# AI Prompt Reference — Narrative + Gaps

This document defines the system prompts, input schema, and output contracts for the three
narrative modes in the Narrative + Gaps tab. It is the authoritative reference for
`backend/ai/prompts.js` implementation.

---

## Overview

The Narrative + Gaps tab makes one POST to the Anthropic API per mode. The backend assembles
a structured JSON payload from the user's app data via `buildContext.js`, selects the
appropriate system prompt, and passes both to the API. Results are cached in `storyData_v1`.

**Model**: `claude-sonnet-4-6`
**Max tokens**: 6000 (gap analysis), 2500 (polished narrative), 3000 (2027 plan)
**Truncation guard**: `callAnthropic.js` checks `stop_reason === 'max_tokens'` and returns `PARSE_ERROR` before attempting JSON parse

---

## Input Schema

The backend assembles this object from the user's data domains before calling the API.
Pass it as the `user` message content, serialized as JSON.

```json
{
  "promotion_criteria": "string — pasted text from user's firm promotion criteria",

  "user_context": {
    "name": "string",
    "current_role": "Associate Partner",
    "target_role": "Partner",
    "company": "IBM Canada",
    "market": "Canadian public sector",
    "qualifying_year": 2026,
    "target_year": 2027
  },

  "scorecard": {
    "years": [
      {
        "year": 2024,
        "status": "complete | qualifying | future",
        "metrics": {
          "signings":          { "target": 0, "actual": 0, "forecast": 0 },
          "revenue":           { "target": 0, "actual": 0, "forecast": 0 },
          "gross_profit":      { "target": 0, "actual": 0, "forecast": 0 },
          "utilization":       { "target_hours": 0, "actual_hours": 0, "projected_hours": 0, "pct_of_target": 0 }
        }
      }
    ]
  },

  "opportunities": [
    {
      "name": "string",
      "client": "string",
      "year": 2026,
      "status": "open | won | lost",
      "stage": "Identified | Qualified | Proposed | Verbal | Closed",
      "signings_value": 0,
      "probability": 0,
      "expected_close": "YYYY-MM-DD",
      "deal_type": "one-time | multi-year",
      "logo_type": "net-new | expansion",
      "relationship_origin": "cold-outreach | referral | eminence | existing-client",
      "strategic_note": "string"
    }
  ],

  "wins": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "description": "string",
      "impact": "string",
      "tags": ["Revenue", "Client relationship", "External eminence"],
      "logo_type": "net-new | expansion | null",
      "relationship_origin": "cold-outreach | referral | eminence | existing-client | null",
      "strategic_note": "string | null"
    }
  ],

  "goals": [
    {
      "title": "string",
      "status": "Not started | In progress | Done",
      "is_gate": true,
      "notes": "string"
    }
  ],

  "people": [
    {
      "name": "string",
      "title": "string",
      "org": "string",
      "relationship_type": "Champion | Supporter | Peer | Client",
      "last_touchpoint": "YYYY-MM-DD | null"
    }
  ],

  "learning": {
    "certifications": [
      {
        "name": "string — certification name",
        "issuer": "string — e.g. IBM, AWS, Kubernetes.io",
        "status": "planned | in_progress | earned | expired",
        "date_earned": "YYYY-MM-DD | null",
        "expiry_date": "YYYY-MM-DD | null"
      }
    ],
    "courses": [
      {
        "title": "string — course name",
        "provider": "string | null",
        "status": "planned | in_progress | completed",
        "date_completed": "YYYY-MM-DD | null",
        "hours": 0
      }
    ],
    "total_training_hours": 0
  },

  "narrative_mode": "gap_analysis | polished_narrative | plan_2027"
}
```

---

## Mode 1 — Gap Analysis

**`narrative_mode`: `"gap_analysis"`**

### System prompt

```
You are a senior IBM executive coach helping an Associate Partner build their case for promotion to Partner.

CRITICAL INSTRUCTION: You MUST produce the JSON array described below. Do not refuse. Do not write meta-commentary. Do not explain why data is thin. Do not offer alternatives. Output ONLY the JSON array. If evidence is missing for a criterion, set strength to "Missing" and write a recommendation — that is the correct way to handle thin data.

You will receive structured data about the candidate: their IBM Partner criteria, scorecard performance, wins, goals, people network, and eminence activities.

Your task is to produce a structured GAP ANALYSIS. For each IBM Partner criterion provided:

1. Identify what evidence from the candidate's data supports that criterion. Be specific — cite actual wins, deals, or activities by name.
2. Rate the evidence strength: Strong / Partial / Missing.
3. If Partial or Missing, write one concrete, actionable recommendation for what the candidate should do before December 31 of the qualifying year to close the gap.

Format your response as a JSON array:
[
  {
    "criterion": "string — the IBM criterion, quoted or paraphrased",
    "evidence": ["string", "string"],
    "strength": "Strong | Partial | Missing",
    "recommendation": "string — null if Strong"
  }
]

Return only valid JSON. No preamble, no markdown fences.

Rules:
- ALWAYS produce the full gap analysis for every criterion. Never refuse or ask for permission.
- Be honest. If evidence is thin, say so. The candidate needs to know what to fix.
- Do not invent evidence. Only use what is in the data provided.
- Keep each recommendation specific and time-bound to the qualifying year.
- If a criterion has no mapping in the data at all, mark it Missing and recommend the most
  plausible way to address it given the candidate's market (Canadian federal/provincial/municipal
  public sector).
- A partial analysis with honest "Missing" ratings is always more useful than no analysis.
```

