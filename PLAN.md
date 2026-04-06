# Promotion tracker — project plan

## Goal
A multi-user web app to manage the path to promotion. Each user tracks their own goals,
scorecard, wins, people, and action items privately. Users can share a read-only summary
link and invite others to leave structured feedback. Built with a React frontend, Node.js
backend, and PostgreSQL database.

## My context
- **Company**: IBM Canada — consulting business
- **Market focus**: Canadian public sector (federal, provincial, municipal clients)
- **Current role**: Associate Partner
- **Target role**: Partner (executive level — stock awards, larger salary and bonus structure)
- **Note**: "Partner" at IBM is not an equity partnership — it's an executive designation with compensation changes
- **Expected users**: 2–3 IBMers, each with their own private data

### Timeline
- **Target promotion year**: 2027 (exact timing TBD)
- **2026 is the qualifying year** — three non-negotiable gates by December 31, 2026:
  1. Hit all performance targets for the year
  2. Complete all training goals
  3. Finish the year rated as a top performer
- Think of 2026 as "building the case" and 2027 as "making the ask"

### Scorecard
IBM sets annual targets for four metrics, tracked by calendar year (Jan–Dec):

| Metric | Unit | How actuals are entered |
|---|---|---|
| Sales | $CAD | Signings value from named Opportunities (won = realized, open = forecast) |
| Revenue | $CAD | Quarterly revenue from named Projects (realized or forecast status) |
| Gross profit | $CAD | Quarterly GP from named Projects (realized or forecast status) |
| Utilization | Hours | Entered monthly with a monthly forecast |

#### Year structure
- The scorecard spans **7 years** relative to a user-selected partner promotion year:
  Year −4, −3, −2, −1 (qualifying), 0 (partner), +1, +2
- The user sets their **partner year** in the scorecard header (default 2027)
- The app knows the current calendar year and highlights it distinctly
- Qualifying year (Year −1) and partner year (Year 0) are visually accented throughout

#### Opportunity model (Sales metric)
- Each opportunity has: name, client, year, status (open / won / lost), win/close date,
  total deal value, and **signings value** (the credited portion that counts toward the target)
- Pipeline fields: stage (Identified / Qualified / Proposed / Verbal / Closed), probability (%),
  expected close date, deal type (one-time / multi-year)
- Strategic context: logo type (net-new / expansion), relationship origin (cold-outreach / referral /
  eminence / existing-client), strategic rationale note
- **Won** opportunities contribute signings value as **realized** sales
- **Open** opportunities contribute signings value as **forecast** sales
- **Lost** opportunities are excluded from all totals
- Targets are flat IBM-given numbers per year, entered separately — not derived from deals

#### Project model (Revenue and Gross Profit metrics)
- Each project has: name, client, year, status (forecast / realized), optional link to an
  opportunity, and quarterly revenue + gross profit values (Q1–Q4)
- **Realized** projects contribute to realized revenue/GP totals
- **Forecast** projects contribute to forecast revenue/GP totals
- A project can exist without being linked to any opportunity
- Deleting an opportunity automatically clears the link on any connected projects

#### Utilization model
- Annual target hours set per year (IBM-given, editable)
- Actuals entered month by month (Jan–Dec)
- Each month also has a forecast (expected billing for future months)
- App calculates: hours to date (actuals only), full-year projection (actuals + forecasts), % of annual target
- Actual hours override forecasts in the projection — enter actuals for completed months, forecasts for the rest

### What this means for the app
- **Scorecard** is a first-class tab — four sub-tabs: Overview grid, Opportunities, Projects, Utilization
- **Dashboard** shows a live scorecard snapshot (qualifying year), days remaining to Dec 31 qualifying year, overdue action items, recent wins, and a quick-add button
- **Goals** split into IBM milestones (qualifying-year gates, user-flagged) and other goals; AI suggestion placeholder present
- **People** tracks sponsors, decision makers, clients, external contacts
- **Wins** captured in business impact terms with eminence tags
- **Eminence** split into internal (IBM visibility) and external (public sector presence)
- **My story** uses AI to synthesize all data into a structured case and polished narrative
- **Sharing** allows a read-only public summary link and structured feedback from invited reviewers

---

## Tech stack

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React 19 (Vite 8) | Vercel | Free |
| Backend | Node.js + Express | Render | Free |
| Database | PostgreSQL | Supabase | Free |
| AI | Anthropic API (claude-sonnet-4-6) | Via backend proxy | Pay per use |
| Auth | JWT tokens (email + password) | Backend | Free |

### Why this stack
- React replaces single HTML file — handles routing, login state, multiple pages cleanly
- Backend protects private data, generates share tokens, proxies AI calls (API key stays secret)
- PostgreSQL keeps each user's data fully isolated
- All free tiers are generous enough for 2–3 users indefinitely
- Every planned feature (sharing, feedback, multi-user) has a clean home from day one

