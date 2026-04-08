// routes/platform.js
// Platform-wide category settings (readable by all authenticated users, writable by superusers only).
// Stored in app_settings under key 'platform_categories' as a JSON string.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/platform — returns platform categories + firm config (all authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT key, value FROM app_settings WHERE key IN ('platform_categories', 'firm_config')"
    );
    const byKey = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    let data = null;
    let firmConfig = null;
    if (byKey.platform_categories) {
      try { data = JSON.parse(byKey.platform_categories); } catch { data = null; }
    }
    if (byKey.firm_config) {
      try { firmConfig = JSON.parse(byKey.firm_config); } catch { firmConfig = null; }
    }
    res.json({ data, firmConfig });
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

// PUT /api/platform/firm-config — upsert firm configuration (superuser only)
router.put('/firm-config', authMiddleware, requireRole('superuser'), async (req, res) => {
  const { firmConfig } = req.body;
  if (firmConfig === undefined) return res.status(400).json({ error: 'firmConfig field required' });

  try {
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ('firm_config', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(firmConfig)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT firm-config error:', err.message);
    res.status(500).json({ error: 'Failed to save firm configuration' });
  }
});

module.exports = router;
