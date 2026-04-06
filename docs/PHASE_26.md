# Phase 26 — Structured 360 feedback

**Goal**: Replace the current minimal feedback form (name, star rating, open comment) with
a structured 360 feedback experience modelled on the Bettup development framework. Reviewers
answer a focused set of questions designed to surface strengths, development areas, and
partner readiness specifically. The owner optionally shares their readiness score with
reviewers before they respond, anchoring feedback to the actual promotion case rather than
a generic performance conversation.

The existing feedback infrastructure (token-based link, no-auth reviewer access, feedback
inbox in Sharing tab, `feedback` table in PostgreSQL) is extended — not replaced. The
migration adds new columns to the existing table; old single-comment responses are preserved
and displayed in a legacy format.

---

## 26a — Database migration

- [ ] `backend/migration_phase26.sql`:
  - Add structured response columns to the `feedback` table:
    ```sql
    ALTER TABLE feedback
      ADD COLUMN strengths        TEXT,
      ADD COLUMN leverage         TEXT,
      ADD COLUMN development      TEXT,
      ADD COLUMN partner_ready    TEXT,
      ADD COLUMN partner_timeline TEXT,
      ADD COLUMN score_reaction   TEXT,
      ADD COLUMN form_version     TEXT NOT NULL DEFAULT 'v1';
    ```
  - Existing rows get `form_version = 'legacy'` via a backfill:
    ```sql
    UPDATE feedback SET form_version = 'legacy' WHERE strengths IS NULL;
    ```
  - Add `share_readiness_score BOOLEAN NOT NULL DEFAULT FALSE` to the `users` table —
    controls whether the readiness score is shown to reviewers on the feedback page

## 26b — Reviewer feedback form

The form at `/feedback/:token` is rebuilt around five structured questions plus an
optional readiness score context block shown at the top if the owner has enabled it.

**Readiness score context block** (conditional — shown only if `share_readiness_score` is
true for this owner):
- Displays the owner's current overall readiness score (percentage) and the five dimension
  bars, in the same visual format as the dashboard widget (Phase 21)
- A short framing note below the score: "This score is a self-assessed indicator across
  five dimensions. Your feedback will help [Name] understand how others perceive their
  readiness for Partner."
- The score shown is computed server-side at the time the feedback page is loaded — it
  reflects the owner's data at that moment, not a cached value
- Reviewers cannot interact with the score — it is read-only context only

**The five questions** (all required except Q5):

| # | Label | Prompt | Format |
|---|---|---|---|
| Q1 | Strengths | "What do you see as [Name]'s top strengths?" | Textarea |
| Q2 | Leverage | "In what ways could [Name] leverage these strengths to become more effective?" | Textarea |
| Q3 | Development | "What should [Name] focus on to grow?" | Textarea |
| Q4 | Partner readiness | "Based on what you know of [Name]'s work, how ready do you think they are for the Partner role?" | 5-point scale: Not yet ready / Building toward it / Nearly there / Ready now / Overdue |
| Q5 | Timeline | "If you had to estimate, when do you think [Name] will be ready?" | Dropdown: Within 6 months / 6–12 months / 1–2 years / More than 2 years / Already ready (optional field) |

Q5 (timeline) is shown only when Q4 is answered. It is optional — reviewer can skip it.

If the readiness score is shared, a sixth question is added after Q5:

| # | Label | Prompt | Format |
|---|---|---|---|
| Q6 | Score reaction | "The self-assessed readiness score above is [X]%. Does this feel accurate to you?" | 3-point scale: Lower than I'd expect / About right / Higher than I'd expect — with an optional free-text "Why?" field |

**Reviewer name** remains a required field, shown at the top of the form before the
questions. The 1–5 star rating from Phase 12 is retired — Q4 replaces it with a more
meaningful scale.

**Form UX**:
- Questions displayed one section at a time on mobile (step 1: name + Q1/Q2, step 2:
  Q3, step 3: Q4/Q5/Q6) with a progress indicator; single-page on desktop
