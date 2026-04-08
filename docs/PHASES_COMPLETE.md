# Completed Phases (1–16) — Archive

This file is the historical record of all completed phases. Consult it only when you need
to understand what was built and how. For current data model schemas, see `DATA_MODEL.md`.

---

## Phase 1 — Project setup ✅

- [x] Create React app with Vite
- [x] Set up Node.js + Express backend
- [x] Connect PostgreSQL on Supabase (completed in Phase 11)
- [x] Deploy frontend to Vercel, backend to Render (completed in Phase 15)
- [x] Basic folder structure and routing in place

## Phase 2 — Auth ✅

- [x] Register and login (email + password)
- [x] JWT tokens for session management
- [x] Protected routes (redirect to login if not authenticated)
- [x] Basic user profile (name, role, company)

## Phase 3 — Static UI shell ✅

- [x] Tab navigation (Dashboard, Scorecard, Pursuits, Goals, People, Wins, Action items, Narrative + Gaps, Calendar, Sharing, Admin)
- [x] Card and layout components
- [x] Hardcoded sample data so it looks real
- [x] Consistent color scheme and typography (IBM blue `#0040a0`, qualifying year amber accent)

## Phase 4 — Scorecard tab ✅

- [x] 7-year scorecard grid anchored to user-selected partner promotion year (Year −4 to +2)
- [x] Qualifying year (Year −1) and partner year (Year 0) visually highlighted
- [x] Current calendar year distinctly marked
- [x] Overview tab: stacked realized/forecast progress bars per metric per year
- [x] ~~Inline target editing~~ (moved to dedicated Targets sub-tab)
- [x] Opportunities sub-tab: full table with add/edit/delete modal, status pills, year+status filters, summary strip
- [x] Projects sub-tab: quarterly revenue and GP inputs, optional opportunity link, GP margin %, summary strip
- [x] Utilization sub-tab: annual target + monthly actual/forecast grid, live stats panel
- [x] Targets are flat IBM-given numbers per year/metric — not tied to any deal or project
- [x] All scorecard data persisted to `scorecardData_v2`

## Phase 5 — Dashboard tab ✅

- [x] Qualifying year scorecard snapshot — live data from `useScorecardData`
- [x] Countdown to December 31 of the qualifying year
- [x] Count of overdue action items (interactive — click to mark done)
- [x] Count of people not contacted in 30+ days
- [x] Quick-add button opens modal to add a Win or Action item
- [x] Wins and action items backed by `useWinsData` / `useActionsData` hooks

## Phase 6 — Goals tab ✅

- [x] Add, edit, delete goals (title, target date, status, notes)
- [x] Status: Not started / In progress / Done — click badge to cycle
- [x] IBM milestones: any goal flagged as gate; shown in dedicated section
- [x] Milestones section title references qualifying year from settings
- [x] Three IBM milestone goals pre-seeded; fully editable/deletable
- [x] Overdue non-done goals highlighted in red; done goals faded with strikethrough
- [x] "✦ Suggest goals" placeholder button
- [x] Goals ↔ action items many-to-many linking

## Phase 7 — People tab ✅ (core complete; relationship status deferred to Phase 7c)

- [x] Add, edit, delete people (name, job title, org, email, phone, relationship type, what you need)
- [x] Relationship types configurable via Admin tab
- [x] Touchpoint log per person: date + note, newest first
- [x] Planned contacts with optional action item link
- [x] "Log as done" converts planned contact to touchpoint and marks action done
- [x] Last contact derived from most recent touchpoint
- [x] 30+ day stale contacts flagged with "Follow up needed"
- [x] People sorted stalest first; type filter in toolbar
- [x] Dashboard stale contacts count wired to live hook

**Not built** (deferred to Phase 7c):
- `relationshipStatus` field (`established | in-progress`)
- Status filter in People tab toolbar
- LinkedIn import default status (Phase 25)

## Phase 7b — Admin tab ✅

- [x] `/admin` route with sub-tab layout: GenAI, Categories, User settings
- [x] Editable relationship types, win tags with configurable colours
- [x] Deal types, logo types, relationship origins as configurable value/label lists
- [x] All category lists support drag-and-drop reordering
- [x] Colour picker: palette swatches + native color wheel

