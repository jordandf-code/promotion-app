# Glossary — Common Language Reference

When Jordan uses these terms, this is what they mean in the app.

## IBM Role & Timeline

| Term | Meaning |
|------|---------|
| **Associate Partner** | Jordan's current role at IBM Canada |
| **Partner** | Target promotion role (2027) |
| **Qualifying year** | Year before promotion (2026) — building the case, Dec 31 deadline |
| **Promotion year** | Year of the ask (2027) |
| **Gate / IBM milestone** | Required checkbox for promotion. Goals with `isGate: true` |
| **Three gates** | Hit targets, complete training, top performer rating — all by Dec 31 of qualifying year |

## Financial Metrics (Scorecard)

| Term | Code field | Notes |
|------|-----------|-------|
| **Signings** | `sales` | Closed deal value. UI says "Signings", never "Sales" |
| **Revenue** | `revenue` | Total project revenue (quarterly breakdown) |
| **Gross profit** | `grossProfit` | Revenue minus delivery costs. Not "Gross Profit" (lowercase p) |
| **Chargeable utilization** | `utilization` | Billable hours. Not just "Utilization" |

All currency stored in CAD. Display can toggle to USD at 1.5x rate.

## Pages & Tabs

| What Jordan says | Component | Route |
|-----------------|-----------|-------|
| **Dashboard** | Dashboard.jsx | `/` |
| **Scorecard** | Scorecard.jsx (sub-tabs: Overview, Targets, Opportunities, Projects, Utilization) | `/scorecard` |
| **Opportunities / Pipeline** | Pursuits.jsx — CRM-style pipeline/funnel view | `/opportunities` |
| **Goals** | Goals.jsx | `/goals` |
| **People** | People.jsx — contacts & relationships | `/people` |
| **Wins** | Wins.jsx — accomplishments | `/wins` |
| **Actions** | ActionItems.jsx — to-dos with due dates | `/actions` |
| **Story / Narrative** | MyStory.jsx — AI narrative + gap analysis (3 subtabs: AI Generated / DIY / Manual) | `/story` |
| **Learning** | Learning.jsx — certs & courses | `/learning` |
| **Eminence** | Eminence.jsx — thought leadership activities | `/eminence` |
| **Calendar** | Calendar.jsx — aggregated dates from all tabs | `/calendar` |
| **Admin** | Admin.jsx — AI settings, user settings | `/admin` |
| **Super Admin** | SuperAdmin.jsx — categories, firm config, user management | `/super-admin` |
| **Sharing** | Sharing.jsx — public link + feedback (sub-tabs: Links / Feedback) | `/sharing` |
| **Import/Export** | ImportExport.jsx — CSV import and ZIP export | `/import-export` |

Hidden pages (registered but not in nav): `/influence-map`, `/brand`, `/mock-panel`, `/vault`

## Pipeline Stages & Statuses

**Stages** (progression): Identified > Qualified > Proposed > Verbal > Closed
**Status** (outcome): open | won | lost

"Closed" is a stage. "Won" is a status. A deal can be at the "Closed" stage but still "open" status.

## UI Components

| What Jordan says | What it is |
|-----------------|-----------|
| **Tile / card** | A card component (WinCard, PersonCard, GoalCard, etc.) |
| **Modal / popup / form** | Modal overlay (OppModal, WinFormModal, PersonModal, etc.) |
| **Stat card** | KPI box on Dashboard (days left, overdue count, etc.) |
| **Stat strip** | Row of stat cards across Dashboard top |
| **Funnel** | Pipeline visualization on Opportunities page |
| **Tags / pills** | Colored category badges (win tags, eminence types) |
| **Quick add** | FAB button + modal on Dashboard for creating items |
| **Readiness widget** | Circular progress chart with 5 weighted dimensions |

## Confusable Terms

| Term | Context A | Context B |
|------|-----------|-----------|
| **Qualified** | Pipeline stage (deal qualified) | Qualifying year (promotion timeline) |
| **Closed** | Pipeline stage (final) | Not the same as Won (a deal can be Closed stage but open status) |
| **Forecast** | Project status (not yet realized) | Utilization projection (future hours) |
| **Eminence** | Win tag category | Separate data domain with activities |
| **Demo mode** | Sample data for new users | Toggle off to start real journey |
| **Sales / Signings** | Code uses `sales` | UI displays "Signings" — always use "Signings" |
| **Admin** | Per-user settings page (`/admin`) | Super Admin is the platform-wide management page (`/super-admin`) |