### AI key model
- Each user stores their own Anthropic API key in the Admin tab — saved to their user record in the database
- The backend reads the key from the user's DB record when proxying AI calls — never from environment variables
- No shared platform key — each user is responsible for their own Anthropic account and usage costs
- If no key is configured, all AI features show a prompt linking to Admin to set one up

### Sharing model
- Each user can generate a public share link: `yourapp.com/share/{token}`
- Share link shows a read-only summary view — no private data exposed
- Separate feedback link: `yourapp.com/feedback/{token}` — reviewers submit structured feedback
- User controls what is visible on the public summary

---

## App structure

| View | Who sees it | What it contains |
|---|---|---|
| Dashboard | Owner only | Live scorecard snapshot, countdown, overdue items, quick-add |
| Scorecard | Owner only | Overview grid + Opportunities, Projects, Utilization sub-tabs |
| Pursuits | Owner only | CRM-style pipeline view of open opportunities — stage funnel, weighted pipeline, strategy fields |
| Goals | Owner only | Goal cards, progress, 2026 gates |
| People | Owner only | Contacts, relationship types, touchpoint log |
| Wins | Owner only | Accomplishments, impact, eminence tags |
| Action items | Owner only | To-dos with due dates, mark done |
| My story | Owner only | AI-generated narrative, gap analysis, 2027 plan |
| Public summary | Anyone with link | Read-only: selected wins, story narrative, scorecard highlights |
| Feedback portal | Invited reviewers | Structured feedback form, tied to owner's profile |
| Admin | Owner only | Configurable lists, AI key, IBM criteria, career history |

---

## Data model (current — localStorage, migrates to PostgreSQL in Phase 11)

### `scorecardData_v2` (localStorage)
```
targets:       { [year]: { sales, revenue, grossProfit, utilization } }
opportunities: [ {
  id, name, client, year, status, winDate, totalValue, signingsValue,
  stage, probability, expectedClose, dealType, logoType, relationshipOrigin, strategicNote
} ]
projects:      [ { id, name, client, year, status, opportunityId, revenue{q1-q4}, grossProfit{q1-q4} } ]
utilization:   { [year]: { months: { [jan-dec]: { actual, forecast } } } }
```

### `winsData_v2` (localStorage)
```
[ {
  id, title, date, description, impact, tags[],
  sourceType,          // 'manual' | 'opportunity' | 'goal'
  sourceId,            // id of linked opportunity or goal (null for manual)
  sourceName,          // human-readable source label, saved at creation time
  logoType,            // 'net-new' | 'expansion' (optional)
  relationshipOrigin,  // 'cold-outreach' | 'referral' | 'eminence' | 'existing-client' (optional)
  strategicNote        // free text — why this win matters beyond the $ (optional)
} ]
```
Tags: Revenue · Client relationship · Delivery · Team leadership · Internal eminence · External eminence
Migrates automatically from `winsData_v1` (adds `sourceType: 'manual'`, `sourceId: null`, `sourceName: null`).

### `actionsData_v2` (localStorage)
```
[ { id, title, dueDate, done, linkedGoalIds[] } ]
```
Many-to-many with goals — one action can be linked to multiple goals and vice versa.

### `peopleData_v1` (localStorage)
```
[ {
  id, name, title, org, type, email, phone, need,
  touchpoints[{ id, date, note }],
  plannedTouchpoints[{ id, date, note, actionId }]
} ]
```
`lastContact` is derived from the most recent touchpoint — never stored directly.
`plannedTouchpoints` are future planned contacts; each can be linked to an action item by `actionId`.
"Log as done" converts a planned touchpoint to a real touchpoint and marks the linked action item done.

### `goalsData_v1` (localStorage)
```
[ { id, title, targetDate, status, notes, isGate } ]
```
`isGate: true` marks the goal as an IBM milestone (shown in the milestones section).

### `adminData_v2` (localStorage)
```
{
  relationshipTypes: [ { label, color } ],
  winTags:           [ { label, color } ],
  dealTypes:         [ { value, label } ],
  logoTypes:         [ { value, label } ],
  originTypes:       [ { value, label } ],
  ibmCriteria:       string,
  careerHistory:     string,
  anthropicKey:      string,
  navOrder:          [ string ]
}
```
**Colour lists** (relationshipTypes, winTags) have `label` + `color` (hex). Colours picked from palette + color wheel in Admin.
**Value lists** (dealTypes, logoTypes, originTypes) have `value` (machine key) + `label` (display text). Editable in Admin Categories tab.
Auto-migrates from `adminData_v1` (plain strings → objects with default colours).
Default relationship types: Champion (purple), Supporter (IBM blue), Peer (gray), Client (teal).
Default win tags: Revenue, Client relationship, Delivery, Team leadership, Internal eminence, External eminence.
Default deal types: one-time, multi-year. Default logo types: net-new, expansion. Default origins: cold-outreach, referral, eminence, existing-client.

