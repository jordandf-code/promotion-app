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

// GET /api/admin/users — paginated, searchable, filterable user list
router.get('/users', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const role   = req.query.role || '';

    // Allowed sort columns (whitelist to prevent injection)
    const SORT_COLS = { created_at: 'created_at', name: 'name', email: 'email' };
    const sortCol   = SORT_COLS[req.query.sort] || 'created_at';
    const order     = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const params  = [];
    const where   = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role && ['user', 'viewer', 'superuser'].includes(role)) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await db.query(
      `SELECT id, email, name, role, company, created_at
       FROM users
       ${whereClause}
       ORDER BY ${sortCol} ${order}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      users:      dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
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

// PUT /api/admin/users/bulk-role — change role for multiple users at once
router.put('/users/bulk-role', async (req, res) => {
  const { userIds, role } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds must be a non-empty array' });
  }
  if (!['user', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be user or viewer' });
  }
  if (userIds.includes(req.userId)) {
    return res.status(403).json({ error: 'Cannot change your own role' });
  }

  try {
    // Build parameterized query: UPDATE ... WHERE id = ANY($1)
    const ids = userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = ANY($2) AND id != $3',
      [role, ids, req.userId]
    );
    res.json({ ok: true, updated: result.rowCount });
  } catch (err) {
    console.error('admin/users/bulk-role error:', err.message);
    res.status(500).json({ error: 'Failed to update roles' });
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

// GET /api/admin/platform-settings — check GitHub issue reporting config
router.get('/platform-settings', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT key, value FROM app_settings WHERE key IN ('github_token', 'github_repo', 'email_from')"
    );
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json({
      githubConfigured: !!(settings.github_token && settings.github_repo),
      githubRepo: settings.github_repo || '',
      emailFrom: settings.email_from || '',
      resendConfigured: !!process.env.RESEND_API_KEY,
    });
  } catch (err) {
    console.error('admin/platform-settings get error:', err.message);
    res.status(500).json({ error: 'Failed to load platform settings' });
  }
});

// PUT /api/admin/platform-settings — save GitHub issue reporting config
router.put('/platform-settings', async (req, res) => {
  const { githubToken, githubRepo, emailFrom } = req.body;

  try {
    if (githubToken !== undefined) {
      if (githubToken) {
        await db.query(
          `INSERT INTO app_settings (key, value) VALUES ('github_token', $1)
           ON CONFLICT (key) DO UPDATE SET value = $1`,
          [githubToken]
        );
      } else {
        await db.query("DELETE FROM app_settings WHERE key = 'github_token'");
      }
    }
    if (githubRepo !== undefined) {
      if (githubRepo) {
        await db.query(
          `INSERT INTO app_settings (key, value) VALUES ('github_repo', $1)
           ON CONFLICT (key) DO UPDATE SET value = $1`,
          [githubRepo]
        );
      } else {
        await db.query("DELETE FROM app_settings WHERE key = 'github_repo'");
      }
    }

    if (emailFrom !== undefined) {
      if (emailFrom) {
        await db.query(
          `INSERT INTO app_settings (key, value) VALUES ('email_from', $1)
           ON CONFLICT (key) DO UPDATE SET value = $1`,
          [emailFrom]
        );
      } else {
        await db.query("DELETE FROM app_settings WHERE key = 'email_from'");
      }
    }

    // Return updated status
    const result = await db.query(
      "SELECT key, value FROM app_settings WHERE key IN ('github_token', 'github_repo', 'email_from')"
    );
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json({
      ok: true,
      githubConfigured: !!(settings.github_token && settings.github_repo),
      githubRepo: settings.github_repo || '',
      emailFrom: settings.email_from || '',
      resendConfigured: !!process.env.RESEND_API_KEY,
    });
  } catch (err) {
    console.error('admin/platform-settings put error:', err.message);
    res.status(500).json({ error: 'Failed to save platform settings' });
  }
});

module.exports = router;
