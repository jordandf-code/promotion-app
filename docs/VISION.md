# Career Command Center — Product Vision & Roadmap

## Vision

**"Career Command Center for professional services leaders."**

Promotion tracking is the entry point and killer use case, but the architecture supports ongoing career management. The tool doesn't reset after a promotion — it evolves.

Anchor narrative: "I started by looking at my promotion journey and it quickly evolved into something bigger but still very personal."

## Audience

- Primary: Associate Partners / Senior Managers at Big 4, IBM, Accenture going for Partner-level promotions
- Secondary: Any professional services leader who wants a structured system for managing their career
- Distribution model: share with friends, "check out this app I built, make an account." Single hosted instance, data isolated per user.

## Core concept: campaigns

A promotion case is a *campaign* with a start date, target date, and specific criteria. Scorecard, relationships, wins, eminence, and learning persist across campaigns. After promotion, a new campaign begins (practice building, Senior Partner, etc.). The campaign layer changes while the data continues.

---

## Current state

Phases 1–23 complete. App covers: scorecard, pursuits, goals, people, wins, action items, narrative + gaps (AI), calendar, sharing, feedback, admin, learning, eminence, readiness score, notifications, PWA, roles/access control, demo data onboarding.

**Restructured (2026-04-07):** Old phase sequence replaced with 4-layer dependency roadmap. All features below are now assigned to layers in `docs/PLAN.md`.

---

## Features — in roadmap (see `docs/PLAN.md` for layer assignments)

### 1. Promotion package generator *(Layer 3B)*

Evolution of Phase 20 PowerPoint into a full content assembly + export system.

**Flow:**
1. **Select sections** — Checklist of available sections: executive summary, scorecard, wins, gaps, eminence, feedback synthesis, pipeline, "the ask." Toggle on/off, drag to reorder.
2. **Preview & edit content** — For each section, AI generates content shown as editable text/bullets. User tweaks before export. All editing happens in-app, not in PowerPoint.
3. **Generate** — Download as .pptx with clean slides matching selections and edits.

**Design principles:**
- Content assembly is the valuable part — format-agnostic. PPT is just the first output target. PDF, Word, clipboard could come later.
- Simple, clean slide layouts. Not pixel-perfect branded templates — a strong first draft a consultant can polish in 20 minutes.
- 70% there on content and structure; user does the last 30%.
- Designed as a generic "report generator" — promotion package is the first template. Annual review, sponsor brief, practice summary could follow.

### 2. Document vault *(Layer 2F)*

File uploads attached to wins and eminence activities. Client kudos screenshots, award PDFs, certification badges, etc.

- Supabase Storage for file hosting
- Links back to the record they support (win, eminence activity, certification)
- Referenced in promotion package generator as supporting evidence

*Details to discuss — storage limits, file types, UI integration.*

### 3. Suggested actions engine + smart nudges *(Layer 2C)*

Two layers:

**Rule-based nudges** — Cheap, instant, run on Dashboard load.
- Trigger on: data staleness, threshold breaches, cadence gaps, missing activity
- Structured config per rule: trigger condition, check frequency, priority, message, suggested action
- Configurable in Admin (toggle on/off, adjust thresholds)
- Different firms may want different cadences

**AI coaching layer** — Periodic or on-demand.
- Looks across all data, gives strategic "zoom out" guidance
- "You're 8 months out, numbers are strong, but eminence is thin and you haven't practiced your brand articulation"

**Surfaces on Dashboard** as a persistent "here's what I'd focus on next" section. Not a user-maintained to-do list — an AI/rule-generated prioritized list.

**Build approach:** Use AI research during development to generate comprehensive nudge rules grounded in career development best practices. Curate the output. This is a case where AI as a design-time research tool is more valuable than AI at runtime.

### 4. AI mock promotion panel *(Layer 3A)*

Interactive AI conversation for practicing promotion defense and career articulation.

**What it does:**
- Draws from full app data (narrative, gaps, scorecard, wins, pipeline) via buildContext
- Covers promotion case defense AND broader brand/strategic thinking
- Doesn't judge right/wrong — probes deeper. "I don't know" is noted as a study area, not a failure.
- Produces a debrief: strong areas, weak areas, topics to study further, brand themes that emerged

**Variance (to prevent repetitive sessions):**
- Persona: numbers-focused partner, culture/people partner, strategy partner, skeptic
- Focus area: pipeline, leadership story, brand, practice vision
- Tone: supportive-but-probing vs. deliberately challenging
- Some randomness so you can't predict what's coming

