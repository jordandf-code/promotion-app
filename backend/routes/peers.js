// routes/peers.js
// Peer access: grant/revoke viewer access, list peers, load peer data.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// POST /api/access/grant — grant a user access to view my data
// Accepts either { userId } or { email } to identify the target user.
router.post('/access/grant', async (req, res) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot grant access' });
  }

  let viewerId = req.body.userId;

  // Look up by email if userId not provided
  if (!viewerId && req.body.email) {
    try {
      const lookup = await db.query('SELECT id FROM users WHERE email = $1', [req.body.email.toLowerCase().trim()]);
      if (!lookup.rows.length) return res.status(404).json({ error: 'No user found with that email' });
      viewerId = lookup.rows[0].id;
    } catch (err) {
      console.error('access/grant lookup error:', err.message);
      return res.status(500).json({ error: 'Failed to look up user' });
    }
  }

  if (!viewerId) return res.status(400).json({ error: 'userId or email is required' });
  if (viewerId === req.userId) return res.status(400).json({ error: 'Cannot grant access to yourself' });

  try {
    await db.query(
      `INSERT INTO viewer_access (owner_id, viewer_id) VALUES ($1, $2)
       ON CONFLICT (owner_id, viewer_id) DO NOTHING`,
      [req.userId, viewerId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('access/grant error:', err.message);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// DELETE /api/access/revoke — revoke a user's access to view my data
router.delete('/access/revoke', async (req, res) => {
  const { userId: viewerId } = req.body;
  if (!viewerId) return res.status(400).json({ error: 'userId is required' });

  try {
    await db.query(
      'DELETE FROM viewer_access WHERE owner_id = $1 AND viewer_id = $2',
      [req.userId, viewerId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('access/revoke error:', err.message);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// GET /api/access/granted — list users I've granted access to
router.get('/access/granted', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, va.granted_at
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

// GET /api/peers — list users who have granted ME access
router.get('/peers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.company, va.granted_at
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
    // Verify access grant exists
    const access = await db.query(
      'SELECT 1 FROM viewer_access WHERE owner_id = $1 AND viewer_id = $2',
      [ownerId, req.userId]
    );
    if (!access.rows.length) {
      return res.status(403).json({ error: 'Access not granted' });
    }

    // Load selected domains (read-only snapshot)
    const domains = ['scorecard', 'wins', 'goals', 'story', 'settings'];
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

module.exports = router;
