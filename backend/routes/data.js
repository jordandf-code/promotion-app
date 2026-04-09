// routes/data.js
// Document store: GET and PUT /api/data/:domain
// Each user has one row per domain in user_data (JSONB).

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const ALLOWED_DOMAINS = new Set([
  'scorecard', 'wins', 'actions', 'goals', 'people', 'admin', 'story', 'settings', 'sharing', 'backup', 'learning', 'eminence', 'readiness', 'feedback_synthesis', 'reflections', 'competencies',
]);

// GET /api/data/:domain
// Returns { data: <jsonb value> } — data is null if the domain has never been saved.
router.get('/:domain', authMiddleware, async (req, res) => {
  const { domain } = req.params;
  if (!ALLOWED_DOMAINS.has(domain)) return res.status(400).json({ error: 'Unknown domain' });

  try {
    const result = await db.query(
      'SELECT data FROM user_data WHERE user_id = $1 AND domain = $2',
      [req.userId, domain]
    );
    res.json({ data: result.rows[0]?.data ?? null });
  } catch (err) {
    console.error(`GET data/${domain} error:`, err.message);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// PUT /api/data/:domain
// Body: { data: <any json value> }
// Upserts the row; returns { ok: true }.
router.put('/:domain', authMiddleware, async (req, res) => {
  if (req.userRole === 'viewer') return res.status(403).json({ error: 'Viewers cannot modify data' });

  const { domain } = req.params;
  if (!ALLOWED_DOMAINS.has(domain)) return res.status(400).json({ error: 'Unknown domain' });

  const { data } = req.body;
  if (data === undefined) return res.status(400).json({ error: 'data field required' });

  try {
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (user_id, domain)
       DO UPDATE SET data = $3::jsonb, updated_at = now()`,
      [req.userId, domain, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(`PUT data/${domain} error:`, err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

module.exports = router;
