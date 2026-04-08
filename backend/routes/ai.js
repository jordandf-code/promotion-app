// routes/ai.js
// AI endpoints — all require JWT auth. The API key and user data are loaded
// from the database via buildContext, never sent from the frontend.

const express        = require('express');
const Anthropic      = require('@anthropic-ai/sdk');
const authMiddleware = require('../middleware/auth');
const { buildContext }   = require('../ai/buildContext');
const { callAnthropic }  = require('../ai/callAnthropic');
const { STORY_MODES, SUGGEST_GOALS_PROMPT, SUGGEST_IMPACT_PROMPT } = require('../ai/prompts');
const { fmtCurrency }   = require('../ai/formatUtils');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

// ── Helper: handle buildContext errors ──────────────────────────────────────

function handleContextError(err, res) {
  if (err.code === 'NO_KEY' || err.code === 'NO_CRITERIA') {
    return res.status(400).json({ ok: false, error: err.message, code: err.code });
  }
  console.error('buildContext error:', err.message);
  return res.status(500).json({ ok: false, error: 'Failed to load user data', code: 'AI_ERROR' });
}

// ── Helper: build user message for story modes (strip internal fields) ──────

function buildUserMessage(ctx) {
  const { anthropicKey, _stats, career_history, ...payload } = ctx;
  if (career_history) payload.career_history = career_history;
  return JSON.stringify(payload);
}

// ── POST /api/ai/generate-story ─────────────────────────────────────────────
// Body: { narrative_mode: 'gap_analysis' | 'polished_narrative' | 'plan_2027' }

router.post('/generate-story', async (req, res) => {
  const { narrative_mode } = req.body ?? {};
  const mode = STORY_MODES[narrative_mode];
  if (!mode) {
    return res.status(400).json({ ok: false, error: 'Invalid narrative_mode', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: mode.prompt,
    userContent:  buildUserMessage(ctx),
    maxTokens:    mode.maxTokens,
    parseJson:    mode.parseJson,
  });

  if (!result.ok) return res.status(500).json(result);

  res.json({
    ok: true,
    data: result.data,
    narrative_mode,
    generated_at: new Date().toISOString(),
    usage: result.usage,
  });
});

// ── POST /api/ai/suggest-goals ──────────────────────────────────────────────
// Body: {} (all data loaded from DB)

router.post('/suggest-goals', async (req, res) => {
  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build enriched user content with scorecard weakness context
  const qyStats = ctx.scorecard.years.find(y => y.status === 'qualifying');
  let weaknessHint = '';
  if (qyStats) {
    const metrics = qyStats.metrics;
    const weak = [];
    if (metrics.signings.pct != null && metrics.signings.pct < 80)
      weak.push(`Signings at ${metrics.signings.pct}% of target`);
    if (metrics.revenue.pct != null && metrics.revenue.pct < 80)
      weak.push(`Revenue at ${metrics.revenue.pct}% of target`);
    if (metrics.gross_profit.pct != null && metrics.gross_profit.pct < 80)
      weak.push(`Gross profit at ${metrics.gross_profit.pct}% of target`);
    if (metrics.utilization.pct_of_target != null && metrics.utilization.pct_of_target < 80)
      weak.push(`Utilization at ${metrics.utilization.pct_of_target}% of target`);
    if (weak.length) weaknessHint = `\n\nWEAKEST SCORECARD AREAS:\n${weak.join('\n')}`;
  }

  const existingTitles = (ctx.goals ?? []).map(g => g.title);
  const userContent = buildUserMessage(ctx) + weaknessHint
    + `\n\nEXISTING GOAL TITLES (do not duplicate):\n${existingTitles.join('\n')}`;

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: SUGGEST_GOALS_PROMPT,
    userContent,
    maxTokens:    800,
    parseJson:    true,
  });

  if (!result.ok) return res.status(500).json(result);

  // Post-filter: remove suggestions that overlap with existing goals
  const lowerTitles = existingTitles.map(t => t.toLowerCase());
  const filtered = (result.data.suggestions ?? []).filter(s => {
    const lower = s.title.toLowerCase();
    return !lowerTitles.some(existing => existing.includes(lower) || lower.includes(existing));
  });

  res.json({ ok: true, suggestions: filtered, usage: result.usage });
});

// ── POST /api/ai/suggest-impact ─────────────────────────────────────────────
// Body: { title, description?, sourceId?, sourceType? }

