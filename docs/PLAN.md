# Career Command Center — Project Plan

## Goal

A multi-user web app for professional services leaders managing their path to promotion and beyond. Each user tracks their own scorecard, goals, wins, people, brand, and action items privately. Users grant role-based access to sponsors, peers, and reviewers.

## Context

- **Audience**: Associate Partners / Senior Managers at IBM, Big 4, Accenture going for Partner-level promotions
- **Scale target**: ~12 core users across multiple firms, each granting sponsor/peer/reviewer access to others (100+ total accounts)
- **Qualifying year**: 2026 (building the case) → **Promotion year**: 2027 (making the ask)
- Three gates by Dec 31 of qualifying year: hit targets, complete training, top performer rating
- **Vision**: Promotion tracking is the entry point; the architecture supports ongoing career management. The tool doesn't reset after promotion — it evolves via a lightweight mode shift.

## App structure

| Tab | Access | Purpose |
|---|---|---|
| Dashboard | user | Scorecard snapshot, countdown, overdue items, quick-add |
| Scorecard | user | Overview + Opportunities, Projects, Utilization, Targets sub-tabs |
| Opportunities | user | CRM-style pipeline view of open opportunities |
| Goals | user | Goal cards with IBM milestone (gate) flags |
| People | user | Contacts, relationship types, touchpoint log |
| Wins | user | Accomplishments with impact and eminence tags |
| Action Items | user | To-dos with due dates, linked to goals |
| Narrative + Gaps | user | AI-generated promotion narrative and gap analysis |
| Calendar | user | Aggregated key dates from all tabs |
| Sharing | user | Public share link, feedback link |
| Admin | user | GenAI settings, User settings (nav order, follow-up config) |
| Super Admin | superuser | Categories, readiness weights, deck template, user management |
| Public summary | anyone with link | Read-only selected data |
| Feedback portal | invited reviewers | Structured feedback form |

## Completion status

**Phases 1–23, 7c, 20**: Complete (all of Phase 19 including 19c/g/h/i; Phase 20 working but marked testing-only). Full specs and progress log archived in `docs/PHASES_COMPLETE.md`.

**Issue triage (2026-04-07)**: Resolved 30 of 32 open GitHub issues. Key changes: pursuit→opportunity rename, site-wide categories moved to Super Admin (platform API), narrative subtabs (AI/DIY/Manual), recurring touchpoints with auto-actions, TCV field on opportunities, scorecard table redesign, mobile stability fixes, PWA install banner. Parked #19 (View Others) and #24 (Viewer Access) — absorbed into role/permissions rework (0E).

---

## Career Command Center — Dependency Roadmap

Replaces the old linear phase sequence. Features organized into layers for parallel agent execution. Independent features within a layer can be built simultaneously.

### Key design decisions
- **No campaign objects** — mode shift via settings + snapshot archival
- **Roles rework** — core user, sponsor, peer (authenticated) + reviewer (token-based, no account)
- **Sponsoring is additive** — shows in sponsor's own nav, not a context switch
- **One global category set** — per-user label customization in settings
- **Per-user AI keys** — keep current model, defer platform key decision
- **Influence map** — view on enriched People data, not separate data store
- **Nudges engine** — absorbs meeting prep, weekly review, progress celebrations, AI coaching

### Layer 0 — Foundation (sequential scaffolding) ✅ COMPLETE

| ID | Feature | Key changes | Status |
|----|---------|-------------|--------|
| **0A** | Security hardening | JWT secret validation, rate limiting on AI + public endpoints, SSL in prod | ✅ |
| **0B** | Firm-agnostic config | `firm_config` in `app_settings`, configurable labels in Super Admin, `buildContext.js` uses config | ✅ |
| **0C** | Dashboard widget scaffold | Extracted StatStrip, ScorecardWidget, ActionsWidget, RecentWinsWidget | ✅ |
| **0D** | Navigation scaffold | 6 new routes + placeholder pages, hidden nav entries, icons in BottomTabBar | ✅ |
| **0E** | Role/permissions rework | `user_relationships` table (sponsor/peer), `review_tokens` table, `/api/sponsees`, `requireRelationship` middleware | ✅ |
| **0F** | Email infrastructure | Shared `emailTemplate.js`, rebranded emails, 6 new dedup intervals | ✅ |

Migration required: `migration_layer0e.sql` (run in Supabase SQL editor)

### Layer 1 — Parallel fan-out (12 features)

| ID | Feature | Depends on | Status |
|----|---------|-----------|--------|
| **1A** | People tab enrichment (influence tier, coverage, strategic importance) | 0B | ✅ |
| **1B** | Readiness score snapshots + trend chart | 0C | ✅ |
| **1C** | Structured 360 feedback (5 questions + AI synthesis) | 0E, 0F | ✅ |
| **1D** | Sponsor view (purpose-built summary in Sponsees page) | 0E, 0D | |
| **1E** | Bulk import/export (CSV ZIP) | Layer 0 | ✅ |
| **1F** | Remaining notification types (4 deferred from Phase 23) | 0F | |
| **1G** | AI usage log | Layer 0 | |
| **1H** | Super Admin tooling (100+ user management) | 0E | |
| **1I** | Onboarding polish (self-service at scale) | 0B | |
| **1J** | Competency self-assessment (framework, radar chart, AI gap detection) | 0B | |
| **1K** | Weekly reflection & check-in (habit loop, AI synthesis, Dashboard widget) | 0C, 0F | |
| **1L** | Win enhancement AI (impact statements, bullets, one-liners from context) | Layer 0 | |