## Phase 8 — Wins tab ✅

- [x] Full CRUD for wins with card list view
- [x] Filter by tag
- [x] Source badges for data-driven wins (from opportunities and goals)
- [x] Win prompt on opportunity won / goal done (pre-filled, skip-able, fires once per source)
- [x] `winsData_v2` with source tracking and strategic context fields

## Phase 9 — Action items tab ✅

- [x] Full CRUD with modal; overdue sorted first and highlighted
- [x] Goal linking via checkbox list in modal (many-to-many)

## Phase 10 — Narrative + Gaps tab (AI-powered) ✅

- [x] IBM criteria + career history + API key in Admin > GenAI
- [x] Two AI modes: polished narrative (plain text) and gap analysis (JSON)
- [x] Independent Generate/Regenerate buttons; "Generate all" fires both in parallel
- [x] Shows setup prompt if criteria or API key not configured
- [x] Token usage displayed; export to plain text
- [x] ✦ Suggest goals (scorecard-aware) and ✦ Suggest impact (deal-context-aware)
- [x] Cached in `storyData_v1`

## Phase 11 — Persistence ✅

- [x] All data saved to PostgreSQL via `GET/PUT /api/data/:domain`
- [x] Optimistic UI updates — state updates instantly, background sync
- [x] Auto-migration from localStorage to DB on first load
- [x] Auth migrated to PostgreSQL `users` table
- [x] Settings migrated to `settings` domain

## Phase 12 — Sharing + feedback ✅

- [x] Public share link (`/share/:token`) with visibility controls
- [x] Feedback link (`/feedback/:token`) — reviewer name, star rating, comments
- [x] Feedback inbox in Sharing tab
- [x] Reset links button to rotate tokens

## Out-of-phase additions ✅

- [x] Calendar tab — aggregated dates from all tabs, colour-coded, click-to-navigate
- [x] Account wipe + restore in Admin
- [x] New accounts start empty (no seed data)
- [x] Tab ordering in Admin (drag-and-drop + arrows, via AdminDataContext)
- [x] Dashboard stat card navigation (days → Calendar, overdue → filtered Actions, stale → filtered People)
- [x] Filtered views on Actions and People pages (?filter= URL params)
- [x] Dashboard item click navigation (?id= with scroll + highlight animation)
- [x] Dashboard multi-year ScorecardTable with status badges
- [x] Currency-aware inputs throughout (toInputValue/fromInputValue/currencySymbol)
- [x] Scorecard windowed view (3-year default, expand to 7)
- [x] Targets sub-tab (dedicated target entry)
- [x] Metric label updates: Sales→Signings, Utilization→Chargeable utilization, Gross Profit→Gross profit
- [x] Quick-add expanded to 5 types with fixed-height modal
- [x] Pursuits page — CRM pipeline, stage funnel, weighted pipeline
- [x] Admin split into sub-tabs; configurable category lists

## Phase 13 — Multi-user ✅

- [x] Independent user registration; all data fully isolated per user

## Phase 14 — Polish ✅

- [x] Mobile-friendly layout (hamburger menu, sidebar overlay, responsive)
- [x] Export wins to plain text
- [x] Print-friendly scorecard and story views
- [ ] Email notification on feedback (deferred → Phase 23)

## Phase 15 — Source control and deployment ✅

- [x] Git repo on GitHub with `main` and `dev` branches
- [x] Frontend on Vercel, backend on Render (auto-deploy on merge to `main`)
- [x] Two Supabase projects: dev and prod
- [x] CORS configured; `API_BASE` from env var
- [x] Promotion workflow: dev → PR → merge → auto-deploy

## Phase 16 — AI prompt engineering ✅

- [x] `buildContext.js` centralises data assembly for all AI calls
- [x] Two independent Narrative + Gaps modes with per-section Generate/Regenerate
- [x] Suggest goals: scorecard-aware, returns targetDate + isGate
- [x] Suggest impact: deal/goal context injected
- [x] Error handling: consistent envelope, retry on 529, frontend error mapping
- [x] Token efficiency: compact JSON, null stripping, caps on wins/people
- [x] Bug fixes: modal backdrop click prevention, admin data race condition guard
- [ ] AI usage log in Admin (deferred — unassigned)

