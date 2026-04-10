// routes/share.js
// Share links and feedback for the promotion profile.
//
// HTML escaping helper for email content:
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
//
// Owner endpoints (JWT required):
//   GET  /api/share/tokens              — get or create share + feedback tokens
//   POST /api/share/reset               — rotate both tokens (invalidates old links)
//   GET  /api/share/feedback            — fetch all feedback submitted by reviewers
//   POST /api/share/request-feedback    — send a feedback request email to a specific person
//   GET  /api/share/feedback-requests   — list all sent feedback requests + status
//
// Public endpoints (no auth):
//   GET  /api/share/view/:token         — public summary data
//   GET  /api/share/feedback-info/:token — reviewer form header info
//   POST /api/share/feedback/:token     — submit feedback (supports structured 360 dimensions)

const express        = require('express');
const crypto         = require('crypto');
const rateLimit      = require('express-rate-limit');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limit public endpoints (view + feedback submission): 30 requests per 15 minutes per IP
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests — please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

function genToken() {
  return crypto.randomBytes(20).toString('hex');
}

function fmtCAD(n) {
  if (n == null || isNaN(n)) return 'n/a';
  if (n >= 1_000_000) return `CDN$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `CDN$${Math.round(n / 1_000)}K`;
  return `CDN$${Math.round(n)}`;
}

function pct(total, target) {
  if (!target) return null;
  return Math.round((total / target) * 100);
}

// Computes a display-ready qualifying year summary from raw scorecard data.
function buildScorecardSummary(scorecard, userSettings) {
  const promotionYear  = userSettings?.promotionYear ?? 2027;
  const qualifyingYear = promotionYear - 1;
  const { targets = {}, opportunities = [], projects = [], utilization = {} } = scorecard;
  const yearTargets = targets[qualifyingYear] ?? {};

  const wonOpps  = opportunities.filter(o => o.year === qualifyingYear && o.status === 'won');
  const openOpps = opportunities.filter(o => o.year === qualifyingYear && o.status === 'open');
  const salesR = wonOpps.reduce((s, o)  => s + (Number(o.signingsValue) || 0), 0);
  const salesF = openOpps.reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);

  const realProj = projects.filter(p => qualifyingYear >= p.year && qualifyingYear <= (p.endYear || p.year) && p.status === 'realized');
  const foreProj = projects.filter(p => qualifyingYear >= p.year && qualifyingYear <= (p.endYear || p.year) && p.status === 'forecast');
  const qRev = p => ['q1','q2','q3','q4'].reduce((s, q) => s + (Number(p.revenue?.[q])    || 0), 0);
  const qGP  = p => ['q1','q2','q3','q4'].reduce((s, q) => s + (Number(p.grossProfit?.[q]) || 0), 0);
  const revR = realProj.reduce((s, p) => s + qRev(p), 0);
  const revF = foreProj.reduce((s, p) => s + qRev(p), 0);
  const gpR  = realProj.reduce((s, p) => s + qGP(p),  0);
  const gpF  = foreProj.reduce((s, p) => s + qGP(p),  0);

  const months   = Object.values(utilization[qualifyingYear]?.months ?? {});
  const utilActual   = months.reduce((s, m) => s + (Number(m.actual)   || 0), 0);
  const utilForecast = months.reduce((s, m) => s + (Number(m.forecast) || 0), 0);

  function row(label, realized, forecast, target) {
    const total = realized + forecast;
    return {
      label,
      realized: fmtCAD(realized),
      forecast: fmtCAD(forecast),
      total:    fmtCAD(total),
      target:   target ? fmtCAD(target) : '—',
      pct:      pct(total, target),
    };
  }

  return {
    year: qualifyingYear,
    rows: [
      row('Sales',         salesR, salesF, yearTargets.sales),
      row('Revenue',       revR,   revF,   yearTargets.revenue),
      row('Gross profit',  gpR,    gpF,    yearTargets.grossProfit),
    ],
    util: {
      actual:   utilActual,
      forecast: utilForecast,
      total:    utilActual + utilForecast,
      target:   yearTargets.utilization ?? null,
      pct:      pct(utilActual + utilForecast, yearTargets.utilization),
    },
  };
}

// GET /api/share/tokens
// Returns existing tokens, creating them if they don't exist yet.
router.get('/tokens', authMiddleware, async (req, res) => {
  try {
    await db.query(
      `UPDATE users
       SET share_token    = COALESCE(share_token,    $1),
           feedback_token = COALESCE(feedback_token, $2)
       WHERE id = $3`,
      [genToken(), genToken(), req.userId]
    );
    const result = await db.query(
      'SELECT share_token, feedback_token FROM users WHERE id = $1',
      [req.userId]
    );
    const { share_token, feedback_token } = result.rows[0];
    res.json({ shareToken: share_token, feedbackToken: feedback_token });
  } catch (err) {
    console.error('get tokens error:', err.message);
    res.status(500).json({ error: 'Failed to load share tokens' });
  }
});

// POST /api/share/reset
// Rotates both tokens — all existing links are invalidated.
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET share_token = $1, feedback_token = $2
       WHERE id = $3 RETURNING share_token, feedback_token`,
      [genToken(), genToken(), req.userId]
    );
    const { share_token, feedback_token } = result.rows[0];
    res.json({ shareToken: share_token, feedbackToken: feedback_token });
  } catch (err) {
    console.error('reset tokens error:', err.message);
    res.status(500).json({ error: 'Failed to reset links' });
  }
});

