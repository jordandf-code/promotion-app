// __tests__/auth.test.js
// Tests for auth routes: register, login, /me

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// Set env before importing app
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://unused';

// Mock the database
jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');

const app = require('../app');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'longpassword', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', securityQuestion: 'Q?', securityAnswer: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'short', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  test('returns 400 when security question is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/security question/i);
  });

  test('returns 201 with token and user on success (first user = superuser)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })  // invite code check
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })  // user count (first user)
      .mockResolvedValueOnce({  // INSERT
        rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: 'superuser', company: '' }],
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.role).toBe('superuser');
  });

  test('second user gets role user', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })  // invite code check
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] })  // user count
      .mockResolvedValueOnce({
        rows: [{ id: 2, email: 'b@b.com', name: 'Test2', role: 'user', company: '' }],
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'b@b.com', password: 'longpassword', name: 'Test2', securityQuestion: 'Q?', securityAnswer: 'A' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  test('returns 403 with wrong invite code', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    db.query.mockResolvedValueOnce({ rows: [{ value: hash }] });  // invite code exists

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A', inviteCode: 'wrong' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invite code/i);
  });

  test('normalizes email to lowercase and trims', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: 'superuser', company: '' }],
      });

    await request(app)
      .post('/api/auth/register')
      .send({ email: '  A@B.COM  ', password: 'longpassword', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });

    // INSERT is the third call
    const insertCall = db.query.mock.calls[2];
    expect(insertCall[1][0]).toBe('a@b.com');
  });

  test('returns 409 on duplicate email', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    const dupError = new Error('duplicate key');
    dupError.code = '23505';
    db.query.mockRejectedValueOnce(dupError);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test', securityQuestion: 'Q?', securityAnswer: 'A' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });
});

describe('POST /api/auth/login', () => {
  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'longpassword' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('returns 401 when user not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'longpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('returns 401 on wrong password', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', password: hash, name: 'Test', role: 'user', company: '', must_change_password: false }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('returns token and user on valid credentials', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', password: hash, name: 'Test', role: 'user', company: 'IBM', must_change_password: false }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({
      id: 1, email: 'a@b.com', name: 'Test', role: 'user', company: 'IBM',
    });
    expect(res.body.mustChangePassword).toBe(false);

    // Verify token is valid
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(1);
  });
});

describe('GET /api/auth/me', () => {
  function makeToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  }

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  test('returns user on valid token', async () => {
    // First call: auth middleware role lookup
    db.query.mockResolvedValueOnce({
      rows: [{ role: 'user', must_change_password: false }],
    });
    // Second call: /me endpoint query
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: 'user', company: 'IBM', security_question: 'Q?', must_change_password: false }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
    expect(res.body.securityQuestion).toBe('Q?');
  });

  test('returns 401 when user not found (middleware)', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // auth middleware: user deleted

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(999)}`);

    expect(res.status).toBe(401);
  });
});
