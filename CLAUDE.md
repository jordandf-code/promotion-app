# Career Command Center

Multi-user web app for professional services leaders managing their path to promotion and beyond. React frontend, Node.js/Express backend, PostgreSQL (Supabase). Deployed on Vercel (frontend) + Render (backend). Target: ~12 core users across firms (IBM, Big 4, Accenture), 100+ total accounts with sponsor/peer/reviewer access.

## Tech stack

- **Frontend**: React 19, Vite 8, deployed to Vercel
- **Backend**: Node.js + Express, deployed to Render
- **Database**: PostgreSQL on Supabase (JSONB `user_data` table for all domains)
- **AI**: Anthropic API (claude-sonnet-4-6) — key stored per-user in DB, never in env vars
- **Auth**: JWT (email + password)

## Project structure

```
frontend/
  src/
    pages/           — one file per tab (Dashboard, Scorecard, Goals, People, Wins, etc.)
    components/      — shared UI components
    hooks/           — data hooks (useScorecardData, useWinsData, useGoalsData, etc.)
    contexts/        — React contexts (SettingsContext, AdminDataContext)
    utils/           — helpers (aiErrors.js, formatting)
backend/
  routes/            — Express route files (auth.js, data.js, ai.js, share.js, feedback.js)
  ai/                — AI pipeline (buildContext.js, prompts.js, callAnthropic.js)
  migration*.sql     — DB migrations (run in Supabase SQL editor, never modify existing ones)
docs/                — phase specs, data model, completed phase archive
```

## Commands

```bash
# Run locally (two terminals)
cd backend && npm run dev    # port 3001
cd frontend && npm run dev   # port 5173

# Git workflow
git checkout dev             # all work on dev branch
# Before committing: update docs/PLAN.md, docs/PHASES_COMPLETE.md, and CLAUDE.md
# to reflect what was built (completion status, dependency map, "what to build next")
git add -p                   # stage specific changes (prefer over git add -A)
git commit -m "description"
git push origin dev          # then PR to main
gh pr create --base main --head dev --title "title" --body "body"
gh pr merge --merge          # merge PR to main for auto-deploy

# Verify deploy succeeded
# Vercel: check dashboard or live site
# Render: check dashboard Events tab or hit /api/health
```

## Key conventions

### Data persistence pattern
All user data stored in PostgreSQL `user_data` table as JSONB, keyed by `(user_id, domain)`. Domains: `scorecard`, `wins`, `actions`, `goals`, `people`, `admin`, `story`, `settings`, `sharing`, `backup`, `learning`. Each domain has a React hook (`useXxxData`) that follows the same optimistic-update pattern: state updates instantly in React, then fires a debounced background PUT to `/api/data/:domain` (300ms debounce + per-domain deduplication in `api.js`).

### Currency
ALL currency values stored in CAD. Display conversion to USD uses 1.5× rate. `SettingsContext` provides `toInputValue()`, `fromInputValue()`, and `currencySymbol` — use these in all currency inputs and displays.

### API patterns
- All data endpoints: `GET /api/data/:domain` and `PUT /api/data/:domain`, scoped to `req.userId` via JWT
- Export endpoints: `GET /api/export` (full ZIP), `GET /api/export/:domain` (single CSV)
- AI endpoints: `POST /api/ai/narrative`, `POST /api/ai/suggest-goals`, `POST /api/ai/suggest-impact`
- AI calls use `buildContext(userId)` to assemble all user data server-side — frontend never sends data payloads to AI endpoints
- Error envelope: `{ ok: false, error, code }` with codes: NO_KEY, NO_CRITERIA, INVALID_KEY, RATE_LIMITED, OVERLOADED, BILLING, PARSE_ERROR

### AI architecture
`buildContext.js` loads all domains → `prompts.js` selects system prompt → `callAnthropic.js` sends to API with retry on 529. API key loaded from user's `adminData` in DB. Results cached in `storyData_v1` under `gap_analysis` and `polished_narrative` keys. Full prompt specs in `backend/ai/AIprompt.md`.

