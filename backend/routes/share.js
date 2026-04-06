// routes/share.js
// Share links and feedback for the promotion profile.
//
// Owner endpoints (JWT required):
//   GET  /api/share/tokens         — get or create share + feedback tokens
//   POST /api/share/reset          — rotate both tokens (invalidates old links)
//   GET  /api/share/feedback        — fetch all feedback submitted by reviewers
//
// Public endpoints (no auth):
//   GET  /api/share/view/:token    — public summary data
//   GET  /api/share/feedback-info/:token — reviewer form header info
//   POST /api/share/feedback/:token — submit feedback

const express        = require('express');
const crypto         = require('crypto');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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

  const realProj = projects.filter(p => p.year === qualifyingYear && p.status === 'realized');
  const foreProj = projects.filter(p => p.year === qualifyingYear && p.status === 'forecast');
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
router.get('/view/:token', async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, name FROM users WHERE share_token = $1',
      [req.params.token]
    );
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Share link not found' });

    const { id: userId, name } = userResult.rows[0];

    const dataResult = await db.query(
      `SELECT domain, data FROM user_data
       WHERE user_id = $1 AND domain IN ('sharing', 'wins', 'story', 'scorecard', 'settings')`,
      [userId]
    );

    const byDomain    = Object.fromEntries(dataResult.rows.map(r => [r.domain, r.data]));
    const sharing     = byDomain.sharing ?? { showWins: true, showNarrative: true, showScorecard: false };
    const userSettings = byDomain.settings;

    const scorecardSummary = sharing.showScorecard && byDomain.scorecard
      ? buildScorecardSummary(byDomain.scorecard, userSettings)
      : null;

    res.json({
      owner:     { name },
      settings:  sharing,
      wins:      sharing.showWins      ? (byDomain.wins ?? [])              : null,
      narrative: sharing.showNarrative ? (byDomain.story?.narrative ?? null) : null,
      scorecard: scorecardSummary,
    });
  } catch (err) {
    console.error('share view error:', err.message);
    res.status(500).json({ error: 'Failed to load share data' });
  }
});

// GET /api/share/feedback-info/:token
// Returns basic info for the feedback form header (whose profile it is).
router.get('/feedback-info/:token', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT name FROM users WHERE feedback_token = $1',
      [req.params.token]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Feedback link not found' });
    res.json({ owner: { name: result.rows[0].name } });
  } catch (err) {
    console.error('feedback-info error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback info' });
  }
});

// POST /api/share/feedback/:token
// Submits feedback from a reviewer.
router.post('/feedback/:token', async (req, res) => {
  const { reviewer, rating, comments } = req.body ?? {};
  if (!reviewer?.trim())              return res.status(400).json({ error: 'Your name is required' });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });

  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE feedback_token = $1',
      [req.params.token]
    );
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Feedback link not found' });

    await db.query(
      `INSERT INTO feedback (user_id, reviewer, rating, comments)
       VALUES ($1, $2, $3, $4)`,
      [userResult.rows[0].id, reviewer.trim(), Number(rating), comments?.trim() || null]
    );
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
      `SELECT id, reviewer, rating, comments, submitted_at
       FROM feedback WHERE user_id = $1 ORDER BY submitted_at DESC`,
      [req.userId]
    );
    res.json({ feedback: result.rows });
  } catch (err) {
    console.error('get feedback error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

module.exports = router;