## Phase 17 — Learning tab ✅

- [x] `learning` domain with certifications and courses arrays
- [x] `useLearningData` hook following standard data-hook pattern
- [x] Add/edit/delete certifications with status tracking (Earned, In progress, Planned, Expired)
- [x] Add/edit/delete courses with completion tracking
- [x] Domain added to backend allowed domains list and `buildContext.js`
- [x] Learning tab in sidebar with route and RoleGuard

## Phase 18 — Roles and access control ✅

- [x] **18a** — `migration_phase18.sql`: role column (superuser/user/viewer) with NOT NULL + CHECK, security_question + security_answer_hash columns, must_change_password flag, app_settings table, viewer_access table. First user auto-promoted to superuser.
- [x] **18b** — Registration invite code gate: checked against bcrypt hash in app_settings; open if no code set (handles first-user bootstrap).
- [x] **18c** — Security question on registration: free-text question + bcrypt-hashed answer (case-insensitive, whitespace-normalised).
- [x] **18d** — Super Admin panel (`SuperAdmin.jsx`): Users sub-tab (table, role dropdown, reset password modal, delete confirmation), Invite code sub-tab (set/clear/status), Platform sub-tab (placeholder).
- [x] **18e** — Forgot password flow (`ForgotPassword.jsx`): two-step (email → security question → new password), fake question for non-existent emails to prevent enumeration, "Back to login" link on every step.
- [x] **18f** — User profile in Admin tab: name (editable), email (read-only), role (display), change password (re-auth), update security question (re-auth). Sections save independently.
- [x] **18g** — View others tab: PeerAccessSection in Sharing (grant by email, revoke), ViewOthers page (peer list → read-only PeerDashboard + PeerNarrative), backend peers.js with access verification via viewer_access table.
- [x] **18h** — Sidebar + routing: viewer sees only View others + Admin, Super Admin always last for superuser, RoleGuard on all data routes, Layout filters nav items by role.

## Phase 19 — Mobile UX ✅

- [x] **19a** — PWA manifest + service worker (vite-plugin-pwa), safe-area-inset padding
- [x] **19b** — Bottom tab bar with star system (up to 5 customisable tabs)
- [x] **19c** — Tables → cards on mobile (data tables, super admin, scorecard, pursuits, utilization)
- [x] **19d** — Mobile hamburger menu + sidebar with backdrop, mobile header with currency toggle
- [x] **19e** — Touch-friendly targets (44px minimum)
- [x] **19f** — Form input improvements (inputmode, type=date, textarea min-heights)
- [x] **19g** — Dashboard mobile layout (stat cards stacking, FAB quick-add, scorecard collapse)
- [x] **19h** — Public share and feedback pages mobile (scorecard cards, 48px star targets, full-width submit)
- [x] **19i** — View others mobile (sticky viewing banner, 44px peer cards, responsive grid)

## Phase 21 — Readiness score ✅

- [x] Readiness scoring engine with weighted criteria
- [x] Dashboard readiness widget with progress visualisation
- [x] Readiness weights configurable in Admin → User settings

## Phase 22 — Eminence tracker ✅

- [x] `eminence` domain with activities array (type, date, venue, audience, reach, tags, year)
- [x] `useEminenceData` hook following standard pattern
- [x] Eminence tab with add/edit/delete activities
- [x] Domain added to backend and buildContext.js

## Phase 7c — People relationship status ✅

- [x] `relationshipStatus` field added to people data model (established / in-progress)
- [x] Status shown in People tab UI with filter support

## Phase 23 — Notifications (digest + feedback) ✅

