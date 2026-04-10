# UI Audit & Design Recommendations

**Date:** 2026-04-10
**Scope:** Full visual audit of partner.jordandf.com + industry research

---

## Part 1: What Good Looks Like (Industry Research)

### The Core Principle: Layered Information, Not Flat Density

The best data-heavy SaaS apps (Linear, Stripe, Notion, Monday.com) all solve the same problem Career Command Center faces: **dozens of features, dense data, one screen.** They solve it not by removing features, but by *layering* them.

Linear's recent redesign philosophy captures it perfectly:
> "Don't compete for attention you haven't earned. Structure should be felt, not seen."

They made their sidebar "a few notches dimmer," reduced icon sizes, cut back on color, and shifted from monochrome blue to monochrome black/white. The result: same features, dramatically calmer interface.

### The 10 Principles That Separate Polished From Cluttered

#### 1. Three-Tier Information Hierarchy
- **Primary (visible immediately):** 4-5 key metrics, no clicks required
- **Secondary (one interaction away):** Expanded details, filters, secondary data
- **Tertiary (intentional navigation):** Deep configuration, historical data, advanced features

Overview screens should have <40% information density — users should grasp context in 3-5 seconds.

#### 2. The 60-30-10 Color Rule
- **60%** dominant/background (muted neutrals — off-white like `#f8fafc`, not pure white)
- **30%** secondary (slightly different neutral or very soft brand tint)
- **10%** accent (brand color, used *only* for CTAs and key interactive elements)

Stripe uses exactly this: primary blue `#2563eb` appears only on buttons and links. Everything else is neutral. Status colors (green/amber/red) are semantic and used sparingly.

#### 3. The 8px Grid System
Industry standard spacing scale: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px**. Font sizes can deviate from multiples of 8, but line heights must not. The rule: *internal padding ≤ external margin* (Gestalt proximity — items closer together are perceived as grouped).

#### 4. Disciplined Typography Scale
For data-dense apps:
| Role | Size | Weight |
|---|---|---|
| Hero numbers | 28-32px | Bold |
| Page title | 20-24px | Semibold |
| Section header | 16px | Semibold |
| Body text | 14px / 20px line-height | Regular |
| Labels & secondary | 12px | Medium |
| Micro/UI text | 11px | Medium |

Only 3 font weights: Regular (400), Medium (500), Semibold (600). Bold (700) reserved for hero numbers only.

#### 5. Sidebar Navigation: 240-280px, Collapsible to 64px
| Element | Spec |
|---|---|
| Expanded width | 256px (16rem) |
| Collapsed width | 64px (icon-only) |
| Nav item height | 36px |
| Active state | 3px left accent border + 8% primary opacity bg |
| Section grouping | Uppercase 12px headers with 24px top margin |
| Max visible items | 7-9 before scrolling |

Apps with 10+ sections **group them** (e.g., "Work," "Insights," "Settings"). Command palette (Cmd+K) is now table-stakes for power users.

#### 6. Progressive Disclosure Everywhere
- Filters start collapsed; basic visible, advanced behind "More filters"
- Table rows expandable for detail without full navigation
- Row actions behind "..." menus, not inline buttons
- Empty sub-sections hidden until populated

#### 7. Cards: One Job Each
Metric cards: **one primary number + one trend indicator + one sparkline**. Never two of those three. Width 200-280px, 4-6 per row. Content cards should have clear visual hierarchy: title → key value → supporting detail.

#### 8. Tables: Strict Formatting
| Property | Standard | Dense |
|---|---|---|
| Row height | 48-52px | 36-40px |
| Text alignment | Left for text, right for numbers, center for badges |
| Header | Sticky, muted bg, uppercase 12px |
| First column | Sticky on horizontal scroll |

#### 9. Skeleton Loading, Not Spinners
Stripe, Linear, and Notion all use shimmer skeleton screens. Reduces perceived load time 20-30%.

#### 10. Consistency Through Design Tokens
Every color, spacing value, shadow, and radius should be a named token (`--space-sm`, `--color-primary`, `--shadow-card`). Ad-hoc hex values and pixel amounts are the #1 source of visual inconsistency.

---

## Part 2: Current State of Career Command Center

