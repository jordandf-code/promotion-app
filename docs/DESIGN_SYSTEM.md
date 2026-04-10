# Design System

Single source of truth for all visual patterns. All values reference CSS custom properties in `frontend/src/index.css`.

## Color tokens

### 60-30-10 rule
- **60% — Backgrounds**: `--bg` (`#f8fafc`), `--surface` (`#ffffff`)
- **30% — Secondary**: `--text` (`#111827`), `--text-muted` (`#6b7280`), `--border` (`#e5e7eb`)
- **10% — Accent**: `--brand` (`#0040a0`) — used ONLY on primary buttons, active nav, links, focus rings

### Brand
| Token | Value | Usage |
|---|---|---|
| `--brand` | `#0040a0` | Primary buttons, active states, links |
| `--brand-dark` | `#002d80` | Button hover |
| `--brand-light` | `#dbeafe` | Light backgrounds for brand-related elements |

### Status (semantic only, never decorative)
| Token | Value | Usage |
|---|---|---|
| `--green` / `--green-bg` / `--green-border` | `#16a34a` | Success, done, on-track |
| `--red` / `--red-bg` / `--red-border` | `#dc2626` | Error, danger, overdue |
| `--amber` / `--amber-bg` / `--amber-border` | `#d97706` | Warning, at-risk, qualifying year |

### Neutrals
| Token | Value | Usage |
|---|---|---|
| `--text` | `#111827` | Primary text |
| `--text-muted` | `#6b7280` | Secondary text, labels |
| `--text-light` | `#9ca3af` | Tertiary text, placeholders |
| `--bg` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Cards, modals |
| `--border` | `#e5e7eb` | Default borders |
| `--border-med` | `#d1d5db` | Input borders |

## Typography scale

6 sizes only. No ad-hoc `font-size` values.

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | `0.75rem` (12px) | Labels, metadata, badges, table headers |
| `--text-sm` | `0.8125rem` (13px) | Secondary text, small buttons, table cells |
| `--text-base` | `0.875rem` (14px) | Body text, inputs, primary button text |
| `--text-md` | `1rem` (16px) | Section headers, modal titles |
| `--text-lg` | `1.25rem` (20px) | Page titles |
| `--text-xl` | `1.75rem` (28px) | Hero numbers, dashboard KPIs |

### Font weights
- **400 (Regular)**: Body text
- **500 (Medium)**: Labels, secondary buttons
- **600 (Semibold)**: Section headers, primary buttons, nav items
- **700 (Bold)**: Page titles, hero numbers only

## Spacing scale

8px base grid. Use these tokens for all margin, padding, and gap values.

| Token | Value | Usage |
|---|---|---|
| `--space-2xs` | `0.125rem` (2px) | Hairline gaps, nav item gaps |
| `--space-xs` | `0.25rem` (4px) | Tight spacing within components |
| `--space-sm` | `0.5rem` (8px) | Between related elements |
| `--space-md` | `0.75rem` (12px) | Standard gap |
| `--space-base` | `1rem` (16px) | Between sections within a card |
| `--space-lg` | `1.5rem` (24px) | Between cards/sections |
| `--space-xl` | `2rem` (32px) | Page padding, major breaks |
| `--space-2xl` | `3rem` (48px) | Hero spacing |

### Gestalt rule
Internal padding (inside a card) must be <= external margin (between cards). Items closer together are perceived as grouped.

## Shadows (elevation)

3 levels, each with a distinct semantic meaning.

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards at rest |
| `--shadow` | `0 4px 12px rgba(0,0,0,0.08)` | Hover/raised cards, dropdowns |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Modals, popovers |

## Button variants

3 core variants only. No additional button colors.

| Variant | Class | Style | Usage |
|---|---|---|---|
| **Primary** | `.btn-primary` | Filled brand blue, white text | Main CTA — 1 per card/section max |
| **Secondary** | `.btn-secondary` | Outlined, neutral border | All other actions |
| **Destructive** | `.btn-danger-ghost` | Red text, no border | Delete/remove actions |

### Modifiers
- `.btn-sm`: Smaller padding and font size (`--text-xs`)
- `.row-btn`: Inline text button for table/card row actions (brand color, no border)

### AI actions
Use standard button variants with a text prefix (e.g., "AI: Suggest goals") — no special colors or borders for AI features.

## Card patterns

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);  /* 8px */
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}
```

- `.card--list`: No padding (content items provide their own)
- `.card--flush`: No padding (for tables that fill the card)

## Table standards

| Property | Value |
|---|---|
| Row height | 48px standard, 36px dense |
| Text alignment | Left for text, right for numbers, center for badges |
| Header | Sticky, `--bg` background, uppercase `--text-xs`, letter-spaced |
| Hover | `background: var(--bg)` |
| First column | Sticky on horizontal scroll |
| Numbers | Right-aligned, tabular nums |

## Status indicators

- **Dot**: 8px circle, inline before label. Green/amber/red.
- **Badge**: Capsule shape, `--text-xs`, 600 weight. Semantic color bg + border.
- **Progress bar**: Fill color matches status. Green = done, brand = on-track, amber = at-risk.

## Sidebar navigation

Groups with collapsible sections (defined in `frontend/src/navGroups.js`):
- **Home**: Dashboard
- **Track**: Scorecard, Opportunities, Goals, Action items, Calendar
- **Relationships**: People, Sponsees, Sharing, Influence Map
- **Evidence**: Wins, Competencies, Eminence, Learning, Reflections
- **Package**: Narrative + Gaps, Package Generator, Documents, Mock Panel
- **Settings**: View Others, Admin, Import / Export
- **Testing**: Benchmarking, Brand *(superuser-only)*

Group headers: uppercase, `0.65rem`, letter-spaced, muted white. Collapsible with chevron. State persisted in localStorage.

Both group order and item order within groups are customizable via Admin > Settings > Tab order. Saved in `navOrder: { groupOrder: [...], itemOrder: { groupId: [...] } }`.

Sidebar collapses to 48px icon-only rail via toggle button.

New tabs go to the `testing` group by default (superuser-only). Move to the appropriate group after validation.

## Progressive disclosure

Use `<CollapsibleSection>` component for any content that is secondary or detail-level:
- Dashboard: Readiness + Scorecard always visible; Actions, Wins, Reflections collapsed
- Competencies: Self-assessment + Radar always visible; Evidence, Johari, Composite, Multi-rater, AI collapsed
- Props: `id` (localStorage key), `title`, `count` (badge), `defaultOpen`

## Accessibility

- Required fields: `aria-required="true"` + red asterisk
- Error fields: `aria-invalid="true"` + `aria-describedby` pointing to error message
- Focus rings: `0 0 0 3px rgba(0,64,160,0.1)` on brand-colored border
- Minimum touch target: 44px on mobile
- Color is never the only indicator — always paired with text or icon