// GET /api/share/view/:token
// Public summary — returns owner name, wins, narrative, scorecard based on sharing settings.
router.get('/view/:token', publicLimiter, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, name FROM users WHERE share_token = $1',
      [req.params.token]
    );
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Share link not found' });

    const { id: userId, name } = userResult.rows[0];

    const dataResult = await db.query(
      `SELECT domain, data FROM user_data
       WHERE user_id = $1 AND domain IN ('sharing', 'wins', 'story', 'scorecard', 'settings', 'learning', 'eminence')`,
      [userId]
    );

    const byDomain    = Object.fromEntries(dataResult.rows.map(r => [r.domain, r.data]));
    const sharing     = byDomain.sharing ?? { showWins: true, showNarrative: true, showScorecard: false };
    const userSettings = byDomain.settings;

    const scorecardSummary = sharing.showScorecard && byDomain.scorecard
      ? buildScorecardSummary(byDomain.scorecard, userSettings)
      : null;

    const earnedCerts = sharing.showLearning && byDomain.learning
      ? (byDomain.learning.certifications ?? [])
          .filter(c => c.status === 'earned')
          .map(c => ({ name: c.name, issuer: c.issuer, dateEarned: c.dateEarned }))
      : null;

    const eminenceActivities = sharing.showEminence && byDomain.eminence
      ? (byDomain.eminence.activities ?? [])
          .filter(a => a.audience === 'external')
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          .map(a => ({ title: a.title, type: a.type, date: a.date, venue: a.venue, url: a.url }))
      : null;

    res.json({
      owner:          { name },
      settings:       sharing,
      wins:           sharing.showWins      ? (byDomain.wins ?? [])              : null,
      narrative:      sharing.showNarrative ? (byDomain.story?.narrative ?? null) : null,
      scorecard:      scorecardSummary,
      certifications: earnedCerts,
      eminence:       eminenceActivities,
    });
  } catch (err) {
    console.error('share view error:', err.message);
    res.status(500).json({ error: 'Failed to load share data' });
  }
});

// GET /api/share/feedback-info/:token
// Returns basic info for the feedback form header. Supports both legacy feedback_token
// (from users table) and new review_tokens (from 1C structured feedback).
router.get('/feedback-info/:token', publicLimiter, async (req, res) => {
  try {
    // Try legacy feedback_token first
    const legacyResult = await db.query(
      'SELECT name FROM users WHERE feedback_token = $1',
      [req.params.token]
    );
    if (legacyResult.rows[0]) {
      return res.json({ owner: { name: legacyResult.rows[0].name }, tokenType: 'legacy' });
    }

    // Try review_tokens table
    const rtResult = await db.query(
      `SELECT rt.id AS token_id, rt.reviewer_name, rt.reviewer_email, rt.expires_at, u.name AS owner_name
       FROM review_tokens rt JOIN users u ON u.id = rt.owner_id
       WHERE rt.token = $1 AND rt.purpose = 'feedback'`,
      [req.params.token]
    );
    if (!rtResult.rows[0]) return res.status(404).json({ error: 'Feedback link not found' });

    const rt = rtResult.rows[0];
    if (rt.expires_at && new Date(rt.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This feedback link has expired' });
    }
    res.json({
      owner: { name: rt.owner_name },
      tokenType: 'review_token',
      reviewerName: rt.reviewer_name || null,
      reviewerEmail: rt.reviewer_email || null,
    });
  } catch (err) {
    console.error('feedback-info error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback info' });
  }
});