### What's Working Well
- **Clean CSS custom properties** for core colors and shadows
- **Mobile-first awareness** — bottom tab bar, hamburger menu, 44px touch targets, safe-area handling
- **Consistent card pattern** — white bg, border, radius, shadow
- **Smart mobile nav customization** — star/favorite system for bottom bar tabs
- **Professional color palette** — IBM blue (#0040a0) is distinctive and serious
- **Modal safety** — backdrop clicks don't close (prevents data loss)
- **Form focus states** — clear blue ring on inputs

### The 8 Sources of Visual Clutter

#### 1. Navigation Overload (23 items, no grouping)
The sidebar lists 23 navigation items in a flat list. Users must scan all 23 to find what they need. No grouping, no collapsibility, no section headers. Compare: Linear groups items into "My Work," "Team," "Settings." HubSpot uses collapsible sections.

**Impact:** First-time users feel overwhelmed. Even power users waste scan time.

#### 2. Inconsistent Spacing / No Rhythm
The codebase uses gap values of 0.5rem, 0.75rem, 1rem, 1.25rem, 1.5rem, and 2rem — often on the same page. There's no defined spacing scale. Padding inside cards (1.25rem) sometimes exceeds margin between cards, violating the Gestalt proximity principle.

**Impact:** Elements feel randomly placed rather than deliberately composed.

#### 3. Too Many Button Variants (6-8 styles)
`btn-primary`, `btn-secondary`, `btn-danger-ghost`, `btn-ai`, `btn-ai-inline`, `btn-sm`, `row-btn` — each with different padding, colors, and sizing. The AI buttons introduce purple/light-blue that doesn't appear elsewhere in the design system.

**Impact:** Users can't build muscle memory for "what's clickable and how important is it."

#### 4. Color Proliferation
Beyond the defined token palette, hardcoded colors appear: qualifying year purple (`#EEEDFE`, `#5b21b6`), AI button tints, various one-off backgrounds. The 60-30-10 rule is violated — accent colors appear in too many places.

**Impact:** The eye has no resting point. Everything competes for attention.

#### 5. Information Density on Key Pages
- **Dashboard:** 6+ widgets stacked (Nudges, Readiness, Scorecard, Actions, Wins, Reflections) — tries to show everything at once
- **Scorecard:** 5 tabs, each with multi-column tables showing status + value + forecast + target in single cells
- **Competencies:** Radar chart, BARS wizard, evidence linker, Johari window, composite scores, multi-rater request — 6+ major components

**Impact:** Users don't know where to look first. Key information doesn't stand out from supporting detail.

#### 6. Inconsistent Page Structure
Some pages use tabs, some use sections, some use card grids, some use lists. No consistent pattern for "how a page is organized." Vertical rhythm varies page to page.

**Impact:** Each page feels like a different app. Users must re-learn the interface per tab.

#### 7. Monolithic CSS (5,300+ lines, single file)
All styles in one `App.css`. No component-scoped styles, no naming convention beyond semantic class names. Makes it easy for styles to conflict and hard to maintain consistency.

**Impact:** Developer friction → inconsistency compounds over time.

#### 8. No Progressive Disclosure
Most pages show all their content immediately. No collapsed sections, no "show more," no tiered visibility. Every field, every metric, every action button is always visible.

**Impact:** Pages with 10+ fields feel like walls of inputs. Users doing simple tasks are confronted with the full complexity.

---

## Part 3: Recommendations

### Tier 1 — High-Impact, Moderate Effort (Do These First)

#### R1. Group the Sidebar Navigation
**Current:** 23 flat items.
**Proposed:** 5 groups with collapsible sections:

```
HOME:          Dashboard
TRACK:         Scorecard, Opportunities, Goals, Action Items, Calendar
RELATIONSHIPS: People, Sponsees, Sharing, Influence Map
EVIDENCE:      Wins, Competencies, Eminence, Learning, Reflections
PACKAGE:       Narrative + Gaps, Package Generator, Documents, Mock Panel
SETTINGS:      View Others, Admin, Import / Export
TESTING:       Benchmarking, Brand (superuser-only)
```

Groups should be collapsible (click section header to toggle). Remember collapsed state in localStorage. Show 7-9 items by default (collapse lesser-used groups). Add `Cmd+K` command palette for keyboard navigation.

#### R2. Establish a Spacing Scale (Replace Ad-Hoc Values)
Define and enforce:
```css
--space-2xs: 0.125rem;  /*  2px — hairline gaps */
--space-xs:  0.25rem;   /*  4px — tight, within components */
--space-sm:  0.5rem;    /*  8px — between related elements */
--space-md:  0.75rem;   /* 12px — standard gap */
--space-base: 1rem;     /* 16px — between sections within a card */
--space-lg:  1.5rem;    /* 24px — between cards/sections */
--space-xl:  2rem;      /* 32px — page padding, major breaks */
--space-2xl: 3rem;      /* 48px — hero spacing */
```
Audit every margin/padding/gap in `App.css` and replace with tokens. This alone will create visual rhythm.

#### R3. Reduce the Dashboard to 3 Tiers
**Tier 1 (always visible):** Readiness score + 4 key metrics (Scorecard snapshot). These are the "glanceable" KPIs.
**Tier 2 (collapsed by default, one click to expand):** Nudges, Action items, Recent wins.
**Tier 3 (navigate to page):** Reflections, detailed competency data, historical trends.

The dashboard should answer "Am I on track?" in 3 seconds. Everything else is one click away.

#### R4. Consolidate Button Styles to 3 Variants
| Variant | Use Case | Style |
|---|---|---|
| **Primary** | Main CTA per section (1 per card/section max) | Filled brand color |
| **Secondary** | All other actions | Outlined, neutral border |
| **Destructive** | Delete/remove actions | Red text, no fill |

Kill `btn-ai`, `btn-ai-inline`, `btn-danger-ghost`, `row-btn` as separate styles. AI actions use the same button styles as everything else — differentiate with an icon prefix (✨), not a different button color. Size variants: default + small only.

#### R5. Enforce the 60-30-10 Color Rule
- **60% — Backgrounds:** Change main bg from `#f3f4f6` to `#f8fafc` (slightly warmer, less stark). Cards stay `#ffffff`.
- **30% — Secondary:** Text uses only `--text` (#111827) and `--text-muted` (#6b7280). Borders stay `#e5e7eb`.
- **10% — Accent:** Brand blue `#0040a0` appears ONLY on: primary buttons, active nav items, links, focus rings. That's it.
- **Status colors:** Green/amber/red used ONLY for status indicators, never for decoration.
- **Remove:** Qualifying year purple (`#EEEDFE`), AI-specific blues. QY column uses amber (already a defined token). AI features use no special color.

### Tier 2 — Medium Impact, Focused Effort

#### R6. Add Progressive Disclosure to Complex Pages
**Scorecard:** Default to "Overview" tab showing the 4 key metrics + status. Detailed quarterly data behind "View details" per metric.
**Competencies:** Show competency list + radar chart by default. BARS wizard, evidence linker, and Johari window are each behind expand/accordion sections.
**People:** Show name + role + last contact date in the list. Full contact details, touchpoint history, and feedback in an expandable panel or detail view.

#### R7. Standardize Page Layout Structure
Every page should follow this template:
```
┌─────────────────────────────┐
│ Page Title        [Actions] │  ← .page-header, always
├─────────────────────────────┤
│ Key Metrics (if applicable) │  ← Optional metric strip, 4 max
├─────────────────────────────┤
│ Filters / Tabs              │  ← If page has sub-views
├─────────────────────────────┤
│ Primary Content             │  ← Cards, tables, or lists
│                             │
│                             │
└─────────────────────────────┘
```
No page should skip levels (e.g., jump from title straight to a complex table without context).

#### R8. Tighten Typography Scale
Reduce to exactly 6 sizes:
```css
--text-xs:   0.75rem;   /* 12px — labels, metadata, badges */
--text-sm:   0.8125rem; /* 13px — secondary text, table cells */
--text-base: 0.875rem;  /* 14px — body text, inputs */
--text-md:   1rem;      /* 16px — section headers */
--text-lg:   1.25rem;   /* 20px — page titles */
--text-xl:   1.75rem;   /* 28px — hero numbers */
```
Audit all font-size declarations and map to these 6 tokens. Remove all other sizes (0.7rem, 0.78rem, 0.825rem, 1.6rem — these fractional values serve no design purpose).

#### R9. Add Collapsible Sidebar
Desktop sidebar should be collapsible to icon-only (64px) via a toggle button. Saves ~190px of horizontal space for data-heavy pages like Scorecard. Persist collapsed state in localStorage. On hover in collapsed mode, show label tooltips.

### Tier 3 — Polish & Platform Feel

#### R10. Add Skeleton Loading States
Replace any spinner/loading text with shimmer skeletons that match the layout of the content they're replacing. Reduces perceived load time 20-30%.

#### R11. Improve Empty States
Every page that can be empty should have:
- An illustration or icon (subtle, not cartoonish)
- One sentence explaining what will appear here
- A primary CTA to create the first item
- Optional: link to docs or a template

Current empty states are likely bare "No items yet" text.

#### R12. Add Command Palette (Cmd+K)
With 23 pages and many features, a keyboard-navigable command palette dramatically improves power-user efficiency. Items: all nav pages, recent items, common actions (Add win, Log contact, etc.).

#### R13. Introduce Subtle Depth Hierarchy
Define 3 shadow levels tied to elevation meaning:
```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);   /* cards at rest */
--shadow-md:  0 4px 12px rgba(0,0,0,0.08);   /* hover/raised cards */
--shadow-lg:  0 8px 32px rgba(0,0,0,0.12);   /* modals, popovers */
```
Currently only 2 shadows defined. Adding a hover-elevation on cards creates interactive feel.

---

## Part 4: Design Guide Updates

### Updates to FORM_UX.md
Add the following sections:
1. **Error states** — red border, error message below field (0.78rem, red), icon prefix
2. **Disabled/readonly states** — reduced opacity (0.6), `cursor: not-allowed`, muted bg
3. **Loading states** — input skeleton or disabled + spinner for async validation
4. **Form sections** — group related fields with a subtle section header (--text-sm, --text-muted, uppercase)
5. **Progressive disclosure** — "Show advanced options" pattern for forms with >6 fields
6. **Accessibility** — `aria-required`, `aria-invalid`, `aria-describedby` for error messages

### Updates to MOBILE_UX.md
Add the following sections:
1. **Typography scaling** — body text stays 14px on mobile (don't scale down), titles scale from 20px to 18px
2. **Collapsed sections** — on mobile, secondary content sections start collapsed by default
3. **Filter patterns** — filters become a "Filter" button → bottom sheet, not an inline bar
4. **Overflow strategy** — horizontal scroll containers need visible scroll indicators (gradient fade or scrollbar)
5. **Touch spacing** — minimum 8px between tappable elements (prevents mis-taps)

### New: DESIGN_SYSTEM.md
Create a single source of truth covering:
1. Color tokens (all CSS custom properties with usage rules)
2. Typography scale (the 6 sizes above)
3. Spacing scale (the 8 values above)
4. Shadow/elevation scale
5. Button variants (3 only)
6. Card patterns
7. Table standards
8. Status indicator spec
9. The 60-30-10 color rule
10. Sidebar navigation grouping spec

---

## Implementation Priority

| # | Recommendation | Impact | Effort | Dependency |
|---|---|---|---|---|
| R1 | Group sidebar nav | 🔴 High | Medium | None |
| R2 | Spacing scale tokens | 🔴 High | Medium | None |
| R3 | Dashboard 3-tier | 🔴 High | Medium | R6 pattern |
| R4 | Consolidate buttons | 🔴 High | Low | R2 |
| R5 | 60-30-10 color cleanup | 🔴 High | Low | None |
| R6 | Progressive disclosure | 🟡 Medium | High | None |
| R7 | Page layout template | 🟡 Medium | Medium | R2 |
| R8 | Typography scale | 🟡 Medium | Medium | None |
| R9 | Collapsible sidebar | 🟡 Medium | Medium | R1 |
| R10 | Skeleton loading | 🟢 Low | Medium | None |
| R11 | Empty states | 🟢 Low | Low | None |
| R12 | Command palette | 🟢 Low | High | None |
| R13 | Shadow hierarchy | 🟢 Low | Low | None |

**Recommended execution order:** R5 → R2 → R4 → R8 → R1 → R3 → R7 → R6 → R9 → R11 → R13 → R10 → R12

Start with color and spacing tokens (R5, R2) because they're the foundation everything else builds on. Then button consolidation (R4) and typography (R8) to establish the visual language. Then tackle layout (R1, R3, R7) with the new tokens in place. Progressive disclosure (R6) and polish (R9-R13) last.
