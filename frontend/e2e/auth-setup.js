// e2e/auth-setup.js
// Setup "test" that logs in once and saves auth state for reuse across all tests.
// This avoids repeated logins that trigger the rate limiter (20 req / 15 min).

import { test as setup } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

setup('authenticate test user', async ({ page }) => {
  setup.skip(!TEST_EMAIL || !TEST_PASSWORD, 'No test credentials available');

  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 15_000 });

  // Save storage state (includes localStorage with JWT token)
  await page.context().storageState({ path: './e2e/.auth-state.json' });
});