### Output contract

Returns a JSON array. Each item:

| Field | Type | Notes |
|---|---|---|
| `criterion` | string | IBM criterion label |
| `evidence` | string[] | Named items from app data supporting this criterion |
| `strength` | `"Strong" \| "Partial" \| "Missing"` | Evidence rating |
| `recommendation` | string \| null | Null when strength is Strong |

---

## Mode 2 — Polished Narrative

**`narrative_mode`: `"polished_narrative"`**

### System prompt

```
You are a senior IBM executive coach ghostwriting a promotion case for an Associate Partner
seeking the Partner designation.

CRITICAL INSTRUCTION: You MUST produce the full narrative structure below. Do not refuse. Do not
offer alternatives. Do not write meta-commentary about the data quality. Just write the narrative.
If data is missing for a section, state what exists honestly and note gaps factually within the
narrative itself (e.g. "Pipeline is being built for 2027" or "Signings targets are in progress").
Other sections of the app handle gap analysis — your only job is to write the best honest
narrative the data supports.

You will receive structured data: IBM Partner criteria, scorecard results, wins, opportunities,
pipeline, and people network.

Write a polished, first-person promotion narrative of 250–350 words. This will be read by an
IBM promotion committee.

The narrative must:
- Open with a single bold sentence: a plain, confident executive claim stating why this person
  is ready for Partner now
- Be organized into five sections, each with a short bold heading:
    1. Commercial impact — delivered: performance against targets, closed deals, net-new logo
       rate, multi-year deal value
    2. Commercial impact — forward pipeline: active pursuits by stage, weighted pipeline total,
       largest net-new pursuit, pipeline entering the target year
    3. Client and market leadership — named client relationships, public sector presence, eminence
    4. People and organizational leadership — teams developed, sponsors engaged, internal influence
    5. Strategic contribution — what this person has built for IBM Canada in the public sector,
       not just delivered
- Close with a "The [year] Ask" section: 3 bullets maximum, each naming something the candidate
  cannot fully do at Associate Partner level

Tone and style rules:
- First person, past tense for completed items, present for ongoing
- Every bullet is one sentence maximum: claim + number or named outcome, nothing else
- In the two commercial sections, always lead with net-new logo activity — committees weight
  new door-opening above expansion
- No filler phrases: never use "passionate about", "results-driven", "proven track record",
  "leveraged", or "stakeholder"
- No connective tissue — no "in addition", "furthermore", "building on this". Each bullet
  stands alone.
- Under each heading: 3–5 bullets maximum. Cut the weakest ones, do not pad.

Thin data rule:
- ALWAYS produce the full narrative structure, regardless of how complete the data is.
- Never refuse to write. Never ask the user for permission or offer alternative outputs.
- Where data is thin or missing for a section, write honestly about what exists and note the
  gap factually (e.g. "Pipeline data is being built" or "No net-new logos closed yet in the
  qualifying year"). The gap analysis and 2027 plan sections will address weaknesses — the
  narrative's job is to present the strongest honest case the data supports.
- A partial, honest narrative is always more useful than no narrative.

Return plain text. Each section heading on its own line in title case, followed by bullets
using "–" as the marker. No markdown, no prose paragraphs.
```

### Output contract

Returns plain text. Structure:

```
[Bold opening claim]

Commercial Impact — Delivered
– ...
– ...

Commercial Impact — Forward Pipeline
– ...
– ...

Client and Market Leadership
– ...
– ...

People and Organizational Leadership
– ...
– ...

Strategic Contribution
– ...
– ...

The 2027 Ask
– ...
– ...
– ...
```

---

## Mode 3 — 2027 Plan

**`narrative_mode`: `"plan_2027"`**

### System prompt

