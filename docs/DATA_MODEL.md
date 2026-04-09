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
  influenceTier, strategicImportance, stakeholderGroup,
  touchpoints[{ id, date, note }],
  plannedTouchpoints[{ id, date, note, actionId }]
} ]
```

- `type`: desired relationship type (Champion, Supporter, Peer, Client). Configurable via Admin Categories.
- `relationshipStatus`: `established | in-progress`.
- `influenceTier`: `decision-maker | influencer | supporter | informer` — how much power this person has over your promotion outcome.
- `strategicImportance`: `critical | high | medium | low` — how important this relationship is to your promotion case right now.
- `stakeholderGroup`: free-text with defaults (`Practice leadership`, `Geography leadership`, `Client`, `HR / Talent`, `Peer network`, `External`) — which arena they belong to. Used for coverage analysis.
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
  ibmCriteria:       string,
  careerHistory:     string,
  anthropicKey:      string,
  navOrder:          [ string ],
  bottomBarTabs:     [ string ]
}
```

- Per-user AI settings, nav preferences, and mobile bottom bar config.
- IMPORTANT: `adminData` sync has a `serverLoaded` guard to prevent default overwrites on failed fetch.
- Note: Site-wide categories (relationshipTypes, winTags, dealTypes, logoTypes, originTypes, eminenceTypes, pipelineStages) moved to `app_settings` table under `platform_categories` key. Managed via Super Admin → Platform, not per-user admin.

## `settings` domain