### Settings (localStorage)
```
setting_promotionYear   — user's target partner year (default 2027)
setting_currency        — display currency: 'CAD' (CDN$) or 'USD' (USD$, at 1.5× IBM rate)
```

---

## Phases

### Phase 1 — Project setup ✅
- [x] Create React app with Vite
- [x] Set up Node.js + Express backend
- [ ] Connect PostgreSQL on Supabase
- [ ] Deploy frontend to Vercel, backend to Render
- [x] Basic folder structure and routing in place

### Phase 2 — Auth ✅
- [x] Register and login (email + password)
- [x] JWT tokens for session management
- [x] Protected routes (redirect to login if not authenticated)
- [x] Basic user profile (name, role, company)

### Phase 3 — Static UI shell ✅
- [x] Tab navigation (Dashboard, Scorecard, Goals, People, Wins, Action items, My story, Admin)
- [x] Card and layout components
- [x] Hardcoded sample data so it looks real
- [x] Consistent color scheme and typography (IBM blue `#0040a0`, qualifying year amber accent)

### Phase 4 — Scorecard tab ✅
- [x] 7-year scorecard grid anchored to user-selected partner promotion year (Year −4 to +2)
- [x] Qualifying year (Year −1) and partner year (Year 0) visually highlighted
- [x] Current calendar year distinctly marked
- [x] Overview tab: stacked realized/forecast progress bars per metric per year
- [x] ~~Inline target editing directly in the overview grid cells~~ (moved to dedicated Targets sub-tab)
- [x] Opportunities sub-tab: full table with add/edit/delete modal, status pills, year+status filters, summary strip
- [x] Projects sub-tab: quarterly revenue and GP inputs, optional opportunity link, GP margin %, summary strip
- [x] Utilization sub-tab: annual target + monthly actual/forecast grid, live stats panel (hours to date, projection, % of target)
- [x] Targets are flat IBM-given numbers per year/metric — not tied to any deal or project
- [x] All scorecard data persisted to `localStorage` as `scorecardData_v2`

### Phase 5 — Dashboard tab ✅
- [x] Qualifying year scorecard snapshot — live data from `useScorecardData`, stacked realized + forecast bars
- [x] Countdown to December 31 of the qualifying year
- [x] Count of overdue action items (interactive — click circle to mark done)
- [x] Count of people not contacted in 30+ days
- [x] Quick-add button opens modal to add a Win or Action item directly from the dashboard
- [x] Wins and action items now backed by `useWinsData` / `useActionsData` hooks (localStorage, seeded with sample data)

### Phase 6 — Goals tab ✅
- [x] Add, edit, delete goals (title, target date, status, notes)
- [x] Status: Not started / In progress / Done — click status badge to cycle
- [x] IBM milestones: any goal can be flagged as an IBM-set milestone; shown in a dedicated section
- [x] Milestones section title references the qualifying year from settings (not hardcoded to 2026)
- [x] Three IBM milestone goals pre-seeded; fully editable and deletable like any other goal
- [x] Overdue non-done goals highlighted in red
- [x] Done goals shown faded with strikethrough
- [x] "✦ Suggest goals" placeholder button — opens info modal explaining AI integration coming in Phase 10
- [x] Goals ↔ action items are many-to-many: create new actions directly from a goal card, or link/unlink existing ones; action items page shows all linked goal names

### Phase 7 — People tab ✅
- [x] Add, edit, delete people (name, job title, org, email, phone, relationship type, what you need from them)
- [x] Relationship types configurable via Admin tab (default: Champion / Supporter / Peer / Client)
- [x] Touchpoint log per person: date + note, newest first, inline entry form
- [x] Planned contacts per person: date, note, optional action item (create new or link existing)
- [x] "Log as done" converts a planned contact to a real touchpoint and marks the linked action item done
- [x] Last contact derived from most recent touchpoint (never stored directly)
- [x] Contacts not reached in 30+ days flagged with "Follow up needed" badge
- [x] People sorted stalest first; type filter in toolbar
- [x] Dashboard stale contacts count wired to live usePeopleData hook
- [x] Edit/Remove buttons in card header; cards use align-items: start (no whitespace from expanding cards)

