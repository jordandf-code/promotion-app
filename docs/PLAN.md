# Promotion Tracker — Project Plan

## Goal

A multi-user web app to manage the path to promotion at IBM Canada. Each user tracks their
own scorecard, goals, wins, people, and action items privately. Users can share a read-only
summary link and invite others to leave structured feedback.

## Context

- **Company**: IBM Canada — consulting, Canadian public sector (federal/provincial/municipal)
- **Current role**: Associate Partner → **Target role**: Partner
- **Expected users**: 2–3 IBMers, each with their own private data
- **Qualifying year**: 2026 (building the case) → **Promotion year**: 2027 (making the ask)
- Three gates by Dec 31 of qualifying year: hit targets, complete training, top performer rating

## Tech stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 19 (Vite 8) | Vercel (free) |
| Backend | Node.js + Express | Render (free) |
| Database | PostgreSQL | Supabase (free) |
| AI | Anthropic API (claude-sonnet-4-6) | Via backend proxy |
| Auth | JWT (email + password) | Backend |

AI key is per-user (stored in DB via Admin tab), never an env var.

## App structure

| Tab | Access | Purpose |
|---|---|---|
| Dashboard | user | Scorecard snapshot, countdown, overdue items, quick-add |
| Scorecard | user | Overview + Opportunities, Projects, Utilization, Targets sub-tabs |
| Pursuits | user | CRM-style pipeline view of open opportunities |
| Goals | user | Goal cards with IBM milestone (gate) flags |
| People | user | Contacts, relationship types, touchpoint log |
| Wins | user | Accomplishments with impact and eminence tags |
| Action Items | user | To-dos with due dates, linked to goals |
| Narrative + Gaps | user | AI-generated promotion narrative and gap analysis |
| Calendar | user | Aggregated key dates from all tabs |
| Sharing | user | Public share link, feedback link |
| Admin | user | GenAI settings, Categories, User settings |
| Public summary | anyone with link | Read-only selected data |
| Feedback portal | invited reviewers | Structured feedback form |

## Completion status

**Phases 1–23, 7c, 20**: Complete (all of Phase 19 including 19c/g/h/i; Phase 20 working but marked testing-only). Full specs and progress log archived in `docs/PHASES_COMPLETE.md`.

**Uncompleted items in "done" phases**:
- Phase 16 — AI usage log in Admin: deferred (add to future phase)
- Phase 20 — PowerPoint deck export: core pipeline working (prompt, render, route, Admin UI, MyStory UI) but output quality needs work. Marked as testing only. Revisit: improve placeholder replacement fidelity, tune AI prompt for better content, fix template rendering issues.
- Phase 23 — Only weekly digest + feedback received implemented; overdue_action, stale_contact, goal_deadline, scorecard_at_risk notification types deferred

## Backlog and build sequence

### Dependency map

| Phase | Depends on (unbuilt) | Can start now? |
|---|---|---|
| 24 — Bulk import/export | — | ✅ |
| 25 — LinkedIn import | — | ✅ |
| 20 — PowerPoint deck export | — | ✅ (testing only — needs polish) |
| 26a–e — Structured 360 feedback | — | ✅ |
| 26g — Sponsor view | — | ✅ |
| 26h — Peer benchmarking | — | ✅ |

### Recommended priority

**All remaining phases are unblocked:**
1. **Phase 24** — Bulk import/export.
2. **Phase 25** — LinkedIn import.
3. **Phase 26a–e** — Structured 360 feedback.
5. **Phase 26g** — Sponsor view.
6. **Phase 26h** — Peer benchmarking.

### Deferred items (no phase assigned)
- AI usage log in Admin (originally Phase 16, deferred)

## Phase specs

Each upcoming phase has a detailed spec in `docs/`:
- `docs/PHASE_7C.md` — People relationship status
- `docs/PHASE_17.md` — Learning tab
- `docs/PHASE_18.md` — Roles and access control
- `docs/PHASE_19.md` — Mobile UX and PWA
- `docs/PHASE_20.md` — PowerPoint deck export
- `docs/PHASE_21.md` — Readiness score
- `docs/PHASE_22.md` — Eminence tracker
- `docs/PHASE_23.md` — Notifications
- `docs/PHASE_24.md` — Bulk import/export
- `docs/PHASE_25.md` — LinkedIn import
- `docs/PHASE_26.md` — Structured 360 feedback

## Other reference docs

- Data model schemas: `docs/DATA_MODEL.md`
- Form UX standards: `docs/FORM_UX.md`
- AI prompt specs: `backend/ai/AIprompt.md`
- Deployment workflow: `DEPLOY.md`