- Textarea fields: `min-height: 100px`; character limit 1000 per field
- Submit button disabled until Q1–Q4 are answered
- Success page after submit: "Thank you — your feedback has been sent to [Name]"
- No editing after submission — the form is single-use per reviewer session

## 26c — Feedback inbox redesign

The feedback inbox in the Sharing tab is redesigned to display structured responses
clearly. Legacy responses (from Phase 12, `form_version: 'legacy'`) are shown in a
collapsed card with a "Legacy response" label — their star rating and comment are
preserved and readable.

**Structured response card** layout:
- Header: reviewer name, submission date, Q4 partner readiness rating as a prominent pill
  (colour-coded: green = Ready now / Overdue, amber = Nearly there / Building toward it,
  gray = Not yet ready)
- Q1 Strengths — full text, expandable if long
- Q2 Leverage — full text, expandable if long
- Q3 Development — full text, expandable if long
- Q5 Timeline — shown as a label if answered
- Q6 Score reaction — shown as a label + optional comment if the readiness score was
  shared and the reviewer answered
- Cards sorted newest first; no pagination for 2–3 users (expected volume is low)

**Inbox summary strip** above the cards:
- Count of responses received
- Distribution of Q4 ratings as a small bar: how many said Ready now, Nearly there, etc.
- If readiness score was shared: breakdown of Q6 reactions (Lower / About right / Higher)
  as a count row

## 26d — AI synthesis of feedback

A new "Synthesise feedback" button in the feedback inbox. Sends all structured feedback
responses to Claude and returns a concise synthesis — patterns across reviewers, recurring
themes in strengths and development areas, and an honest read of the Q4 partner readiness
distribution.

- [ ] New backend endpoint `POST /api/ai/synthesise-feedback`
- [ ] Loads all feedback rows for the user from the DB; formats them into a structured
  context block (reviewer name optional — owner controls whether names are included in the
  synthesis via a toggle before clicking)
