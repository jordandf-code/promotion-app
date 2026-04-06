// routes/ai.js
// Proxies AI requests to Anthropic so API keys stay server-side.
// All endpoints accept an optional apiKey in the request body,
// falling back to ANTHROPIC_API_KEY in .env.

const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const router    = express.Router();

function getClient(req) {
  const apiKey = req.body?.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Translate Anthropic SDK errors into clear user-facing messages.
function friendlyError(err) {
  const status  = err?.status;
  const message = err?.message ?? String(err);
  if (status === 401) return 'Invalid API key — check the key saved in Admin settings.';
  if (status === 403) return 'API key does not have permission for this model.';
  if (status === 429) return 'Rate limit exceeded — wait a moment and try again.';
  if (status === 402 || message.toLowerCase().includes('credit') || message.toLowerCase().includes('billing'))
    return 'Insufficient API credits — top up your Anthropic account at console.anthropic.com.';
  if (status === 400 && message.toLowerCase().includes('model'))
    return `Model error: ${message}`;
  return `AI request failed: ${message}`;
}

function parseAIJson(text) {
  const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(clean);
}

function fmtCAD(n) {
  if (n == null || isNaN(n)) return 'n/a';
  if (n >= 1_000_000) return `CDN$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `CDN$${Math.round(n / 1_000)}K`;
  return `CDN$${Math.round(n)}`;
}

function pctStr(total, target) {
  if (!target) return '';
  return ` (${Math.round((total / target) * 100)}% of target)`;
}

// POST /api/ai/suggest-impact
// Body: { title, description, apiKey? }
router.post('/suggest-impact', async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title && !description) return res.status(400).json({ error: 'title or description required' });

  const client = getClient(req);
  if (!client) return res.status(503).json({ error: 'AI not configured — add API key in Admin or backend .env' });

  try {
    const userContent = [
      title       && `Win title: ${title}`,
      description && `Description: ${description}`,
    ].filter(Boolean).join('\n');

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 80,
      messages: [{ role: 'user', content:
        `You are helping an IBM Associate Partner build their promotion case to Partner level.\n\n${userContent}\n\nWrite a single punchy impact statement — one sentence, under 20 words — that captures the business value of this win. Focus on measurable outcomes: revenue secured, client relationships built, or strategic influence. Output only the impact sentence, nothing else.`
      }],
    });

    res.json({ impact: message.content[0].text.trim() });
  } catch (err) {
    console.error('suggest-impact error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// POST /api/ai/generate-story
// Body: { apiKey?, ibmCriteria, careerHistory, wins, goals, scorecardSummary }
router.post('/generate-story', async (req, res) => {
  const { ibmCriteria, careerHistory, wins = [], goals = [], scorecardSummary } = req.body ?? {};
  if (!ibmCriteria) return res.status(400).json({ error: 'IBM criteria required' });

  const client = getClient(req);
  if (!client) return res.status(503).json({ error: 'AI not configured — add API key in Admin' });

  const winsText = wins.length
    ? wins.map(w => `- ${w.title}${w.impact ? ` — ${w.impact}` : ''}${w.tags?.length ? ` [${w.tags.join(', ')}]` : ''}`).join('\n')
    : '(none logged yet)';

  const goalsText = goals.length
    ? goals.map(g => `- [${g.status.replace('_', ' ')}] ${g.title}${g.isGate ? ' ★ IBM gate' : ''}`).join('\n')
    : '(none set)';

  let scorecardText = '(not available)';
  if (scorecardSummary) {
    const { year, sales, revenue, gp, util } = scorecardSummary;
    scorecardText = [
      `Year: ${year}`,
      `Sales: ${fmtCAD(sales?.realized)} realized + ${fmtCAD(sales?.forecast)} forecast = ${fmtCAD(sales?.total)} vs ${fmtCAD(sales?.target)} target${pctStr(sales?.total, sales?.target)}`,
      `Revenue: ${fmtCAD(revenue?.realized)} realized + ${fmtCAD(revenue?.forecast)} forecast = ${fmtCAD(revenue?.total)} vs ${fmtCAD(revenue?.target)} target${pctStr(revenue?.total, revenue?.target)}`,
      `Gross Profit: ${fmtCAD(gp?.realized)} realized + ${fmtCAD(gp?.forecast)} forecast = ${fmtCAD(gp?.total)} vs ${fmtCAD(gp?.target)} target${pctStr(gp?.total, gp?.target)}`,
      `Utilization: ${util?.hoursToDate ?? 'n/a'} hrs actual, ${util?.projection ?? 'n/a'} hrs projected vs ${util?.target ?? 'n/a'} target${util?.pct != null ? ` (${util.pct}%)` : ''}`,
    ].join('\n');
  }

  const prompt = `You are helping an IBM Associate Partner at IBM Canada build a compelling, evidence-based case for Partner promotion. IBM Partner is an executive designation (not equity partnership) — comparable to Managing Director at other firms.

CAREER HISTORY:
${careerHistory || '(not provided)'}

IBM PARTNER CRITERIA:
${ibmCriteria}

WINS LOGGED:
${winsText}

GOALS:
${goalsText}

QUALIFYING YEAR SCORECARD:
${scorecardText}

Return ONLY a valid JSON object — no markdown, no code fences, no preamble:
{
  "evidenceMap": [
    { "criterion": "criterion as stated in the IBM framework", "evidence": ["specific win, goal, or data point"] }
  ],
  "gaps": ["criterion with weak or missing evidence — these are the priorities to address"],
  "narrative": "4–6 paragraphs in first person. Open with career context and the case for Partner. Build through key achievements citing specific wins and numbers. Close with readiness and the ask. Written to hand to a VP sponsor.",
  "plan": "5–7 prioritised action items for the next 12 months to close gaps and maximise the promotion case. Each item on its own line starting with •."
}

Parse the IBM Partner Criteria to identify each distinct criterion. Map every criterion to specific evidence from the data. Be concrete — cite actual win titles, dollar amounts, and goal names.`;

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIJson(message.content[0].text);
    res.json(result);
  } catch (err) {
    console.error('generate-story error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// POST /api/ai/suggest-goals
// Body: { apiKey?, ibmCriteria, careerHistory, currentGoals, wins }
router.post('/suggest-goals', async (req, res) => {
  const { ibmCriteria, careerHistory, currentGoals = [], wins = [] } = req.body ?? {};
  if (!ibmCriteria) return res.status(400).json({ error: 'IBM criteria required' });

  const client = getClient(req);
  if (!client) return res.status(503).json({ error: 'AI not configured — add API key in Admin' });

  const goalsText = currentGoals.length
    ? currentGoals.map(g => `- [${g.status.replace('_', ' ')}] ${g.title}`).join('\n')
    : '(none)';

  const winsText = wins.length
    ? wins.map(w => `- ${w.title}${w.impact ? ` — ${w.impact}` : ''}`).join('\n')
    : '(none)';

  const prompt = `You are helping an IBM Associate Partner build their case for Partner promotion.

IBM PARTNER CRITERIA:
${ibmCriteria}

CAREER HISTORY:
${careerHistory || '(not provided)'}

CURRENT GOALS:
${goalsText}

RECENT WINS:
${winsText}

Suggest 5 specific, actionable goals that would strengthen this person's Partner promotion case. Focus on criteria gaps — areas where the current wins and goals don't yet provide strong evidence. Each goal should be achievable within 12 months.

Return ONLY a valid JSON object — no markdown, no code fences:
{
  "suggestions": [
    {
      "title": "concise goal title (under 15 words)",
      "rationale": "one sentence: which criterion this addresses and why it strengthens the case"
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIJson(message.content[0].text);
    res.json(result);
  } catch (err) {
    console.error('suggest-goals error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// POST /api/ai/check-key
// Body: { apiKey? }
// Returns: { ok: true } or { error: string }
router.post('/check-key', async (req, res) => {
  const client = getClient(req);
  if (!client) return res.status(400).json({ error: 'No API key provided.' });

  try {
    await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1,
      messages:   [{ role: 'user', content: 'hi' }],
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(200).json({ error: friendlyError(err) });
  }
});

module.exports = router;