// POST /api/share/feedback/:token
// Submits feedback from a reviewer. Supports both legacy (rating + comments) and
// structured 360 format (dimensions array + comments).
router.post('/feedback/:token', publicLimiter, async (req, res) => {
  const { reviewer, rating, comments, dimensions } = req.body ?? {};
  if (!reviewer?.trim()) return res.status(400).json({ error: 'Your name is required' });

  // Structured 360 feedback: dimensions is an array of { key, label, rating, comment }
  const isStructured = Array.isArray(dimensions) && dimensions.length > 0;

  if (isStructured) {
    // Validate each dimension has a rating 1-5
    for (const d of dimensions) {
      if (!d.rating || d.rating < 1 || d.rating > 5) {
        return res.status(400).json({ error: `Rating must be 1–5 for each dimension` });
      }
    }
  } else {
    // Legacy format requires a single rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1–5' });
    }
  }

  try {
    // Resolve token — try legacy feedback_token first, then review_tokens
    let userId = null;
    let reviewTokenId = null;

    const legacyResult = await db.query(
      'SELECT id FROM users WHERE feedback_token = $1',
      [req.params.token]
    );
    if (legacyResult.rows[0]) {
      userId = legacyResult.rows[0].id;
    } else {
      const rtResult = await db.query(
        `SELECT id, owner_id, expires_at, used_at FROM review_tokens
         WHERE token = $1 AND purpose = 'feedback'`,
        [req.params.token]
      );
      if (!rtResult.rows[0]) return res.status(404).json({ error: 'Feedback link not found' });
      const rt = rtResult.rows[0];
      if (rt.expires_at && new Date(rt.expires_at) < new Date()) {
        return res.status(410).json({ error: 'This feedback link has expired' });
      }
      if (rt.used_at) {
        return res.status(410).json({ error: 'This feedback link has already been used' });
      }
      userId = rt.owner_id;
      reviewTokenId = rt.id;

      // Mark review token as used
      await db.query('UPDATE review_tokens SET used_at = NOW() WHERE id = $1', [rt.id]);
    }

    // Compute average rating for backward compat
    const avgRating = isStructured
      ? Math.round(dimensions.reduce((s, d) => s + d.rating, 0) / dimensions.length)
      : Number(rating);

    await db.query(
      `INSERT INTO feedback (user_id, reviewer, rating, comments, dimensions, review_token_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, reviewer.trim(), avgRating, comments?.trim() || null,
       isStructured ? JSON.stringify(dimensions) : null, reviewTokenId]
    );

    // Fire-and-forget feedback notification
    try {
      const { sendNotification } = require('../notifications/send');
      const { wrapEmail } = require('../notifications/emailTemplate');
      const stars = '★'.repeat(avgRating) + '☆'.repeat(5 - avgRating);
      const dimSummary = isStructured
        ? dimensions.map(d => `<li>${esc(d.label)}: ${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)}</li>`).join('')
        : '';
      const preview = comments?.trim() ? comments.trim().slice(0, 200) : '';
      const body = `
        <p style="margin:0 0 8px;font-size:14px;"><strong>${esc(reviewer.trim())}</strong> submitted ${isStructured ? '360 ' : ''}feedback:</p>
        <p style="margin:0 0 8px;font-size:20px;">${stars} <span style="font-size:13px;color:#666;">(avg)</span></p>
        ${dimSummary ? `<ul style="margin:0 0 12px;padding-left:20px;font-size:13px;color:#444;">${dimSummary}</ul>` : ''}
        ${preview ? `<p style="margin:0 0 12px;font-size:13px;color:#555;">"${esc(preview)}${(comments?.trim().length || 0) > 200 ? '…' : ''}"</p>` : ''}`;
      const html = wrapEmail(body, {
        subtitle: 'Feedback Received',
        ctaLabel: 'View feedback',
        ctaUrl: `${process.env.APP_URL || 'https://partner.jordandf.com'}/sharing`,
      });
      sendNotification({
        userId,
        type: 'feedback_received',
        subject: `New ${isStructured ? '360 ' : ''}feedback from ${reviewer.trim()} — ${stars}`,
        html,
        payload: { reviewer: reviewer.trim(), rating: avgRating, structured: isStructured },
      }).catch(() => {});
    } catch { /* notification module not available — skip */ }

    res.json({ ok: true });
  } catch (err) {
    console.error('submit feedback error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/share/feedback
// Owner fetches all feedback submitted against their profile.
router.get('/feedback', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, reviewer, rating, comments, dimensions, review_token_id,
              COALESCE(submitted_at, created_at) AS submitted_at
       FROM feedback WHERE user_id = $1
       ORDER BY COALESCE(submitted_at, created_at) DESC`,
      [req.userId]
    );
    res.json({ feedback: result.rows });
  } catch (err) {
    console.error('get feedback error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// POST /api/share/request-feedback
// Send a feedback request to a specific person via email. Creates a review_token.
router.post('/request-feedback', authMiddleware, async (req, res) => {
  const { recipientEmail, recipientName, personId, message } = req.body ?? {};
  if (!recipientEmail?.trim()) return res.status(400).json({ error: 'Recipient email is required' });
  if (!recipientName?.trim())  return res.status(400).json({ error: 'Recipient name is required' });

  try {
    const token = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.query(
      `INSERT INTO review_tokens (owner_id, token, reviewer_name, reviewer_email, purpose, expires_at)
       VALUES ($1, $2, $3, $4, 'feedback', $5)`,
      [req.userId, token, recipientName.trim(), recipientEmail.trim(), expiresAt]
    );

    // Load owner name for the email
    const ownerResult = await db.query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const ownerName = ownerResult.rows[0]?.name || 'A colleague';

    // Send feedback request email
    try {
      const { sendNotification } = require('../notifications/send');
      const { wrapEmail, APP_URL } = require('../notifications/emailTemplate');
      const feedbackUrl = `${APP_URL}/feedback/${token}`;
      const personalMsg = message?.trim()
        ? `<p style="margin:0 0 16px;font-size:14px;color:#555;font-style:italic;">"${message.trim()}"</p>`
        : '';
      const body = `
        <p style="margin:0 0 8px;font-size:15px;">Hi ${recipientName.trim()},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333;">
          <strong>${ownerName}</strong> has invited you to provide structured 360 feedback
          on their readiness for promotion. Your feedback is confidential and shared only with them.
        </p>
        ${personalMsg}
        <p style="margin:0 0 8px;font-size:13px;color:#666;">
          The form takes about 5 minutes and covers 5 dimensions. The link expires in 30 days.
        </p>`;
      const html = wrapEmail(body, {
        subtitle: 'Feedback Request',
        ctaLabel: 'Give feedback',
        ctaUrl: feedbackUrl,
      });

      // Send directly via Resend (not through sendNotification dedup, since recipient is external)
      const { Resend } = require('resend');
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        const fromResult = await db.query("SELECT value FROM app_settings WHERE key = 'email_from'");
        const fromAddress = fromResult.rows[0]?.value || 'Career Command Center <notifications@partner.jordandf.com>';
        await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail.trim()],
          subject: `${ownerName} is requesting your feedback`,
          html,
        });
      }

      // Also log a notification for the owner (so they see it in history)
      sendNotification({
        userId: req.userId,
        type: 'feedback_request',
        subject: `Feedback request sent to ${recipientName.trim()}`,
        html: `<p>You sent a feedback request to <strong>${recipientName.trim()}</strong> (${recipientEmail.trim()}).</p>`,
        payload: { recipientName: recipientName.trim(), recipientEmail: recipientEmail.trim(), token },
      }).catch(() => {});
    } catch (emailErr) {
      console.error('feedback request email error:', emailErr.message);
      // Don't fail — token was created, email just didn't send
    }

    res.json({ ok: true, token });
  } catch (err) {
    console.error('request-feedback error:', err.message);
    res.status(500).json({ error: 'Failed to create feedback request' });
  }
});

