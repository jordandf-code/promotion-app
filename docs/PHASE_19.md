# Phase 19 — Mobile UX and PWA

**Goal**: Make the app genuinely usable on iOS and Android as a PWA. Phase 14 added a
hamburger menu and responsive breakpoints; this phase goes deeper — fixing the specific
patterns that break on small screens (tables, modals, dense tap targets) and adding the
PWA manifest so users can install the app from Safari or Chrome. All new screens introduced
in Phase 17 (Learning tab) and Phase 18 (Super Admin panel, View others tab, registration
flow, forgot-password flow, My profile sub-tab) are covered by these changes.

---

## 19a — PWA manifest and install support

- [ ] Add `public/manifest.json`: `name`, `short_name`, `start_url`, `display: standalone`,
  `background_color`, `theme_color: #0040a0`, and icon set (192px + 512px PNG)
- [ ] Add `<link rel="manifest">` and `<meta name="theme-color" content="#0040a0">` to
  `index.html`
- [ ] Set `viewport` meta to `width=device-width, initial-scale=1, viewport-fit=cover` so
  content respects the iPhone notch and Dynamic Island
- [ ] Add `vite-plugin-pwa` — generates service worker for offline shell caching; configure
  to pre-cache the app shell only (not API responses)
- [ ] Add `env.safe-area-inset-bottom` padding to the bottom navigation bar so content
  clears the iOS home indicator
- [ ] Test: "Add to Home Screen" in Safari → app opens full-screen with IBM blue status bar,
  no browser chrome

## 19b — Navigation: bottom tab bar for primary tabs

The hamburger + full-screen sidebar overlay (Phase 14) stays for secondary tabs. A persistent
bottom tab bar replaces the hamburger for the five most-used tabs on mobile.

- [ ] On screens ≤ 768px, render a fixed bottom tab bar with five slots: Dashboard, Scorecard,
  Pursuits, Wins, Narrative + Gaps — these are the tabs with the highest data-entry and
  review frequency
- [ ] Each slot: icon (SVG, 24px) + short label (≤ 10 chars), active state uses IBM blue fill
- [ ] Bottom bar height: 56px + `env(safe-area-inset-bottom)` — never overlaps content
- [ ] Remaining tabs (Goals, People, Wins, Actions, Learning, Calendar, Sharing, Admin,
  View others, Super Admin) remain accessible via the hamburger sidebar overlay
- [ ] Tab bar respects the user's tab-ordering setting from Admin — if a tab is reordered out
  of the primary five, it moves to the sidebar; the next tab in order takes its slot. Super
  Admin is never in the bottom bar.
- [ ] `viewer` role: bottom bar shows only "View others"; all other slots hidden (matches
  Phase 18 role constraints)
- [ ] On ≥ 769px screens: bottom bar hidden, sidebar nav used as before — no change to
  desktop layout

## 19c — Tables → card lists on mobile

Every data table in the app switches to a card list layout on screens ≤ 768px. Desktop table
layout is unchanged.

**Scorecard — Overview tab**
- [ ] The windowed 3-year grid (Phase 14 / out-of-phase addition) is already an improvement;
  on mobile collapse further to **qualifying year only** with a "Show all years →" link that
  opens a horizontally-scrollable version of the full grid
- [ ] Each metric row becomes a card: metric name as heading, target / realized / forecast /
  status as stacked label–value pairs; status dot and badge retained

**Scorecard — Opportunities sub-tab**
- [ ] Table rows become cards: deal name + client as card heading; signings value prominent;
  stage pill, logo type pill, and status pill in a pill row; probability and expected close
  on one line; strategic note collapsed behind a "Details" disclosure if present
- [ ] Edit and Remove buttons retained in card footer; same modals used

**Scorecard — Projects sub-tab**
- [ ] Table rows become cards: project name + client as heading; realized/forecast status pill;
  quarterly revenue and GP shown as a 2×4 mini grid within the card; GP margin % shown
  as a single figure; opportunity link shown if present
- [ ] Edit and Remove in card footer

**Scorecard — Utilization sub-tab**
- [ ] Annual target + stats panel stack vertically (already likely responsive); the 12-month
  actual/forecast grid is the problem — on mobile render as a single-column list of month
  rows (month label | actual input | forecast input) instead of a horizontal grid

**Pursuits tab**
- [ ] Stage funnel summary strip: render as a 2×3 grid of stage count badges instead of a
  horizontal row (avoids overflow at small widths)
- [ ] Pipeline table → cards: deal name + client as heading; signings value and weighted value
  prominent; stage pill; probability, expected close, logo type, and origin on secondary lines;
  strategic note behind "Details" disclosure

**People tab**
- [ ] People are already cards; ensure edit/remove buttons have ≥ 44px tap targets; touchpoint
  log and planned contacts sections stack cleanly without horizontal overflow

**Learning tab (Phase 17)**
- [ ] Certification cards: already card-based by design; ensure expiry alert badges don't
  overflow; "View badge" link button has ≥ 44px tap target
- [ ] Courses section: card list, no table — already appropriate for mobile by design

**Super Admin — Users sub-tab (Phase 18)**
- [ ] The registered-accounts table → cards on mobile: name + email as heading; role pill;
  joined date on secondary line; Change role dropdown, Reset password button, and Delete
  button in card footer
- [ ] Confirmation modals for delete/reset are bottom sheets on mobile (see 19d)

## 19d — Modals → bottom sheets on mobile

All modals that are currently centered overlays switch to bottom sheets on screens ≤ 768px.
Desktop modal behaviour (centered, max-width constrained) is unchanged.