### Phase 7b — Admin tab ✅
- [x] `/admin` route and sidebar nav item
- [x] Sub-tab layout: GenAI (API key, partner criteria, career history), Categories (all configurable lists), User settings (tab order, account data)
- [x] Editable "People relationship types" list: add, rename, drag-and-drop reorder, remove
- [x] `useAdminData` hook persists configurable lists to `adminData_v2` (localStorage); migrates from `adminData_v1`
- [x] Relationship types in People tab (filter dropdown, add/edit modal) read from admin data — changes apply immediately
- [x] Win categories (tags) list added to Admin tab — configurable labels and colours
- [x] Each list item has a colour — palette swatches + native color wheel picker; badges and tags rendered with inline styles
- [x] Deal types, logo types, and relationship origins configurable via Admin Categories tab (value/label lists with drag-and-drop reorder)
- [x] All opportunity/win dropdowns read from admin data; defaults provided as fallbacks
- [x] All category lists support drag-and-drop reordering

### Phase 8 — Wins tab ✅
- [x] Full add/edit/delete for wins directly from the Wins tab
- [x] Filter by tag
- [x] Card list view: title, date, impact block, description, tag pills, source badge
- [x] Source badges: "Opportunity: [name]" (green) or "Goal: [title]" (blue) on data-driven wins
- [x] Win prompt triggered when an opportunity status changes to "won" — pre-filled with name, client, win date, signings value; user can edit or skip
- [x] Win prompt triggered when a goal is cycled to "done" — pre-filled with goal title; user can edit or skip
- [x] Prompt only fires once per source (skipped if a win already exists for that opportunity/goal id)
- [x] Opportunities table shows a "W" indicator on rows that have a linked win
- [x] `WinFormModal` component handles both prompt mode (Skip button, context message) and CRUD mode
- [x] `winsData_v2` storage key with automatic migration from `winsData_v1`

### Phase 9 — Action items tab ✅
- [x] Full add/edit/delete for action items
- [x] Overdue items sorted first and highlighted in red
- [x] Linked goal names shown inline
- [x] Goals link via checkbox list in add/edit modal (multi-select, done goals shown struck through)
- [x] Edit/Remove buttons on every row (open and completed sections)

### Phase 10 — My story tab (AI-powered) ✅
- [x] IBM Partner criteria stored in Admin (textarea, paste from PPT/framework doc)
- [x] Career history stored in Admin (textarea, anchors narrative to pre-app background)
- [x] Anthropic API key stored per-user in Admin — saved to user's DB record; never in any env file
- [x] My Story tab generates full story from one button: evidence map, gaps, narrative, 2027 plan
- [x] Shows setup prompt with Admin link if criteria or API key not yet configured
- [x] Evidence map: each IBM criterion mapped to supporting wins, goals, scorecard data
- [x] Gap analysis: criteria with weak or missing evidence highlighted with △
- [x] Polished narrative: 4–6 paragraph first-person promotion case, regenerable as data grows
- [x] 2027 plan: 5–7 prioritised AI recommendations to close gaps before the ask
- [x] Export to plain text (.txt download)
- [x] ✦ Suggest goals button in Goals tab now live — calls AI, shows suggestions with checkboxes to add
- [x] ✦ Suggest impact button in Wins form now uses key from Admin
- [x] `storyData_v1` localStorage key stores last generated output

### Phase 11 — Persistence ✅
- [x] All data saved to PostgreSQL via backend API (`GET/PUT /api/data/:domain`)
- [x] Load user data on login — hooks fetch from server on mount
- [x] Optimistic UI updates — state updates instantly, syncs to server fire-and-forget
- [x] Migrate all localStorage keys (`scorecardData_v2`, `winsData_v2`, `actionsData_v2`, `goalsData_v1`, `peopleData_v1`, `adminData_v2`, `storyData_v1`, `setting_*`) to database on first load
- [x] Auth migrated from in-memory array to PostgreSQL `users` table
- [x] Settings (promotionYear, currency) migrated to `settings` domain in `user_data`
- [x] `backend/migration.sql` — run once in Supabase SQL editor to create schema

### Phase 12 — Sharing + feedback ✅
- [x] Generate a public read-only share link (token-based, stored on users table)
- [x] Public summary page at `/share/:token` — owner controls what is shown (wins, narrative, scorecard)
- [x] Generate a feedback link at `/feedback/:token` for invited reviewers (no auth required)
- [x] Feedback form: reviewer name, 1–5 star rating with labels, open comments
- [x] Owner sees all feedback in Sharing tab inbox
- [x] Reset links button to rotate both tokens and invalidate old links
- [x] `backend/migration_phase12.sql` — run in Supabase to add share_token, feedback_token, feedback table