### Form UX
Required fields: red `*` via `<span className="form-required">*</span>`. Optional fields: no marker at all — never write "(optional)". Units: `<span className="form-unit">%</span>` inline after label. Full spec in `docs/FORM_UX.md`.

### Mobile UX
**Every UI change must work on both desktop and mobile (375px viewport).** Test at the 768px breakpoint. No horizontal scrolling allowed. Key patterns: top-anchored modals, 44px touch targets, tables convert to cards, sub-tabs become dropdowns, scorecard uses single-year arrow navigation. Full spec in `docs/MOBILE_UX.md`.

### Adding a new data domain
Follow the pattern from existing hooks. New domain needs: a `useXxxData` hook (copy any existing one), add domain to `GET/PUT /api/data/:domain` whitelist in backend, add to `buildContext.js` if AI needs it. No migration needed — `user_data` table handles arbitrary domain strings.

## Current status

Phases 1–23, 7c, and 20 complete (all of Phase 19 including 19c/g/h/i; Phase 20 testing-only). New users get demo data across all 7 domains with a `demoMode` flag and "Start your promotion journey" onboarding flow. 30 of 32 GitHub issues resolved (2026-04-07 triage). Key changes: pursuit→opportunity rename (route is now `/opportunities`), site-wide categories moved from Admin to Super Admin (new `/api/platform` endpoint), narrative page has 3 subtabs (AI Generated / DIY Prompts / Manual Input), recurring touchpoints with auto-actions, TCV field on opportunities, scorecard table redesigned. See `docs/PHASES_COMPLETE.md` for full history.

**Restructured as Career Command Center (2026-04-07)**: Old linear phase sequence replaced with a 4-layer dependency graph optimized for parallel agent execution. 22 features across Layers 0–3. See `docs/PLAN.md` for the full dependency roadmap.

**Layer 0 complete (2026-04-07)**: Security hardening (0A), firm-agnostic config (0B), Dashboard widget scaffold (0C), navigation scaffold with 6 new placeholder routes (0D), role/permissions rework with `user_relationships` table (0E), email infrastructure (0F). Migration `migration_layer0e.sql` must be run in Supabase before deploying.

**Layer 1E complete (2026-04-08)**: Bulk import/export — `GET /api/export` (full ZIP with 10 CSVs + README), `GET /api/export/:domain` (single CSV), ImportExport page with export button + import for opportunities/wins/people, shared ImportModal component, CSV utilities with papaparse, duplicate detection for people, pipe-separated tags for wins. Nav item unhidden.

**Layer 1C complete (2026-04-08)**: Structured 360 feedback — 5 soft-skill dimensions (strategic thinking, executive presence, collaboration & influence, delivery excellence, growth mindset). Public feedback form upgraded with per-dimension ratings + optional comments. Feedback request flow from People cards via review_tokens + Resend email. Sharing page split into Links/Feedback sub-tabs. Feedback inbox with expandable dimension details. AI synthesis via `POST /api/ai/synthesize-feedback`. Synthesis cached in `feedback_synthesis` domain. `buildContext.js` includes feedback_360 data. Migration: `migration_1c_feedback.sql`.

**Layer 1A complete (2026-04-08)**: People tab enrichment — 3 new fields per person: `influenceTier` (decision-maker/influencer/supporter/informer), `strategicImportance` (critical/high/medium/low), `stakeholderGroup` (combobox with defaults + free text). Collapsible CoverageSummary panel on People page (stakeholder groups × influence tiers, gap/thin/covered indicators). Influence tier filter dropdown. Color-coded badges on PersonCard. AI pipeline includes new fields + coverage stats. No migration needed.

