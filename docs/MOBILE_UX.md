# Mobile UX Standards

Every UI change must work on both desktop and mobile (375px viewport minimum). Test at the 768px breakpoint. No horizontal scrolling is allowed on any page.

## Breakpoints

- **768px** — primary mobile breakpoint. All mobile layout changes trigger here.
- **640px** — small phone breakpoint (used for readiness widget only).

## Navigation

### Bottom tab bar
- Fixed at bottom, 56px height + `env(safe-area-inset-bottom)` padding.
- Up to 5 user-selected tabs. Users toggle tabs via star icons (☆/★) in the hamburger sidebar.
- Persisted in `adminData.bottomBarTabs`. Defaults: Dashboard, Scorecard, Pursuits, Wins, Narrative+Gaps.
- Viewer role: shows only "View others".
- Hidden on desktop (≥ 769px).
- Component: `frontend/src/components/BottomTabBar.jsx`

### Mobile header
- Fixed top bar (3.25rem) with hamburger, app name, and current tab name.
- Current tab label shown after "Promotion Tracker — " (lighter weight, 0.85rem, 75% opacity).

### Sidebar (hamburger)
- All tabs always visible (not filtered by bottom bar membership).
- Star toggles visible on mobile only (`display: contents` on desktop).
- Brand ("Promotion Tracker") hidden on mobile — header already shows it.
- Top padding: 2.5rem to clear mobile header.
- Footer padding includes `env(safe-area-inset-bottom)`.

## Modals

- **Top-anchored** on mobile: `align-items: flex-start`, `padding-top: 3.25rem` (below header).
- Rounded bottom corners: `border-radius: 0 0 16px 16px`.
- Slide-down animation: `translateY(-100%)` → `translateY(0)`, 300ms ease-out.
- No drag handle on mobile.
- Max height: 90vh with internal scroll.
- Form padding: `padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))`.
- Backdrop click does NOT close modals (prevents data loss).
- Desktop modals are unchanged (centered, rounded all corners).

## Touch targets

Minimum **44px** on all interactive elements at the mobile breakpoint. Applied via CSS:
- `.row-btn`: `min-height: 44px; min-width: 44px; padding: 10px 14px`
- `.status-badge--btn`: `min-height: 44px; min-width: 44px` with inline-flex centering
- `.goal-action-check`, `.goal-action-unlink`: 44px
- `.btn-primary`, `.btn-secondary`, `.btn-danger-ghost`: `min-height: 44px`
- `.filter-select`: `min-height: 44px`
- `.win-tag--pick`: `min-height: 44px; padding: 8px 14px`
- `.currency-btn`, `.nav-order-btn`: 44px
- Feedback stars: 48px (`min-width: 48px; min-height: 48px`)

## Form inputs

- Currency inputs: `inputMode="decimal"` — shows numeric keypad with decimal point
- Probability (%): `inputMode="numeric"`
- Hour inputs: `inputMode="numeric"`
- All date inputs: `type="date"` consistently
- Textareas: `min-height: 80px` on mobile
- All inputs: `max-width: 100%; box-sizing: border-box` on mobile

## Scorecard year navigation

On mobile, all scorecard views show **one year at a time** with arrow navigation:
- **Applies to**: Dashboard ScorecardTable, Scorecard Overview, Targets tab.
- **Arrow buttons**: 40px shaded circles (`border-radius: 50%; background: var(--bg)`), no border. Positioned at left/right edges via `justify-content: space-between` on full-width nav.
- **Year label**: centered between arrows, 1.1rem bold. Gold star (★) shown next to qualifying year.
- **Table header row** (`<thead>`) hidden on mobile — year already shown in arrow nav.
- **No colored backgrounds** on year columns on mobile (qualifying purple, partner blue all reset to plain surface).
- **Default year**: current year (not qualifying year -1).
- Desktop is unchanged (3-year windowed view with expand button).
- Use `useIsMobile(768)` hook pattern for conditional rendering.

## Sub-tabs

When a page has horizontal sub-tabs (e.g., Scorecard: Overview/Targets/Opportunities/Projects/Utilization):
- **Desktop**: horizontal tab bar (`.sc-tabs`).
- **Mobile**: full-width `<select>` dropdown replacing the tab bar.
- Render both, hide one with CSS: `.sc-tabs--desktop { display: none }` and `.sc-tabs--mobile { display: block }` at 768px.

## Tables

On mobile, `.data-table` rows convert to card layout:
```css
.data-table thead { display: none; }
.data-table tfoot { display: none; }
.data-table tbody tr {
  display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem;
  padding: 0.875rem; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
}
.data-table .td-primary { width: 100%; font-weight: 600; }
.data-table .action-col { width: 100%; border-top: 1px solid var(--border); }
```
Same pattern for `.super-admin-table`.

## Dashboard

- **Stat strip**: stacks to single column (`flex-direction: column`).
- **Two-column layout**: collapses to single column (`grid-template-columns: 1fr`).
- **Quick-add FAB**: 56px IBM blue circle, fixed bottom-right above tab bar. Hidden on desktop.
- **Scorecard highlights**: same arrow-navigation pattern as Scorecard Overview.

## Preventing horizontal scroll

- Never use fixed `min-width` values that exceed mobile viewport.
- Use `flex-wrap: wrap` on flex rows that contain multiple items.
- Admin cards: `max-width: 100%` on mobile (overrides desktop 560px cap).
- Admin list rows and add forms: `flex-wrap: wrap`.
- Readiness weight labels: remove fixed width on mobile.
- All form inputs: `max-width: 100%; box-sizing: border-box`.
- Pages: no `overflow-x: auto` unless explicitly inside an expandable container.
- Test every change at 375px viewport width.

## Safe areas (iOS notch / home indicator)

- Bottom tab bar: `padding-bottom: env(safe-area-inset-bottom)`
- Modal forms: `padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))`
- Sidebar footer: `padding-bottom: calc(1.5rem + env(safe-area-inset-bottom))`
- Viewport meta: `viewport-fit=cover`

## PWA

- `frontend/public/manifest.json`: standalone display, IBM blue theme
- Service worker via `vite-plugin-pwa`: caches app shell only, no API responses
- Disabled in dev (`devOptions: { enabled: false }`)
- Icons: 192px and 512px PNG in `frontend/public/`

## Checklist for any new UI component

1. Does it fit within 375px without horizontal scroll?
2. Are all tap targets ≥ 44px on mobile?
3. If it's a modal, does it use the standard `.modal-backdrop` / `.modal` classes (auto top-anchored on mobile)?
4. If it has tabs, is there a dropdown alternative for mobile?
5. If it has a table, does it convert to cards at 768px?
6. Are number inputs using the correct `inputMode`?
7. Does it account for the bottom tab bar height in fixed positioning?