### Out-of-phase additions ✅
- [x] **Calendar tab** — aggregates key dates from all tabs (goals, action items, wins, opportunities, planned contacts); month/year navigation; colour-coded by type; live — updates instantly when any item is added or edited; hover tooltip (fixed-position, not clipped); click navigates to relevant tab
- [x] **Account wipe + restore** (Admin) — "Clear all account data" button saves a full backup before wiping wins/goals/actions/people/scorecard; backup is verified saved before wipe proceeds; "Restore backup" row appears in Admin if a backup exists; admin settings (categories, API key, IBM criteria) are never touched
- [x] **New accounts start empty** — all hooks initialize to empty data instead of sample seed data; existing accounts unaffected
- [x] **Tab ordering** (Admin) — drag-and-drop and ↑↓ arrows to reorder sidebar tabs; order persisted via AdminDataContext (shared React context so Admin and Layout share the same state instance); changes reflect instantly without reload
- [x] **Dashboard stat card navigation** — clicking "days to go" → Calendar; clicking "overdue actions" → Actions filtered to overdue only (`?filter=overdue`); clicking "contacts to follow up" → People filtered to stale only (`?filter=stale`)
- [x] **Filtered views** — ActionItems and People pages read URL search params and show a dismissable filter banner; "Show all" button clears the filter
- [x] **Dashboard item navigation** — clicking an action item or win in the dashboard navigates to the relevant page with `?id=X`; the target item scrolls into view and flashes a yellow highlight animation
- [x] **Dashboard scorecard highlights** — replaced single-year snapshot cards with a multi-year table (`ScorecardTable`); shows qualifying year and prior 2 years; compact past-year columns; qualifying year column highlighted purple with status badge (Achieved / On track / At risk / Behind / No target); forecast line shown for all metrics; utilization uses projection-based status
- [x] **Currency-aware inputs** — `toInputValue` / `fromInputValue` / `currencySymbol` added to SettingsContext; all currency inputs (Opportunities modal, Projects modal, Targets tab) accept and display values in the user's selected currency (CAD or USD), converting to/from CAD for storage
- [x] **Scorecard overview windowed view** — default shows 3 years (previous, current, next) with ‹/› arrows to navigate; expand button shows all 7 years with horizontal scroll; current year marked with ★ instead of dot; year sub-labels ("Qualifying", "Year −2") removed
- [x] **Targets sub-tab** (Scorecard) — dedicated tab for entering annual targets by year and metric; click-to-edit cells with Enter/blur to save; inline currency conversion; removed target editing from overview grid cells
- [x] **Scorecard cell redesign** — all overview cells now use the same format as the dashboard qualifying-year column (status dot + bold label left, value right; forecast line with coloured %; target line); no bars
- [x] **Metric label updates** — "Sales" → "Signings", "Utilization" → "Chargeable utilization", "Gross Profit" → "Gross profit" throughout app (constants, dashboard, scorecard)
- [x] **Quick add expanded** — modal now covers 5 types: Win, Action item, Goal, Person, Opportunity; modal maintains fixed height so it doesn't resize between tabs
- [x] **Pursuits page** — CRM-style pipeline view of open opportunities; summary strip (total pipeline, weighted pipeline, net-new count, expansion count); clickable stage funnel that filters the table; full pipeline table with stage, probability, signings, expected close, logo type, origin, and strategic rationale; weighted pipeline calculated as Σ(signingsValue × probability/100), defaulting to 50% when probability is unset; stage pills and logo type pills exported as shared components (`StagePip`, `LogoTypePip`) from `OpportunitiesTab`; Opportunity model extended with 7 new fields (stage, probability, expectedClose, dealType, logoType, relationshipOrigin, strategicNote); Win model extended with 3 new strategic context fields (logoType, relationshipOrigin, strategicNote) shown on win cards

### Phase 13 — Multi-user
- [ ] Second user can register and use the app independently
- [ ] All data fully isolated per user
- [ ] No user can see another user's private data

### Phase 14 — Polish
- [ ] Mobile-friendly layout
- [ ] Export wins to plain text (for performance review)
- [ ] Print-friendly scorecard and story views
- [ ] Email notification when feedback is received (optional)
- [ ] Clean up unused `scorecard` export from `sampleData.js` (superseded by `useScorecardData`)

### Phase 15 — Source control, deployment, and promotion workflow

**Goal**: Get the app on GitHub, deployed publicly on Vercel + Render, and establish a safe
local → production promotion workflow so changes can be tested before going live.

#### 15a — GitHub setup
- [ ] Initialise Git repo (if not already done) and push to GitHub (`main` branch)
- [ ] Add `.gitignore` — exclude `node_modules/`, `.env` files, and build artifacts (`dist/`, `build/`)
- [ ] Add `backend/.env.example` and `frontend/.env.example` — safe templates committed to repo
- [ ] Add root `README.md` with local setup instructions and env var reference
- [ ] Add `DEPLOY.md` — the step-by-step promotion workflow cheatsheet
- [ ] Protect `main` branch — no direct pushes; all changes go through `dev` branch and PR

