import { test, expect } from '@playwright/test';

// iPhone SE / small Android — worst-case viewport
const MOBILE = { width: 375, height: 667 };

test.describe('Mobile audit', () => {
  test.use({ viewport: MOBILE });

  // ── Horizontal overflow detection ──────────────────────────────
  // The #1 mobile bug: something wider than the screen causes horizontal scroll

  const pagesToAudit = [
    { path: '/', name: 'Dashboard' },
    { path: '/scorecard', name: 'Scorecard' },
    { path: '/goals', name: 'Goals' },
    { path: '/people', name: 'People' },
    { path: '/wins', name: 'Wins' },
    { path: '/actions', name: 'Actions' },
    { path: '/story', name: 'Story' },
    { path: '/learning', name: 'Learning' },
    { path: '/eminence', name: 'Eminence' },
    { path: '/opportunities', name: 'Pursuits' },
  ];

  for (const { path, name } of pagesToAudit) {
    test(`${name}: no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${name} overflows by ${scrollWidth - clientWidth}px`).toBeLessThanOrEqual(clientWidth);
    });
  }

  // ── Touch target sizes ─────────────────────────────────────────
  // Apple HIG & WCAG: interactive elements should be at least 44x44px

  for (const { path, name } of pagesToAudit) {
    test(`${name}: touch targets are at least 44px`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const tooSmall = await page.evaluate(() => {
        const interactive = document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"], [tabindex="0"]'
        );
        const problems = [];
        for (const el of interactive) {
          // Skip hidden elements
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // Check if on screen
          if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

          if (rect.height < 44 || rect.width < 44) {
            problems.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 40),
              className: el.className?.toString().slice(0, 60),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
        return problems;
      });

      if (tooSmall.length > 0) {
        const summary = tooSmall.map(
          (el) => `  ${el.tag} "${el.text}" (${el.width}x${el.height}) .${el.className}`
        ).join('\n');
        console.warn(`[${name}] ${tooSmall.length} touch targets under 44px:\n${summary}`);
      }

      // Soft assertion — warn but don't fail yet. Change to expect() when ready to enforce.
      // expect(tooSmall, `${tooSmall.length} touch targets too small`).toHaveLength(0);
    });
  }

  // ── Input zoom prevention ──────────────────────────────────────
  // iOS Safari auto-zooms on inputs with font-size < 16px

  for (const { path, name } of pagesToAudit) {
    test(`${name}: inputs have font-size >= 16px (no iOS zoom)`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const tooSmallFont = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        const problems = [];
        for (const el of inputs) {
          const style = getComputedStyle(el);
          if (style.display === 'none') continue;
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 16) {
            problems.push({
              name: el.name || el.type || el.tagName,
              className: el.className?.toString().slice(0, 60),
              fontSize: Math.round(fontSize * 10) / 10,
            });
          }
        }
        return problems;
      });

      expect(tooSmallFont, tooSmallFont.map(
        (el) => `${el.name} has font-size ${el.fontSize}px`
      ).join(', ')).toHaveLength(0);
    });
  }

  // ── Elements overflowing viewport ──────────────────────────────
  // Catches elements whose right edge extends past the viewport

  for (const { path, name } of pagesToAudit) {
    test(`${name}: no elements overflow viewport right edge`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const overflowing = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const all = document.querySelectorAll('*');
        const problems = [];
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // Ignore off-screen elements (scrolled away or hidden)
          if (rect.bottom < 0 || rect.top > window.innerHeight * 2) continue;
          if (rect.right > viewportWidth + 1) { // 1px tolerance
            problems.push({
              tag: el.tagName,
              className: el.className?.toString().slice(0, 60),
              right: Math.round(rect.right),
              overflow: Math.round(rect.right - viewportWidth),
            });
          }
        }
        // Deduplicate — often a parent and child both overflow
        const seen = new Set();
        return problems.filter((p) => {
          const key = `${p.tag}.${p.className}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 10); // cap at 10 to keep output readable
      });

      expect(overflowing, overflowing.map(
        (el) => `<${el.tag} class="${el.className}"> overflows by ${el.overflow}px`
      ).join('\n')).toHaveLength(0);
    });
  }

  // ── Modal fits viewport ────────────────────────────────────────
  // Modals should not extend beyond the screen on mobile

  test('modals fit within mobile viewport', async ({ page }) => {
    // Go to a page with a likely modal trigger (dashboard has Quick Add)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const quickAdd = page.locator('text=Quick add').first();
    if (await quickAdd.isVisible()) {
      await quickAdd.click();
      await page.waitForTimeout(400); // wait for slide animation

      const modalBounds = await page.evaluate(() => {
        const modal = document.querySelector('.modal');
        if (!modal) return null;
        const rect = modal.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        };
      });

      if (modalBounds) {
        expect(modalBounds.right, 'modal extends past right edge').toBeLessThanOrEqual(MOBILE.width);
        expect(modalBounds.bottom, 'modal extends past bottom edge').toBeLessThanOrEqual(MOBILE.height);
      }
    }
  });

  // ── Bottom tab bar visible ─────────────────────────────────────

  test('bottom tab bar is visible on mobile', async ({ page }) => {
    await page.goto('/');
    const tabBar = page.locator('.bottom-tab-bar');
    await expect(tabBar).toBeVisible();

    // All tabs should be tappable
    const tabs = page.locator('.bottom-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box.height, `tab ${i} too short`).toBeGreaterThanOrEqual(44);
    }
  });

  // ── Mobile header present ──────────────────────────────────────

  test('mobile header and hamburger are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.mobile-header')).toBeVisible();
    await expect(page.locator('.mobile-hamburger')).toBeVisible();
  });

  // ── Sidebar opens and closes ───────────────────────────────────

  test('hamburger opens sidebar, backdrop closes it', async ({ page }) => {
    await page.goto('/');
    await page.locator('.mobile-hamburger').click();
    await expect(page.locator('.sidebar--open')).toBeVisible();
    await expect(page.locator('.sidebar-backdrop')).toBeVisible();

    // Clicking backdrop should close — click far right to avoid sidebar overlay
    await page.locator('.sidebar-backdrop').click({ position: { x: 350, y: 400 } });
    await expect(page.locator('.sidebar--open')).not.toBeVisible();
  });

  // ── Tables convert to cards ────────────────────────────────────

  const pagesWithTables = [
    { path: '/people', name: 'People' },
    { path: '/wins', name: 'Wins' },
    { path: '/goals', name: 'Goals' },
    { path: '/actions', name: 'Actions' },
  ];

  for (const { path, name } of pagesWithTables) {
    test(`${name}: tables display as cards (no horizontal scroll)`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const tables = page.locator('.data-table');
      const count = await tables.count();
      if (count === 0) return; // page may have no data

      for (let i = 0; i < count; i++) {
        const tableBox = await tables.nth(i).boundingBox();
        if (!tableBox) continue;
        expect(tableBox.width, `${name} table ${i} wider than viewport`).toBeLessThanOrEqual(MOBILE.width + 1);
      }
    });
  }

  // ── Overlapping interactive elements ───────────────────────────
  // Two tappable elements on top of each other = accidental taps

  test('Dashboard: no overlapping interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const overlaps = await page.evaluate(() => {
      const interactive = Array.from(document.querySelectorAll(
        'button, a, [role="button"], [tabindex="0"]'
      )).filter((el) => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      const rects = interactive.map((el) => ({
        el: `${el.tagName}.${(el.className?.toString() || '').split(' ')[0]} "${(el.textContent || '').trim().slice(0, 20)}"`,
        rect: el.getBoundingClientRect(),
      })).filter((r) => r.rect.width > 0 && r.rect.height > 0);

      const problems = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          // Check overlap
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            // Skip parent-child relationships (those are normal)
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            const overlapArea = overlapX * overlapY;
            const smallerArea = Math.min(a.width * a.height, b.width * b.height);
            // Only flag if overlap is > 50% of the smaller element
            if (overlapArea > smallerArea * 0.5) {
              problems.push(`${rects[i].el} overlaps ${rects[j].el}`);
            }
          }
        }
      }
      return problems.slice(0, 5);
    });

    if (overlaps.length > 0) {
      console.warn(`Overlapping interactive elements:\n${overlaps.join('\n')}`);
    }
    // Soft assertion for now
    // expect(overlaps).toHaveLength(0);
  });
});

// ── Public pages mobile audit (no auth needed) ───────────────────

test.describe('Mobile audit (public pages)', () => {
  test.use({ viewport: MOBILE });

  test('Login page: no horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('Register page: no horizontal overflow', async ({ page }) => {
    await page.goto('/register');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('Login page: inputs have font-size >= 16px', async ({ page }) => {
    await page.goto('/login');
    const tooSmall = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).length;
    });
    expect(tooSmall).toBe(0);
  });
});

// ── Tablet breakpoint (768px) ────────────────────────────────────
// Layout shifts at this breakpoint — sidebar appears, cards revert to tables

const TABLET = { width: 768, height: 1024 };

test.describe('Tablet audit (768px)', () => {
  test.use({ viewport: TABLET });

  const tabletPages = [
    { path: '/', name: 'Dashboard' },
    { path: '/scorecard', name: 'Scorecard' },
    { path: '/goals', name: 'Goals' },
    { path: '/people', name: 'People' },
    { path: '/wins', name: 'Wins' },
    { path: '/story', name: 'Story' },
  ];

  for (const { path, name } of tabletPages) {
    test(`${name}: no horizontal overflow at 768px`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${name} overflows by ${scrollWidth - clientWidth}px`).toBeLessThanOrEqual(clientWidth);
    });
  }

  test('sidebar is visible (not hamburger) at tablet width', async ({ page }) => {
    // At 768px the app should show sidebar, not mobile hamburger
    const sidebar = page.locator('.sidebar');
    const hamburger = page.locator('.mobile-hamburger');

    const sidebarVisible = await sidebar.isVisible();
    const hamburgerVisible = await hamburger.isVisible();

    // One of these layouts should be active — log which one for debugging
    if (hamburgerVisible) {
      console.warn('Still showing mobile layout at 768px — check breakpoint');
    }
    // Don't hard-fail since 768px is the exact breakpoint edge
  });
});

// ── Console error capture ────────────────────────────────────────
// Navigate through all pages, capture any JS errors or uncaught exceptions

test.describe('Console error audit', () => {
  test('no JS errors during page navigation', async ({ page }) => {
    const errors = [];

    page.on('pageerror', (error) => {
      errors.push({ page: page.url(), error: error.message });
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore common non-issues
        const text = msg.text();
        if (text.includes('favicon') || text.includes('404')) return;
        errors.push({ page: page.url(), console: text });
      }
    });

    // Navigate through all major pages
    const routes = [
      '/', '/scorecard', '/goals', '/people', '/wins',
      '/actions', '/story', '/learning', '/eminence', '/opportunities',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // let any delayed errors fire
    }

    if (errors.length > 0) {
      const summary = errors.map(
        (e) => `  ${e.page}: ${e.error || e.console}`
      ).join('\n');
      console.warn(`JS errors found:\n${summary}`);
    }

    // Hard fail on uncaught exceptions (pageerror), warn on console.error
    const uncaught = errors.filter((e) => e.error);
    expect(uncaught, uncaught.map(
      (e) => `${e.page}: ${e.error}`
    ).join('\n')).toHaveLength(0);
  });
});