// GET /api/share/feedback-requests
// List all feedback requests sent by this user with their status.
router.get('/feedback-requests', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rt.id, rt.token, rt.reviewer_name, rt.reviewer_email, rt.created_at, rt.expires_at, rt.used_at,
              (SELECT COUNT(*) FROM feedback f WHERE f.review_token_id = rt.id) AS response_count
       FROM review_tokens rt
       WHERE rt.owner_id = $1 AND rt.purpose = 'feedback'
       ORDER BY rt.created_at DESC`,
      [req.userId]
    );
    const requests = result.rows.map(r => ({
      id: r.id,
      token: r.token,
      reviewerName: r.reviewer_name,
      reviewerEmail: r.reviewer_email,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      usedAt: r.used_at,
      responseCount: Number(r.response_count),
      status: Number(r.response_count) > 0 ? 'completed'
            : (r.expires_at && new Date(r.expires_at) < new Date()) ? 'expired'
            : 'pending',
    }));
    res.json({ requests });
  } catch (err) {
    console.error('feedback-requests error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback requests' });
  }
});

// ── Competency assessment via token (C3) ────────────────────────────────────

// POST /api/share/request-competency-assessment
// Send a competency assessment request to a peer/sponsor via email.
router.post('/request-competency-assessment', authMiddleware, async (req, res) => {
  const { recipientEmail, recipientName, message } = req.body ?? {};
  if (!recipientEmail?.trim()) return res.status(400).json({ error: 'Recipient email is required' });
  if (!recipientName?.trim())  return res.status(400).json({ error: 'Recipient name is required' });

  try {
    const token = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO review_tokens (owner_id, token, reviewer_name, reviewer_email, purpose, expires_at)
       VALUES ($1, $2, $3, $4, 'competency_assessment', $5)`,
      [req.userId, token, recipientName.trim(), recipientEmail.trim(), expiresAt]
    );

    const ownerResult = await db.query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const ownerName = ownerResult.rows[0]?.name || 'A colleague';

    try {
      const { Resend } = require('resend');
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { wrapEmail, APP_URL } = require('../notifications/emailTemplate');
        const assessUrl = `${APP_URL}/competency-assessment/${token}`;
        const personalMsg = message?.trim()
          ? `<p style="margin:0 0 16px;font-size:14px;color:#555;font-style:italic;">"${message.trim()}"</p>`
          : '';
        const body = `
          <p style="margin:0 0 8px;font-size:15px;">Hi ${esc(recipientName.trim())},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#333;">
            <strong>${esc(ownerName)}</strong> has invited you to assess their competencies.
            Your assessment helps them understand how others perceive their strengths and development areas.
          </p>
          ${personalMsg}
          <p style="margin:0 0 8px;font-size:13px;color:#666;">
            The assessment takes about 10 minutes and covers 7 leadership competencies. The link expires in 30 days.
          </p>`;
        const html = wrapEmail(body, {
          subtitle: 'Competency Assessment Request',
          ctaLabel: 'Start assessment',
          ctaUrl: assessUrl,
        });
        const resend = new Resend(apiKey);
        const fromResult = await db.query("SELECT value FROM app_settings WHERE key = 'email_from'");
        const fromAddress = fromResult.rows[0]?.value || 'Career Command Center <notifications@partner.jordandf.com>';
        await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail.trim()],
          subject: `${ownerName} is requesting your competency assessment`,
          html,
        });
      }
    } catch (emailErr) {
      console.error('competency assessment request email error:', emailErr.message);
    }

    res.json({ ok: true, token });
  } catch (err) {
    console.error('request-competency-assessment error:', err.message);
    res.status(500).json({ error: 'Failed to create assessment request' });
  }
});