#### 15b — Environment separation

Two environments: **local/dev** and **production**. Each has its own isolated database.

| Config item | Local (dev) | Production |
|---|---|---|
| Frontend URL | `http://localhost:5173` | Vercel domain |
| Backend URL | `http://localhost:3001` | Render service URL |
| Database | Supabase: `promotion-tracker-dev` | Supabase: `promotion-tracker-prod` |
| JWT secret | `backend/.env` → `JWT_SECRET` | Render environment variable |
| Database URL | `backend/.env` → `DATABASE_URL` | Render environment variable |
| Frontend API URL | `frontend/.env` → `VITE_API_URL=http://localhost:3001` | Vercel environment variable |
| Anthropic API key | Per-user Admin setting (stored in dev DB) | Per-user Admin setting (stored in prod DB) |

**The Anthropic API key is never an environment variable.** Each user enters their own key
in the Admin tab. The backend reads it from the user's database record at call time.
This is identical in both environments — no special handling needed.

- [ ] Create two Supabase projects: `promotion-tracker-dev` and `promotion-tracker-prod`
- [ ] Run `backend/migration.sql` and `backend/migration_phase12.sql` on both projects
- [ ] Confirm `backend/.env` and `frontend/.env` are listed in `.gitignore`

#### 15c — Deployment
- [ ] **Backend → Render**: connect GitHub repo; set root directory to `backend/`; add `JWT_SECRET`
  and `DATABASE_URL` (pointing to prod Supabase) as Render environment variables;
  auto-deploys on push to `main`
- [ ] **Frontend → Vercel**: connect GitHub repo; set root directory to `frontend/`; add
  `VITE_API_URL` pointing to the Render backend URL; auto-deploys on push to `main`
- [ ] Add the Vercel domain to the CORS allowed-origins list in `backend/index.js`
- [ ] Smoke-test production after first deploy: register a new account, log in, add a win,
  confirm AI feature shows the "configure key in Admin" prompt

#### 15d — Promotion workflow (local → production)

All day-to-day development follows this cycle:

```
local dev  →  push to `dev` branch  →  open PR to `main`  →  review diff  →  merge  →  auto-deploy
```

Step by step:
1. All new work happens on the `dev` branch (or a short-lived feature branch off `dev`)
2. Test locally against the `promotion-tracker-dev` Supabase database
3. When satisfied, push `dev` to GitHub and open a pull request from `dev` → `main`
4. Review the diff: confirm no secrets, no debug `console.log`, no `.env` files accidentally staged
5. Merge the PR — Vercel and Render auto-deploy within ~2 minutes
6. Open the live site and verify the change looks correct

See `DEPLOY.md` for the condensed cheatsheet version of this workflow.

#### 15e — Database migration process

When a new phase adds schema changes (new table or column):
1. Write the SQL as `backend/migration_phaseXX.sql` and commit it to the repo
2. Run it against `promotion-tracker-dev` and verify locally
3. Only run it against `promotion-tracker-prod` after the code is merged and live
4. Never modify existing migration files — append new ones only

---

### Phase 16 — AI prompt engineering and call optimisation

**Goal**: Make AI features faster, cheaper, and higher quality by improving prompts with
full IBM/public-sector context, consolidating My Story into a single structured call,
adding streaming so the user sees output progressively, and handling errors clearly.

#### Context: current AI call inventory

| Feature | Trigger | Current state | Problem |
|---|---|---|---|
| My Story — full generation | "Generate story" button | Multiple sequential calls | Slow; no streaming; partial failure loses all output |
| Suggest goals | "✦ Suggest goals" in Goals tab | Single call | Generic prompt; no IBM or scorecard context |
| Suggest impact | "✦ Suggest impact" in Win form | Single call | Generic; ignores deal context and scorecard status |

#### 16a — Shared prompt context builder
- [ ] Create `backend/ai/buildContext.js` — a single function that assembles a structured
  context block from the user's live DB data: current role, company, market focus, promotion
  year, qualifying year (and days remaining), scorecard summary (targets vs actuals for the
  qualifying year across all four metrics), top 20 wins (title + impact + tags), active goals,
  IBM Partner criteria, and career history
- [ ] Every AI endpoint calls `buildContext(userId)` and injects the result into the system
  prompt — no feature reimplements this assembly logic
- [ ] Context is built server-side at call time from live DB data — never stale, never
  passed from the frontend

#### 16b — My Story: consolidate and stream
- [ ] Consolidate My Story generation from multiple sequential calls into **one API call**
  that returns a structured JSON object with four top-level keys:
  `evidenceMap`, `gapAnalysis`, `narrative`, `plan`
- [ ] System prompt includes strict JSON schema instructions and explicitly forbids markdown
  fences or preamble — output must be directly parseable
