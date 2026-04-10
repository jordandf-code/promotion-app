// e2e/global-setup.js
// Ensures a test user exists before all E2E tests run.
// Strategy: try to log in first (user exists from prior run), register if needed.
// Credentials are shared to test files via process.env.

const API = 'http://localhost:3001';

export const TEST_USER = {
  email: 'e2e-test@promotiontracker.test',
  password: 'TestPass123!',
  name: 'E2E Test User',
  company: 'Test Corp',
  securityQuestion: 'What is the test?',
  securityAnswer: 'playwright',
};

export const TEST_USER_B = {
  email: 'e2e-test-b@promotiontracker.test',
  password: 'TestPassB456!',
  name: 'E2E Test User B',
  company: 'Test Corp B',
  securityQuestion: 'What is the second test?',
  securityAnswer: 'security',
};

async function ensureUser(user, label) {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });

  if (loginRes.ok) {
    const { token } = await loginRes.json();
    console.log(`[e2e] ${label} exists, login verified`);
    return token;
  }

  const regPayload = { ...user };
  if (process.env.TEST_INVITE_CODE) {
    regPayload.inviteCode = process.env.TEST_INVITE_CODE;
  }

  const regRes = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });

  if (regRes.ok) {
    const { token } = await regRes.json();
    console.log(`[e2e] ${label} created`);
    return token;
  }

  const body = await regRes.json();

  if (regRes.status === 403 && body.error?.includes('invite code')) {
    throw new Error(
      `[e2e] Registration requires an invite code.\n` +
      'Fix: set TEST_INVITE_CODE=<code> env var, or clear the invite code in Super Admin.'
    );
  }

  throw new Error(`[e2e] Failed to create ${label}: ${regRes.status} — ${body.error}`);
}

export default async function globalSetup() {
  const tokenA = await ensureUser(TEST_USER, 'Test user A');
  process.env.TEST_EMAIL = TEST_USER.email;
  process.env.TEST_PASSWORD = TEST_USER.password;
  process.env.TEST_TOKEN_A = tokenA;

  const tokenB = await ensureUser(TEST_USER_B, 'Test user B');
  process.env.TEST_EMAIL_B = TEST_USER_B.email;
  process.env.TEST_PASSWORD_B = TEST_USER_B.password;
  process.env.TEST_TOKEN_B = tokenB;
}
