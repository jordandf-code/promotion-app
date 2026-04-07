// routes/notifications.js
// User notification preferences, history, and test-digest endpoint.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const { buildDigest } = require('../notifications/digest');
const { sendNotification } = require('../notifications/send');

const router = express.Router();

router.use(authMiddleware);

// GET /api/notifications/prefs — get current user's notification preferences
router.get('/prefs', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT notification_prefs FROM users WHERE id = $1',
      [req.userId]
    );
    res.json({ prefs: result.rows[0]?.notification_prefs || {} });
  } catch (err) {
    console.error('notifications/prefs get error:', err.message);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// PUT /api/notifications/prefs — update notification preferences
router.put('/prefs', async (req, res) => {
  const { prefs } = req.body;
  if (!prefs || typeof prefs !== 'object') {
    return res.status(400).json({ error: 'Preferences object required' });
  }

  try {
    await db.query(
      'UPDATE users SET notification_prefs = $1 WHERE id = $2',
      [JSON.stringify(prefs), req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('notifications/prefs put error:', err.message);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// GET /api/notifications/history — last 20 sent notifications
router.get('/history', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, type, payload, sent_at FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 20',
      [req.userId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('notifications/history error:', err.message);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// POST /api/notifications/test-digest — send a test digest immediately
router.post('/test-digest', async (req, res) => {
  try {
    const { subject, html } = await buildDigest(req.userId);
    const result = await sendNotification({
      userId: req.userId,
      type: 'weekly_digest',
      subject: `[TEST] ${subject}`,
      html,
      payload: { test: true },
      force: true, // bypass prefs/dedup for test
    });

    if (result.sent) {
      res.json({ ok: true, message: 'Test digest sent — check your email' });
    } else {
      res.json({ ok: false, message: `Not sent: ${result.reason}` });
    }
  } catch (err) {
    console.error('notifications/test-digest error:', err.message);
    res.status(500).json({ error: 'Failed to send test digest' });
  }
});

// GET /api/notifications/status — check if email is configured (any user)
router.get('/status', async (req, res) => {
  const hasKey = !!process.env.RESEND_API_KEY;
  res.json({ configured: hasKey });
});

module.exports = router;
