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
      .send({ password: 'longpassword', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'short', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  test('returns 201 with token and user on success', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: '', company: '' }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.name).toBe('Test');

    // Verify password was hashed
    const insertCall = db.query.mock.calls[0];
    const hashedPassword = insertCall[1][1];
    expect(await bcrypt.compare('longpassword', hashedPassword)).toBe(true);
  });

  test('normalizes email to lowercase and trims', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: '', company: '' }],
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: '  A@B.COM  ', password: 'longpassword', name: 'Test' });

    const insertCall = db.query.mock.calls[0];
    expect(insertCall[1][0]).toBe('a@b.com');
  });

  test('returns 409 on duplicate email', async () => {
    const dupError = new Error('duplicate key');
    dupError.code = '23505';
    db.query.mockRejectedValueOnce(dupError);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  test('returns 500 on unexpected database error', async () => {
    db.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'longpassword', name: 'Test' });

    expect(res.status).toBe(500);
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
      rows: [{ id: 1, email: 'a@b.com', password: hash, name: 'Test', role: '', company: '' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('returns token and user on valid credentials', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', password: hash, name: 'Test', role: 'dev', company: 'IBM' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({
      id: 1, email: 'a@b.com', name: 'Test', role: 'dev', company: 'IBM',
    });

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
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', name: 'Test', role: 'dev', company: 'IBM' }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
  });

  test('returns 404 when user not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(999)}`);

    expect(res.status).toBe(404);
  });
});
