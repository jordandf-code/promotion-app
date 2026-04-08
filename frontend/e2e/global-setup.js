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

export default async function globalSetup() {
  // 1. Try to log in (user may already exist from a previous run)
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });

  if (loginRes.ok) {
    console.log('[e2e] Test user exists, login verified');
    process.env.TEST_EMAIL = TEST_USER.email;
    process.env.TEST_PASSWORD = TEST_USER.password;
    return;
  }

  // 2. User doesn't exist — register them
  // If an invite code is required, set TEST_INVITE_CODE env var
  const regPayload = { ...TEST_USER };
  if (process.env.TEST_INVITE_CODE) {
    regPayload.inviteCode = process.env.TEST_INVITE_CODE;
  }

  const regRes = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });

  if (regRes.ok) {
    console.log('[e2e] Test user created');
    process.env.TEST_EMAIL = TEST_USER.email;
    process.env.TEST_PASSWORD = TEST_USER.password;
    return;
  }

  const body = await regRes.json();

  if (regRes.status === 403 && body.error?.includes('invite code')) {
    throw new Error(
      '[e2e] Registration requires an invite code.\n' +
      'Fix: set TEST_INVITE_CODE=<code> env var, or clear the invite code in Super Admin.'
    );
  }

  throw new Error(`[e2e] Failed to create test user: ${regRes.status} — ${body.error}`);
}