### Layer 2 — Second parallel fan-out (9 features)

| ID | Feature | Depends on | Status |
|----|---------|-----------|--------|
| **2A** | Influence map (strategic People visualization) | 1A | |
| **2B** | Brand workspace (positioning, perception, proof points) | 0B, 1C | |
| **2C** | Smart nudges engine (rules + AI coaching on Dashboard) | 0B, 0C, 1B | |
| **2D** | Peer benchmarking (anonymized comparison) | 0E, 1B | |
| **2E** | LinkedIn import (paste → AI parse → People) | 1A | |
| **2F** | Document vault (file uploads on wins/eminence) | 0D | |
| **2G** | Mode shift wizard (role transition flow) | 0B, 1B | |
| **2H** | Meeting prep & debrief engine (AI prep cards, quick-capture debrief) | 1A | |
| **2I** | Calendar integration (read-only sync, auto-detect tracked contacts) | 2H | _deferred_ |

### Layer 3 — Final features (2 features)

| ID | Feature | Depends on | Status |
|----|---------|-----------|--------|
| **3A** | AI mock promotion panel (interactive practice + debriefs) | 2B, 1J | |
| **3B** | Promotion package generator (content assembly + export) | 2B, 1L | |

### Dependency graph (visual)

```
LAYER 0 (sequential) ✅
  0A Security → 0B Config → 0C Dashboard + 0D Nav → 0E Roles
  0F Email (parallel with 0C/0D)

LAYER 1 (parallel)               LAYER 2 (parallel)
  1A People ✅ ─────────────────→ 2A Influence Map
                             └──→ 2E LinkedIn Import
                             └──→ 2H Meeting Prep & Debrief
  1B Readiness ✅ ──────────────→ 2C Smart Nudges ←── 1J, 1K also enrich
                             └──→ 2D Peer Benchmarking
                             └──→ 2G Mode Shift
  1C Feedback ✅ ───────────────→ 2B Brand Workspace ←── 1J also enriches
  1D Sponsor View
  1E Import/Export ✅             2F Document Vault
  1F Notifications + 1G AI Log   2I Calendar Integration (deferred) ←── 2H
  1H Super Admin + 1I Onboarding
  1J Competency Assessment        LAYER 3 (parallel)
  1K Weekly Reflection              3A Mock Panel ←── 2B + 1J
  1L Win Enhancement AI             3B Package Gen ←── 2B + 1L
```

### New features from competitive gap analysis (2026-04-08)

Added after analyzing CCC against Lattice, Pando, BragBook, MyCareerDiary, Career Compass AI, BetterUp, Rocky.ai. These address the biggest gaps while staying true to CCC's individual-owned, executive-grade positioning.

| ID | Feature | Layer | Effort | Build priority |
|----|---------|-------|--------|---------------|
| **1L** | Win enhancement AI | 1 | Low | 1st — highest ROI, single session |
| **1K** | Weekly reflection & check-in | 1 | Low-medium | 2nd — creates habit loop |
| **1J** | Competency self-assessment | 1 | Medium | 3rd — strategic heavyweight |
| **2H** | Meeting prep & debrief engine | 2 | Medium | 4th — daily engagement driver |
| **2I** | Calendar integration (deferred) | 2+ | High | Deferred — design notes only |

**1L Win Enhancement AI**: "Enhance with AI" button on win entries. Transforms raw accomplishments into quantified impact statements using cross-referenced scorecard, opportunity, and people data. Three modes: impact statement (STAR format), bullet points, one-liner. Endpoint: `POST /api/ai/enhance-win`.

**1K Weekly Reflection**: 5-minute Friday check-in (6 questions: biggest win, challenge, learning, next-week focus, confidence 1-10, need help). Dashboard widget with streak counter. AI synthesis extracts recurring themes, maps to competencies, tracks confidence trend. Bridges to action: "Quick-log as win" and "Create action item" buttons. Endpoint: `POST /api/ai/reflection-synthesis`.

**1J Competency Self-Assessment**: Rate yourself against a configurable 7-category competency framework (commercial acumen, client relationship, leadership, practice building, executive presence, strategic thinking, delivery excellence). 4 proficiency levels per competency. Link evidence from wins/feedback/eminence. Radar chart visualization with historical overlay. AI perception-gap detection (self-rating vs. actual evidence). Endpoint: `POST /api/ai/competency-analysis`.

**2H Meeting Prep & Debrief**: Before meetings with tracked contacts, AI generates prep cards with relationship health, context from your data, and suggested talking points. After meetings, quick-capture debrief form logs outcomes, creates follow-up actions, and auto-creates touchpoints. Extends People domain. Endpoint: `POST /api/ai/meeting-prep`.

**2I Calendar Integration (deferred — design only)**: Read-only Google Calendar / Outlook sync. Auto-detect meetings with tracked contacts. Privacy-first: only matched meetings stored, calendar data never sent to AI. Will build when 2H is complete.

### Deferred from completed phases (absorbed into roadmap)
- AI usage log → **1G**
- PowerPoint deck polish → absorbed into **3B** (promotion package generator)
- 4 notification types → **1F**

---

## Legacy phase specs

Completed phases archived in `docs/PHASES_COMPLETE.md`. Original phase specs archived in `docs/archive/`.
