// e2e/global-teardown.js
// Cleans up the test user after all E2E tests complete.
// Uses direct DB deletion via a dedicated cleanup endpoint,
// or simply leaves the user (safe in test environments).

const API = 'http://localhost:3001';

export default async function globalTeardown() {
  // Log in to get a token, then delete all test user data
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) return;

  try {
    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) return;

    const { token } = await loginRes.json();

    // Wipe all transactional data domains so next run starts clean
    const domains = ['wins', 'goals', 'actions', 'people', 'scorecard', 'eminence', 'learning', 'story', 'settings'];
    const empties = {
      scorecard: { targets: {}, opportunities: [], projects: [], utilization: {} },
      eminence: { activities: [] },
      learning: { certifications: [], courses: [] },
    };

    await Promise.all(domains.map(d =>
      fetch(`${API}/api/data/${d}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: empties[d] ?? (d === 'settings' ? { demoMode: false } : []) }),
      })
    ));

    console.log('[e2e] Test user data cleaned up');
  } catch {
    // Non-critical — test user data will be overwritten next run anyway
    console.log('[e2e] Cleanup skipped (non-critical)');
  }
}
