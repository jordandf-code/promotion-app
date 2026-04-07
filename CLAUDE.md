# Promotion Tracker

Multi-user web app for IBM Canada Associate Partners tracking their path to Partner promotion. React frontend, Node.js/Express backend, PostgreSQL (Supabase). Deployed on Vercel (frontend) + Render (backend).

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
git add -A && git commit -m "description"
git push origin dev          # then PR to main
gh pr create --base main --head dev --title "title" --body "body"
gh pr merge --merge          # merge PR to main for auto-deploy
```

## Key conventions

### Data persistence pattern
All user data stored in PostgreSQL `user_data` table as JSONB, keyed by `(user_id, domain)`. Domains: `scorecard`, `wins`, `actions`, `goals`, `people`, `admin`, `story`, `settings`, `sharing`, `backup`, `learning`. Each domain has a React hook (`useXxxData`) that follows the same optimistic-update pattern: state updates instantly in React, then fires a debounced background PUT to `/api/data/:domain` (300ms debounce + per-domain deduplication in `api.js`).

### Currency
ALL currency values stored in CAD. Display conversion to USD uses 1.5× rate. `SettingsContext` provides `toInputValue()`, `fromInputValue()`, and `currencySymbol` — use these in all currency inputs and displays.

### API patterns
- All data endpoints: `GET /api/data/:domain` and `PUT /api/data/:domain`, scoped to `req.userId` via JWT
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

Phases 1–22 and 7c complete (all of Phase 19 including 19c/g/h/i). All foundation phases are done. See `docs/PLAN.md` for build sequence and `docs/PHASES_COMPLETE.md` for full history.

## What to build next

All remaining phases are unblocked (except 26a–e which needs 23). Priority order: Phase 23 (notifications) → Phase 20 (PowerPoint export) → Phase 24 (bulk import/export) → Phase 25 (LinkedIn import) → Phase 26 (structured 360 feedback). See `docs/PLAN.md`.

## Important gotchas

- Modal backdrop clicks do NOT close modals (prevents data loss) — do not change this
- Anthropic API key is NEVER an env var — always per-user from DB
- Never modify existing `migration*.sql` files — always create new ones
- `adminData` sync has a `serverLoaded` guard to prevent race conditions — do not remove
- Scorecard metric labels: "Signings" (not Sales), "Chargeable utilization" (not Utilization), "Gross profit" (not Gross Profit)

## Session workflow

Start each session by telling Claude which docs to read for the task at hand. Examples:
- New phase: "Read docs/PHASE_21.md and docs/DATA_MODEL.md. Build Phase 21."
- UI work: "Read docs/PHASE_17.md and docs/FORM_UX.md. Build the certification modal."
- AI pipeline: "Read backend/ai/AIprompt.md. Fix the gap analysis JSON parsing."
- Planning: "Read docs/PLAN.md. What should I build next?"

When compacting, preserve: the current phase being worked on, which files have been modified, what checklist items are done vs remaining, and any failing tests.

## Reference docs

- Data model schemas: `docs/DATA_MODEL.md`
- Form UX standards: `docs/FORM_UX.md`
- AI prompt specs: `backend/ai/AIprompt.md`
- Deployment workflow: `DEPLOY.md`
- Mobile UX standards: `docs/MOBILE_UX.md`
- Completed phase archive: `docs/PHASES_COMPLETE.md`
- Individual phase specs: `docs/PHASE_17.md` through `docs/PHASE_26.md`