// GET /api/share/competency-assessment-info/:token
// Returns BARS + questions for the public competency assessment form.
router.get('/competency-assessment-info/:token', publicLimiter, async (req, res) => {
  try {
    const rtResult = await db.query(
      `SELECT id, owner_id, reviewer_name, expires_at, used_at FROM review_tokens
       WHERE token = $1 AND purpose = 'competency_assessment'`,
      [req.params.token]
    );
    if (!rtResult.rows[0]) return res.status(404).json({ error: 'Assessment link not found' });
    const rt = rtResult.rows[0];
    if (rt.expires_at && new Date(rt.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This assessment link has expired' });
    }
    if (rt.used_at) {
      return res.status(410).json({ error: 'This assessment has already been submitted' });
    }

    const ownerResult = await db.query('SELECT name FROM users WHERE id = $1', [rt.owner_id]);
    const ownerName = ownerResult.rows[0]?.name || 'Unknown';

    // Load question bank
    const qbResult = await db.query("SELECT value FROM app_settings WHERE key = 'competency_question_bank'");
    let questionBank = null;
    if (qbResult.rows[0]?.value) {
      try { questionBank = JSON.parse(qbResult.rows[0].value); } catch {}
    }

    res.json({
      reviewerName: rt.reviewer_name,
      ownerName,
      questionBank,
    });
  } catch (err) {
    console.error('competency-assessment-info error:', err.message);
    res.status(500).json({ error: 'Failed to load assessment info' });
  }
});

// POST /api/share/competency-assessment/:token
// Submit a competency assessment via token (public, no auth required).
router.post('/competency-assessment/:token', publicLimiter, async (req, res) => {
  const { ratings, overall_notes } = req.body ?? {};
  if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) {
    return res.status(400).json({ error: 'At least one competency rating is required' });
  }

  try {
    const rtResult = await db.query(
      `SELECT id, owner_id, reviewer_name, reviewer_email, expires_at, used_at FROM review_tokens
       WHERE token = $1 AND purpose = 'competency_assessment'`,
      [req.params.token]
    );
    if (!rtResult.rows[0]) return res.status(404).json({ error: 'Assessment link not found' });
    const rt = rtResult.rows[0];
    if (rt.expires_at && new Date(rt.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This assessment link has expired' });
    }
    if (rt.used_at) {
      return res.status(410).json({ error: 'This assessment has already been submitted' });
    }

    // Mark token as used
    await db.query('UPDATE review_tokens SET used_at = NOW() WHERE id = $1', [rt.id]);

    // Build the assessment entry
    const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const assessment = {
      id: uid,
      date: new Date().toISOString().slice(0, 10),
      type: 'peer', // default; could be sponsor if relationship is known
      assessor_name: rt.reviewer_name,
      review_token_id: rt.id,
      ratings,
      overall_notes: overall_notes || '',
    };

    // Append to owner's competencies domain (using SELECT FOR UPDATE to prevent races)
    await db.query('BEGIN');
    const dataResult = await db.query(
      `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'competencies' FOR UPDATE`,
      [rt.owner_id]
    );
    const compData = dataResult.rows[0]?.data ?? { framework_version: 'v1', assessments: [], competency_goals: [], ai_analysis: {} };
    compData.assessments = [...(compData.assessments ?? []), assessment];

    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'competencies', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [rt.owner_id, JSON.stringify(compData)]
    );
    await db.query('COMMIT');

    // Notify owner
    try {
      const { sendNotification } = require('../notifications/send');
      const { wrapEmail } = require('../notifications/emailTemplate');
      const ratedCount = Object.keys(ratings).length;
      const body = `
        <p style="margin:0 0 8px;font-size:14px;"><strong>${esc(rt.reviewer_name)}</strong> completed a competency assessment:</p>
        <p style="margin:0 0 8px;font-size:13px;color:#555;">${ratedCount} competencies rated</p>`;
      const html = wrapEmail(body, {
        subtitle: 'Competency Assessment Received',
        ctaLabel: 'View assessments',
        ctaUrl: `${process.env.APP_URL || 'https://partner.jordandf.com'}/competencies`,
      });
      sendNotification({
        userId: rt.owner_id,
        type: 'competency_assessment_received',
        subject: `Competency assessment from ${rt.reviewer_name}`,
        html,
        payload: { assessorName: rt.reviewer_name, ratedCount },
      }).catch(() => {});
    } catch {}

    res.json({ ok: true });
  } catch (err) {
    if (err.message !== 'COMMIT') await db.query('ROLLBACK').catch(() => {});
    console.error('submit competency assessment error:', err.message);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

module.exports = router;
