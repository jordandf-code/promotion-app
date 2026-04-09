# Phase 18 — Account management, roles, and access control

**Goal**: Introduce three account roles (superuser, regular user, viewer), a registration invite
code, a forgot-password flow via security question, a user profile tab, a superuser admin panel,
and a "View others" tab that lets any user see peers' data when mutual access is granted.

## Roles

| Role | What they can do |
|---|---|
| `superuser` | Full access to own data + superuser admin panel; can manage all accounts, set invite code, grant/revoke roles |
| `user` | Full access to own data; can grant viewer access to specific other users |
| `viewer` | No private data of their own; can only see data that others have explicitly shared with them |

One superuser exists at any time (the first registered account is automatically promoted, or
promoted manually via DB). The superuser role is not transferable via the UI — DB-level change
only, to prevent accidental lockout.

A `viewer` account has no Dashboard, Scorecard, Pursuits, Goals, People, Wins, Actions,
Learning, Narrative, Calendar, or Sharing tabs of their own. They see only the "View others"
tab and their own User profile.

A `user` account has all normal tabs plus the "View others" tab (if they have been granted
access by at least one other user, or have granted access to others).

---

## 18a — Database migration
- [ ] `backend/migration_phase18.sql`:
  - Add `role` column to `users` table: `role TEXT NOT NULL DEFAULT 'user'` — values: `superuser | user | viewer`
  - Add `security_question TEXT` and `security_answer_hash TEXT` columns to `users` table
    (answer stored as bcrypt hash, never plain text)
  - Add `invite_code_hash TEXT` column to `users` table on a shared config row, or more simply:
    add `app_settings` table: `( key TEXT PRIMARY KEY, value TEXT )` — used to store
    `invite_code_hash` and any future platform-level settings
  - Add `viewer_access` table:
    ```sql
    CREATE TABLE viewer_access (
      id          SERIAL PRIMARY KEY,
      owner_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      viewer_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      granted_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (owner_id, viewer_id)
    );
    ```
  - First registered user ever gets `role = 'superuser'` — implement as a trigger or a
    post-registration check in `backend/routes/auth.js` (if `SELECT COUNT(*) FROM users = 0`
    before insert, set role to superuser)

**Post-migration runbook (existing accounts)**
When `migration_phase18.sql` is run against an existing database:
1. All existing users get `role = 'user'` automatically (column default backfills existing rows)
2. Promote your own account to superuser by running this in the Supabase SQL editor:
   ```sql
   UPDATE users SET role = 'superuser' WHERE email = 'your@email.com';
   ```
3. Log out and back in — the Super Admin tab will appear immediately
4. Go to Super Admin → Invite code and set a registration code before sharing the app with
   anyone new — the invite code is unset after migration, leaving registration open until you do this
5. Existing users do not need to re-register or take any action — their accounts and data are unaffected

## 18b — Registration gate (invite code)
- [ ] Registration form gains an "Invite code" field (required) below the password fields
- [ ] On submit, backend compares bcrypt hash of entered code against `app_settings.invite_code_hash`
- [ ] If no invite code has been set yet (app_settings row absent), registration is open — this
  covers the very first registration (the superuser) without a chicken-and-egg problem
- [ ] If code is wrong, return a generic error: "Invalid invite code" — no hint about what's expected
- [ ] Superuser sets the invite code in the Superuser Admin panel (18d); stored as bcrypt hash,
  the plain-text code is never persisted

## 18c — Registration: security question
- [ ] Registration form gains two fields after the invite code: "Security question" (free-text,
  required) and "Security answer" (text input, required)
- [ ] Answer stored as `bcrypt.hash(answer.toLowerCase().trim(), 10)` — case-insensitive and
  whitespace-normalised before hashing so minor variations don't fail the challenge
- [ ] Both fields are required; no minimum length enforced beyond non-empty
- [ ] Shown to user again on the forgot-password screen (18e) — question is stored plain text,
  only the answer is hashed

## 18d — Superuser admin panel
A new top-level tab "Super Admin" visible only to `role = 'superuser'`. Sits at the bottom of
the sidebar, visually distinct (e.g. a subtle separator above it). Not reorderable via tab
ordering — always last.

Sub-tabs: **Users**, **Invite code**, **Platform**.

**Users sub-tab**
- [ ] Table of all registered accounts: name, email, role, joined date, last login (if tracked)
- [ ] Per-row actions:
  - Change role — dropdown: user / viewer (superuser role not assignable via UI)
  - Reset password — generates a temporary password shown once in a modal; user must change on
    next login (add `must_change_password BOOLEAN DEFAULT FALSE` to users table)
  - Delete account — confirmation modal warning that all user data will be permanently deleted;
    cascades via DB foreign keys
- [ ] Superuser's own row is shown but role and delete actions are disabled (can't self-demote
  or self-delete via UI)
- [ ] Table is read-only otherwise — superuser cannot edit another user's data, only manage access

**Invite code sub-tab**
- [ ] Current status: "Code is set" or "No code set (registration open)"
- [ ] Set new code: text input + "Save" button — hashes and stores; replaces any existing code
- [ ] Clear code: "Remove code" button — deletes app_settings row; registration becomes open again
- [ ] The plain-text code is shown once in a success banner after saving so the superuser can
  copy it to share out-of-band; never shown again

