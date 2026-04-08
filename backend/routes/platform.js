// routes/platform.js
// Platform-wide category settings (readable by all authenticated users, writable by superusers only).
// Stored in app_settings under key 'platform_categories' as a JSON string.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/platform — returns platform categories (all authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT value FROM app_settings WHERE key = 'platform_categories'"
    );
    const raw = result.rows[0]?.value;
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = null; }
    }
    res.json({ data });
  } catch (err) {
    console.error('GET platform error:', err.message);
    res.status(500).json({ error: 'Failed to load platform settings' });
  }
});

// PUT /api/platform — upsert platform categories (superuser only)
router.put('/', authMiddleware, requireRole('superuser'), async (req, res) => {
  const { data } = req.body;
  if (data === undefined) return res.status(400).json({ error: 'data field required' });

  try {
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ('platform_categories', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT platform error:', err.message);
    res.status(500).json({ error: 'Failed to save platform settings' });
  }
});

module.exports = router;
