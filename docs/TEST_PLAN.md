# Test Plan

Comprehensive testing strategy for the Promotion Tracker app covering backend, frontend unit, and browser-based E2E tests.

## When to test (and when not to)

**Run the full E2E suite when:**
- Changing CSS/layout (especially responsive or mobile styles)
- Modifying form components, modals, or data hooks
- Changing routing, auth, or navigation
- Before merging to main

**Don't bother with E2E for:**
- Backend-only logic changes (unit tests cover that)
- Copy/text changes (visual review is faster)
- Adding a new page that follows an existing pattern (just add it to the page list in `mobile-audit.spec.js`)

**Use the webapp-testing skill when:**
- Investigating a specific visual bug (screenshot + DOM inspection)
- Debugging console errors on a particular flow
- You need a quick one-off check, not a permanent test

**Use unit tests (not E2E) for:**
- Pure calculation logic (stats, formatting, helpers)
- API client behavior (debounce, retry, dedup)
- Anything that doesn't need a real browser

**Don't add a test for:**
- Framework behavior (React renders, router redirects work — they do)
- Simple CRUD that mirrors another tested CRUD (one wins test covers the add/delete pattern for all similar pages)
- One-off bugs that won't regress (fix it, move on)

---

## Test infrastructure

### Playwright JS (persistent test suite)
- **Location**: `frontend/e2e/`
- **Config**: `frontend/playwright.config.js` (auto-starts both servers, auto-creates test user)
- **Run**: `cd frontend && TEST_INVITE_CODE=password npm run test:e2e`
- **Headed mode**: `TEST_INVITE_CODE=password npm run test:e2e:headed`
- **Interactive UI**: `TEST_INVITE_CODE=password npm run test:e2e:ui`
- **Override credentials**: `TEST_EMAIL=x TEST_PASSWORD=y npm run test:e2e` (skips auto-creation)

#### Test user auto-creation
Global setup (`e2e/global-setup.js`) automatically creates a test user (`e2e-test@promotiontracker.test`) before tests run. It tries to log in first (reuses existing user from prior runs), and only registers if needed. `TEST_INVITE_CODE` is required if the app has an invite code set. Global teardown wipes the test user's data after tests complete so each run starts clean.

This means you never need to manually create test users unless you're testing the registration flow itself.

### webapp-testing skill (ad-hoc Python scripts)
- **Helper**: `~/.claude/skills/webapp-testing/scripts/with_server.py`
- **Use for**: reconnaissance, screenshots, console log capture, one-off debugging
- **Run pattern**:
  ```bash
  python ~/.claude/skills/webapp-testing/scripts/with_server.py \
    --server "cd backend && npm run dev" --port 3001 \
    --server "cd frontend && npm run dev" --port 5173 \
    -- python test_script.py
  ```

### Backend unit tests (Jest)
- **Location**: `backend/__tests__/`
- **Run**: `cd backend && npm test`

### Frontend unit tests (Vitest)
- **Location**: `frontend/src/**/__tests__/`
- **Run**: `cd frontend && npm test`

---

## Current coverage

### Backend unit tests
| File | What's tested |
|------|---------------|
| `auth.test.js` | Register validation, login, JWT auth, role assignment |
| `data.test.js` | GET/PUT per domain, auth guard, viewer restriction, error handling |
| `buildContext.test.js` | AI context assembly, field mapping, data limits, edge cases |
| `callAnthropic.test.js` | JSON parsing, error code mapping, retry on 529 |

### Frontend unit tests
| File | What's tested |
|------|---------------|
| `statsHelpers.test.js` | Sales/revenue/GP/utilization stat calculations |
| `goalsHelpers.test.js` | Status cycling, labels |
| `api.test.js` | Auth headers, GET/PUT, debounce, dedup, retry |

### E2E tests (Playwright JS)
| File | What's tested | Auth required |
|------|---------------|---------------|
| `auth.spec.js` | Login form UI, invalid credentials, links, route guards, login/logout/persistence | Partial |
| `navigation.spec.js` | Tab navigation (8 pages), mobile hamburger, public pages | Partial |
| `mobile-audit.spec.js` | 375px: overflow, touch targets, iOS zoom, viewport clipping, element overlap, modal fit, tab bar, sidebar, table→card. 768px: overflow, layout mode. Console error capture across all pages | Yes |
| `user-journeys.spec.js` | Scorecard entry + persistence, add/delete win, add/cycle/delete goal, add/delete contact, currency toggle, dashboard stat integrity | Yes |

---

## Remaining gaps (pick up next session)

### Worth building
- [ ] **Network failure handling**: intercept API calls with `page.route()`, verify error toast appears
- [ ] **Session expiry**: clear token mid-session, verify redirect to login (not blank screen)
- [ ] **Empty states**: verify each page with zero data doesn't break layout
- [ ] **Landscape phone** (667x375): quick overflow check

### Build only if issues arise
- [ ] **Form validation**: only test if we see validation bugs — the required field pattern is consistent across all forms
- [ ] **AI features**: flaky by nature (depends on external API), better tested manually
- [ ] **Accessibility**: valuable but large scope — consider axe-playwright plugin when ready
- [ ] **Backend share/feedback/email routes**: add when those features change

---

## Test execution workflow

The correct flow is: **build → code review → fix → test → commit → ship**. A PreToolUse hook automatically runs a code review agent before any test command (`npm test`, `npm run test:e2e`, `npx vitest`, `npx playwright`). This catches security and architecture issues before you waste time testing code that needs rewriting.

### Standard flow
```bash
# 1. Code review runs automatically when you run any test command below
# 2. Fix any Critical issues flagged by the review
cd backend && npm test                              # Backend unit tests
cd frontend && npm test                             # Frontend unit tests
cd frontend && TEST_INVITE_CODE=password npm run test:e2e  # Full E2E suite (auto-creates test user)
# 3. Commit and ship (PR creates a final checklist gate)
```

All authenticated tests run automatically — no need to manually create users or pass credentials. The test user is created once, reused across runs, and cleaned up after each suite.

### Ad-hoc debugging with webapp-testing skill
```bash
python ~/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "cd backend && npm run dev" --port 3001 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_script.py
```

### Debugging failed tests
```bash
npm run test:e2e:headed          # Watch in visible browser
npm run test:e2e:ui              # Interactive Playwright UI
npx playwright show-report       # HTML report after failures
```

### Adding a new page to the audit
When you add a new route, just add it to the `pagesToAudit` array in `mobile-audit.spec.js` — it automatically gets overflow, touch target, font-size, and viewport checks.
