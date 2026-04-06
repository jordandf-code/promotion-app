// routes/auth.js
// Handles registration (with invite code + security question), login,
// forgot-password, change-password, profile update, and current-user fetch.

const express        = require('express');
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const rateLimit      = require('express-rate-limit');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  message: { error: 'Too many attempts — please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

function safeUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, company: user.company };
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, name, company, inviteCode, securityQuestion, securityAnswer } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: 'Security question and answer are required' });
  }

  try {
    // Check if invite code is required
    const settingResult = await db.query(
      "SELECT value FROM app_settings WHERE key = 'invite_code_hash'"
    );
    const inviteHash = settingResult.rows[0]?.value;
    if (inviteHash) {
      if (!inviteCode || !(await bcrypt.compare(inviteCode, inviteHash))) {
        return res.status(403).json({ error: 'Invalid invite code' });
      }
    }

    // First registered user becomes superuser
    const countResult = await db.query('SELECT COUNT(*)::int AS cnt FROM users');
    const assignedRole = countResult.rows[0].cnt === 0 ? 'superuser' : 'user';

    const passwordHash = await bcrypt.hash(password, 10);
    const answerHash   = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

    const result = await db.query(
      `INSERT INTO users (email, password, name, role, company, security_question, security_answer_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, company`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        assignedRole,
        (company || '').trim(),
        securityQuestion.trim(),
        answerHash,
      ]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user.id), user: safeUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({
      token: signToken(user.id),
      user: safeUser(user),
      mustChangePassword: user.must_change_password,
    });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — returns the current user (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, company, security_question, must_change_password FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];
    res.json({
      ...safeUser(row),
      securityQuestion: row.security_question,
      mustChangePassword: row.must_change_password,
    });
  } catch (err) {
    console.error('me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/forgot-password/question
// Returns the user's security question (or a fake one to prevent email enumeration).
router.post('/forgot-password/question', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const result = await db.query(
      'SELECT security_question FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const question = result.rows[0]?.security_question || 'What is your security answer?';
    res.json({ question });
  } catch (err) {
    console.error('forgot-password/question error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/auth/forgot-password/verify
// Verifies the security answer and resets the password.
router.post('/forgot-password/verify', authLimiter, async (req, res) => {
  const { email, answer, newPassword } = req.body;
  if (!email || !answer || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const result = await db.query(
      'SELECT id, security_answer_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user || !user.security_answer_hash) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const valid = await bcrypt.compare(answer.trim().toLowerCase(), user.security_answer_hash);
    if (!valid) return res.status(400).json({ error: 'Incorrect answer' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2',
      [passwordHash, user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('forgot-password/verify error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/auth/change-password (protected)
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2',
      [passwordHash, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('change-password error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/update-security-question (protected, re-auth required)
router.post('/update-security-question', authMiddleware, async (req, res) => {
  const { currentPassword, securityQuestion, securityAnswer } = req.body;
  if (!currentPassword || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const answerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);
    await db.query(
      'UPDATE users SET security_question = $1, security_answer_hash = $2 WHERE id = $3',
      [securityQuestion.trim(), answerHash, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('update-security-question error:', err.message);
    res.status(500).json({ error: 'Failed to update security question' });
  }
});

// PUT /api/auth/profile (protected)
router.put('/profile', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role, company',
      [name.trim(), req.userId]
    );
    res.json({ user: safeUser(result.rows[0]) });
  } catch (err) {
    console.error('profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
