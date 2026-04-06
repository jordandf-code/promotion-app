# Phase 20 — PowerPoint deck export

**Goal**: Let any user generate a populated `.pptx` promotion case deck from their live app
data in one click. The visual design is driven entirely by an uploadable `.pptx` template
stored in Admin — changing the look requires no code changes. The slide content is generated
by Claude using the same `buildContext.js` pipeline already in place for Narrative + Gaps.

The default template ships with the app (`Jordan_PromotionCase.pptx` — 2 slides, IBM blue
theme). Users can replace it by uploading their own `.pptx` to Admin at any time.

---

## 20a — Template storage and Admin UI

The template `.pptx` file is stored per-user in the database, alongside their other admin
settings. It is saved as a base64 blob under a new key `deckTemplate` in the `adminData`
domain — no schema changes needed (uses the existing `user_data` table).

- [ ] Admin → GenAI tab: new "Deck template" section below the existing AI fields
- [ ] Upload button: accepts `.pptx` files only; on upload, reads the file as base64 and
  saves to `adminData.deckTemplate`; shows filename and upload date once set
- [ ] "Remove" button: clears the stored template; app falls back to the built-in default
- [ ] If no template has been uploaded, the built-in default (`Jordan_PromotionCase.pptx`)
  is used automatically — no setup required for new users
- [ ] Built-in default shipped as a static asset in `backend/assets/deck_template_default.pptx`
- [ ] New editable textarea in the same section: "Deck content instructions" — plain English
  instructions Claude uses to fill the template (e.g. tone, emphasis, which criteria to
  prioritise). If empty, a built-in default instruction set is used.
- [ ] Template and instructions save independently — same pattern as other Admin fields

## 20b — Placeholder contract

The template uses bracket-delimited placeholder strings throughout its XML. The backend
identifies and replaces these strings with AI-generated content. The placeholder set below
matches `Jordan_PromotionCase.pptx` exactly; any user-uploaded template must use the same
placeholder strings to be compatible.

**Slide 1 placeholders**

| Placeholder | Source |
|---|---|
| `[Candidate Name]` | `user_context.name` |
| `[Associate Partner – Band 10]` | `user_context.current_role` |
| `[Client Partner – Band D]` | `user_context.target_role` |
| `[Public Sector / Canadian Federal]` | `user_context.market` |
| `[2025]` | `user_context.qualifying_year` |
| `$XXM` (signings value) | AI — qualifying year realized + forecast signings |
| `vs $XXM target` (signings) | scorecard target for qualifying year |
| `$XXM` (revenue value) | AI — qualifying year realized + forecast revenue |
| `vs $XXM target` (revenue) | scorecard target for qualifying year |
| `XX%` (gross profit value) | AI — qualifying year GP% |
| `vs XX% target` (gross profit) | scorecard target for qualifying year |
| `XX%` (utilization value) | AI — qualifying year utilization projection |
| `vs XX% target` (utilization) | scorecard target for qualifying year |
| `[Win 1 – one sentence...]` | AI — top win, net-new logos first |
| `[Win 2 – one sentence...]` | AI |
| `[Win 3 – one sentence...]` | AI |
| `[Win 4 – one sentence...]` | AI |
| `[Pursuit A – brief description]` | AI — top open opportunity by value |
| `[e.g., Proposal Submitted]` (×3) | AI — stage for each pursuit |
| `$XXM` (pipeline value, ×3) | AI — signings value for each pursuit |

**Slide 2 placeholders**

| Placeholder | Source |
|---|---|
| `[e.g., Client Relationship & Trust]` (×6) | AI — IBM criterion label |
| `★★★★☆` (×6) | AI — strength as Unicode stars (5 filled = Strong, 4 = Partial, 3 = Missing/low) |
| `[Jordan is the trusted advisor...]` (×6) | AI — one-line assessment per criterion |
| `[Bullet 1 – e.g., Own and grow...]` | AI — The Ask bullet 1 |
| `[Bullet 2 – ...]` | AI — The Ask bullet 2 |
| `[Bullet 3 – ...]` | AI — The Ask bullet 3 |

**Constraint**: The criteria table has exactly 6 rows. The AI prompt explicitly instructs
Claude to return exactly 6 criteria — consolidate or drop lower-priority ones if the IBM
criteria text lists more. This constraint is noted in the "Deck content instructions"
textarea in Admin so the user understands it.

