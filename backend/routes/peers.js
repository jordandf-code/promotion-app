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
    res.json({ sponsees: result.rows });
  } catch (err) {
    console.error('sponsees error:', err.message);
    res.status(500).json({ error: 'Failed to load sponsees' });
  }
});

module.exports = router;
