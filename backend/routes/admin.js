// routes/admin.js
// Superuser-only endpoints: user management, invite code, platform settings.

const express        = require('express');
const bcrypt         = require('bcryptjs');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require superuser
router.use(authMiddleware, requireRole('superuser'));

// GET /api/admin/users — list all accounts (no sensitive fields)
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, company, created_at FROM users ORDER BY created_at'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('admin/users error:', err.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// PUT /api/admin/users/:id/role — change a user's role
router.put('/users/:id/role', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { role } = req.body;

  if (targetId === req.userId) {
    return res.status(403).json({ error: 'Cannot change your own role' });
  }
  if (!['user', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be user or viewer' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, targetId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('admin/users/role error:', err.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// POST /api/admin/users/:id/reset-password — reset a user's password
router.post('/users/:id/reset-password', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (targetId === req.userId) {
    return res.status(403).json({ error: 'Use the change-password endpoint for your own account' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await db.query(
      'UPDATE users SET password = $1, must_change_password = TRUE WHERE id = $2 RETURNING id',
      [passwordHash, targetId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/users/reset-password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/admin/users/:id — delete a user account
router.delete('/users/:id', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.userId) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/users/delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/invite-code — check if an invite code is set
router.get('/invite-code', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT 1 FROM app_settings WHERE key = 'invite_code_hash'"
    );
    res.json({ isSet: result.rows.length > 0 });
  } catch (err) {
    console.error('admin/invite-code get error:', err.message);
    res.status(500).json({ error: 'Failed to check invite code' });
  }
});

// PUT /api/admin/invite-code — set or clear the invite code
router.put('/invite-code', async (req, res) => {
  const { inviteCode } = req.body;

  try {
    if (!inviteCode) {
      // Clear the invite code — registration becomes open
      await db.query("DELETE FROM app_settings WHERE key = 'invite_code_hash'");
      return res.json({ ok: true, isSet: false });
    }

    const hash = await bcrypt.hash(inviteCode, 10);
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ('invite_code_hash', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [hash]
    );
    res.json({ ok: true, isSet: true });
  } catch (err) {
    console.error('admin/invite-code put error:', err.message);
    res.status(500).json({ error: 'Failed to update invite code' });
  }
});

module.exports = router;
