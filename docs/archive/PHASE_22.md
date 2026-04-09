# Phase 22 — Eminence tracker

**Goal**: Give eminence activities a first-class home in the app. Currently, eminence is
captured only incidentally — win tags can flag `Internal eminence` or `External eminence`,
but there is no dedicated place to log speaking engagements, publications, panel appearances,
media mentions, or internal IBM visibility events. IBM Partner committees weigh external
market presence heavily; this phase makes that evidence explicit and queryable.

---

## 22a — Data model

New domain `eminenceData_v1` in `user_data` (PostgreSQL via `GET/PUT /api/data/eminence`).

```
{
  activities: [ {
    id,
    title,            // string — e.g. "Keynote: AI in Federal Procurement"
    type,             // 'speaking' | 'publication' | 'media' | 'panel' | 'award' |
                      // 'internal-ibm' | 'community' | 'other'
    date,             // YYYY-MM-DD
    venue,            // string | null — event name, publication, media outlet
    audience,         // 'external' | 'internal'
    reach,            // 'local' | 'national' | 'international' | null
    url,              // string | null — link to article, recording, etc.
    description,      // string | null — free text
    tags,             // string[] — reuses existing winTags categories from adminData
    year              // derived from date — used for filtering
  } ]
}
```

`eminenceData_v1` is a new domain — no migration needed.

No schema changes required (`user_data` table already handles arbitrary domains).
`backend/migration_phase22.sql` — no SQL needed; document that no migration is required.

## 22b — Eminence tab

New top-level tab "Eminence" added to the sidebar. Default position: after Wins. Reorderable
via Admin tab ordering like all other tabs.

The tab has two sections — **External** (audience: external) and **Internal** (audience:
internal) — reflecting the IBM distinction between market-facing visibility and IBM-internal
influence. Summary strip at the top shows counts for each section and the current qualifying
year.

**Activity card**: title as heading; type pill + audience pill + reach pill in a pill row;
venue and date on one line; description if present; URL as a "View" link button; tags as
small pills. Edit and Remove in card footer.

**Add/edit modal**: Fields follow the standard form UX pattern.
- Title (required)
- Type (required) — dropdown from the type list above; configurable via Admin Categories
- Date (required) — `type="date"`
- Audience (required) — External / Internal toggle
- Venue — text input
- Reach — dropdown: Local / National / International (shown only when audience is External)
- URL — text input
- Description — textarea
- Tags — multi-select from `adminData.winTags`

**Summary strip**: total external activities this qualifying year, total internal, and a
count of activities with a linked URL (evidence that can be verified).

**Sorting**: most recent first within each section; year filter in toolbar.

## 22c — Admin Categories integration

- [ ] New configurable list "Eminence types" in Admin → Categories, following the same
  value/label/drag-and-drop pattern as deal types and logo types
- [ ] Default types pre-seeded: Speaking, Publication, Media, Panel, Award, Internal IBM,
  Community, Other
- [ ] Eminence tab type dropdown reads from `adminData.eminenceTypes`; changes apply
  immediately

## 22d — AI context integration

- [ ] `backend/ai/buildContext.js` — add `eminence` domain load alongside other domains
- [ ] Inject into AI context as a new top-level key, capped at 20 most recent activities:
  ```json
  "eminence": [
    {
      "title": "string",
      "type": "string",
      "date": "YYYY-MM-DD",
      "audience": "external | internal",
      "reach": "string | null",
      "venue": "string | null"
    }
  ]
  ```
- [ ] Update gap analysis system prompt to cite specific eminence activities as evidence
  for criteria related to market presence, thought leadership, and IBM strategy alignment
- [ ] Update polished narrative prompt to reference external eminence activities by name
  in the "Client and market leadership" or "Strategic contribution" sections
- [ ] Readiness score (Phase 21) eminence dimension updated: eminence activities in the
  qualifying year count alongside eminence-tagged wins — combined signal, same scoring logic

## 22e — Calendar and wins integration

- [ ] Calendar tab: eminence activity dates appear as a new event type (distinct colour);
  click navigates to the Eminence tab
- [ ] Wins tab: when adding a win, a new optional field "Link to eminence activity" lets
  the user connect a win to an existing eminence record (e.g. a speaking engagement that
  led to a client relationship). Display-only on the win card — no bidirectional sync.
- [ ] Dashboard: count of eminence activities this qualifying year shown as a new stat
  in the readiness widget dimension bar (Phase 21 wins + eminence dimension)

## 22f — Public share page

- [ ] Eminence activities optionally included on the public summary page — owner toggle
  in Sharing tab, same pattern as other domains
- [ ] Shows external activities only; internal IBM activities never exposed publicly
- [ ] Renders as a list: title, type pill, venue, date, "View" link if URL present

---

**Implementation note**: Phase 22 requires one backend migration note (none needed — new
domain in existing table). `useLearningData` in Phase 17 is the closest prior example of
a new domain hook — follow the same pattern for `useEminenceData`. The Eminence tab is the
fourth tab introduced after the initial shell (after Learning, View others, Super Admin);
follow the same sidebar registration pattern.

---