Bottom sheet behaviour:
- Slides up from the bottom of the screen
- Full viewport width, rounded top corners (16px radius)
- Maximum height 90vh with internal scroll — never taller than the screen
- Backdrop behind it; tapping backdrop does NOT close (consistent with Phase 16 fix —
  prevents accidental data loss)
- A drag handle indicator (centered 40×4px pill) at the top of the sheet
- The sheet clears the iOS keyboard — when a text input is focused, the sheet scrolls to
  keep the active input above the keyboard

Affected modals (all existing + phases 17–18):
- All add/edit modals: Opportunity, Project, Win, Goal, Action item, Person, Quick-add (5
  types)
- Learning tab modals: Add/edit certification, Add/edit course (Phase 17)
- Phase 18 modals: Reset password confirmation, Delete account confirmation, Forgot password
  two-step form, Update security question inline form
- Calendar event tooltip: on mobile becomes a bottom sheet instead of a fixed-position
  tooltip (tooltips are unusable on touch screens)

## 19e — Touch targets and tap ergonomics

- [ ] Audit all interactive elements and enforce minimum **44×44px** tap targets via CSS
  (`min-height: 44px; min-width: 44px` on buttons and links, padding on small controls)
- [ ] Status pills that are tappable to cycle state (goal status, action done toggle): ensure
  full pill area is the tap target, not just the text
- [ ] Edit / Remove / Done buttons on cards and table rows: use `padding: 10px 14px` minimum
  so they meet the 44px height threshold without visually enlarging
- [ ] Drag-and-drop reorder handles in Admin (category lists, tab ordering): add a dedicated
  grip icon (⠿) with 44px tap area; drag-and-drop on mobile uses touch events
- [ ] People tab planned contact "Log as done" button: ensure 44px height
- [ ] Win tag pills in the Wins form multi-select: each pill needs 44px height or render as
  full-width toggles on mobile
- [ ] Phase 18 role dropdown and per-row action buttons in Super Admin users table: 44px rows

## 19f — Form input improvements

Apply correct `inputmode` and `type` attributes throughout so iOS shows the right keyboard
and avoids the number-spinner regression.

- [ ] All currency inputs (`signingsValue`, `totalValue`, quarterly revenue/GP, targets):
  `inputmode="decimal"` — shows numeric keypad with decimal point, no iOS spinner
- [ ] Probability input (%): `inputmode="numeric"` — whole numbers only
- [ ] Hour inputs (utilization actual/forecast, course hours): `inputmode="numeric"`
- [ ] All date inputs: `type="date"` — renders native iOS date picker (already likely in use;
  confirm consistently applied including Phase 17 cert/course modals and Phase 18
  registration fields)
- [ ] Long textarea fields (IBM criteria, career history, strategic notes, cert notes, course
  notes, security question): `min-height: 80px` so they don't render as single-line inputs
  on mobile
- [ ] Forms inside bottom sheets: add `padding-bottom: env(safe-area-inset-bottom)` + extra
  16px so the Save button is never hidden behind the iOS home indicator
- [ ] Phase 18 registration form (invite code + security question + answer): all three new
  fields follow the same input standards; security answer uses `autocomplete="off"` and
  `autocorrect="off"` to prevent iOS from auto-correcting the answer and causing hash
  mismatches

## 19g — Dashboard mobile layout

- [ ] Stat cards (days to go, overdue actions, stale contacts): render as a single-row
  horizontal strip with equal-width cards; currently likely 3-column grid which gets
  very narrow at 390px — use `min-width: 90px` with overflow scroll if needed, or
  stack as 1×3 column on the smallest breakpoint (< 390px)
- [ ] Multi-year `ScorecardTable`: on mobile collapse to **qualifying year only** (same
  treatment as Scorecard overview in 19c) with a "Full scorecard →" link
- [ ] Recent wins and overdue action items list: already card-based; ensure items have
  ≥ 44px tap targets for the click-to-navigate behaviour added in the out-of-phase work
- [ ] Quick-add FAB: on mobile replace the text button with a floating action button (FAB) —
  fixed position, bottom-right, above the bottom tab bar; IBM blue circle, white `+` icon,
  56px diameter; opens the existing 5-type quick-add bottom sheet

## 19h — Public share and feedback pages (mobile)

These pages are accessed by anyone with a link — they may never have seen the app before,
so mobile-first polish matters more here than anywhere else.

- [ ] Public summary page (`/share/:token`): single-column layout; scorecard highlights as
  stat cards; wins as cards; narrative as readable prose block; no tables
- [ ] Feedback portal (`/feedback/:token`): star rating rendered as large tap targets
  (≥ 48px per star); name + comment fields full-width; Submit button full-width, 48px height
- [ ] Forgot password flow (`/forgot-password` — Phase 18): two-step form renders as a
  centered card on desktop and full-screen on mobile; each step fits within one viewport
  height so no scrolling is needed to reach the primary action

## 19i — View others tab (Phase 18) — mobile layout

- [ ] Peer list: cards with name, role pill, last-updated timestamp; ≥ 44px tap target per card
- [ ] "Viewing: [Name]" banner: sticky at top, slim (36px), does not push content below it
  off-screen on small displays
- [ ] `PeerDashboard` view: same mobile treatment as the owner's Dashboard (stat strip,
  qualifying-year scorecard card, recent wins list)
- [ ] `PeerNarrative` view: plain prose block; token usage and Generate buttons hidden (already
  planned); renders cleanly as a single-column reading view

---

**Implementation note**: All changes in Phase 19 are CSS and component-layout only — no data
model changes, no new backend routes, no migrations. The phase can be worked sub-task by
sub-task in any order; 19a (PWA manifest) and 19d (bottom sheets) should be done first as
they affect the most surfaces.

---