- [ ] Enable **streaming** on the backend (`stream: true`); pipe the response to the frontend
  via chunked transfer or SSE
- [ ] Frontend renders each section progressively as it arrives in the stream: evidence map
  appears first (fast, structured), then gap analysis, then narrative (longest), then plan
- [ ] On partial failure (stream cuts out mid-response), catch and return whatever sections
  arrived successfully with an error flag on the failed section — never lose completed output

#### 16c — Suggest goals: IBM-aware and gap-driven
- [ ] Inject full shared context block into the system prompt
- [ ] Prompt instructs the model to prioritise suggestions that address the user's weakest
  scorecard metrics first, then eminence gaps, then relationship gaps — not generic advice
- [ ] Response schema: `[ { title, rationale, targetDate, isGate } ]` — structured so the
  frontend can pre-populate all goal form fields directly, not just display text
- [ ] Before returning suggestions, filter out any titles that closely match an existing goal
  (simple lowercase substring match is sufficient)

#### 16d — Suggest impact: deal-context-aware
- [ ] When a win is linked to an opportunity, inject the full opportunity record into the
  prompt: client, signings value, stage at win, logo type, relationship origin, strategic note
- [ ] When a win is linked to a goal, inject the goal title, target date, and IBM milestone flag
- [ ] Inject the qualifying year scorecard status so the model can frame impact relative to
  annual targets (e.g. "this deal represented X% of the qualifying year signings target")
- [ ] Prompt explicitly requests first-person, business-impact language suitable for an IBM
  Partner promotion case — concise, outcome-focused, no generic filler phrases

#### 16e — Error handling and user feedback
- [ ] All AI backend endpoints return a consistent error envelope:
  `{ ok: false, error: 'human-readable message', code: 'NO_KEY' | 'INVALID_KEY' | 'OVERLOADED' | 'PARSE_ERROR' }`
- [ ] Frontend maps error codes to specific UI messages:
  - `NO_KEY` → "Add your Anthropic API key in Admin to use this feature"
  - `INVALID_KEY` → "Your API key was rejected — check it in Admin"
  - `OVERLOADED` → "Anthropic is busy right now — wait a moment and try again"
  - `PARSE_ERROR` → "The AI returned an unexpected response — try regenerating"
- [ ] Backend retries on HTTP 529 (overloaded): 2 retries with 2s / 4s exponential backoff
  before returning an `OVERLOADED` error to the frontend
- [ ] Add a lightweight **AI usage log** in Admin — last 10 calls per user showing: feature name,
  timestamp, estimated token count (`charCount / 4`), and success/fail status; helps users
  understand usage and diagnose key issues

#### 16f — Token efficiency
- [ ] Cap context payload before sending to the model: truncate wins to the 20 most recent,
  truncate touchpoint logs to the last 3 per person — the model does not need full history
- [ ] Log estimated token counts to the server console in development for every AI call —
  makes it easy to spot bloated prompts before they hit production
- [ ] My Story generation budget: target under 4,000 input tokens and under 2,000 output tokens

---

## Progress log

