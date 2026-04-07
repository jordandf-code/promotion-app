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

**Phases 1–19, 21**: Complete. Full specs and progress log archived in `docs/PHASES_COMPLETE.md`.

**Uncompleted items in "done" phases**:
- Phase 7c — People `relationshipStatus` field: not built (separate backlog item)
- Phase 14 — Email notification on feedback: deferred to Phase 23
- Phase 16 — AI usage log in Admin: deferred (add to future phase)

## Backlog and build sequence

### Dependency map

| Phase | Depends on (unbuilt) | Can start now? |
|---|---|---|
| 7c — People: relationship status | — | ✅ |
| 17 — Learning tab | — | ✅ |
| 18 — Roles and access control | — | ✅ |
| 19a/b/d/e/f — Mobile core | — | ✅ |
| 21 — Readiness score | — | ✅ |
| 22 — Eminence tracker | 21 | After 21 |
| 19c/g/h/i — Mobile tables + views | 18 | After 18 |
| 23 — Notifications | 18 | After 18 |
| 24 — Bulk import/export | 17, 22 | After 17 + 22 |
| 25 — LinkedIn import | 7c | After 7c |
| 20 — PowerPoint deck export | 17, 22 | After 17 + 22 |
| 26a–e — Structured 360 feedback | 21, 23 | After 21 + 23 |
| 26g — Sponsor view | 18, 21 | After 18 + 21 |
| 26h — Peer benchmarking | 18, 21 | After 18 + 21 |

### Recommended priority

**Wave 1 — independent foundations** (any order):
1. **Phase 21** — Readiness score. Pure frontend, no deps, high dashboard value, unblocks most downstream work.
2. **Phase 18** — Roles and access control. Largest item, unlocks the most other work.
3. **Phase 17** — Learning tab. Self-contained new domain.
4. **Phase 7c** — People relationship status. Tiny scope, immediate value.
5. **Phase 19a/b/d/e/f** — Mobile core (PWA, bottom tab bar, bottom sheets, touch targets).

**Wave 2** (start as deps complete):
6. Phase 22 — Eminence tracker (after 21)
7. Phase 25 — LinkedIn import (after 7c)
8. Phase 23 — Notifications (after 18)
9. Phase 19c/g/h/i — Mobile tables/views (after 18)

**Wave 3** (builds on Wave 2):
10. Phase 20 — PowerPoint deck export (after 17 + 22)
11. Phase 24 — Bulk import/export (after 17 + 22)
12. Phase 26a–e — Structured 360 feedback (after 21 + 23)
13. Phase 26g — Sponsor view (after 18 + 21)
14. Phase 26h — Peer benchmarking architecture (after 18 + 21)

**If starting one thing today**: Phase 21 (readiness score).

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
