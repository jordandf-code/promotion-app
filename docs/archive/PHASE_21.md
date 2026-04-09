# Phase 21 — Promotion readiness score

**Goal**: Add a live "readiness score" that aggregates signals from every data domain into
a single at-a-glance indicator, with a per-dimension breakdown showing exactly what is
dragging the score down. The score is purely informational — it supplements the human
judgment of a promotion committee, it does not replace it. All calculation happens
client-side from data already in memory; no new backend calls or database changes needed.

---

## 21a — Score model

The readiness score is a weighted percentage from 0–100, composed of five dimensions.
Each dimension is scored 0–100 independently; the overall score is a weighted average.

| Dimension | Weight | What it measures |
|---|---|---|
| Scorecard performance | 35% | How close the qualifying year metrics are to target |
| Pipeline coverage | 20% | Weighted pipeline as a multiple of the signings gap remaining |
| Gate completion | 20% | IBM milestone goals (isGate: true) marked done vs total |
| Evidence strength | 15% | Gap analysis ratings — proportion of criteria rated Strong |
| Wins and eminence | 10% | Count and quality of wins in the qualifying year |

**Dimension calculations**

*Scorecard performance (35%)*: Average of the four qualifying year metrics, each expressed
as `min(actual + forecast, target) / target`. A metric at or above target contributes
100%; a metric at 80% of target contributes 80%. Capped at 100% — exceeding target does
not inflate the score beyond the cap.

*Pipeline coverage (20%)*: `min(weightedPipeline / signingsGap, 1.0) × 100`, where
`signingsGap = max(signingsTarget − signingsActual, 0)` and `weightedPipeline` is the
sum of `signingsValue × (probability / 100)` across all open qualifying-year opportunities
(defaulting probability to 50% when unset). If signings target is already met, this
dimension scores 100%.

*Gate completion (20%)*: `goalsWithIsGate.filter(done).length / goalsWithIsGate.length × 100`.
If no gate goals exist, this dimension scores 0% and a warning note is shown prompting the
user to flag their IBM milestone goals.

*Evidence strength (15%)*: Derived from the most recent gap analysis result in
`storyData_v1`. `Strong` criteria count as 100%, `Partial` as 50%, `Missing` as 0%.
Average across all criteria. If no gap analysis has been generated yet, this dimension
scores 0% and a prompt is shown to generate one.

*Wins and eminence (10%)*: Scored on two sub-signals averaged together —
(a) qualifying-year wins count, capped at 5 (5 wins = 100%, 3 = 60%, 0 = 0%);
(b) proportion of qualifying-year wins tagged with `Internal eminence` or
`External eminence` (at least 2 eminence-tagged wins = 100%, 1 = 50%, 0 = 0%).

## 21b — Score display

**Dashboard widget**: The readiness score appears as a new card on the Dashboard, between
the stat strip and the multi-year scorecard table. It shows:
- A large circular progress indicator (SVG arc, IBM blue fill, gray track) with the
  overall percentage in the centre
- A label below the arc: "Promotion readiness" with a sub-label showing days remaining
  in the qualifying year
- Five dimension bars below the circle — each a thin horizontal bar with label left,
  percentage right, coloured by status: green ≥ 80%, amber 50–79%, red < 50%
- The weakest dimension is highlighted with a brief action prompt (one sentence, e.g.
  "Generate a gap analysis to score evidence strength")

The widget is purely read-only — no actions, no settings. Clicking any dimension bar
navigates to the relevant tab (scorecard → Scorecard, gates → Goals, etc.).

**Narrative + Gaps tab**: A compact inline readiness strip (single row, five coloured
dots with percentages) appears at the top of the tab above the Generate buttons. This
gives context when reading or regenerating the narrative.

## 21c — Score computation hook

- [ ] New `useReadinessScore()` hook — pure computation, no API calls, no storage
- [ ] Consumes: `useScorecardData`, `useGoalsData`, `useWinsData`, `storyData_v1`
  (from localStorage/DB), and `SettingsContext` for the qualifying year
- [ ] Returns: `{ overall, dimensions: { scorecard, pipeline, gates, evidence, wins },
  warnings: [] }`
- [ ] `warnings` is an array of plain-English prompts for dimensions that scored 0% due
  to missing data (no gate goals flagged, no gap analysis generated, etc.)
- [ ] Recomputes reactively whenever any source hook updates — no debounce needed given
  data volume
- [ ] No caching — recomputed on every render cycle from in-memory data

## 21d — Sharing and peer view

- [ ] Overall readiness score and dimension breakdown included on the public summary page
  (`/share/:token`) if the owner enables it — new toggle in Sharing tab alongside the
  existing wins/narrative/scorecard visibility controls
- [ ] `PeerDashboard` (Phase 18 View others) shows the readiness widget in the same
  position as the owner's dashboard — read-only, same rendering

---

## 21e — Configurable weights in Admin

The five dimension weights are editable in Admin -> GenAI under a new "Readiness score
weights" section. Each dimension has a numeric input (0–100); the app normalises the five
values to sum to 100% so the user can enter relative values (e.g. 35 / 20 / 20 / 15 / 10)
without needing to ensure they add up precisely.

- [ ] Five labelled numeric inputs in Admin -> GenAI, one per dimension, with the default
  values pre-filled: Scorecard 35, Pipeline 20, Gates 20, Evidence 15, Wins & eminence 10
- [ ] A live "Total" indicator below the inputs shows the current sum; a normalisation note
  explains that values are scaled to 100% automatically — entering 1/1/1/1/1 is valid and
  produces equal weighting
- [ ] Weights saved to `adminData` under a new key `readinessWeights: { scorecard, pipeline,
  gates, evidence, wins }` via the existing `PUT /api/data/admin` endpoint
- [ ] `useReadinessScore()` reads weights from `adminData`; falls back to the default
  values if the key is absent (backwards-compatible with existing accounts)
- [ ] "Reset to defaults" button restores the five default values
- [ ] Weights are per-user — each user tunes their own score to reflect their priorities

**Implementation note**: Phase 21 is entirely frontend — no backend routes, no migrations,
no new npm packages. All inputs are already available in existing hooks. Dimension weights
are stored in `adminData` (no migration needed) and read by `useReadinessScore()` at
compute time.

---

