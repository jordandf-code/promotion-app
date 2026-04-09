# Phase 17 — Learning tab (certifications and training)

**Goal**: Track certifications and training courses as first-class evidence for the IBM Partner
promotion case. Two sections in one tab: structured certification cards (with expiry alerts)
and a lighter course log. Data fed into AI context so the narrative and gap analysis can cite
specific credentials.

## 17a — Data model and persistence

- [ ] New `learningData_v1` domain in `user_data` (PostgreSQL via `GET/PUT /api/data/learning`)
- [ ] `useLearningData` hook — same optimistic-update pattern as all other data hooks
- [ ] No migration needed — new domain, starts empty for all users
- [ ] `backend/migration_phase17.sql` — no schema changes needed (uses existing `user_data` table with `domain = 'learning'`)

## 17b — Certifications section

Each certification card shows: name, issuer, status pill, date earned, expiry date (with visual
alert if expired or expiring within 90 days), credential ID, and a badge link button.

- [ ] Add/edit/delete certification via modal
- [ ] Fields: name (required), issuer (required), status (planned / in-progress / earned / expired),
  date earned, expiry date, credential ID, badge URL, notes
- [ ] Status pills: Planned (gray), In progress (blue), Earned (green), Expired (red)
- [ ] Expiry alert: amber "Expires soon" badge if expiry date is within 90 days of today;
  red "Expired" badge (overrides status pill) if expiry date is in the past
- [ ] Cards sorted: expired last, then by status (earned → in-progress → planned), then by date earned descending
- [ ] Summary strip: count of earned certs, count expiring within 90 days
- [ ] Badge URL renders as a small "View badge" link button on the card (opens in new tab)

## 17c — Courses section

Lighter than certifications — a log of completed or planned training, used to demonstrate
continuous learning and satisfy the qualifying-year training gate.

- [ ] Add/edit/delete course via modal
- [ ] Fields: title (required), provider, status (planned / in-progress / completed), date completed,
  hours (CPD/learning hours), notes
- [ ] Status pills match certification style (gray / blue / green)
- [ ] Summary strip: total completed courses, total learning hours (completed only)
- [ ] Courses sorted: completed first (by date descending), then in-progress, then planned

## 17d — Qualifying-year training gate integration

The qualifying-year training gate (gate 2 of 3 in Goals) should reflect Learning tab data.

- [ ] Goals tab: IBM milestone goals with `isGate: true` show a "View in Learning" link if the
  goal title contains keywords matching "training" or "certification" (case-insensitive substring
  match) — links to `/learning`
- [ ] Learning tab header: shows a qualifying-year gate status banner — "Training gate: X of Y
  required certifications earned" — only visible if any cert has `isGate` relationship. This is
  informational only; the gate pass/fail is still owned by the Goals tab.
- [ ] No automated gate calculation — the user still manually marks the milestone goal as done.
  The Learning tab is evidence, not a trigger.

## 17e — AI context integration

- [ ] `backend/ai/buildContext.js` — add `learning` domain load alongside other domains
- [ ] Inject into AI context payload as a new top-level key:
  ```json
  "learning": {
    "certifications": [
      {
        "name": "string",
        "issuer": "string",
        "status": "planned | in-progress | earned | expired",
        "date_earned": "YYYY-MM-DD | null",
        "expiry_date": "YYYY-MM-DD | null"
      }
    ],
    "courses": [
      {
        "title": "string",
        "provider": "string",
        "status": "planned | in-progress | completed",
        "date_completed": "YYYY-MM-DD | null",
        "hours": 0
      }
    ]
  }
  ```
- [ ] Cap: all earned/completed items included; planned items capped at 5 (most recently added)
  to keep token count lean
- [ ] Update gap analysis system prompt in `AIprompt.md` to instruct the model to cite specific
  certifications and training hours as evidence for "continuous learning" and "technical depth"
  IBM criteria when present
- [ ] Update polished narrative system prompt to reference earned certifications by name in the
  "Strategic contribution" or "Client and market leadership" section when relevant

## 17f — Public share page

- [ ] Learning tab data optionally included on the public summary page (owner toggle, same
  pattern as wins/narrative/scorecard visibility controls in Sharing tab)
- [ ] Shows earned certifications only — no planned, in-progress, or expired items exposed publicly
- [ ] Renders as a simple list: cert name, issuer, date earned
