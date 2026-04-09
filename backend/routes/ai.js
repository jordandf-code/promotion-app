// routes/ai.js
// AI endpoints — all require JWT auth. The API key and user data are loaded
// from the database via buildContext, never sent from the frontend.

const express        = require('express');
const Anthropic      = require('@anthropic-ai/sdk');
const rateLimit      = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { buildContext }   = require('../ai/buildContext');
const { callAnthropic }  = require('../ai/callAnthropic');
const { STORY_MODES, SUGGEST_GOALS_PROMPT, SUGGEST_IMPACT_PROMPT, FEEDBACK_SYNTHESIS_PROMPT, ENHANCE_WIN_PROMPT, REFLECTION_SYNTHESIS_PROMPT, COMPETENCY_ANALYSIS_PROMPT, PARSE_LINKEDIN_PROMPT } = require('../ai/prompts');
const { fmtCurrency }   = require('../ai/formatUtils');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

// Rate limit AI calls: 20 requests per 15 minutes per user
// Keyed by userId (set by auth middleware which runs first via router.use above)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `user-${req.userId}`,
  message: { ok: false, error: 'Too many AI requests — please try again in a few minutes', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(aiLimiter);

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
    userId:       req.userId,
    endpoint:     'generate-story',
    narrativeMode: narrative_mode,
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
    userId:       req.userId,
    endpoint:     'suggest-goals',
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
      parts.push(`Deal value: ${fmtCurrency(opp.signings_credit)}`);
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
    userId:       req.userId,
    endpoint:     'suggest-impact',
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

// ── POST /api/ai/synthesize-feedback ────────────────────────────────────────
// Synthesizes all structured 360 feedback into themes, strengths, and recommendations.

router.post('/synthesize-feedback', async (req, res) => {
  // Load structured feedback
  const fbResult = await db.query(
    `SELECT reviewer, rating, comments, dimensions,
            COALESCE(submitted_at, created_at) AS submitted_at
     FROM feedback WHERE user_id = $1 AND dimensions IS NOT NULL
     ORDER BY COALESCE(submitted_at, created_at) DESC`,
    [req.userId]
  );

  if (fbResult.rows.length < 1) {
    return res.status(400).json({ ok: false, error: 'Need at least 1 structured feedback response to synthesize', code: 'NO_FEEDBACK' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build user content: all feedback responses
  const feedbackData = fbResult.rows.map(r => ({
    reviewer: r.reviewer,
    overallRating: r.rating,
    dimensions: r.dimensions,
    comments: r.comments,
    date: r.submitted_at,
  }));

  const userContent = JSON.stringify({
    responseCount: feedbackData.length,
    feedback: feedbackData,
  });

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: FEEDBACK_SYNTHESIS_PROMPT,
    userContent,
    maxTokens:    2000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'synthesize-feedback',
  });

  if (!result.ok) return res.status(500).json(result);

  // Cache synthesis in user_data
  try {
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'feedback_synthesis', $2, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.userId, JSON.stringify(result.data)]
    );
  } catch (cacheErr) {
    console.error('cache feedback synthesis error:', cacheErr.message);
  }

  res.json({ ok: true, data: result.data, usage: result.usage });
});

// ── POST /api/ai/enhance-win ────────────────────────────────────────────────
// Body: { winId }
// Generates statement, bullets, and one-liner for a specific win using cross-referenced data.