**Platform sub-tab** (minimal for now, extensible later)
- [ ] App name (display only — read from env or hardcoded)
- [ ] Placeholder section: "Email notifications — coming in a future phase"

## 18e — Forgot password flow
Accessible from the login screen via a "Forgot password?" link. No email required — entirely
security-question based.

Flow:
1. User enters their registered email address → backend looks up the account
2. If account found, backend returns the security question (plain text) — never confirms or
   denies whether the email exists in the system (return the same "Enter your answer" screen
   regardless, to prevent email enumeration)
3. User enters their answer → backend compares bcrypt hash
4. If correct, user is prompted to set a new password (two fields: new password + confirm)
5. Password is updated; user is redirected to login with a success message
6. If answer is wrong: show "Incorrect answer" error; no lockout for now (deferred — add
   rate-limiting in a future phase when email is available)

- [ ] `POST /api/auth/forgot-password/question` — takes `{ email }`, returns `{ question }` (always, even if email not found — return a fake question "What is your answer?" to avoid enumeration)
- [ ] `POST /api/auth/forgot-password/verify` — takes `{ email, answer, newPassword }`, returns `{ ok }` or error
- [ ] Frontend: two-step form component `ForgotPassword.jsx` at route `/forgot-password`
- [ ] "Back to login" link on every step

## 18f — User profile tab
A new sub-tab in the existing **Admin** tab (alongside GenAI, Categories, User settings),
visible to all roles. Label: **My profile**.

- [ ] Displays: name (editable), email (read-only — changing email is a superuser-only operation
  to avoid account hijacking), role (read-only, display only)
- [ ] Change password section: current password + new password + confirm new password; validated
  server-side (current password must match before update is accepted)
- [ ] Security question section: shows current question (read-only label) + "Update" button that
  opens an inline form: current password (re-auth required) + new question + new answer
- [ ] All three sections save independently — no single "Save all" button
- [ ] For `viewer` accounts: same profile tab, same fields — name, password, security question

## 18g — "View others" tab
Visible to all roles (superuser, user, viewer). For users and superusers it appears only once
at least one peer has granted them access. For viewers it is always the primary tab (they have
no other tabs).

**Access grant flow (owner side)**
- [ ] New section in the existing **Sharing** tab: "Peer access" — separate from the public
  share link and feedback link sections
- [ ] Lists all registered users (by name + email) except the owner themselves
- [ ] Toggle per user: "Allow [Name] to view my data" — on/off switch
- [ ] Toggle calls `POST /api/access/grant` or `DELETE /api/access/revoke` with `{ viewerId }`
- [ ] Changes take effect immediately — no confirmation modal needed (it's reversible)
- [ ] Only grants access to the "View others" tab view — not to the public share link

**View others tab (viewer side)**
- [ ] Shows a list of users who have granted the current user access — name, role label, last
  updated timestamp
- [ ] Clicking a user loads their data in a read-only view
- [ ] **Modular view sections** (each is a named component that can be toggled per-user in a
  future phase; for now all are shown when access is granted):
  - `PeerDashboard` — read-only render of the peer's Dashboard tab (scorecard snapshot,
    countdown, recent wins; overdue actions and stale contacts hidden — those are private)
  - `PeerNarrative` — read-only render of the peer's Narrative + Gaps tab (both sections if
    generated; generate buttons hidden)
- [ ] No editing, no quick-add, no action buttons of any kind in the peer view
- [ ] A "Viewing: [Name]" banner at the top of the page makes the context clear at all times
- [ ] Back button / breadcrumb returns to the "View others" list
- [ ] Backend: `GET /api/peers` — returns list of users who have granted access to the requesting
  user; `GET /api/peers/:userId/data` — returns a scoped read-only payload for that user
  (dashboard stats + story data only); requires that a `viewer_access` row exists for
  `(owner_id = userId, viewer_id = req.userId)` — otherwise 403

**Access control enforcement**
- [ ] All existing data endpoints (`GET/PUT /api/data/:domain`) already scope to `req.userId` —
  no change needed there
- [ ] New peer data endpoint is separate and explicitly scoped — never reuses the private data
  endpoint
- [ ] Superuser has no special data access — they manage accounts, not data. They cannot read
  another user's private data unless that user explicitly grants them viewer access

## 18h — Sidebar and routing updates
- [ ] `viewer` role: sidebar shows only "View others" and "Admin" (profile sub-tab only);
  all other tabs hidden and routes return 403 if accessed directly
- [ ] `user` / `superuser`: "View others" tab added to sidebar; position controlled by tab
  ordering in Admin (same drag-and-drop as all other tabs); default position: after Sharing
- [ ] "Super Admin" tab: always last in sidebar, always visible to superuser only, not
  reorderable
- [ ] Route guard in `ProtectedRoute` component extended to check role: wrap tabs with
  `<RoleGuard requires="user">` or `<RoleGuard requires="superuser">` so direct URL access
  is also blocked

---

