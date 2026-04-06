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

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
