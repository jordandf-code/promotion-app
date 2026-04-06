# Phase 24 — Bulk import and export

**Goal**: Let users get data into and out of the app in bulk — particularly useful when
migrating from an existing Excel tracker, sharing data with a manager, or backing up
before a major change. Export covers all domains; import covers the three highest-volume
domains (opportunities, wins, people).

---

## 24a — Export

A single "Export all data" action in Admin → User settings produces a ZIP file containing
one CSV per domain plus a `README.txt` explaining the format.

Domains exported:
- `opportunities.csv` — all fields from `scorecardData_v2.opportunities`
- `projects.csv` — all fields from `scorecardData_v2.projects`
- `wins.csv` — all fields from `winsData_v2`
- `goals.csv` — all fields from `goalsData_v1`
- `actions.csv` — all fields from `actionsData_v2`
- `people.csv` — core fields only (id, name, title, org, type, email, phone); touchpoints
  exported as a separate `touchpoints.csv` with a `person_id` foreign key
- `eminence.csv` — all fields from `eminenceData_v1` (Phase 22)
- `learning_certifications.csv` and `learning_courses.csv` — from `learningData_v1`
  (Phase 17)

The export is assembled server-side via `GET /api/export` — loads all domains from the
DB in one pass, converts each to CSV using a simple JSON-to-CSV mapper, zips them with
`adm-zip` (already added in Phase 20), returns the ZIP binary as a download.

Currency values exported in CAD (storage format) regardless of display currency setting —
noted in `README.txt`.

- [ ] "Export all data (.zip)" button in Admin → User settings
- [ ] Per-domain export buttons on each tab's toolbar (e.g. Wins has an existing "Export"
  button for plain text — replace or supplement with CSV export)
- [ ] `GET /api/export` — full export endpoint; requires JWT auth
- [ ] `GET /api/export/:domain` — single-domain CSV download; requires JWT auth

## 24b — Import: opportunities

- [ ] New "Import" button in Scorecard → Opportunities sub-tab toolbar
- [ ] Accepts CSV upload; expected columns: `name, client, year, status, signingsValue,
  totalValue, stage, probability, expectedClose, dealType, logoType, relationshipOrigin,
  strategicNote`
- [ ] Column headers are case-insensitive and whitespace-tolerant — common CSV export
  variations handled
- [ ] Preview step: shows a table of parsed rows before committing; flags any rows with
  validation errors (missing required fields, unrecognised status values, malformed dates)
  in red with a reason column
- [ ] User can deselect individual rows before importing
- [ ] On confirm: appends valid rows to existing opportunities (never replaces); assigns
  new UUIDs; skips rows the user deselected or that failed validation
- [ ] Post-import summary: "X opportunities imported, Y skipped (validation errors)"
- [ ] Download a template CSV button (pre-populated with correct column headers and one
  example row) — removes the guesswork from formatting

## 24c — Import: wins

- [ ] Same pattern as 24b; in Wins tab toolbar
- [ ] Expected columns: `title, date, description, impact, tags, logoType,
  relationshipOrigin, strategicNote`
- [ ] `tags` column accepts a pipe-separated list (e.g. `Revenue|Delivery`) — matched
  case-insensitively against `adminData.winTags`; unrecognised tags added as-is
- [ ] `sourceType` set to `'manual'` for all imported wins; `sourceId` and `sourceName`
  set to null — imported wins are not linked to opportunities or goals
- [ ] Same preview, deselect, confirm, and summary flow as 24b

## 24d — Import: people

- [ ] Same pattern as 24b; in People tab toolbar
- [ ] Expected columns: `name, title, org, type, email, phone, need`
- [ ] `type` matched case-insensitively against `adminData.relationshipTypes`; falls back
  to first relationship type if unrecognised
- [ ] Touchpoints not importable via CSV (structured log — too complex for flat CSV);
  noted in the import modal and in the template CSV `README` column
- [ ] Duplicate detection: if an imported row's `name` exactly matches an existing person
  (case-insensitive), the row is flagged in the preview as a likely duplicate with a
  "Skip" pre-selection; user can override to import anyway

## 24e — Import infrastructure

Shared across all three import flows:

- [ ] `frontend/src/utils/csvImport.js` — CSV parser using `papaparse` (already available
  as a declared available library in the React artifact environment; add as an npm dep in
  the frontend: `npm install papaparse`)
- [ ] Generic `ImportModal` component — accepts column spec, validation rules, and an
  `onConfirm` callback; handles the upload → parse → preview → confirm → summary flow
  consistently across all three domains
- [ ] All imports go through the existing `PUT /api/data/:domain` endpoint — the import
  just merges new items into the existing domain array on the server, same as any other
  data write

---

**Implementation note**: Phase 24 adds `papaparse` to the frontend (`npm install papaparse`)
and uses `adm-zip` already added in Phase 20 for the ZIP export. No new database tables or
migrations. The import flow is entirely client-side up to the final confirm step — parsing
and validation happen in the browser before any data is sent to the server.

---