**Layer 1B complete (2026-04-08)**: Readiness score snapshots + trend chart — new `readiness` domain with `useReadinessSnapshots` hook (auto-snapshot once/day on Dashboard load, manual via "Snapshot" button, 365-snapshot cap, same-day dedup). `ReadinessTrendWidget` (pure SVG line chart: overall score line + 5 togglable dimension lines, hover tooltips, responsive legend). Placed on Dashboard between ReadinessWidget and ScorecardWidget. No migration needed.

## What to build next

**Layer 1 is in progress** — 1A, 1B, 1C, and 1E done, 4 remaining features can be built in parallel:
- ~~**1A** People tab enrichment~~ ✅
- ~~**1B** Readiness score snapshots + trend chart~~ ✅
- ~~**1C** Structured 360 feedback~~ ✅
- **1D** Sponsor view (Sponsees page)
- ~~**1E** Bulk import/export (CSV ZIP)~~ ✅
- **1F** Remaining notification types + **1G** AI usage log
- **1H** Super Admin tooling + **1I** Onboarding polish

See `docs/PLAN.md` for dependencies and the full graph.

## Important gotchas

- Modal backdrop clicks do NOT close modals (prevents data loss) — do not change this
- Anthropic API key is NEVER an env var — always per-user from DB
- Never modify existing `migration*.sql` files — always create new ones
- `adminData` sync has a `serverLoaded` guard to prevent race conditions — do not remove
- Scorecard metric labels are now configurable via firm config in Super Admin → Platform. Defaults: "Signings", "Revenue", "Gross profit", "Chargeable utilization"
- Route is `/opportunities` (not `/pursuits`) — renamed in 2026-04-07 triage
- Site-wide categories (win tags, relationship types, pipeline stages, etc.) are stored via `/api/platform` and managed in Super Admin — NOT per-user admin data
- Platform data uses `app_settings` table (keys: `platform_categories`, `firm_config`), not `user_data`
- Narrative page has 3 subtabs with an "active source" toggle that controls which source feeds the readiness score's evidence dimension
- User relationships use `user_relationships` table (sponsor/peer types). Old `viewer_access` table kept for backward compat — both are written to during transition
- New pages (influence-map, brand, mock-panel, vault) are registered in App.jsx and Layout.jsx but hidden in nav. When building these features, flip `hidden: false` in Layout.jsx `ALL_NAV_ITEMS`
- Export endpoint: `GET /api/export` (full ZIP) and `GET /api/export/:domain` (single CSV) — auth required, currency in CAD
- Dashboard uses widget slot pattern — add new widgets as components in `components/dashboard/`, import and place them in Dashboard.jsx. Don't inline new sections.
- Sharing page now has sub-tabs (Links | Feedback). Feedback tab has request tracking, expandable inbox, and AI synthesis.
- Feedback form supports both legacy (single star rating via `feedback_token`) and structured 360 (5 dimensions via `review_tokens`). Token type determines form mode.
- `feedback_synthesis` is a user_data domain — cached AI synthesis of 360 feedback responses.

## Session workflow

Start each session by telling Claude which docs to read for the task at hand. Examples:
- New phase: "Read docs/PHASE_21.md and docs/DATA_MODEL.md. Build Phase 21."
- UI work: "Read docs/PHASE_17.md and docs/FORM_UX.md. Build the certification modal."
- AI pipeline: "Read backend/ai/AIprompt.md. Fix the gap analysis JSON parsing."
- Planning: "Read docs/PLAN.md. What should I build next?"

When compacting, preserve: the current phase being worked on, which files have been modified, what checklist items are done vs remaining, and any failing tests.

## Reference docs

- Common language glossary: `docs/GLOSSARY.md`
- Data model schemas: `docs/DATA_MODEL.md`
- Form UX standards: `docs/FORM_UX.md`
- AI prompt specs: `backend/ai/AIprompt.md`
- Deployment workflow: `DEPLOY.md`
- Mobile UX standards: `docs/MOBILE_UX.md`
- Completed phase archive: `docs/PHASES_COMPLETE.md`
- Individual phase specs: `docs/PHASE_17.md` through `docs/PHASE_26.md`