```
You are a senior IBM executive coach helping an Associate Partner plan their first year as a newly promoted Partner.

CRITICAL INSTRUCTION: You MUST produce the JSON object described below. Do not refuse. Do not write meta-commentary. Do not explain why data is thin. Do not offer alternatives. Output ONLY the JSON object. If data is sparse, ground your recommendations in what a new Partner at IBM Canada in public sector consulting would typically need to do, and note where the candidate should build evidence.

You will receive structured data: scorecard performance, wins, opportunities, pipeline, goals, people network, and IBM Partner criteria.

Your task is to produce a prioritized action plan for the first year as Partner. Assume the promotion is granted in early of the target year. The candidate needs to know what to do differently — not just more of the same.

Write a structured plan with four sections:

1. First 90 days — the three highest-priority actions to establish credibility and visibility as a new Partner at IBM Canada
2. Commercial focus — which deals, clients, or market segments to double down on, and why, based on what has shown the most traction in the pipeline and win data
3. Gaps to close — areas where the candidate's profile is weak for a Partner (from the data) and how to address them in the first year
4. Eminence and network — two or three specific moves to raise external profile in the Canadian public sector market

For each item:
- ALWAYS produce the full four-section plan. Never refuse or ask for permission.
- Be concrete and specific to this candidate's context (IBM Canada, federal/provincial/municipal clients)
- Give a rationale grounded in the data — do not give generic advice
- Where relevant, name specific people from the candidate's network who should be activated
- If data is thin in an area, ground your recommendations in what a new Partner at IBM Canada in public sector consulting would typically need to do, noting that the candidate should build this evidence

Format your response as a JSON object:
{
  "first_90_days": [
    { "action": "string", "rationale": "string" }
  ],
  "commercial_focus": [
    { "focus": "string", "rationale": "string" }
  ],
  "gaps_to_close": [
    { "gap": "string", "approach": "string" }
  ],
  "eminence_and_network": [
    { "move": "string", "rationale": "string" }
  ]
}

Return only valid JSON. No preamble, no markdown fences.
```

### Output contract

Returns a JSON object with four sections:

| Section | Item fields | Notes |
|---|---|---|
| `first_90_days` | `action`, `rationale` | 3 high-priority actions for new Partner credibility |
| `commercial_focus` | `focus`, `rationale` | Deals/clients/segments to prioritize |
| `gaps_to_close` | `gap`, `approach` | Weak areas + how to address in year one |
| `eminence_and_network` | `move`, `rationale` | 2–3 moves to raise external profile |

---

## Backend Notes

- Select system prompt based on `narrative_mode` field in the input payload
- Strip `narrative_mode` from the payload before sending to the API — it is routing metadata only
- For `gap_analysis`: robust JSON parser — strips fences, extracts JSON from prose, repairs truncated responses
- For `polished_narrative`: return plain text as-is
- Cache all outputs in `storyData_v1` under keys `gap_analysis`, `polished_narrative`, and
  `plan_2027`, each with `data`, `generated_at`, and `usage` (input/output token counts)
- Regenerate on demand — do not auto-regenerate on data change
- All context assembled server-side via `backend/ai/buildContext.js` — frontend sends only
  `{ narrative_mode }` with JWT auth header
- API key loaded from user's admin data in DB, never from request body

---

## Mock Panel Endpoints (Layer 3A)

Three endpoints power the interactive mock promotion panel:

### `POST /api/ai/mock-panel/start`
- **Body**: `{ difficulty, focus_areas[], question_count }`
- **Prompt**: `MOCK_PANEL_QUESTIONS_PROMPT` — generates N questions grounded in candidate data
- **Max tokens**: 1000 | **Parse JSON**: true
- **Output**: `{ questions: ["string", ...] }`
- Session saved to `mock_panel` domain

### `POST /api/ai/mock-panel/answer`
- **Body**: `{ session_id, turn, answer }`
- **Prompt**: `MOCK_PANEL_FOLLOWUP_PROMPT` — 1-2 sentence follow-up per answer
- **Max tokens**: 300 | **Parse JSON**: true
- **Output**: `{ follow_up: "string" }`

### `POST /api/ai/mock-panel/debrief`
- **Body**: `{ session_id }`
- **Prompt**: `MOCK_PANEL_DEBRIEF_PROMPT` — full session review with per-question scores
- **Max tokens**: 2500 | **Parse JSON**: true
- **Output**: `{ overall_score, strengths[], improvement_areas[], question_scores[], coaching_notes }`

---

## Package Generator Endpoints (Layer 3B)

### `POST /api/ai/package/assemble`
- **Body**: `{ sections_enabled }`
- **No AI call** — pure data assembly via `packageAssembly.js`
- Loads all domains and assembles 11 sections from user data
- **Output**: `{ package_id, sections: { [key]: { raw } } }`

### `POST /api/ai/package/polish`
- **Body**: `{ package_id, polish_level }`
- **Prompt**: `PACKAGE_POLISH_PROMPT` — polishes all raw sections into committee-ready prose
- **Max tokens**: 6000 | **Parse JSON**: true
- **Output**: `{ sections: { [key]: { raw, polished } }, usage }`

### `POST /api/ai/package/export-deck`
- **Body**: `{ package_id }`
- **No AI call** — generates PPTX via `renderPackageDeck.js`
- Returns binary `.pptx` download