router.post('/enhance-win', async (req, res) => {
  const { winId } = req.body ?? {};
  if (!winId) {
    return res.status(400).json({ ok: false, error: 'winId is required', code: 'AI_ERROR' });
  }

  // Load the user's wins from DB to find the specific win
  const winsResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'wins'`,
    [req.userId]
  );
  const allWins = winsResult.rows[0]?.data ?? [];
  const win = allWins.find(w => w.id === winId);
  if (!win) {
    return res.status(404).json({ ok: false, error: 'Win not found', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build focused user message with win + cross-referenced data
  const parts = [];
  parts.push(`WIN TO ENHANCE:`);
  parts.push(`Title: ${win.title}`);
  if (win.date) parts.push(`Date: ${win.date}`);
  if (win.description) parts.push(`Description: ${win.description}`);
  if (win.impact) parts.push(`Current impact statement: ${win.impact}`);
  if (win.tags && win.tags.length) parts.push(`Tags: ${win.tags.join(', ')}`);
  if (win.logoType) parts.push(`Logo type: ${win.logoType}`);
  if (win.relationshipOrigin) parts.push(`Relationship origin: ${win.relationshipOrigin}`);
  if (win.strategicNote) parts.push(`Strategic context: ${win.strategicNote}`);

  // Cross-reference linked opportunity
  const dataSources = [];
  if (win.sourceId && win.sourceType === 'opportunity') {
    const rawScResult = await db.query(
      `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'scorecard'`,
      [req.userId]
    );
    const rawOpps = rawScResult.rows[0]?.data?.opportunities ?? [];
    const rawOpp = rawOpps.find(o => o.id === win.sourceId);
    if (rawOpp) {
      parts.push(`\nLINKED OPPORTUNITY:`);
      parts.push(`Name: ${rawOpp.name}`);
      if (rawOpp.client) parts.push(`Client: ${rawOpp.client}`);
      parts.push(`Deal value (TCV): ${fmtCurrency(Number(rawOpp.totalValue) || 0)}`);
      parts.push(`Signings credit: ${fmtCurrency(Number(rawOpp.signingsValue) || 0)}`);
      if (rawOpp.logoType) parts.push(`Logo type: ${rawOpp.logoType}`);
      if (rawOpp.status) parts.push(`Status: ${rawOpp.status}`);
      if (rawOpp.strategicNote) parts.push(`Strategic context: ${rawOpp.strategicNote}`);
      dataSources.push(win.sourceId);
    }
  } else if (win.sourceId && win.sourceType === 'goal') {
    const rawGoalResult = await db.query(
      `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'goals'`,
      [req.userId]
    );
    const rawGoal = (rawGoalResult.rows[0]?.data ?? []).find(g => g.id === win.sourceId);
    if (rawGoal) {
      parts.push(`\nLINKED GOAL:`);
      parts.push(`Title: ${rawGoal.title}`);
      if (rawGoal.isGate) parts.push(`Type: IBM milestone`);
      dataSources.push(win.sourceId);
    }
  }

  // Inject qualifying year scorecard stats
  const qy = ctx.scorecard.years.find(y => y.status === 'qualifying');
  if (qy) {
    parts.push(`\nSCORECARD CONTEXT (qualifying year):`);
    const s = qy.metrics.signings;
    if (s.target) parts.push(`Signings: ${fmtCurrency(s.actual + s.forecast)} of ${fmtCurrency(s.target)} target (${s.pct}%)`);
    const r = qy.metrics.revenue;
    if (r.target) parts.push(`Revenue: ${fmtCurrency(r.actual + r.forecast)} of ${fmtCurrency(r.target)} target (${r.pct}%)`);
    const g = qy.metrics.gross_profit;
    if (g.target) parts.push(`Gross profit: ${fmtCurrency(g.actual + g.forecast)} of ${fmtCurrency(g.target)} target (${g.pct}%)`);
  }

  // Inject people context (brief)
  if (ctx.people && ctx.people.length) {
    const topPeople = ctx.people.slice(0, 10).map(p =>
      `${p.name}${p.title ? ` (${p.title})` : ''}${p.org ? ` at ${p.org}` : ''} — ${p.relationship_type ?? 'contact'}`
    );
    parts.push(`\nKEY PEOPLE:\n${topPeople.join('\n')}`);
  }

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: ENHANCE_WIN_PROMPT,
    userContent:  parts.join('\n'),
    maxTokens:    1500,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'enhance-win',
  });

  if (!result.ok) return res.status(500).json(result);

  res.json({
    ok: true,
    data: {
      statement:    result.data.statement,
      bullets:      result.data.bullets,
      one_liner:    result.data.one_liner,
      data_sources: dataSources,
    },
    usage: result.usage,
  });
});

// ── POST /api/ai/reflection-synthesis ────────────────────────────────────────
// Synthesizes weekly check-ins into themes, confidence trend, and patterns.

router.post('/reflection-synthesis', async (req, res) => {
  // Load reflections data
  const refResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'reflections'`,
    [req.userId]
  );
  const reflections = refResult.rows[0]?.data ?? { checkins: [] };
  const checkins = reflections.checkins ?? [];

  if (checkins.length < 3) {
    return res.status(400).json({ ok: false, error: 'Need at least 3 weekly check-ins before synthesis', code: 'INSUFFICIENT_DATA' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const userContent = JSON.stringify({
    checkins: checkins.slice(-12),
    wins_context: (ctx.wins ?? []).slice(0, 10),
    goals_context: (ctx.goals ?? []).slice(0, 10),
  });

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: REFLECTION_SYNTHESIS_PROMPT,
    userContent,
    maxTokens:    2000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'reflection-synthesis',
  });

  if (!result.ok) return res.status(500).json(result);

  // Cache synthesis in reflections domain
  try {
    const updatedData = { ...reflections, ai_synthesis: { ...result.data, last_generated: new Date().toISOString() } };
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'reflections', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(updatedData)]
    );
  } catch (cacheErr) {
    console.error('cache reflection synthesis error:', cacheErr.message);
  }

  res.json({ ok: true, data: result.data, usage: result.usage });
});

