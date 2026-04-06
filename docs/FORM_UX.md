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

## What not to do

- Never write `(optional)` in a label
- Never put unit hints like `(%)` or `(CAD)` in parentheses in label text
- Never use `form-hint` class to mark optionality — reserve it for genuinely contextual inline text (e.g. IBM milestone explanation in a checkbox)
