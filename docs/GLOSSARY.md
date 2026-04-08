# Glossary — Common Language Reference

When Jordan uses these terms, this is what they mean in the app. Use this to avoid creating duplicate concepts or misinterpreting requests.

## IBM Role & Timeline

| Term | Meaning |
|------|---------|
| **Associate Partner** | Jordan's current role at IBM Canada |
| **Partner** | Target promotion role (2027) |
| **Qualifying year** | Year before promotion (2026) — building the case, Dec 31 deadline |
| **Promotion year** | Year of the ask (2027) |
| **Gate / IBM milestone** | Required checkbox for promotion (training, targets, rating). Goals with `isGate: true` |
| **Three gates** | Hit targets, complete training, top performer rating — all by Dec 31 of qualifying year |

## Financial Metrics (Scorecard)

| Term | Code field | Notes |
|------|-----------|-------|
| **Signings** | `sales` | Closed deal value. UI says "Signings", never "Sales" |
| **Revenue** | `revenue` | Total project revenue (quarterly breakdown) |
| **Gross profit** | `grossProfit` | Revenue minus delivery costs. Not "Gross Profit" (lowercase p) |
| **Chargeable utilization** | `utilization` | Billable hours. Not just "Utilization" |
| **Targets** | `targets[year]` | IBM-provided annual goals (not user-set) |
| **Actual** | Realized values | What really happened |
| **Forecast** | Projected values | What's expected to happen |

All currency stored in CAD. Display can toggle to USD at 1.5× rate.

## Pages & Tabs

| What Jordan says | Actual page/component | Route |
|-----------------|----------------------|-------|
| **Dashboard** | Dashboard.jsx | `/` |
| **Scorecard** | Scorecard.jsx (with sub-tabs: Overview, Targets, Opportunities, Projects, Utilization) | `/scorecard` |
| **Pursuits** | Pursuits.jsx — CRM-style pipeline/funnel view | `/opportunities` |
| **Goals** | Goals.jsx | `/goals` |
| **People** | People.jsx — contacts & relationships | `/people` |
| **Wins** | Wins.jsx — accomplishments | `/wins` |
| **Actions** | ActionItems.jsx — to-dos with due dates | `/actions` |
| **Story / Narrative** | MyStory.jsx — AI-generated narrative + gap analysis | `/story` |
| **Learning** | Learning.jsx — certs & courses | `/learning` |
| **Eminence** | Eminence.jsx — thought leadership activities | `/eminence` |
| **Calendar** | Calendar.jsx — aggregated dates from all tabs | `/calendar` |
| **Admin** | Admin.jsx — AI settings, categories, user settings | `/admin` |
| **Sharing** | Sharing.jsx — public link, feedback link | `/sharing` |

## Opportunities vs Pursuits

These overlap and can be confusing:
- **Opportunities** = individual deals (data objects with status, stage, value)
- **Opportunities tab** = sub-tab within Scorecard showing all opps in a table
- **Pursuits page** = top-level page with CRM funnel view + weighted pipeline
- When Jordan says "pipeline" = the Pursuits page funnel

## Pipeline Stages & Statuses

**Stages** (progression): Identified → Qualified → Proposed → Verbal → Closed
**Status** (outcome): open | won | lost

"Closed" is a stage. "Won" is a status. A deal can be at the "Closed" stage but still "open" status.

## UI Components

| What Jordan might say | What it is in code |
|----------------------|-------------------|
| **Tile / card** | A card component (WinCard, PersonCard, GoalCard, etc.) |
| **Modal / popup / form** | Modal overlay (OppModal, WinFormModal, PersonModal, etc.) |
| **Stat card** | KPI box on Dashboard (days left, overdue count, etc.) |
| **Stat strip** | Row of stat cards across Dashboard top |
| **Funnel** | Pipeline visualization on Pursuits page |
| **Tags / pills** | Colored category badges (win tags, eminence types) |
| **Segment buttons** | Toggle filter buttons (e.g., goal status filter) |
| **Quick add** | FAB button + modal on Dashboard for creating items |
| **Readiness widget** | Circular progress chart with 5 weighted dimensions |

## Readiness Score Dimensions

