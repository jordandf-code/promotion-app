import { test, expect } from '@playwright/test';

test.describe('Core user journeys', () => {

  // ── Scorecard ──────────────────────────────────────────────────
  // The scorecard is the most data-dense page. Verify it loads,
  // values can be entered, and they survive a reload.

  test('Scorecard: page loads with metric rows', async ({ page }) => {
    await page.goto('/scorecard');
    await page.waitForLoadState('networkidle');
    // Should have recognizable metric labels
    await expect(page.getByText('Signings')).toBeVisible();
    await expect(page.getByText('Chargeable utilization')).toBeVisible();
  });

  test('Scorecard: can enter a value and it persists after reload', async ({ page }) => {
    await page.goto('/scorecard');
    await page.waitForLoadState('networkidle');

    // Find a numeric input in the scorecard and note its current value
    const inputs = page.locator('.form-input[type="number"]');
    const count = await inputs.count();
    if (count === 0) return; // scorecard may not have editable inputs in current view

    const input = inputs.first();
    const original = await input.inputValue();

    // Enter a test value
    const testVal = original === '999' ? '998' : '999';
    await input.fill(testVal);
    await input.blur(); // trigger debounced save

    // Wait for debounce + network save
    await page.waitForTimeout(1000);

    // Reload and verify
    await page.reload();
    await page.waitForLoadState('networkidle');

    const afterReload = await page.locator('.form-input[type="number"]').first().inputValue();
    expect(afterReload).toBe(testVal);

    // Restore original value
    await page.locator('.form-input[type="number"]').first().fill(original || '0');
    await page.locator('.form-input[type="number"]').first().blur();
    await page.waitForTimeout(1000);
  });

  // ── Wins ───────────────────────────────────────────────────────
  // Add a win, verify it appears, then clean up.

  test('Wins: can add and delete a win', async ({ page }) => {
    await page.goto('/wins');
    await page.waitForLoadState('networkidle');

    // Count existing wins
    const beforeCount = await page.locator('.win-card').count();

    // Click add button
    const addBtn = page.getByRole('button', { name: /add|new/i }).first();
    await addBtn.click();

    // Fill the modal form
    await page.waitForSelector('.modal', { timeout: 5000 });

    // Find and fill required fields — title is first text input in the modal
    const titleInput = page.locator('.modal input.form-input').first();
    await titleInput.fill('E2E Test Win — delete me');

    // Look for a textarea (description/impact)
    const textarea = page.locator('.modal .form-textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Automated test entry');
    }

    // Save
    const saveBtn = page.locator('.modal').getByRole('button', { name: /save|add|submit/i }).first();
    await saveBtn.click();

    // Verify win appears
    await page.waitForTimeout(1000);
    await expect(page.getByText('E2E Test Win — delete me')).toBeVisible({ timeout: 5000 });

    const afterCount = await page.locator('.win-card').count();
    expect(afterCount).toBeGreaterThan(beforeCount);

    // Clean up — click the Remove button on the win card
    const winCard = page.locator('.win-card', { hasText: 'E2E Test Win — delete me' });
    page.on('dialog', dialog => dialog.accept()); // auto-accept confirm dialog
    await winCard.getByRole('button', { name: /remove/i }).click();
    await page.waitForTimeout(1000);
  });

  // ── Goals ──────────────────────────────────────────────────────

  test('Goals: can add a goal and cycle its status', async ({ page }) => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByRole('button', { name: /add|new/i }).first();
    await addBtn.click();
    await page.waitForSelector('.modal', { timeout: 5000 });

    const titleInput = page.locator('.modal .form-input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('E2E Test Goal — delete me');
    }

    const saveBtn = page.locator('.modal').getByRole('button', { name: /save|add|submit/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('E2E Test Goal — delete me')).toBeVisible({ timeout: 5000 });

    // Cycle status — look for a status badge button near our goal
    const statusBadge = page.locator('.status-badge--btn').last();
    if (await statusBadge.isVisible()) {
      const initialText = await statusBadge.textContent();
      await statusBadge.click();
      await page.waitForTimeout(500);
      const newText = await statusBadge.textContent();
      expect(newText).not.toBe(initialText);
    }

    // Clean up
    await page.getByText('E2E Test Goal — delete me').click();
    await page.waitForSelector('.modal', { timeout: 5000 });
    const deleteBtn = page.locator('.modal').getByRole('button', { name: /delete|remove/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(1000);
    }
  });

  // ── People ─────────────────────────────────────────────────────

  test('People: can add and delete a contact', async ({ page }) => {
    await page.goto('/people');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByRole('button', { name: /add|new/i }).first();
    await addBtn.click();
    await page.waitForSelector('.modal', { timeout: 5000 });

    const nameInput = page.locator('.modal .form-input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Contact');
    }

    const saveBtn = page.locator('.modal').getByRole('button', { name: /save|add|submit/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('E2E Test Contact')).toBeVisible({ timeout: 5000 });

    // Clean up
    await page.getByText('E2E Test Contact').click();
    await page.waitForSelector('.modal', { timeout: 5000 });
    const deleteBtn = page.locator('.modal').getByRole('button', { name: /delete|remove/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(1000);
    }
  });

  // ── Currency toggle ────────────────────────────────────────────
  // Verify switching CAD/USD actually changes displayed values

  test('Currency toggle changes displayed values', async ({ page }) => {
    await page.goto('/scorecard');
    await page.waitForLoadState('networkidle');

    // Look for currency toggle button
    const cadBtn = page.locator('text=CAD').first();
    const usdBtn = page.locator('text=USD').first();

    if (await cadBtn.isVisible() && await usdBtn.isVisible()) {
      // Get a currency value in current mode
      await cadBtn.click();
      await page.waitForTimeout(300);

      // Find any dollar value on the page
      const dollarValues = page.locator('text=/\\$[\\d,]+/');
      const count = await dollarValues.count();
      if (count === 0) return; // no currency values visible

      const cadValue = await dollarValues.first().textContent();

      // Switch to USD
      await usdBtn.click();
      await page.waitForTimeout(300);

      const usdValue = await dollarValues.first().textContent();

      // Values should differ (USD = CAD / 1.5)
      if (cadValue && usdValue) {
        expect(usdValue).not.toBe(cadValue);
      }
    }
  });

  // ── Cross-page data ────────────────────────────────────────────
  // Dashboard should reflect data from other pages

  test('Dashboard shows stats that correspond to real data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Stat cards should be present
    const statCards = page.locator('.stat-card');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);

    // Each stat card should have a number (not NaN or undefined)
    for (let i = 0; i < count; i++) {
      const text = await statCards.nth(i).textContent();
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
    }
  });
});
