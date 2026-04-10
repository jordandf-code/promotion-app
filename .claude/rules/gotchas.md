# Gotchas — things that will silently break if you forget them

- Modal backdrop clicks do NOT close modals (prevents data loss) — do not change this
- Anthropic API key is NEVER an env var — always per-user from DB
- NEVER modify existing `migration*.sql` files — always create new ones
- `adminData` sync has a `serverLoaded` guard to prevent race conditions — do not remove
- Route is `/opportunities` (not `/pursuits`) — renamed 2026-04-07
- Site-wide categories (win tags, relationship types, pipeline stages) are stored via `/api/platform` in `app_settings` table — NOT per-user admin data
- Platform data uses `app_settings` table (keys: `platform_categories`, `firm_config`), not `user_data`
- Scorecard metric labels are configurable via firm config in Super Admin. Defaults: "Signings", "Revenue", "Gross profit", "Chargeable utilization"
- Narrative page has 3 subtabs with an "active source" toggle that controls which source feeds the readiness score's evidence dimension
- User relationships use `user_relationships` table (sponsor/peer types). Old `viewer_access` table kept for backward compat — both written to during transition
- New pages/tabs MUST be added to the `testing` group in `frontend/src/navGroups.js` (superuser-only). Move to the appropriate group only after validation. Nav groups are defined in `navGroups.js`, NOT in Layout.jsx
- The `testing` nav group is only visible to superuser role. Use it as a staging area for new features
- Dashboard uses widget slot pattern — add new widgets as components in `components/dashboard/`, import and place them in Dashboard.jsx
- Sharing page has sub-tabs (Links | Feedback). Feedback tab has request tracking, expandable inbox, and AI synthesis
- Feedback form supports both legacy (single star rating via `feedback_token`) and structured 360 (5 dimensions via `review_tokens`). Token type determines form mode
