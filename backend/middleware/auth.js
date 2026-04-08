// middleware/auth.js
// Verifies the JWT on protected routes.
// Attaches req.userId, req.userRole, and req.mustChangePassword.

const jwt = require('jsonwebtoken');
const db = require('../db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Load role and flags from DB so changes take effect immediately
    const { rows } = await db.query(
      'SELECT role, must_change_password FROM users WHERE id = $1',
      [req.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Account not found' });
    }

    req.userRole = rows[0].role;
    req.mustChangePassword = rows[0].must_change_password;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory — restricts access to the listed roles.
 * Usage: router.get('/admin/users', auth, requireRole('superuser'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Middleware factory — checks that the current user has a specific relationship
 * with the target user specified by :userId param.
 * Usage: router.get('/:userId/summary', auth, requireRelationship('sponsor'), handler)
 */
function requireRelationship(...types) {
  return async (req, res, next) => {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId) {
      return res.status(400).json({ error: 'userId parameter required' });
    }
    try {
      // Check user_relationships table; fall back to viewer_access if table doesn't exist yet
      let hasAccess = false;
      try {
        const result = await db.query(
          `SELECT 1 FROM user_relationships
           WHERE user_id = $1 AND related_user_id = $2 AND relationship_type = ANY($3)`,
          [targetUserId, req.userId, types]
        );
        hasAccess = result.rows.length > 0;
      } catch (tableErr) {
        // Table may not exist yet — fall back to viewer_access for backward compat
        if (tableErr.code === '42P01') {
          const fallback = await db.query(
            'SELECT 1 FROM viewer_access WHERE owner_id = $1 AND viewer_id = $2',
            [targetUserId, req.userId]
          );
          hasAccess = fallback.rows.length > 0;
        } else {
          throw tableErr;
        }
      }
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access not granted' });
      }
      next();
    } catch (err) {
      console.error('requireRelationship error:', err.message);
      res.status(500).json({ error: 'Failed to verify access' });
    }
  };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.requireRelationship = requireRelationship;
