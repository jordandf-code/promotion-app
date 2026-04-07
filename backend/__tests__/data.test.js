// __tests__/data.test.js
// Tests for the generic data store routes: GET/PUT /api/data/:domain

const request = require('supertest');
const jwt     = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://unused';

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');

const app = require('../app');

function makeToken(userId = 1) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/** Mock the auth middleware's role query, then the actual data query. */
function mockRoleAndData(dataResult, role = 'user') {
  db.query
    .mockResolvedValueOnce({ rows: [{ role, must_change_password: false }] }) // auth middleware
    .mockResolvedValueOnce(dataResult);
}

function mockRole(role = 'user') {
  db.query.mockResolvedValueOnce({ rows: [{ role, must_change_password: false }] });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/data/:domain', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/data/wins');
    expect(res.status).toBe(401);
  });

  test('returns 400 for unknown domain', async () => {
    mockRole();
    const res = await request(app)
      .get('/api/data/unknown')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown domain/i);
  });

  test('returns null when no data exists', async () => {
    mockRoleAndData({ rows: [] });

    const res = await request(app)
      .get('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('returns stored data for valid domain', async () => {
    const stored = [{ id: '1', title: 'Win 1' }];
    mockRoleAndData({ rows: [{ data: stored }] });

    const res = await request(app)
      .get('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(stored);
  });

  test('scopes query to authenticated user', async () => {
    mockRoleAndData({ rows: [] });

    await request(app)
      .get('/api/data/goals')
      .set('Authorization', `Bearer ${makeToken(42)}`);

    // Second call is the data query (first is role lookup)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('user_id = $1'),
      [42, 'goals']
    );
  });

  test('accepts all allowed domains', async () => {
    const domains = ['scorecard', 'wins', 'actions', 'goals', 'people', 'admin', 'story', 'settings', 'sharing', 'backup', 'learning'];
    for (const domain of domains) {
      mockRoleAndData({ rows: [] });
      const res = await request(app)
        .get(`/api/data/${domain}`)
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
    }
  });

  test('returns 500 on database error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ role: 'user', must_change_password: false }] })
      .mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app)
      .get('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
  });
});

describe('PUT /api/data/:domain', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/data/wins')
      .send({ data: [] });
    expect(res.status).toBe(401);
  });

  test('returns 400 for unknown domain', async () => {
    mockRole();
    const res = await request(app)
      .put('/api/data/badname')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ data: [] });
    expect(res.status).toBe(400);
  });

  test('returns 400 when data field is missing', async () => {
    mockRole();
    const res = await request(app)
      .put('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/data field required/i);
  });

  test('upserts data and returns ok', async () => {
    mockRoleAndData({ rows: [] });

    const payload = [{ id: '1', title: 'Win 1' }];
    const res = await request(app)
      .put('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken(5)}`)
      .send({ data: payload });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify upsert query (second call, after role lookup)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      [5, 'wins', JSON.stringify(payload)]
    );
  });

  test('returns 403 for viewer role', async () => {
    mockRole('viewer');

    const res = await request(app)
      .put('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ data: [] });

    expect(res.status).toBe(403);
  });

  test('returns 500 on database error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ role: 'user', must_change_password: false }] })
      .mockRejectedValueOnce(new Error('disk full'));

    const res = await request(app)
      .put('/api/data/wins')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ data: [] });

    expect(res.status).toBe(500);
  });
});
