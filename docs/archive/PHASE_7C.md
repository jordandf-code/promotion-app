# Phase 7c — People: relationship status

**Goal**: Add a `relationshipStatus` field to the people data model to distinguish the
desired relationship type from whether that relationship has actually been secured. This
is a small but targeted addition that makes the People tab more useful as a network gap
tracker.

## Checklist

- [ ] `peopleData_v2` — add `relationshipStatus: 'established' | 'in-progress'` field
- [ ] `backend/migration_phase07c.sql` — no schema changes needed (stored in JSONB
  `user_data`); document that new field is added with default `in-progress` via the
  app-side migration on next load
- [ ] App-side migration: on load, if any person record lacks `relationshipStatus`, set it
  to `'in-progress'` — same pattern used for prior data model migrations
- [ ] Person card: show `relationshipStatus` as a small pill alongside the type badge;
  `established` = green, `in-progress` = amber; pill is clickable to toggle without
  opening the edit modal
- [ ] Add/edit person modal: `relationshipStatus` field — toggle or dropdown, defaults to
  `in-progress` for new contacts
- [ ] People tab toolbar: filter by relationship status (All / Established / In progress)
  alongside the existing type filter
- [ ] `buildContext.js`: include `relationshipStatus` in the people context sent to AI —
  lets the gap analysis and narrative distinguish secured relationships from aspirational ones
- [ ] Phase 25 (LinkedIn import): `relationshipStatus` defaults to `in-progress` for all
  imported contacts