**Metric placeholder disambiguation**: The four `$XXM` / `XX%` values and their targets
are positionally ambiguous as strings (multiple identical placeholders on the same slide).
`renderDeck.js` replaces them in document order — signings first, revenue second, gross
profit third, utilization fourth — matching the left-to-right visual order of the scorecard
strip in the template.

## 20c — AI JSON contract

Claude returns a single JSON object. The system prompt instructs it to return only JSON
with no preamble, no markdown fences, and no keys omitted.

```json
{
  "candidate_name": "string",
  "current_role": "string",
  "target_role": "string",
  "practice": "string",
  "qualifying_year": "string",

  "signings_value": "string — e.g. $4.2M",
  "signings_target": "string — e.g. vs $3.8M target",
  "revenue_value": "string",
  "revenue_target": "string",
  "gp_value": "string — e.g. 34%",
  "gp_target": "string — e.g. vs 32% target",
  "utilization_value": "string — e.g. 87%",
  "utilization_target": "string — e.g. vs 85% target",

  "win1": "string — one sentence, claim + named outcome",
  "win2": "string",
  "win3": "string",
  "win4": "string",

  "pursuit_a_name": "string",
  "pursuit_a_stage": "string",
  "pursuit_a_value": "string — e.g. $3.2M",
  "pursuit_b_name": "string",
  "pursuit_b_stage": "string",
  "pursuit_b_value": "string",
  "pursuit_c_name": "string",
  "pursuit_c_stage": "string",
  "pursuit_c_value": "string",

  "criteria": [
    {
      "label": "string — IBM criterion name",
      "stars": "string — exactly 5 Unicode chars from ★ and ☆",
      "assessment": "string — one sentence max"
    }
  ],

  "ask_1": "string — one sentence, names something only a Partner can do",
  "ask_2": "string",
  "ask_3": "string"
}
```

The `criteria` array must contain exactly 6 items. The `stars` field uses the same Unicode
characters already in the template XML (`★` filled, `☆` empty) — the renderer replaces
the existing star string verbatim, so no encoding issues arise.