// ── POST /api/ai/competency-analysis ─────────────────────────────────────────
// Detects perception gaps between self-ratings and actual evidence.

router.post('/competency-analysis', async (req, res) => {
  // Load competencies data
  const compResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'competencies'`,
    [req.userId]
  );
  const competenciesData = compResult.rows[0]?.data ?? { assessments: [] };
  const assessments = competenciesData.assessments ?? [];

  if (assessments.length < 1) {
    return res.status(400).json({
      ok: false,
      error: 'Complete a self-assessment first',
      code: 'INSUFFICIENT_DATA',
    });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build user content: latest assessment + full context
  const latest = assessments[assessments.length - 1];
  const { anthropicKey, ...safeCtx } = ctx;

  const userContent = JSON.stringify({
    self_assessment: {
      date: latest.date,
      ratings: latest.ratings,
      overall_notes: latest.overall_notes,
    },
    wins: safeCtx.wins ?? [],
    eminence: safeCtx.eminence ?? [],
    feedback_360: safeCtx.feedback_360 ?? null,
    scorecard: safeCtx.scorecard ?? {},
    goals: safeCtx.goals ?? [],
    user_context: safeCtx.user_context,
  });

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: COMPETENCY_ANALYSIS_PROMPT,
    userContent,
    maxTokens:    2500,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'competency-analysis',
  });

  if (!result.ok) return res.status(500).json(result);

  // Cache result in competencies domain
  try {
    const updatedData = {
      ...competenciesData,
      ai_analysis: {
        ...result.data,
        generated_at: new Date().toISOString(),
      },
    };
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'competencies', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(updatedData)]
    );
  } catch (cacheErr) {
    console.error('cache competency analysis error:', cacheErr.message);
  }

  res.json({ ok: true, data: result.data, usage: result.usage });
});

// ── POST /api/ai/parse-linkedin ───────────────────────────────────────────────
// Body: { text } — raw pasted LinkedIn content
// Parses contacts from the text and returns structured records.

router.post('/parse-linkedin', async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'text is required', code: 'AI_ERROR' });
  }
  if (text.length > 50000) {
    return res.status(400).json({ ok: false, error: 'Text is too long (max 50,000 characters)', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: PARSE_LINKEDIN_PROMPT,
    userContent:  text.trim(),
    maxTokens:    2000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'parse-linkedin',
  });

  if (!result.ok) return res.status(500).json(result);

  res.json({ ok: true, data: result.data, usage: result.usage });
});

// ── GET /api/ai/usage ───────────────────────────────────────────────────────
// Returns AI usage stats for the current user.
// Query: ?days=30 (default 30, max 365)

router.get('/usage', async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  try {
    const result = await db.query(
      `SELECT endpoint, narrative_mode, input_tokens, output_tokens, model, response_time_ms, called_at
       FROM ai_usage_log WHERE user_id = $1 AND called_at > NOW() - INTERVAL '1 day' * $2
       ORDER BY called_at DESC`,
      [req.userId, days]
    );

    const rows = result.rows;
    let totalInput = 0, totalOutput = 0;
    const byEndpoint = {};

    for (const r of rows) {
      totalInput += r.input_tokens;
      totalOutput += r.output_tokens;
      const key = r.narrative_mode ? `${r.endpoint}:${r.narrative_mode}` : r.endpoint;
      if (!byEndpoint[key]) byEndpoint[key] = { endpoint: key, calls: 0, input_tokens: 0, output_tokens: 0 };
      byEndpoint[key].calls++;
      byEndpoint[key].input_tokens += r.input_tokens;
      byEndpoint[key].output_tokens += r.output_tokens;
    }

    const estimatedCostUsd = (totalInput / 1_000_000 * 3) + (totalOutput / 1_000_000 * 15);

    res.json({
      ok: true,
      summary: {
        totalCalls: rows.length,
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
        days,
      },
      byEndpoint: Object.values(byEndpoint).sort((a, b) => b.calls - a.calls),
      recentCalls: rows.slice(0, 20).map(r => ({
        endpoint: r.endpoint,
        narrative_mode: r.narrative_mode,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
        response_time_ms: r.response_time_ms,
        called_at: r.called_at,
      })),
    });
  } catch (err) {
    // Table may not exist if migration hasn't been run
    if (err.code === '42P01') {
      return res.json({
        ok: true,
        summary: { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, estimatedCostUsd: 0, days },
        byEndpoint: [],
        recentCalls: [],
      });
    }
    console.error('AI usage query error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load usage data' });
  }
});

module.exports = router;