| Date | What was done |
|---|---|
| 2026-04-05 | Project planned, architecture decided, full context documented |
| 2026-04-05 | Phase 1 complete — React frontend (Vite) and Express backend running locally on Linux Mint |
| 2026-04-05 | Phase 2 complete — email/password auth with JWT, protected routes, user profile |
| 2026-04-05 | Phase 3 complete — full static UI shell, 7-tab sidebar nav, IBM Canada sample data, design system |
| 2026-04-05 | Phase 4 complete — full scorecard redesign: 7-year grid, Opportunities/Projects/Utilization sub-tabs, new data model (`scorecardData_v2`) |
| 2026-04-05 | Phase 5 complete — dashboard live scorecard snapshot, quick-add modal (win + action item), `useWinsData` and `useActionsData` hooks |
| 2026-04-05 | Phase 6 complete — Goals tab with full CRUD, IBM milestone flag, qualifying-year-aware section, AI suggest placeholder |
| 2026-04-05 | Phase 7 complete — People tab with touchpoint log, stale-contact flagging, type filter, live dashboard wiring |
| 2026-04-05 | Phase 7b complete — Admin tab with editable relationship types list (`adminData_v1`); people cards updated with email/phone fields, planned contacts, Champion/Supporter/Peer/Client types |
| 2026-04-05 | Phase 8 complete — Wins tab full CRUD; data-driven wins from opportunities (on won) and goals (on done); `WinFormModal` shared prompt/CRUD component; `winsData_v2` with source tracking |
| 2026-04-05 | Admin colours — win categories moved to Admin tab; all list items now have configurable hex colours (8-swatch picker); type badges and win tags rendered with inline styles |
| 2026-04-05 | Phase 9 complete — Action items full CRUD with modal; overdue sorted first; goal linking via checkbox list in modal |
| 2026-04-05 | Phase 10 complete — My Story AI tab; IBM criteria + career history + API key in Admin; generate-story and suggest-goals endpoints; Suggest goals live in Goals tab |
| 2026-04-05 | Phase 11 complete — PostgreSQL persistence via Supabase; auth and all 7 data domains in DB; auto-migration from localStorage on first load; optimistic UI throughout |
| 2026-04-05 | Phase 12 complete — share link + feedback link; public summary page; reviewer feedback form; feedback inbox in Sharing tab; reset links |
| 2026-04-05 | Calendar tab added — aggregates dates from goals, actions, wins, opportunities, planned contacts; live reactive; colour-coded legend |
| 2026-04-05 | Account wipe + restore added to Admin; new accounts start empty (no seed data) |
| 2026-04-05 | Calendar tooltip (fixed-position, bypass overflow clipping) and click-to-tab navigation added |
| 2026-04-05 | Tab ordering added to Admin — drag-and-drop + arrows; AdminDataContext lifts state so changes reflect instantly in sidebar |
| 2026-04-05 | Dashboard stat cards made clickable — navigate to Calendar, filtered Actions, filtered People |
| 2026-04-05 | ActionItems and People pages support ?filter= URL params with dismissable banners |
| 2026-04-05 | Dashboard item click navigation — actions and wins link to their page with ?id= highlight animation |
| 2026-04-05 | Dashboard scorecard replaced with multi-year ScorecardTable (qualifying year + prior 2); status badges; forecast lines; currency-coloured % |
| 2026-04-05 | Currency-aware inputs throughout — SettingsContext adds toInputValue/fromInputValue/currencySymbol; OppModal, ProjectModal, TargetsTab all updated |
| 2026-04-05 | Scorecard overview redesigned — windowed 3-year default with nav arrows and expand toggle; StackedCell uses dashboard cell format; targets moved to dedicated Targets sub-tab |
| 2026-04-05 | Metric labels updated globally: Sales→Signings, Utilization→Chargeable utilization, Gross Profit→Gross profit |
| 2026-04-05 | Quick add modal expanded to 5 types: Win, Action item, Goal, Person, Opportunity; fixed height to prevent resizing |
| 2026-04-05 | Pursuits page added — CRM pipeline view; stage funnel; weighted pipeline; Opportunity model extended with stage/probability/expectedClose/dealType/logoType/relationshipOrigin/strategicNote; Win model extended with logoType/relationshipOrigin/strategicNote |
| 2026-04-05 | Admin page split into sub-tabs (GenAI, Categories, User settings); deal types, logo types, relationship origins now configurable lists; all opportunity/win dropdowns read from admin data |
| 2026-04-05 | Form UX standardised: required fields marked with red *, no (optional) text, units shown inline via .form-unit; form-row labels use flex-wrap baseline alignment |
| 2026-04-05 | All category lists support drag-and-drop reordering; colour picker upgraded with native color wheel alongside palette swatches |

---

## Form UX Standards

### Label pattern
All form labels follow a single consistent pattern — no exceptions:

- **Required fields**: label text followed immediately by `<span className="form-required">*</span>` (red asterisk, inline)
- **Optional fields**: label text only — no `(optional)` text, no hint, no marker. The absence of `*` implies optional.
- **Unit indicators** (%, currency): `<span className="form-unit">symbol</span>` immediately after the label text — never in parentheses, never as a separate line

```jsx
// Required
<label>Client name<span className="form-required">*</span>
  <input className="form-input" ... required />
</label>

// Optional — no marker at all
<label>Strategic rationale
  <input className="form-input" ... />
</label>

// With unit
<label>Probability<span className="form-unit">%</span>
  <input className="form-input" type="number" ... />
</label>
```

### Layout
- Labels inside `.form-row` use `display: flex; flex-wrap: wrap; align-items: baseline` — label text and inline spans flow on one row, the input wraps to the next row at full width
- `.form-row` uses `align-items: end` so all inputs in a row are bottom-aligned regardless of label height
- Long descriptive context belongs in `placeholder`, not in the label

### What not to do
- Never write `(optional)` in a label — it wastes space and can cause wrapping
- Never put unit hints like `(%)` or `(CAD)` in parentheses in label text
- Never use `form-hint` class to mark optionality — reserve it for genuinely contextual inline text (e.g. IBM milestone explanation in a checkbox)

---

## How to run locally

```bash
# Copy env templates and fill in your dev credentials (see .env.example files)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Frontend proxies `/api` requests to `localhost:3001` via Vite config.

**The Anthropic API key is not an environment variable.** Each user enters their own key
in the Admin tab after logging in. It is stored in the database and read at call time.
