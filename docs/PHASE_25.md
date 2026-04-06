# Phase 25 — LinkedIn profile import

**Goal**: Let users populate a People record from a LinkedIn profile URL, reducing manual
data entry when adding a new contact. Given LinkedIn's strict anti-scraping policies, this
is implemented as an AI-assisted paste flow rather than a live URL fetch — the user copies
the profile text from their browser and the app uses Claude to parse it into structured
fields.

---

## 25a — Import flow

The flow is triggered from the People tab and the Add Person modal. It presents as an
alternative entry method alongside the standard form.

1. User clicks "Import from LinkedIn" in the Add Person modal header (small secondary
   button, top-right of the modal)
2. A two-step inline panel replaces the form fields:
   - **Step 1 — Paste**: instruction text reads "Open the LinkedIn profile in your browser,
     select all text on the page (Ctrl+A / Cmd+A), and paste it here." A large textarea
     accepts the paste. A "Parse profile" button submits it.
   - **Step 2 — Review**: the AI-parsed fields are shown pre-filled in the standard form.
     All fields are editable before saving. A "Back" link returns to Step 1 if the parse
     was poor.
3. On save, creates the person record exactly as the normal Add Person flow would —
   no special handling downstream.

The instruction to select-all-and-paste is intentional: it captures the full page text
including the About section, experience, and headline without requiring any browser
extension or API access.

## 25b — AI parsing

New backend endpoint `POST /api/ai/parse-linkedin`. Accepts `{ pastedText }` (plain text,
up to ~10,000 characters — LinkedIn profiles are verbose). Does not use `buildContext.js`
— this is a pure parsing call with no user data context needed.

System prompt instructs Claude to extract and return a JSON object:

```json
{
  "name": "string | null",
  "title": "string | null — current job title",
  "org": "string | null — current employer",
  "email": "string | null — if present in the profile",
  "phone": "string | null — if present in the profile",
  "linkedin_url": "string | null — canonical profile URL if extractable",
  "notes": "string | null — 1-2 sentence summary of why this person is relevant,
            inferred from their role and background"
}
```

Claude is instructed to return only JSON, return null for any field not clearly present
in the text, and never invent information. The `notes` field is the one place inference
is permitted — it is framed as a suggestion the user should review, not a factual field.

The parsed JSON is returned to the frontend and pre-fills the Add Person modal form.
The `relationship_type` field is not parsed — the user always sets this manually, as it
reflects the user's relationship with the contact, not information on the profile.

Token usage is not displayed for this call — it is a lightweight utility parse, not a
narrative generation. The API key is loaded from the user's `adminData` as with all other
AI calls.

## 25c — Frontend changes

- [ ] "Import from LinkedIn" button added to Add Person modal header — only shown when an
  Anthropic API key is configured; hidden with a tooltip "Configure your API key in Admin
  to enable this feature" if not
- [ ] `LinkedInImportPanel` component — two-step paste/review flow, inline within the
  existing modal (no new modal or route)
- [ ] On successful parse, pre-fills all matching fields in the standard person form;
  user reviews and edits before saving
- [ ] On parse failure (API error, unparseable text): shows an inline error and returns
  to Step 1 with the pasted text preserved so the user can try again
- [ ] Character limit on the textarea: 15,000 characters (LinkedIn full-page paste is
  typically 3,000–8,000 characters; the limit prevents accidental large pastes)
- [ ] No caching of parsed results — each paste is a fresh API call

## 25d — Limitation documentation

A small "How this works" disclosure in the import panel explains the paste-based approach
and its limitations:
- Fields only populated if clearly present in the pasted text — Claude does not guess
- Email and phone are rarely visible on LinkedIn profiles — these fields are usually empty
- Profile text varies by LinkedIn layout version — results may be imperfect; always review
  before saving
- This feature uses your Anthropic API key and counts toward your usage

---

**Implementation note**: Phase 25 adds no npm packages, no database migrations, and no
new React routes. The `POST /api/ai/parse-linkedin` endpoint is a thin wrapper around
`callAnthropic.js` with a dedicated system prompt — no `buildContext.js` call, making it
one of the lightest AI endpoints in the app. The paste-based approach is intentional and
sustainable — it does not violate LinkedIn's Terms of Service because no automated
fetching, scraping, or API access occurs.

---