- [x] **23a** — `migration_phase23.sql`: `notification_prefs` JSONB column on users, `notifications` send log table with index
- [x] **23b** — Two notification types implemented: `weekly_digest` and `feedback_received` (other 4 deferred)
- [x] **23c** — Backend: `notifications/send.js` (core sender with prefs/dedup/Resend API), `notifications/digest.js` (full weekly summary email with readiness, scorecard, overdue actions, stale contacts, goals, wins), `notifications/readiness.js` (server-side port of readiness score), `notifications/scheduler.js` (hourly node-cron check, per-user day+hour config)
- [x] **23d** — Admin → My profile: notification toggles (global pause, per-type), digest day/hour schedule, test digest button, notification history
- [x] **23e** — Feedback notification: inline fire-and-forget email on `POST /api/share/feedback/:token` with reviewer name, stars, comment preview
- [x] Super Admin → Platform: Resend API key status, configurable from-address (stored in `app_settings`)
- [x] Health endpoint moved above CORS for external keep-alive pings
- [x] DEPLOY.md updated with Resend setup and cron-job.org keep-alive instructions

---

## Progress log

| Date | What was done |
|---|---|
| 2026-04-05 | Phases 1–15 completed in a single build session |
| 2026-04-05 | All out-of-phase additions (calendar, pursuits, currency, tab ordering, etc.) |
| 2026-04-06 | Phase 16 complete — AI prompt engineering, buildContext.js, Narrative + Gaps redesign |
| 2026-04-06 | Phases 17, 18, 19a/b/d/e/f, 21, 22, 7c complete — Learning, Roles/access control, Mobile core, Readiness, Eminence, People relationship status |
| 2026-04-07 | In-app GitHub issue reporting: sidebar + mobile bottom bar button, Super Admin config, modal form, backend proxy to GitHub API |
| 2026-04-07 | Phase 23: Email notifications — weekly digest + feedback received, Resend integration, node-cron scheduler, per-user schedule config |
| 2026-04-07 | Phase 20: PowerPoint deck export (testing only) — AI-powered .pptx generation, deck prompt, template renderer with run-merging, Admin template upload/instructions UI |
| 2026-04-07 | Demo data & onboarding: seed data for all 7 domains (scorecard, wins, goals, actions, people, eminence, learning), demoMode flag, Dashboard banner, "Start your promotion journey" in Admin |
| 2026-04-07 | Issue triage: resolved 30 of 32 open GitHub issues across 9 groups — critical data bugs (#41/#54/#46/#34), pursuit→opportunity rename (#48), field cleanup (#47/#43), scorecard UX (#16/#15/#45/#53/#37), mobile fixes (#11/#39/#40/#36), UI polish (#31/#30/#27/#52/#29), admin→super admin restructure (#44), AI improvements (#10/#42), people/contacts features (#49/#50/#38/#51), PWA (#35), docs (#33). Parked #19/#24 for future design. Created issue-triage skill. |
| 2026-04-07 | Test infrastructure: E2E auto-creates test user via global setup/teardown, storageState for auth reuse, eliminated rate limiter flakiness |
| 2026-04-07 | Career Command Center restructure: replaced linear phase sequence with 4-layer dependency roadmap (22 features). Updated PLAN.md, VISION.md, CLAUDE.md. |
| 2026-04-07 | Layer 0A: Security hardening — JWT secret validation (fatal in prod if <32 chars), rate limiting on AI routes (20/15min/user), rate limiting on public share/feedback (30/15min/IP), SSL verification in production |
| 2026-04-07 | Layer 0B: Firm-agnostic config — `firm_config` key in `app_settings`, configurable labels (company, roles, market, metrics) in Super Admin, `buildContext.js` reads config instead of hardcoded values |
| 2026-04-07 | Layer 0F: Email infrastructure — extracted shared `emailTemplate.js`, rebranded emails to "Career Command Center", added dedup intervals for 6 new notification types |
| 2026-04-07 | Layer 0C: Dashboard widget scaffold — extracted StatStrip, ScorecardWidget, ActionsWidget, RecentWinsWidget as standalone components with pluggable slot pattern |
| 2026-04-07 | Layer 0D: Navigation scaffold — registered 6 new routes (influence-map, brand, sponsees, mock-panel, vault, import-export) with placeholder pages, hidden nav entries, icons + labels in BottomTabBar |
| 2026-04-07 | Layer 0E: Role/permissions rework — `user_relationships` table (sponsor/peer types), `review_tokens` table, updated peers.js with relationship types, new `/api/sponsees` endpoint, `requireRelationship` middleware, backward compat with viewer_access |