If data is thin for any field, Claude writes an honest placeholder (e.g. "Pipeline being
built — no active pursuits yet") rather than refusing or returning null. Same CRITICAL
INSTRUCTION pattern used in Narrative + Gaps prompts.

## 20d — Backend implementation

Three new backend files, no new database tables, no migrations.

**`backend/ai/deckPrompt.js`**
Builds the system prompt for deck generation. Injects:
- The placeholder contract (20b) so Claude knows exactly what keys to return
- The user's "Deck content instructions" from `adminData` (or the built-in default if empty)
- Tone and style rules matching the polished narrative prompt (first person, net-new logos
  first, no filler phrases, every bullet is one sentence + named outcome)
- CRITICAL INSTRUCTION: always return all keys; never refuse; use honest placeholders for
  missing data

**`backend/ai/renderDeck.js`**
Takes the AI JSON and the template `.pptx` (base64 from `adminData`, or the built-in
default), and returns a populated `.pptx` buffer.

Process:
1. Decode the template base64 to a buffer; write to a temp file
2. Unzip the `.pptx` (it is a ZIP archive); read `ppt/slides/slide1.xml` and
   `ppt/slides/slide2.xml` as strings
3. For each placeholder string in the contract, run a string replacement with the
   corresponding AI JSON value
4. For the four positionally-ambiguous metric placeholders (`$XXM` ×4, `XX%` ×2,
   `vs $XXM target` ×2, `vs XX% target` ×2): replace sequentially using
   `String.replace()` (replaces first occurrence only) in the correct order
5. Write the updated XML back into the ZIP; return the buffer
6. Clean up temp files

Uses Node.js built-in `fs` and the `adm-zip` npm package (or `jszip`) — no Python,
no `pptxgenjs`. The template's visual design, fonts, colours, and layout are preserved
exactly because the XML is never regenerated — only the placeholder text strings are touched.

**`backend/routes/deck.js`**
New Express route: `POST /api/ai/deck`

1. Verify JWT auth; load user's `adminData` from DB
2. Check API key configured — return `NO_KEY` error if not
3. Call `buildContext(userId)` to assemble user data
4. Call `deckPrompt.js` to build the system prompt
5. Call `callAnthropic.js` with the context and prompt; parse JSON response
6. Call `renderDeck.js` with the JSON and template
7. Return the `.pptx` buffer with headers:
   - `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
   - `Content-Disposition: attachment; filename="PromotionCase_[Year].pptx"`
8. Log token usage to console in dev; include usage in response headers for the frontend
   to display

Error handling follows the same `{ ok: false, error, code }` envelope used by all other
AI routes. A failed deck generation never leaves a partial file on disk.

Register the route in `backend/index.js` alongside the existing AI routes.

## 20e — Frontend implementation

Changes are confined to the Narrative + Gaps tab and Admin tab. No new page or route needed.

**Narrative + Gaps tab**
- [ ] New "Export deck" section below the existing Polished Narrative and Gap Analysis
  sections — same card/section pattern as the rest of the tab
- [ ] Single "Generate deck (.pptx)" button — fires `POST /api/ai/deck`; on success,
  triggers a browser file download using a temporary object URL
- [ ] Loading state: "Generating deck…" spinner; button disabled during generation
- [ ] Token usage displayed below the button after a successful generation (same inline
  pattern as the other AI sections)
- [ ] Error display: same `aiErrors.js` mapping used by other AI features
- [ ] Shows the Admin setup prompt (link to Admin → GenAI) if no API key is configured;
  optionally notes if no custom template has been uploaded (non-blocking — default template
  is used automatically)
- [ ] No caching for deck exports — the file is generated fresh on each click. Decks are
  not stored in `storyData_v1` or anywhere else; they are ephemeral downloads only.

**Admin → GenAI tab**
- [ ] New "Deck template" section (20a): file upload, filename display, remove button
- [ ] New "Deck content instructions" textarea (20a): plain English, editable, saves on
  blur like other Admin fields
- [ ] Both fields save to `adminData` via the existing `PUT /api/data/admin` endpoint —
  no new API calls needed
- [ ] `deckTemplate` stored as base64 string; `deckContentInstructions` stored as plain
  text string
- [ ] Upload size limit noted in UI: "Max 5MB — `.pptx` files only"

## 20f — Template compatibility guide

A short note rendered below the upload button in Admin (collapsed behind a "Template
requirements" disclosure) explaining what placeholder strings a custom template must
contain to be compatible. This is the canonical reference for anyone designing a new
template from scratch.

Content of the guide (rendered in Admin UI and documented here for reference):

```
Your template must contain these exact placeholder strings — the app replaces them
with your live data when you generate a deck.

Slide 1 (scorecard + wins + pipeline):
  [Candidate Name]
  [Associate Partner – Band 10]     ← your current role
  [Client Partner – Band D]         ← your target role
  [Public Sector / Canadian Federal] ← your practice/market
  [2025]                            ← qualifying year
  $XXM  (×4 — signings, revenue, pursuit A/B/C values)
  vs $XXM target  (×2 — signings and revenue targets)
  XX%   (×2 — gross profit and utilization values)
  vs XX% target  (×2 — gross profit and utilization targets)
  [Win 1 – one sentence describing the win, client, and value]
  [Win 2 – one sentence describing the win, client, and value]
  [Win 3 – one sentence describing the win, client, and value]
  [Win 4 – one sentence describing the win, client, and value]
  [Pursuit A – brief description]
  [Pursuit B – brief description]
  [Pursuit C – brief description]
  [e.g., Proposal Submitted]  (×3 — one per pursuit)

Slide 2 (criteria + the ask):
  [e.g., Client Relationship & Trust]  (×6 — criterion labels)
  ★★★★★  and  ★★★★☆               (×6 — strength ratings; mix as needed)
  [Jordan is the trusted advisor...]   (×6 — one-line assessments)
  [Bullet 1 – e.g., Own and grow...]
  [Bullet 2 – e.g., Lead IBM's...]
  [Bullet 3 – e.g., Activate IBM's...]
```

---

**Implementation note**: Phase 20 requires one new npm package in the backend (`adm-zip`
or `jszip` for ZIP manipulation — no Python dependency). No database migrations. No new
React routes. The deck template default asset is committed to the repo as a binary file
in `backend/assets/`. The `deckTemplate` base64 field in `adminData` can be large (~500KB
for a typical `.pptx`); this is within the existing `user_data` JSONB column limits in
PostgreSQL.

---