| Dimension | Weight | Source |
|-----------|--------|--------|
| Scorecard performance | 35% | % of targets hit |
| Pipeline coverage | 20% | Weighted pipeline vs signings gap |
| Gate completion | 20% | % of IBM milestone goals done |
| Evidence strength | 15% | AI gap analysis (strong/partial/missing) |
| Wins & eminence | 10% | Qualifying-year wins + activities |

## People & Relationships

| Term | Meaning |
|------|---------|
| **Relationship type** | Champion, Supporter, Peer, Client (configurable in Admin) |
| **Influence tier** | Decision-maker, Influencer, Supporter, Informer — how much power over your promotion |
| **Strategic importance** | Critical, High, Medium, Low — how important this relationship is right now |
| **Stakeholder group** | Arena a contact belongs to (Practice leadership, Client, HR/Talent, etc.) — used for coverage analysis |
| **Coverage** | Whether you have high-influence contacts across all key stakeholder groups. Covered / Thin / Gap |
| **Touchpoint** | A logged interaction with a contact |
| **Planned touchpoint** | A future intended interaction (can link to action items) |
| **Stale contact** | >30 days since last touchpoint |

## Eminence (Thought Leadership)

| Term | Meaning |
|------|---------|
| **Eminence** | Both a win tag category AND a separate tracking domain |
| **Internal eminence** | IBM forums, knowledge networks, internal speaking |
| **External eminence** | Conferences, publications, media, public panels |
| **Activity types** | speaking, publication, media, panel, award, internal-ibm, community, other |

## 360 Feedback

| Term | Meaning |
|------|---------|
| **360 feedback** | Structured feedback from reviewers across 5 soft-skill dimensions |
| **Dimensions** | Strategic thinking, Executive presence, Collaboration & influence, Delivery excellence, Growth mindset |
| **Review token** | One-time link sent to a reviewer (no account needed). Stored in `review_tokens` table |
| **Feedback synthesis** | AI-generated summary of all 360 feedback responses. Cached in `feedback_synthesis` domain |
| **Legacy feedback** | Original single star-rating + comment format (via `feedback_token` on users table) |

## Readiness Snapshots

| Term | Meaning |
|------|---------|
| **Readiness snapshot** | Point-in-time capture of overall + dimension scores. Stored in `readiness` domain |
| **Auto-snapshot** | Captured once per day on Dashboard load (deduplicates same-day) |
| **Trend chart** | SVG line chart showing overall score + togglable dimension lines over time |

## Key Interconnections

- **Opportunity → Win**: Won opportunity prompts win creation (`sourceType: 'opportunity'`)
- **Goal → Win**: Completed goal prompts win creation (`sourceType: 'goal'`)
- **Goal → Action**: Goals link to action items via `linkedGoalIds`
- **Person → Action**: Planned touchpoints link to action items
- **Eminence → Win tags**: Eminence activities use the same tag system as wins

## Data Domains

| Domain | What it stores |
|--------|---------------|
| `scorecard` | Targets, opportunities, projects, utilization |
| `wins` | Accomplishments with tags |
| `goals` | Goals with gate flag |
| `actions` | To-dos with due dates |
| `people` | Contacts, relationships, touchpoints |
| `eminence` | Thought leadership activities |
| `learning` | Certifications and courses |
| `story` | AI gap analysis and narrative |
| `admin` | Categories, criteria, API key |
| `settings` | Promotion year, currency, demo mode |
| `sharing` | Public summary visibility config |
| `readiness` | Readiness score snapshots + trend data |
| `feedback_synthesis` | Cached AI synthesis of 360 feedback |

## Confusable Terms

| Term | Context A | Context B |
|------|-----------|-----------|
| **Qualified** | Pipeline stage (deal qualified) | Qualifying year (promotion timeline) |
| **Closed** | Pipeline stage (final) | ≠ Won (a deal can be Closed stage but still open) |
| **Forecast** | Project status (not yet realized) | Utilization projection (future hours) |
| **Eminence** | Win tag category | Separate data domain with activities |
| **Demo mode** | Sample data for new users | Toggle off to start real journey |
| **Sales / Signings** | Code uses `sales` | UI displays "Signings" — always use "Signings" |

## Admin Categories (All Configurable)

Users can customize these in Admin → Categories:
- Relationship types (colors + labels)
- Win tags (colors + labels)
- Deal types, Logo types, Origin types
- Eminence types
- Pipeline stages (colors + labels)
