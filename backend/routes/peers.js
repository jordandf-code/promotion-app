// routes/peers.js
// User relationships: grant/revoke sponsor and peer access, list relationships, load peer/sponsee data.
// Uses user_relationships table (Layer 0E). Falls back to viewer_access for backward compat.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// ── Helper: check if user_relationships table exists ──────────────────────
let _hasNewTable = null;
async function hasRelationshipsTable() {
  if (_hasNewTable !== null) return _hasNewTable;
  try {
    await db.query('SELECT 1 FROM user_relationships LIMIT 0');
    _hasNewTable = true;
  } catch {
    _hasNewTable = false;
  }
  return _hasNewTable;
}

// POST /api/access/grant — grant a user access to view my data
// Body: { userId?, email?, relationshipType? }
// relationshipType defaults to 'peer' for backward compat
router.post('/access/grant', async (req, res) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot grant access' });
  }

  let targetId = req.body.userId;
  const relType = req.body.relationshipType || 'peer';

  if (!['peer', 'sponsor'].includes(relType)) {
    return res.status(400).json({ error: 'relationshipType must be "peer" or "sponsor"' });
  }

  // Look up by email if userId not provided
  if (!targetId && req.body.email) {
    try {
      const lookup = await db.query('SELECT id FROM users WHERE email = $1', [req.body.email.toLowerCase().trim()]);
      if (!lookup.rows.length) return res.status(404).json({ error: 'No user found with that email' });
      targetId = lookup.rows[0].id;
    } catch (err) {
      console.error('access/grant lookup error:', err.message);
      return res.status(500).json({ error: 'Failed to look up user' });
    }
  }

  if (!targetId) return res.status(400).json({ error: 'userId or email is required' });
  if (targetId === req.userId) return res.status(400).json({ error: 'Cannot grant access to yourself' });

  try {
    if (await hasRelationshipsTable()) {
      await db.query(
        `INSERT INTO user_relationships (user_id, related_user_id, relationship_type) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, related_user_id, relationship_type) DO NOTHING`,
        [req.userId, targetId, relType]
      );
    }
    // Also write to viewer_access for backward compat
    await db.query(
      `INSERT INTO viewer_access (owner_id, viewer_id) VALUES ($1, $2)
       ON CONFLICT (owner_id, viewer_id) DO NOTHING`,
      [req.userId, targetId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('access/grant error:', err.message);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// DELETE /api/access/revoke — revoke a user's access to view my data
router.delete('/access/revoke', async (req, res) => {
  const { userId: targetId, relationshipType } = req.body;
  if (!targetId) return res.status(400).json({ error: 'userId is required' });

  try {
    if (await hasRelationshipsTable()) {
      if (relationshipType) {
        await db.query(
          'DELETE FROM user_relationships WHERE user_id = $1 AND related_user_id = $2 AND relationship_type = $3',
          [req.userId, targetId, relationshipType]
        );
      } else {
        // Revoke all relationship types
        await db.query(
          'DELETE FROM user_relationships WHERE user_id = $1 AND related_user_id = $2',
          [req.userId, targetId]
        );
      }
    }
    // Also remove from viewer_access for backward compat
    await db.query(
      'DELETE FROM viewer_access WHERE owner_id = $1 AND viewer_id = $2',
      [req.userId, targetId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('access/revoke error:', err.message);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// GET /api/access/granted — list users I've granted access to (with relationship types)
router.get('/access/granted', async (req, res) => {
  try {
    if (await hasRelationshipsTable()) {
      const result = await db.query(
        `SELECT u.id, u.email, u.name, ur.relationship_type, ur.granted_at
         FROM user_relationships ur JOIN users u ON u.id = ur.related_user_id
         WHERE ur.user_id = $1
         ORDER BY ur.granted_at`,
        [req.userId]
      );
      return res.json({ users: result.rows });
    }
    // Fallback to viewer_access
    const result = await db.query(
      `SELECT u.id, u.email, u.name, 'peer' AS relationship_type, va.granted_at
       FROM viewer_access va JOIN users u ON u.id = va.viewer_id
       WHERE va.owner_id = $1
       ORDER BY va.granted_at`,
      [req.userId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('access/granted error:', err.message);
    res.status(500).json({ error: 'Failed to load granted users' });
  }
});

// GET /api/peers — list users who have granted ME peer access
router.get('/peers', async (req, res) => {
  try {
    if (await hasRelationshipsTable()) {
      const result = await db.query(
        `SELECT u.id, u.name, u.company, ur.relationship_type, ur.granted_at
         FROM user_relationships ur JOIN users u ON u.id = ur.user_id
         WHERE ur.related_user_id = $1
         ORDER BY ur.relationship_type, u.name`,
        [req.userId]
      );
      return res.json({ peers: result.rows });
    }
    // Fallback
    const result = await db.query(
      `SELECT u.id, u.name, u.company, 'peer' AS relationship_type, va.granted_at
       FROM viewer_access va JOIN users u ON u.id = va.owner_id
       WHERE va.viewer_id = $1
       ORDER BY u.name`,
      [req.userId]
    );
    res.json({ peers: result.rows });
  } catch (err) {
    console.error('peers error:', err.message);
    res.status(500).json({ error: 'Failed to load peers' });
  }
});

// GET /api/peers/:userId/data — read-only snapshot of a peer's data
router.get('/peers/:userId/data', async (req, res) => {
  const ownerId = parseInt(req.params.userId, 10);

  try {
    // Verify access exists (new table or fallback)
    let hasAccess = false;
    if (await hasRelationshipsTable()) {
      const access = await db.query(
        'SELECT relationship_type FROM user_relationships WHERE user_id = $1 AND related_user_id = $2',
        [ownerId, req.userId]
      );
      hasAccess = access.rows.length > 0;
    }
    if (!hasAccess) {
      const access = await db.query(
        'SELECT 1 FROM viewer_access WHERE owner_id = $1 AND viewer_id = $2',
        [ownerId, req.userId]
      );
      hasAccess = access.rows.length > 0;
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access not granted' });
    }

    // Load selected domains (read-only snapshot)
    const domains = ['scorecard', 'wins', 'goals', 'story', 'settings', 'readiness', 'actions', 'people'];
    const result = await db.query(
      'SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)',
      [ownerId, domains]
    );

    const data = {};
    for (const row of result.rows) {
      data[row.domain] = row.data;
    }

    // Include peer's name
    const userResult = await db.query(
      'SELECT name, company FROM users WHERE id = $1',
      [ownerId]
    );
    const peer = userResult.rows[0];

    res.json({ peer: { name: peer?.name, company: peer?.company }, data });
  } catch (err) {
    console.error('peers/data error:', err.message);
    res.status(500).json({ error: 'Failed to load peer data' });
  }
});

// GET /api/sponsees — list users who have granted ME sponsor access
router.get('/sponsees', async (req, res) => {
  try {
    if (!(await hasRelationshipsTable())) {
      return res.json({ sponsees: [] });
    }
    const result = await db.query(
      `SELECT u.id, u.name, u.company, ur.granted_at
       FROM user_relationships ur JOIN users u ON u.id = ur.user_id
       WHERE ur.related_user_id = $1 AND ur.relationship_type = 'sponsor'
       ORDER BY u.name`,
      [req.userId]
    );

    // Enrich with summary data for overview cards
    const sponsees = [];
    for (const row of result.rows) {
      const summaryResult = await db.query(
        `SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)`,
        [row.id, ['readiness', 'actions']]
      );
      const byDomain = Object.fromEntries(summaryResult.rows.map(r => [r.domain, r.data]));
      const readiness = byDomain.readiness ?? {};
      const actions = byDomain.actions ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const overdueCount = actions.filter(a => !a.done && a.dueDate && a.dueDate < today).length;
      const score = readiness.overall ?? readiness.score ?? null;

      let status = 'on_track';
      if (score != null && score < 40 || overdueCount > 3) status = 'at_risk';
      else if (score != null && score < 60 || overdueCount > 0) status = 'needs_attention';

      sponsees.push({
        ...row,
        readinessScore: score,
        overdueActions: overdueCount,
        status,
      });
    }

    res.json({ sponsees });
  } catch (err) {
    console.error('sponsees error:', err.message);
    res.status(500).json({ error: 'Failed to load sponsees' });
  }
});

// ── Helper: compute benchmark metrics across participants ──────────────────
function computeBenchmarkMetrics(participants, currentUserId, myByDomain) {
  const results = [];

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
  }

  function userPercentileRank(sorted, val) {
    if (!sorted.length) return 50;
    const below = sorted.filter(v => v < val).length;
    return Math.round((below / sorted.length) * 100);
  }

  function buildMetric(key, label, unit, values, userVal) {
    if (values.length < 2) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      key,
      label,
      unit,
      min:            sorted[0],
      p25:            percentile(sorted, 25),
      median:         percentile(sorted, 50),
      p75:            percentile(sorted, 75),
      max:            sorted[sorted.length - 1],
      userValue:      Math.round(userVal ?? 0),
      userPercentile: userPercentileRank(sorted, userVal ?? 0),
    };
  }

  // ── readiness_score ──
  const readinessVals = participants.map(([, d]) => {
    const r = d.readiness ?? {};
    return r.overall ?? r.score ?? 0;
  });
  const myReadiness = (() => {
    const r = myByDomain.readiness ?? {};
    return r.overall ?? r.score ?? 0;
  })();
  const rm = buildMetric('readiness_score', 'Readiness score', '%', readinessVals, myReadiness);
  if (rm) results.push(rm);

  // ── wins_count ──
  const winsVals = participants.map(([, d]) => {
    const w = d.wins;
    if (!w) return 0;
    return Array.isArray(w) ? w.length : (Array.isArray(w.wins) ? w.wins.length : 0);
  });
  const myWins = (() => {
    const w = myByDomain.wins;
    if (!w) return 0;
    return Array.isArray(w) ? w.length : (Array.isArray(w.wins) ? w.wins.length : 0);
  })();
  const wm = buildMetric('wins_count', 'Wins logged', '', winsVals, myWins);
  if (wm) results.push(wm);

  // ── goals_completion ──
  function goalsCompletion(domainData) {
    const g = domainData.goals;
    if (!g) return 0;
    const list = Array.isArray(g) ? g : (Array.isArray(g.goals) ? g.goals : []);
    if (!list.length) return 0;
    const done = list.filter(x => x.status === 'done' || x.completed === true).length;
    return Math.round((done / list.length) * 100);
  }
  const goalsVals = participants.map(([, d]) => goalsCompletion(d));
  const gm = buildMetric('goals_completion', 'Goals completion rate', '%', goalsVals, goalsCompletion(myByDomain));
  if (gm) results.push(gm);

  // ── reflection_streak (consecutive weeks with check-ins backwards from now) ──
  function reflectionStreak(domainData) {
    const r = domainData.reflections;
    if (!r) return 0;
    const entries = Array.isArray(r) ? r : (Array.isArray(r.entries) ? r.entries : []);
    if (!entries.length) return 0;
    // Get weeks (ISO week strings) that have entries
    const weeks = new Set(entries.map(e => {
      const d = new Date(e.date || e.createdAt || 0);
      // ISO week: YYYY-Www
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
      return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }));
    // Count consecutive weeks backwards from current
    const now = new Date();
    let streak = 0;
    for (let w = 0; w < 52; w++) {
      const d = new Date(now);
      d.setDate(d.getDate() - w * 7);
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      if (weeks.has(key)) streak++;
      else break;
    }
    return streak;
  }
  const streakVals = participants.map(([, d]) => reflectionStreak(d));
  const sm = buildMetric('reflection_streak', 'Reflection streak', '', streakVals, reflectionStreak(myByDomain));
  if (sm) results.push(sm);

  // ── signings_pct ──
  function signingsPct(domainData) {
    const sc = domainData.scorecard;
    if (!sc) return 0;
    // Try overview targets structure
    const targets = sc.targets ?? sc.overview?.targets ?? {};
    const actual  = sc.actual  ?? sc.overview?.actual  ?? {};
    const sigT = targets.signings ?? targets.Signings ?? 0;
    const sigA = actual.signings  ?? actual.Signings  ?? 0;
    if (!sigT) return 0;
    return Math.round((sigA / sigT) * 100);
  }
  const sigVals = participants.map(([, d]) => signingsPct(d));
  const sigm = buildMetric('signings_pct', 'Signings vs target', '%', sigVals, signingsPct(myByDomain));
  if (sigm) results.push(sigm);

  return results;
}

// GET /api/benchmark — anonymized peer benchmarks
router.get('/benchmark', async (req, res) => {
  try {
    // Load current user's data
    const myData = await db.query(
      `SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)`,
      [req.userId, ['readiness', 'wins', 'goals', 'actions', 'scorecard', 'reflections', 'settings']]
    );
    const myByDomain = Object.fromEntries(myData.rows.map(r => [r.domain, r.data]));

    // Load all non-viewer users' data for comparison (anonymized)
    const allUsers = await db.query(
      `SELECT u.id, ud.domain, ud.data
       FROM users u
       JOIN user_data ud ON ud.user_id = u.id
       WHERE u.role != 'viewer' AND ud.domain = ANY($1)`,
      [['readiness', 'wins', 'goals', 'scorecard', 'reflections', 'settings']]
    );

    // Group by user
    const userMap = {};
    for (const row of allUsers.rows) {
      if (!userMap[row.id]) userMap[row.id] = {};
      userMap[row.id][row.domain] = row.data;
    }

    // Filter out opted-out users
    const participants = Object.entries(userMap).filter(([, domains]) => {
      const settings = domains.settings ?? {};
      return settings.benchmarkOptOut !== true;
    });

    const participantCount = participants.length;
    if (participantCount < 5) {
      return res.json({ ok: true, participantCount, metrics: [] });
    }

    const metrics = computeBenchmarkMetrics(participants, req.userId, myByDomain);
    res.json({ ok: true, participantCount, metrics });
  } catch (err) {
    console.error('benchmark error:', err.message);
    res.status(500).json({ error: 'Failed to load benchmarks' });
  }
});

module.exports = router;
