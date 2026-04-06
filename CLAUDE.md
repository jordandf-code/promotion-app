# Claude Code Guidelines

## Code Structure

### Single Responsibility
- Every function and module does one thing only
- If you cannot describe a file's purpose without using "and", split it
- Keep files under 200 lines — if a file is growing beyond this, it's a signal to decompose it

### File & Folder Organization
- Organize by **feature or domain**, not by type
  - ✅ `auth/login.js`, `auth/logout.js`, `auth/session.js`
  - ❌ `utils.js`, `helpers.js`, `misc.js`
- Each folder should represent a coherent domain — if you can't name the folder clearly, the grouping is wrong

### Naming
- Use descriptive names for functions, variables, and files
- A function's name should make its purpose clear without reading its body
- Prefer `getUserByEmail(email)` over `getUser(param)` or `fetch(x)`
- Avoid abbreviations unless they are universally understood in this codebase

### Explicit Interfaces
- Keep the surface area between modules small and deliberate
- Modules should communicate through clearly defined functions, not by reaching into each other's internals
- If module A depends on module B, that dependency should be obvious and minimal — one or two entry points, not scattered references
- Before adding a cross-module dependency, ask: should this live in a shared module, or does it belong to one owner?

### Before Building
- Propose a file and folder structure before writing code, and get confirmation before proceeding
- Do not modify files unrelated to the current change
- If a change touches more than 2–3 files, flag it and confirm the approach first

---

## Testing

### When to Write Tests
- Write tests **alongside** the feature, not after
- Every new function or module gets tests before the session ends — do not defer this
- After building something, always check: have the edge cases and error conditions been tested?

### What to Test
- Always test **unhappy paths**, not just the happy path. This includes:
  - Empty or null inputs
  - Out-of-range or unexpected values
  - Network failures and timeouts
  - Unexpected data types
- Assert on **specific outputs and side effects** — not just that no exception was thrown
- Focus test coverage on critical paths and complex logic, not on chasing 100% line coverage

### Test Quality
- Use **descriptive test names** that explain what is being tested and what the expected outcome is
  - ✅ `test_user_login_fails_with_expired_token`
  - ❌ `test2`, `loginTest`, `it works`
- Each test must be **fully independent** — no shared mutable state between tests
- A failing test must not cause other tests to fail for the wrong reasons
- Treat flaky tests as bugs — fix or delete them, never ignore them

### Test Isolation
- **Mock all external dependencies**: databases, APIs, file systems, clocks, randomness
- Tests must be runnable without a live environment
- Tests must be deterministic — the same inputs always produce the same result

### Test Levels
- **Unit tests**: small, fast, one function or component at a time — write these liberally
- **Integration tests**: verify that modules work correctly together — write these for critical flows
- **End-to-end tests**: simulate real user journeys — use sparingly, they are slow and fragile

### Performance
- The full test suite should run in under 2 minutes locally
- If it grows beyond this, split slow tests into a separate suite that runs in CI only

---

## General Principles
- Prefer early returns to reduce nesting
- Avoid clever code — clear and boring is better than impressive and opaque
- Leave the code easier to understand than you found it