router.post('/suggest-impact', async (req, res) => {
  const { title, description, sourceId, sourceType } = req.body ?? {};
  if (!title && !description) {
    return res.status(400).json({ ok: false, error: 'title or description required', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build enriched user content
  const parts = [];
  parts.push(`Win title: ${title}`);
  if (description) parts.push(`Description: ${description}`);

  // Inject linked source context
  if (sourceId && sourceType === 'opportunity') {
    const opp = ctx.opportunities.find(o => o.name === sourceId || ctx._stats?.largest_pursuit?.name === sourceId);
    // Fall back to searching raw scorecard data
    if (!opp) {
      const rawResult = await db.query(
        `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'scorecard'`,
        [req.userId]
      );
      const rawOpps = rawResult.rows[0]?.data?.opportunities ?? [];
      const rawOpp = rawOpps.find(o => o.id === sourceId);
      if (rawOpp) {
        parts.push(`\nLinked opportunity: ${rawOpp.name} for ${rawOpp.client}`);
        parts.push(`Deal value: ${fmtCurrency(Number(rawOpp.signingsValue) || 0)}`);
        if (rawOpp.logoType) parts.push(`Logo type: ${rawOpp.logoType}`);
        if (rawOpp.strategicNote) parts.push(`Strategic context: ${rawOpp.strategicNote}`);
      }
    } else {
      parts.push(`\nLinked opportunity: ${opp.name} for ${opp.client}`);
      parts.push(`Deal value: ${fmtCurrency(opp.signings_value)}`);
      if (opp.logo_type) parts.push(`Logo type: ${opp.logo_type}`);
      if (opp.strategic_note) parts.push(`Strategic context: ${opp.strategic_note}`);
    }
  } else if (sourceId && sourceType === 'goal') {
    const goal = ctx.goals.find(g => g.title === sourceId);
    if (!goal) {
      const rawResult = await db.query(
        `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'goals'`,
        [req.userId]
      );
      const rawGoal = (rawResult.rows[0]?.data ?? []).find(g => g.id === sourceId);
      if (rawGoal) {
        parts.push(`\nLinked goal: ${rawGoal.title}${rawGoal.isGate ? ' (IBM milestone)' : ''}`);
      }
    } else {
      parts.push(`\nLinked goal: ${goal.title}${goal.is_gate ? ' (IBM milestone)' : ''}`);
    }
  }

  // Inject qualifying year scorecard position
  const qy = ctx.scorecard.years.find(y => y.status === 'qualifying');
  if (qy) {
    const s = qy.metrics.signings;
    if (s.target) {
      parts.push(`\nQualifying year signings: ${fmtCurrency(s.actual + s.forecast)} of ${fmtCurrency(s.target)} target (${s.pct}%)`);
    }
  }

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: SUGGEST_IMPACT_PROMPT,
    userContent:  parts.join('\n'),
    maxTokens:    80,
    parseJson:    false,
  });

  if (!result.ok) return res.status(500).json(result);
  res.json({ ok: true, impact: result.data, usage: result.usage });
});

// ── POST /api/ai/check-key ──────────────────────────────────────────────────
// Body: { apiKey } — still accepts key in body (testing before save)

router.post('/check-key', async (req, res) => {
  const apiKey = req.body?.apiKey;
  if (!apiKey) return res.status(400).json({ ok: false, error: 'No API key provided.', code: 'NO_KEY' });

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1,
      messages:   [{ role: 'user', content: 'hi' }],
    });
    res.json({ ok: true });
  } catch (err) {
    const message = err?.status === 401
      ? 'Invalid API key — check the key.'
      : err?.message ?? 'Unknown error';
    res.json({ ok: false, error: message });
  }
});

// ── POST /api/ai/preview-context ────────────────────────────────────────────
// Returns the assembled AI context and system prompt WITHOUT calling Anthropic.
// Body: { mode: 'gap_analysis' | 'polished_narrative' | 'plan_2027' }

router.post('/preview-context', async (req, res) => {
  const { mode: modeId } = req.body ?? {};
  const mode = STORY_MODES[modeId || 'gap_analysis'];
  if (!mode) {
    return res.status(400).json({ ok: false, error: 'Invalid mode', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Strip the API key from the context before returning
  const { anthropicKey, ...safeCtx } = ctx;

  res.json({
    ok: true,
    context: safeCtx,
    systemPrompt: mode.prompt,
  });
});

module.exports = router;
