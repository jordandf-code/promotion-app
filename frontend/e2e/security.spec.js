// e2e/security.spec.js
// Security-focused tests: IDOR, auth bypass, injection, rate limiting, token abuse.
// Uses API-level requests (request.newContext) rather than browser interactions.

import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

// Helpers to get tokens from env (set by global-setup)
function tokenA() { return process.env.TEST_TOKEN_A; }
function tokenB() { return process.env.TEST_TOKEN_B; }

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── IDOR Tests ───────────────────────────────────────────────────────────────

test.describe('IDOR protection', () => {
  test('cannot read another user data via peers endpoint without relationship', async ({ request }) => {
    // Get user B's ID first
    const meRes = await request.get(`${API}/api/auth/me`, {
      headers: authHeader(tokenB()),
    });
    expect(meRes.ok()).toBeTruthy();
    const { user } = await meRes.json();
    const userBId = user.id;

    // User A tries to read user B's data without any relationship
    const res = await request.get(`${API}/api/peers/${userBId}/data`, {
      headers: authHeader(tokenA()),
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access not granted');
  });

  test('data endpoint always scopes to authenticated user', async ({ request }) => {
    // User A writes data
    await request.put(`${API}/api/data/wins`, {
      headers: authHeader(tokenA()),
      data: { data: [{ id: 'sec-test-1', title: 'User A win' }] },
    });

    // User B reads the same domain — should get their own data, not A's
    const res = await request.get(`${API}/api/data/wins`, {
      headers: authHeader(tokenB()),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const wins = body.data ?? [];
    const hasUserAWin = Array.isArray(wins) && wins.some(w => w.id === 'sec-test-1');
    expect(hasUserAWin).toBe(false);
  });
});

// ── Auth Bypass Tests ────────────────────────────────────────────────────────

test.describe('Auth bypass protection', () => {
  test('rejects requests with no auth header', async ({ request }) => {
    const res = await request.get(`${API}/api/data/wins`);
    expect(res.status()).toBe(401);
  });

  test('rejects requests with garbage token', async ({ request }) => {
    const res = await request.get(`${API}/api/data/wins`, {
      headers: authHeader('not-a-valid-jwt-token'),
    });
    expect(res.status()).toBe(401);
  });

  test('rejects expired/malformed JWT', async ({ request }) => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OTk5LCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid';
    const res = await request.get(`${API}/api/data/wins`, {
      headers: authHeader(fakeJwt),
    });
    expect(res.status()).toBe(401);
  });

  test('non-superuser cannot access admin routes', async ({ request }) => {
    const res = await request.get(`${API}/api/admin/users`, {
      headers: authHeader(tokenA()),
    });
    expect(res.status()).toBe(403);
  });

  test('non-superuser cannot write platform config', async ({ request }) => {
    const res = await request.put(`${API}/api/platform/firm-config`, {
      headers: authHeader(tokenA()),
      data: { firmConfig: { companyName: 'Hacked Corp' } },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Injection Tests ──────────────────────────────────────────────────────────

test.describe('Injection protection', () => {
  test('rejects SQL injection in domain parameter', async ({ request }) => {
    const res = await request.get(`${API}/api/data/'; DROP TABLE users; --`, {
      headers: authHeader(tokenA()),
    });
    // Should be 400 (not in ALLOWED_DOMAINS), not 500 (query error)
    expect(res.status()).toBe(400);
  });

  test('handles XSS payload in feedback without execution', async ({ request }) => {
    // Get user A's share tokens
    const tokensRes = await request.get(`${API}/api/share/tokens`, {
      headers: authHeader(tokenA()),
    });
    expect(tokensRes.ok()).toBeTruthy();
    const { feedbackToken } = await tokensRes.json();
    if (!feedbackToken) return;

    // Submit feedback with XSS payload as reviewer name
    const res = await request.post(`${API}/api/share/feedback/${feedbackToken}`, {
      data: {
        reviewer: '<script>alert("xss")</script>',
        rating: 3,
        comments: 'Test feedback',
      },
    });
    // Should accept (stored safely) or reject — either way no 500
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects prototype pollution attempt', async ({ request }) => {
    const res = await request.put(`${API}/api/data/wins`, {
      headers: authHeader(tokenA()),
      data: {
        data: [],
        '__proto__': { admin: true },
        'constructor': { prototype: { admin: true } },
      },
    });
    // Should succeed (data is just stored as JSONB) but not pollute prototype
    expect(res.status()).toBeLessThan(500);
  });
});

// ── Rate Limiting Tests ──────────────────────────────────────────────────────

test.describe('Rate limiting', () => {
  test('rate limits login after too many attempts', async ({ request }) => {
    let hitRateLimit = false;
    // Fire 25 rapid login attempts with bad credentials
    for (let i = 0; i < 25; i++) {
      const res = await request.post(`${API}/api/auth/login`, {
        data: { email: `ratelimit-${i}@test.test`, password: 'wrong' },
      });
      if (res.status() === 429) {
        hitRateLimit = true;
        break;
      }
    }
    expect(hitRateLimit).toBe(true);
  });
});

// ── Token Security Tests ─────────────────────────────────────────────────────

test.describe('Token security', () => {
  test('rejects feedback to invalid token', async ({ request }) => {
    const fakeToken = 'a'.repeat(40);
    const res = await request.post(`${API}/api/share/feedback/${fakeToken}`, {
      data: { reviewer: 'Attacker', rating: 5, comments: 'fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('health endpoint returns security indicators', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.security).toBeDefined();
    expect(body.security.helmet).toBe(true);
    expect(body.security.rateLimiting).toBe(true);
    expect(body.security.corsConfigured).toBe(true);
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    const headers = res.headers();
    // Helmet sets these headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
  });
});
