# Form UX Standards

All form labels follow a single consistent pattern — no exceptions.

## Label pattern

- **Required fields**: label text followed immediately by `<span className="form-required">*</span>` (red asterisk, inline)
- **Optional fields**: label text only — no `(optional)` text, no hint, no marker. The absence of `*` implies optional.
- **Unit indicators** (%, currency): `<span className="form-unit">symbol</span>` immediately after the label text — never in parentheses, never as a separate line

```jsx
// Required
<label>Client name<span className="form-required">*</span>
  <input className="form-input" ... required />
</label>

// Optional — no marker at all
<label>Strategic rationale
  <input className="form-input" ... />
</label>

// With unit
<label>Probability<span className="form-unit">%</span>
  <input className="form-input" type="number" ... />
</label>
```

## Layout

- Labels inside `.form-row` use `display: flex; flex-wrap: wrap; align-items: baseline` — label text and inline spans flow on one row, the input wraps to the next row at full width
- `.form-row` uses `align-items: end` so all inputs in a row are bottom-aligned regardless of label height
- Long descriptive context belongs in `placeholder`, not in the label

## Error states

- **Red border**: `border-color: var(--red)` on the input
- **Error message**: `<p className="form-field-error">message</p>` — displayed below the field, `font-size: var(--text-sm)`, `color: var(--red)`
- **Aria**: `aria-invalid="true"` on the input, `aria-describedby` pointing to the error message `id`
- Required fields that fail validation: show error on blur or on submit attempt — never on first render

## Disabled & readonly states

- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none` — never remove from DOM, always visible
- **Readonly**: `background: var(--bg)`, no focus ring — used for computed/derived values

## Form sections

- Group related fields with a section divider: `<h3 className="form-section-label">Section name</h3>`
- Style: `font-size: var(--text-xs)`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: var(--text-muted)`, `border-bottom: 1px solid var(--border)`, `padding-bottom: var(--space-xs)`, `margin: var(--space-lg) 0 var(--space-sm)`

## Progressive disclosure

- Forms with > 6 fields: group into "Basic" (always visible) and "Advanced" (behind a "Show more options" link)
- Use the `<CollapsibleSection>` component for expandable form groups

## What not to do

- Never write `(optional)` in a label
- Never put unit hints like `(%)` or `(CAD)` in parentheses in label text
- Never use `form-hint` class to mark optionality — reserve it for genuinely contextual inline text (e.g. IBM milestone explanation in a checkbox)
- Never show validation errors before the user has interacted with the field