- [ ] System prompt instructs Claude to:
  - Identify the top 2–3 recurring strengths mentioned across reviewers
  - Identify the top 1–2 development themes
  - Summarise the partner readiness signal from Q4 responses honestly (e.g. "3 of 5
    reviewers said Nearly there or Ready now; 2 said Building toward it")
  - Note any meaningful divergence between the self-assessed readiness score and Q6
    reactions if that data is present
  - Return plain text, structured with the same section heading format as the polished
    narrative — no preamble, no meta-commentary
- [ ] Output displayed inline below the inbox summary strip; regenerable on demand
- [ ] Token usage shown; cached in `storyData_v1` under key `feedback_synthesis` with
  `generated_at` timestamp — same caching pattern as gap analysis and polished narrative
- [ ] Requires at least 2 feedback responses to enable the button; shows a prompt
  ("Collect at least 2 responses to generate a synthesis") if fewer exist
- [ ] Uses user's Anthropic API key from `adminData` — shows Admin setup prompt if not
  configured

## 26e — Sharing tab controls

- [ ] New toggle in the Sharing tab: "Share my readiness score with reviewers" —
  on/off, saves to `users.share_readiness_score`; off by default
- [ ] Toggle shows a brief explanation: "Reviewers will see your current readiness score
  and dimension breakdown before answering. This gives their feedback more context but
  may anchor their responses to your self-assessment."
- [ ] The feedback link URL does not change when this toggle is flipped — the score is
  fetched server-side at page load time, so existing links automatically reflect the
  current toggle state
- [ ] Feedback link section updated to note the form version: "Reviewers will be asked
  [5 / 6] structured questions" depending on whether score sharing is enabled

## 26f — Notification integration (Phase 23)

- [ ] `feedback_received` notification (Phase 23e) updated to include the Q4 partner
  readiness rating in the email body alongside the reviewer name — e.g. "Alex Chen
  submitted feedback · Nearly there"
- [ ] If Q6 is answered, include the score reaction label too — e.g. "Score reaction:
  About right"
- [ ] Email subject line updated: "[Name] left you feedback on your promotion case"

---

## 26g — Sponsor view

A dedicated read-only view designed specifically for a sponsor or mentor who is actively
advocating for the candidate's promotion. Unlike the general peer view (Phase 18) which
mirrors the Dashboard and Narrative tabs, the sponsor view is a purpose-built one-page
summary that gives a sponsor everything they need to make the case — and nothing they
don't.

The sponsor view is accessed via a separate token-based link, distinct from the existing
public share link and feedback link. The owner generates it from the Sharing tab. No
account or login is required to view it.

**Access and token**
- [ ] `backend/migration_phase26.sql` — add `sponsor_token TEXT` column to `users` table
- [ ] Sharing tab: new "Sponsor link" section alongside the existing share and feedback
  link sections; "Generate sponsor link" button creates the token; "Reset" invalidates it
- [ ] Public route `/sponsor/:token` — no auth required; 404 if token not found
- [ ] Owner controls what is shown via toggles in the Sharing tab sponsor section —
  same pattern as the existing share link visibility controls

**Sponsor view content** — one page, top to bottom:

*Header block*: candidate name, current role → target role, qualifying year, days
remaining to qualifying year end. IBM blue, print-ready.

*Promotion case summary* (one paragraph): the opening claim from the polished narrative
(Phase 10) — the single bold sentence that states why this person is ready now. If no
narrative has been generated, shows a placeholder: "Narrative not yet generated."

*Key wins* (top 4, net-new logos first): each win as a single sentence — same content
as the wins section of the polished narrative. Source is the `winsData_v2` array filtered
to the qualifying year, sorted by `logoType` (net-new first) then date descending.

*Gap areas* (criteria rated Partial or Missing from the most recent gap analysis):
criterion label + one-line recommendation. Framed as "Areas where your advocacy helps
most" — gives the sponsor concrete talking points for conversations with decision-makers.
If no gap analysis exists, shows a placeholder prompt.

*Pipeline snapshot*: weighted pipeline total, count of net-new pursuits, top 3 open
opportunities by value (name, stage, value). Gives the sponsor commercial context for
conversations about trajectory.

*The ask*: the three "The [Year] Ask" bullets from the polished narrative verbatim.
This is the most important section for a sponsor — it names exactly what the candidate
needs Partner designation to unlock.

*Readiness score* (optional — shown only if `share_readiness_score` is also enabled):
overall score and dimension breakdown, same visual as the dashboard widget.

**Print behaviour**
- [ ] "Print / Save as PDF" button in the sponsor view header — triggers `window.print()`
- [ ] `@media print` styles: hide the print button and header chrome; render as clean
  A4/letter single-column layout; IBM blue header bar at top of page; page break before
  "The ask" section if content is long
- [ ] The sponsor view is the primary print target in the app — invest in clean print
  styles here even if other views have basic print support

**Sponsor view vs public share link**: the public share link (Phase 12) is for general
visibility — anyone with the link can see it and the owner controls it loosely. The
sponsor link is intentionally more focused and more private — it contains gap areas and
pipeline data that the owner may not want on a fully public page. The two links are
generated and reset independently.

## 26h — Peer benchmarking (architecture only)

Peer benchmarking shows an anonymised comparison of qualifying-year performance across
all users who have mutually granted each other access. The intent is to give each user
a sense of relative positioning — not to rank or compete, but to calibrate self-assessment
against peers at the same career stage.

This feature is **off by default** and gated behind a Super Admin toggle. It is not
visible or accessible to any user until a superuser enables it for the platform. The
architecture is designed now so the feature can be switched on without structural changes
later.

**Super Admin gate**
- [ ] `backend/migration_phase26.sql` — add `peer_benchmarking_enabled BOOLEAN NOT NULL
  DEFAULT FALSE` to the `app_settings` table (added in Phase 18)
- [ ] Super Admin → Platform sub-tab: new toggle "Peer benchmarking" — off by default;
  enabling it shows a confirmation modal explaining what will become visible to users and
  requiring explicit confirmation before activating
- [ ] All peer benchmarking UI is hidden behind a check against this setting — the
  frontend loads the setting once on auth and gates the relevant components

**Eligibility**
A user is included in the benchmark pool only if:
1. `peer_benchmarking_enabled` is true platform-wide, AND
2. The user has mutually granted access with at least one other user — i.e. a
   `viewer_access` row exists in both directions: `(owner_id = A, viewer_id = B)` AND
   `(owner_id = B, viewer_id = A)`

Users who have not granted mutual access are excluded from the pool entirely and cannot
see the benchmark view. This ensures participation is always opt-in via the existing
access grant mechanism — no new consent flow needed.

**What is shown**
The benchmark is a simple anonymous comparison — no names, no identifiers. Each user
sees themselves labelled "You" and all other pool members labelled "Peer 1", "Peer 2",
etc. (assigned randomly per session — labels do not persist, preventing re-identification
over time).

Metrics compared (qualifying year only):
- Signings: actual + forecast as % of target
- Revenue: actual + forecast as % of target  
- Gross profit: actual + forecast as % of target
- Utilization: projection as % of target
- Overall readiness score (Phase 21) — only shown if Phase 21 is built

Display: a simple table — one row per pool member, one column per metric, colour-coded
by status (green ≥ 100%, amber 70–99%, red < 70%). "You" row is visually distinct
(bold or highlighted). No absolute dollar values — percentages of target only, to avoid
exposing commercially sensitive numbers.

**Where it appears**
- [ ] New section at the bottom of the Dashboard, below the readiness widget — only
  rendered when the user is eligible (platform enabled + mutual access with at least one
  other user)
- [ ] Section heading: "How you compare" with a note: "Anonymised — peers shown without
  names. Pool: [N] people."
- [ ] If the platform setting is off, or the user has no mutual-access peers, the section
  is entirely absent — no placeholder, no "coming soon" message

**Backend**
- [ ] `GET /api/benchmark` — returns the benchmark dataset for the requesting user:
  checks platform setting, computes mutual-access peer list, loads qualifying-year
  scorecard data for each eligible user, strips names and assigns random session labels,
  returns the anonymised table
- [ ] No data is cached server-side — computed fresh on each request
- [ ] If pool size < 2 (including the requesting user), returns `{ eligible: false }` —
  the frontend hides the section entirely

**Architecture decisions documented for future build**
- The random session labels (Peer 1, Peer 2...) are assigned server-side on each request
  using a seeded shuffle — same pool, different label order each session. This prevents a
  user from tracking "Peer 2 is always the highest performer, therefore it must be [name]."
- Absolute values (dollar amounts) are never returned by `GET /api/benchmark` — only
  percentages. This is enforced at the API layer, not just the frontend.
- If a user revokes mutual access, they are removed from all peers' benchmark pools
  immediately on the next `GET /api/benchmark` call — no background job needed.
- Pool size is not artificially capped — if 10 users all grant mutual access, all 10
  appear. The display is a scrollable table.

---

**Implementation note**: Phase 26 depends on Phase 21 (readiness score) for the score
sharing feature in 26b and the readiness score display in 26g — implement 21 first, or
stub the score display with a placeholder if building 26 earlier. The feedback synthesis
(26d) and sponsor view (26g) follow the same AI infrastructure and token patterns already
in use — no new npm packages required. The `feedback` table migration and the new
`sponsor_token` and `peer_benchmarking_enabled` additions are all in a single
`backend/migration_phase26.sql`. The Phase 14 deferred item "Email notification when
feedback is received" is fully resolved by Phase 23e + 26f together. Phase 26h
(peer benchmarking) intentionally contains no frontend checklist items beyond the Super
Admin gate — it is an architecture specification to be checked off when the feature is
activated, not a build task for now.

---
