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
# Before committing: see .claude/rules/commit-checklist.md for which docs to update
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
All user data stored in PostgreSQL `user_data` table as JSONB, keyed by `(user_id, domain)`. Domains: `scorecard`, `wins`, `actions`, `goals`, `people`, `admin`, `story`, `settings`, `sharing`, `backup`, `learning`, `eminence`, `readiness`, `feedback_synthesis`. Each domain has a React hook (`useXxxData`) that follows the same optimistic-update pattern: state updates instantly in React, then fires a debounced background PUT to `/api/data/:domain` (300ms debounce + per-domain deduplication in `api.js`).

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
After any UI change, verify the component renders without horizontal scroll at 375px. If adding a table, it must have a card-view fallback below 768px. If adding a sub-tab bar, it must have a select dropdown alternative on mobile. No element should have a fixed pixel width > 375px without `max-width: 100%`. Common horizontal scroll causes: fixed-width table columns, flex rows without `flex-wrap`, `min-width` on filter/button rows. Full spec in `docs/MOBILE_UX.md`.

### Adding a new data domain
Every new domain requires ALL of the following:
1. `useXxxData` hook (copy any existing one)
2. Add domain string to the whitelist array in `backend/routes/data.js`
3. Add `loadDomain(userId, 'xxx')` call in `backend/ai/buildContext.js` if AI needs it
4. Add seed entry in the demo data initializer (search for `demoMode` in backend)
5. Add to CSV export in `backend/routes/export.js` if user-facing
6. If the domain has UI on more than one page, list all affected pages before starting — build all of them

No migration needed — `user_data` table handles arbitrary domain strings.

## Build rules

### Scope check
Before modifying any file, identify every surface that consumes the same data or shares the same UI pattern (sibling pages, share views, mobile breakpoints, export, AI context). Change them all in the same commit. If unsure which surfaces are affected, grep before coding.

### Check all surfaces
Every UI change must be verified at 375px and 768px before considering it complete. Every new data field must be added to: the hook, the form, the card/display, the CSV export, and `buildContext.js` (if AI-relevant). Missing any surface is a bug.

### Re-investigate when challenged
When the user says something is wrong ("are you sure?", "that doesn't seem right"), re-read the actual files before responding. Never defend prior work from memory — verify against current code.

### Scope discipline
Only modify files directly required for the stated task. Do not opportunistically refactor, rename, or clean up adjacent code unless asked. If you notice a problem outside scope, mention it instead of fixing it.

## Current status

Layer 0 and Layer 1 complete (all 12 features: 1A-1L). Layer 2 ready to start. See `docs/PLAN.md` for the full dependency graph. Migrations required: `migration_layer0e.sql`, `migration_1c_feedback.sql`, `migration_1g_ai_log.sql`.

## Doc loading

Read only what the task requires — do not load docs speculatively.
- Feature work: `docs/PLAN.md` + `docs/DATA_MODEL.md`
- UI work: add `docs/FORM_UX.md` + `docs/MOBILE_UX.md`
- AI pipeline: `backend/ai/AIprompt.md`
- Ambiguous terms: check `docs/GLOSSARY.md` first
- Phase history: `docs/PHASES_COMPLETE.md` (archive only — ~4,500 tokens, do not load unless debugging legacy behavior)

If you need a credential, config value, or invite code to proceed — ask immediately. Do not guess or search for it.

When compacting, preserve: the current task, which files have been modified, which checklist items are done vs remaining, and any failing tests or blockers.

