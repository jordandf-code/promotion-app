import { test, expect } from '@playwright/test';

test.describe('Navigation (authenticated)', () => {

  const pages = [
    { path: '/scorecard', title: /scorecard/i },
    { path: '/goals', title: /goals/i },
    { path: '/people', title: /people|contacts/i },
    { path: '/wins', title: /wins/i },
    { path: '/story', title: /story|narrative/i },
    { path: '/actions', title: /action/i },
    { path: '/learning', title: /learning/i },
    { path: '/eminence', title: /eminence/i },
  ];

  for (const { path, title } of pages) {
    test(`can navigate to ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.page-title')).toContainText(title, { timeout: 10_000 });
    });
  }
});

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('mobile viewport shows hamburger menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.mobile-hamburger')).toBeVisible();
  });

  test('no horizontal scrolling on dashboard', async ({ page }) => {
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe('Public pages load without auth', () => {
  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });
});