**Results accumulate:**
- Each session is standalone, but debriefs are stored
- Across 5-10 sessions, surface aggregate patterns: "You consistently struggle with X", "Your brand themes are Y but you never mention Z"
- Feeds into the suggested actions engine: "You haven't run a mock panel in a month"

**Scope:** Firm-agnostic. Focuses on case articulation and strategic thinking, not firm-specific trivia. User preps institutional knowledge separately.

### 5. Firm-agnostic configuration *(Layer 0B)*

Make the tool usable by anyone at a professional services firm without code changes.

**What to make configurable:**
- Metric labels (Signings → "Sold Revenue" etc.)
- Role labels ("Associate Partner → Partner" → "Senior Manager → Partner" etc.)
- Gate/milestone descriptions
- Qualifying year terminology

**What stays the same:**
- Four core financial metrics on the scorecard (everyone tracks some version)
- Opportunities, projects, utilization concepts
- Everything else: wins, goals, people, eminence, learning, actions, narrative, feedback

Jordan's insight: metrics are broadly the same across Big 4 / IBM / Accenture. The labels differ, not the structure.

### 6. Readiness score history *(Layer 1B)*

Persist weekly snapshots now (even before building trend UI). Build trend visualization later. Valuable for trajectory view in sponsor conversations and self-motivation.

### 7. Brand workspace *(Layer 2B)* — NEW

Dedicated space for career brand management:
- Positioning statement ("I'm the person who...")
- Perception vs. reality (self-assessment vs. feedback synthesis)
- Proof points mapped to brand pillars
- Key themes to reinforce in conversations
- Fed by: structured 360 feedback (perception data), AI mock panel (debrief themes)

### 8. Influence map *(Layer 2A)* — NEW

Strategic visualization layer on top of People data:
- Influence tiers (key decision-maker / influencer / supporter / informational)
- Coverage status (strong / developing / gap)
- Strategic importance scoring
- Gap identification and connection strategies
- Not a separate data store — a view on enriched People fields

### 9. Role/permissions rework *(Layer 0E)* — NEW

Replace 3-role model (superuser/user/viewer) with:
- **Core user** — full access to own data
- **Sponsor** — authenticated, sees purpose-built summary of sponsee's data
- **Peer** — authenticated, mutual access for benchmarking and feedback
- **Reviewer** — token-based (no account), one-time structured feedback
- A core user can also be a sponsor/peer to others (additive, not a context switch)

### 10. Mode shift / role transition *(Layer 2G)* — NEW

Lightweight wizard for post-promotion transition (not a full "campaign" system):
- Update role labels and target role
- Set new promotion year
- Archive current readiness snapshot
- Reset scorecard targets
- All data (wins, people, eminence, learning) carries forward

---

## Longer term — post-promotion / career command center

- **Campaign/mode system** — Switch between promotion case, practice building, next-level promotion. Data persists, narrative prompts change.
- **Sponsor mode** — Track sponsees, see their readiness/gaps, coaching log, promotion board prep. Network effect if sponsees also use the tool.
- **Annual retrospective generator** — AI-written year-in-review from accumulated data. Personal career journal that accumulates over years.
- **Client health dashboard** — Ongoing relationship health for key accounts beyond pipeline tracking.
- **Personal board of directors** — Formalize advisory roles in People tab (sponsor, truth-teller, connector, industry expert). Track balanced engagement across roles.

---

## Architectural decisions (resolved 2026-04-07)

1. **No campaign objects** — promotion is continuous; mode shift via settings, not a new data model
2. Pull labels from settings rather than hardcoding "promotion" language → **Layer 0B**
3. Design the package/report generator generically (promotion package is first template) → **Layer 3B**
4. Start persisting readiness score snapshots even before building the trend UI → **Layer 1B**
5. Firm-agnostic config keeps the door open for multi-firm usage → **Layer 0B**
6. **Dependency-based roadmap** — features organized into 4 layers for parallel agent execution

---

## Security notes (for multi-user sharing)

Reviewed 2026-04-07. Current posture is solid for sharing with friends:
- All data properly scoped per user via JWT + req.userId
- All SQL parameterized (no injection risk)
- Bcrypt password hashing
- Role-based access control working

**Fix before inviting others:**
- Generate a strong JWT secret (current one is weak)
- Add rate limiting on AI and public endpoints
- Fix SSL verification on DB connection for production

**Down the road:**
- Field-level encryption for sensitive data (so even DB admin can't read it)
- Audit logging for admin actions
- Password reset session invalidation

---

## Still to discuss

- Document vault details (storage limits, file types, UI placement)
- Post-promotion Day 1 experience — what does the app look like when you make Partner?
- Whether any of this evolves into a revenue-generating product vs. personal tool shared with friends
