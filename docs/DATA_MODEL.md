# Data Model Reference

All user data stored in PostgreSQL `user_data` table as JSONB, keyed by `(user_id, domain)`.
Originally localStorage, migrated to DB in Phase 11. Domain key = the string used in
`GET/PUT /api/data/:domain`.

---

## `scorecard` domain (`scorecardData_v2`)

```
targets:       { [year]: { sales, revenue, grossProfit, utilization } }
opportunities: [ {
  id, name, client, year, status, winDate, totalValue, signingsValue,
  stage, probability, expectedClose, dealType, logoType, relationshipOrigin, strategicNote
} ]
projects:      [ { id, name, client, year, status, opportunityId, revenue{q1-q4}, grossProfit{q1-q4} } ]
utilization:   { [year]: { months: { [jan-dec]: { actual, forecast } } } }
```

- `status` (opportunities): `open | won | lost`
- `stage`: `Identified | Qualified | Proposed | Verbal | Closed`
- `dealType`: `one-time | multi-year`
- `logoType`: `net-new | expansion`
- `relationshipOrigin`: `cold-outreach | referral | eminence | existing-client`
- Won opps → realized signings. Open opps → forecast signings. Lost → excluded.
- Projects: `status` is `forecast | realized`. Optional `opportunityId` link.
- Deleting an opportunity clears the link on connected projects.
- Targets are flat IBM-given numbers per year — not derived from deals.

## `wins` domain (`winsData_v2`)

```
[ {
  id, title, date, description, impact, tags[],
  sourceType,          // 'manual' | 'opportunity' | 'goal'
  sourceId,            // id of linked opportunity or goal (null for manual)
  sourceName,          // human-readable source label, saved at creation time
  logoType,            // 'net-new' | 'expansion' (optional)
  relationshipOrigin,  // 'cold-outreach' | 'referral' | 'eminence' | 'existing-client' (optional)
  strategicNote        // free text (optional)
} ]
```

Default tags: Revenue · Client relationship · Delivery · Team leadership · Internal eminence · External eminence.
Migrated from `winsData_v1` (added sourceType/sourceId/sourceName fields).

## `actions` domain (`actionsData_v2`)

```
[ { id, title, dueDate, done, linkedGoalIds[] } ]
```

Many-to-many with goals via `linkedGoalIds` array.

## `people` domain (`peopleData_v1`)

```
[ {
  id, name, title, org, type, relationshipStatus, email, phone, need,
  touchpoints[{ id, date, note }],
  plannedTouchpoints[{ id, date, note, actionId }]
} ]
```

- `type`: desired relationship type (Champion, Supporter, Peer, Client). Configurable via Admin Categories.
- `relationshipStatus`: `established | in-progress` — NOT YET IMPLEMENTED (Phase 7c). Field exists in the schema spec but is not in the current code.
- `lastContact`: derived from most recent touchpoint — never stored directly.
- `plannedTouchpoints`: future contacts; `actionId` links to an action item. "Log as done" converts to real touchpoint and marks action done.

## `goals` domain (`goalsData_v1`)

```
[ { id, title, targetDate, status, notes, isGate } ]
```

- `status`: `Not started | In progress | Done`
- `isGate: true` marks as IBM milestone (shown in milestones section)

## `admin` domain (`adminData_v2`)

```
{
  relationshipTypes: [ { label, color } ],
  winTags:           [ { label, color } ],
  dealTypes:         [ { value, label } ],
  logoTypes:         [ { value, label } ],
  originTypes:       [ { value, label } ],
  ibmCriteria:       string,
  careerHistory:     string,
  anthropicKey:      string,
  navOrder:          [ string ]
}
```

- Colour lists have `label` + `color` (hex). Value lists have `value` (machine key) + `label` (display).
- All configurable via Admin → Categories tab with drag-and-drop reorder.
- Migrated from `adminData_v1` (plain strings → objects with default colours).
- IMPORTANT: `adminData` sync has a `serverLoaded` guard to prevent default overwrites on failed fetch.

## `settings` domain

```
promotionYear   — user's target partner year (default 2027)
currency        — display currency: 'CAD' or 'USD' (1.5× IBM rate)
```

## `story` domain (`storyData_v1`)

```
{
  gap_analysis:      { data, generated_at, usage: { input, output } },
  polished_narrative: { data, generated_at, usage: { input, output } }
}
```

Cached AI outputs. `gap_analysis.data` is a JSON array of `{ criterion, evidence[], strength, recommendation }`.
`polished_narrative.data` is plain text. Regenerated on demand — not auto-regenerated on data change.

---

## Future domains (not yet implemented)

### `learning` domain (`learningData_v1`) — Phase 17

```
{
  certifications: [ { id, name, issuer, status, dateEarned, expiryDate, credentialId, badgeUrl, notes } ],
  courses: [ { id, title, provider, status, dateCompleted, hours, notes } ]
}
```

### `eminence` domain (`eminenceData_v1`) — Phase 22

```
{
  activities: [ { id, title, type, date, venue, audience, reach, url, description, tags[], year } ]
}
```

---

## Database tables

### `users`
Standard auth table: id, name, email, password_hash. Also holds `share_token` and `feedback_token` (Phase 12).

### `user_data`
```sql
CREATE TABLE user_data (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER REFERENCES users(id),
  domain    TEXT NOT NULL,
  data      JSONB,
  UNIQUE(user_id, domain)
);
```

### `feedback`
```sql
CREATE TABLE feedback (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  reviewer    TEXT NOT NULL,
  rating      INTEGER,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Scorecard year structure

7 years relative to promotion year: Year −4, −3, −2, −1 (qualifying), 0 (partner), +1, +2.
Qualifying year and partner year are visually accented. Current calendar year highlighted with ★.
Default view shows 3 years (windowed) with expand to show all 7.