```
promotionYear   — user's target partner year (default 2027)
currency        — display currency: 'CAD' or 'USD' (1.5× IBM rate)
demoMode        — boolean, true for new users with seed data
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

## `readiness` domain

```
{
  snapshots: [ {
    id,               // uid string
    date,             // ISO date (YYYY-MM-DD)
    overall,          // 0–100
    dimensions: {     // { scorecard, pipeline, gates, evidence, wins } — each 0–100
      [key]: number
    }
  } ],
  lastAutoDate       // ISO date of last auto-snapshot (null if never)
}
```

- Auto-captured once per day on Dashboard load (deduplicates same-day).
- Manual capture via "Snapshot" button on ReadinessWidget.
- Capped at 365 snapshots (oldest dropped).
- Trend chart shows overall line + togglable dimension lines.

## `feedback_synthesis` domain

```
{
  synthesis:     string,      // AI-generated synthesis of all 360 feedback
  generated_at:  ISO string,  // when synthesis was last generated
  feedback_count: number      // number of feedback responses included
}
```

Cached AI output from `POST /api/ai/synthesize-feedback`. Regenerated on demand.

---

## `learning` domain (`learningData_v1`)

```
{
  certifications: [ { id, name, issuer, status, dateEarned, expiryDate, credentialId, badgeUrl, notes } ],
  courses: [ { id, title, provider, status, dateCompleted, hours, notes } ]
}
```

- `status` (certifications): `planned | in_progress | earned | expired`
- `status` (courses): `planned | in_progress | completed`

## `eminence` domain (`eminenceData_v1`)

```
{
  activities: [ { id, title, type, date, venue, audience, reach, url, description, tags[], year } ]
}
```

- `type`: `speaking | publication | media | panel | award | internal-ibm | community | other`

## `competencies` domain _(planned — 1J)_

```
{
  framework_version: "v1",
  assessments: [ {
    id, date, type,           // type: 'self' (future: 'peer', 'sponsor')
    ratings: {
      [competency_id]: {      // e.g. 'revenue_generation', 'thought_leadership'
        level,                // 1=Developing, 2=Competent, 3=Advanced, 4=Exemplary
        notes,                // optional free text
        evidence_ids[]        // links to win/eminence/feedback IDs
      }
    },
    overall_notes
  } ],
  competency_goals: [ {
    competency_id, target_level, target_date,
    actions[],                // free text action descriptions
    linked_action_ids[]       // links to action items
  } ],
  ai_analysis: {              // cached output from /api/ai/competency-analysis
    generated_at, perception_gaps[], focus_areas[], competency_summary
  }
}
```

Default framework categories: Commercial acumen, Client relationship, Leadership & people, Practice building, Executive presence, Strategic thinking, Delivery excellence. Configurable per firm via `firm_config` in `app_settings`.

## `reflections` domain

```
{
  checkins: [ {
    id, week_start,           // ISO date (Monday of the week)
    submitted_at,             // ISO datetime
    biggest_win,              // free text
    biggest_win_logged,       // boolean — was it quick-logged as a win?
    biggest_challenge,        // free text
    learning,                 // free text
    next_week_focus,          // free text
    next_week_action_id,      // link to created action item (or null)
    confidence,               // 1–10
    need_help                 // free text (optional)
  } ],
  ai_synthesis: {             // cached output from /api/ai/reflection-synthesis
    last_generated,
    themes: [ { theme, frequency, first_seen, last_seen, related_competency, insight } ],
    confidence_trend: { current, 4_week_avg, 12_week_avg, trend },
    patterns[]                // plain-English pattern strings
  }
}
```

---

## Planned extensions to existing domains

### `wins` — enhanced field

Each win entry gains an optional `enhanced` object:
```
enhanced: {
  statement,                  // 2-3 sentence STAR-format narrative
  bullets[],                  // 3-5 concise impact bullets
  one_liner,                  // single punchy sentence
  generated_at,               // ISO datetime
  mode,                       // 'statement' | 'bullets' | 'one_liner' (last generated)
  data_sources[]              // IDs of opportunities/scorecard entries used
}
```
Generated by `POST /api/ai/enhance-win`. Original `description` always preserved separately.

### `people` — meeting preps _(planned — 2H)_

People domain gains a `meeting_preps[]` array:
```
meeting_preps: [ {
  id, contact_id, date,
  prep_notes,                 // user's pre-meeting notes
  ai_prep,                    // cached AI prep card content
  talking_points: [ { text, checked } ],
  debrief: {
    sentiment,                // 'positive' | 'neutral' | 'negative'
    outcomes,                 // free text
    commitments_mine: [ { text, due, action_id } ],
    commitments_theirs: [ { text, due } ],
    coverage_update,          // 'strong' | 'developing' | 'gap' | null
    cadence_update            // new cadence string or null
  }
} ]
```
Debrief save auto-creates a touchpoint and action items for commitments.

---

## Database tables

### `users`
```sql
CREATE TABLE users (
  id                    SERIAL PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password              TEXT NOT NULL,
  name                  TEXT,
  role                  TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superuser', 'user', 'viewer')),
  company               TEXT,
  share_token           TEXT UNIQUE,          -- Phase 12
  feedback_token        TEXT UNIQUE,          -- Phase 12
  security_question     TEXT,                 -- Phase 18
  security_answer_hash  TEXT,                 -- Phase 18 (bcrypt)
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,  -- Phase 18
  notification_prefs    JSONB NOT NULL DEFAULT '{}',    -- Phase 23
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

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
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  reviewer        TEXT NOT NULL,
  rating          INTEGER,
  comment         TEXT,
  dimensions      JSONB,                                    -- Layer 1C: structured 360 ratings
  review_token_id INTEGER REFERENCES review_tokens(id),     -- Layer 1C: links to review token
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_feedback_review_token ON feedback(review_token_id);
```

`dimensions` JSONB stores structured 360 ratings:
```json
[
  { "key": "strategic_thinking", "label": "Strategic Thinking", "rating": 4, "comment": "..." },
  { "key": "executive_presence", "label": "Executive Presence", "rating": 5, "comment": "" }
]
```

### `user_relationships` (Layer 0E)
```sql
CREATE TABLE user_relationships (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('sponsor', 'peer')),
  granted_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, related_user_id, relationship_type)
);
```
`user_id` = owner (person whose data is shared), `related_user_id` = the sponsor/peer who can view.

### `review_tokens` (Layer 0E)
```sql
CREATE TABLE review_tokens (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  reviewer_name TEXT,
  reviewer_email TEXT,
  purpose       TEXT DEFAULT 'feedback',
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  used_at       TIMESTAMPTZ
);
```
Token-based reviewer access (no account needed). `used_at` set when feedback is submitted.

### `app_settings` (Phase 18)
```sql
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
Keys: `invite_code_hash` (bcrypt hash of registration invite code), `platform_categories` (JSON — site-wide win tags, relationship types, deal types, logo types, origin types, eminence types, pipeline stages with labels + colors), `firm_config` (JSON — configurable labels for company, roles, market, metrics used in Super Admin → Platform).

### `viewer_access` (Phase 18)
```sql
CREATE TABLE viewer_access (
  id         SERIAL PRIMARY KEY,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (owner_id, viewer_id)
);
```
Tracks which users have granted peer viewing access to other users. Used by the "View others" tab.

### `notifications` (Phase 23)
```sql
CREATE TABLE notifications (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  payload   JSONB,
  sent_at   TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ
);
CREATE INDEX idx_notifications_user_sent ON notifications(user_id, sent_at DESC);
```
Send log for email notifications. Types: `weekly_digest`, `feedback_received`. Used for dedup and history display.

`notification_prefs` JSONB on `users` table stores per-user preferences:
```json
{
  "paused": false,
  "weeklyDigest": true,
  "feedbackReceived": true,
  "digestDay": "monday",
  "digestHour": 12
}
```

## Scorecard year structure

7 years relative to promotion year: Year −4, −3, −2, −1 (qualifying), 0 (partner), +1, +2.
Qualifying year and partner year are visually accented. Current calendar year highlighted with ★.
Default view shows 3 years (windowed) with expand to show all 7.
