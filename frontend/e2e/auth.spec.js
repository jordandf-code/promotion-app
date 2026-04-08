import { test, expect } from '@playwright/test';

// Test credentials — provided by global-setup.js (auto-creates test user)
// Override with: TEST_EMAIL=you@email.com TEST_PASSWORD=pass npx playwright test
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Login page', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'fake@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10_000 });
  });

  test('has link to registration page', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /create one/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('has link to forgot password page', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe('Protected routes redirect to login', () => {
  const protectedRoutes = ['/', '/scorecard', '/goals', '/people', '/wins', '/story'];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});

test.describe('Authenticated flow', () => {

  test('can log in and reach the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should land on dashboard
    await expect(page).toHaveURL('/', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText(/dashboard/i);
  });

  test('persists auth across page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15_000 });

    // Reload and verify we stay on dashboard
    await page.reload();
    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(page.locator('.page-title')).toContainText(/dashboard/i);
  });

  test('can log out', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15_000 });

    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /log\s?out|sign\s?out/i });
    // Logout might be in a menu — try opening nav first on mobile
    const hamburger = page.locator('.mobile-hamburger');
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }
    await logoutButton.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
