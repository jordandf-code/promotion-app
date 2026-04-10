// routes/ai.js
// AI endpoints — all require JWT auth. The API key and user data are loaded
// from the database via buildContext, never sent from the frontend.

const express        = require('express');
const Anthropic      = require('@anthropic-ai/sdk');
const rateLimit      = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { buildContext }   = require('../ai/buildContext');
const { callAnthropic }  = require('../ai/callAnthropic');
const { STORY_MODES, SUGGEST_GOALS_PROMPT, SUGGEST_IMPACT_PROMPT, FEEDBACK_SYNTHESIS_PROMPT, ENHANCE_WIN_PROMPT, REFLECTION_SYNTHESIS_PROMPT, COMPETENCY_ANALYSIS_PROMPT, MEETING_PREP_PROMPT, MOCK_PANEL_QUESTIONS_PROMPT, MOCK_PANEL_FOLLOWUP_PROMPT, MOCK_PANEL_DEBRIEF_PROMPT, PACKAGE_POLISH_PROMPT } = require('../ai/prompts');
const { assemblePackage } = require('../ai/packageAssembly');
const { renderPackageDeck } = require('../ai/renderPackageDeck');
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

// ── POST /api/ai/meeting-prep ────────────────────────────────────────────────
// Body: { contactId } — ID of the contact to prep for

router.post('/meeting-prep', async (req, res) => {
  const { contactId } = req.body ?? {};
  if (!contactId) {
    return res.status(400).json({ ok: false, error: 'contactId is required', code: 'AI_ERROR' });
  }

  // Load the person from the user's people data
  const peopleResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'people'`,
    [req.userId]
  );
  const allPeople = peopleResult.rows[0]?.data ?? [];
  const person = allPeople.find(p => p.id === contactId);
  if (!person) {
    return res.status(404).json({ ok: false, error: 'Contact not found', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build focused user message with person details + cross-referenced data
  const parts = [];
  parts.push(`CONTACT:`);
  parts.push(`Name: ${person.name}`);
  if (person.title) parts.push(`Title: ${person.title}`);
  if (person.org) parts.push(`Organization: ${person.org}`);
  if (person.type) parts.push(`Relationship type: ${person.type}`);
  if (person.relationshipStatus) parts.push(`Relationship status: ${person.relationshipStatus}`);
  if (person.influenceTier) parts.push(`Influence tier: ${person.influenceTier}`);
  if (person.strategicImportance) parts.push(`Strategic importance: ${person.strategicImportance}`);
  if (person.stakeholderGroup) parts.push(`Stakeholder group: ${person.stakeholderGroup}`);
  if (person.need) parts.push(`What the user needs from them: ${person.need}`);

  // Touchpoint history (most recent 10)
  const touchpoints = (person.touchpoints ?? [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  if (touchpoints.length) {
    parts.push(`\nTOUCHPOINT HISTORY (most recent first):`);
    touchpoints.forEach(tp => {
      parts.push(`- ${tp.date}: ${tp.note}`);
    });
  } else {
    parts.push(`\nNo touchpoints logged yet.`);
  }

  // Cross-reference linked opportunities from scorecard
  const rawScResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'scorecard'`,
    [req.userId]
  );
  const rawOpps = rawScResult.rows[0]?.data?.opportunities ?? [];
  const linkedOpps = rawOpps.filter(o =>
    o.relationshipOrigin && (
      (person.name && o.strategicNote && o.strategicNote.toLowerCase().includes(person.name.toLowerCase())) ||
      o.client === person.org
    )
  );
  if (linkedOpps.length) {
    parts.push(`\nLINKED OPPORTUNITIES:`);
    linkedOpps.slice(0, 5).forEach(o => {
      parts.push(`- ${o.name} (${o.client}, ${o.status}, $${o.signingsValue ?? 0} signings)`);
      if (o.strategicNote) parts.push(`  Context: ${o.strategicNote}`);
    });
  }

  // Cross-reference wins mentioning this person
  const winsResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'wins'`,
    [req.userId]
  );
  const allWins = winsResult.rows[0]?.data ?? [];
  const relatedWins = allWins.filter(w =>
    (w.relationshipOrigin && w.description && w.description.toLowerCase().includes(person.name.toLowerCase())) ||
    (w.strategicNote && w.strategicNote.toLowerCase().includes(person.name.toLowerCase()))
  );
  if (relatedWins.length) {
    parts.push(`\nRELATED WINS:`);
    relatedWins.slice(0, 5).forEach(w => {
      parts.push(`- ${w.title} (${w.date})${w.impact ? ': ' + w.impact : ''}`);
    });
  }

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: MEETING_PREP_PROMPT,
    userContent:  parts.join('\n'),
    maxTokens:    1500,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'meeting-prep',
  });

  if (!result.ok) return res.status(500).json(result);

  res.json({ ok: true, data: result.data, usage: result.usage });
});

// ── POST /api/ai/mock-panel/start ───────────────────────────────────────────
// Body: { difficulty, focus_areas, question_count }

router.post('/mock-panel/start', async (req, res) => {
  const {
    difficulty = 'standard',
    focus_areas = ['commercial', 'leadership', 'strategic_thinking', 'client_relationships', 'eminence', 'people'],
    question_count = 6,
  } = req.body ?? {};

  if (!['standard', 'challenging', 'tough'].includes(difficulty)) {
    return res.status(400).json({ ok: false, error: 'Invalid difficulty', code: 'AI_ERROR' });
  }
  if (!Array.isArray(focus_areas) || focus_areas.length === 0) {
    return res.status(400).json({ ok: false, error: 'At least one focus area required', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const userContent = buildUserMessage(ctx)
    + `\n\nDIFFICULTY: ${difficulty}`
    + `\nFOCUS AREAS: ${focus_areas.join(', ')}`
    + `\nNUMBER OF QUESTIONS: ${question_count}`;

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: MOCK_PANEL_QUESTIONS_PROMPT,
    userContent,
    maxTokens:    1000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'mock-panel-start',
  });

  if (!result.ok) return res.status(500).json(result);

  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const session = {
    id: sessionId,
    status: 'in_progress',
    difficulty,
    config: { focus_areas, question_count },
    questions: result.data.questions,
    turns: [],
    created_at: new Date().toISOString(),
    total_usage: { input_tokens: result.usage?.input_tokens ?? 0, output_tokens: result.usage?.output_tokens ?? 0 },
  };

  // Save to mock_panel domain
  try {
    const dataResult = await db.query(
      `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'mock_panel'`,
      [req.userId]
    );
    const mockPanelData = dataResult.rows[0]?.data ?? { sessions: [] };
    mockPanelData.sessions = [session, ...mockPanelData.sessions];

    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'mock_panel', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(mockPanelData)]
    );
  } catch (dbErr) {
    console.error('save mock panel session error:', dbErr.message);
  }

  res.json({ ok: true, session_id: sessionId, questions: result.data.questions, usage: result.usage });
});

// ── POST /api/ai/mock-panel/answer ──────────────────────────────────────────
// Body: { session_id, turn, answer }

router.post('/mock-panel/answer', async (req, res) => {
  const { session_id, turn, answer } = req.body ?? {};
  if (!session_id || turn == null || !answer) {
    return res.status(400).json({ ok: false, error: 'session_id, turn, and answer are required', code: 'AI_ERROR' });
  }

  // Load session from DB
  const dataResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'mock_panel'`,
    [req.userId]
  );
  const mockPanelData = dataResult.rows[0]?.data ?? { sessions: [] };
  const session = mockPanelData.sessions.find(s => s.id === session_id);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found', code: 'AI_ERROR' });
  }
  if (session.status !== 'in_progress') {
    return res.status(400).json({ ok: false, error: 'Session is not in progress', code: 'AI_ERROR' });
  }

  const questionIndex = turn - 1;
  if (questionIndex < 0 || questionIndex >= session.questions.length) {
    return res.status(400).json({ ok: false, error: 'Invalid turn number', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const question = session.questions[questionIndex];
  const userContent = `QUESTION ASKED:\n${question}\n\nCANDIDATE'S ANSWER:\n${answer}\n\nBRIEF CANDIDATE CONTEXT:\n${buildUserMessage(ctx)}`;

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: MOCK_PANEL_FOLLOWUP_PROMPT,
    userContent,
    maxTokens:    300,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'mock-panel-answer',
  });

  if (!result.ok) return res.status(500).json(result);

  // Save turn data
  session.turns[questionIndex] = {
    question,
    answer,
    follow_up: result.data.follow_up,
    answered_at: new Date().toISOString(),
  };
  session.total_usage.input_tokens += result.usage?.input_tokens ?? 0;
  session.total_usage.output_tokens += result.usage?.output_tokens ?? 0;

  const isLast = turn >= session.config.question_count;

  try {
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'mock_panel', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(mockPanelData)]
    );
  } catch (dbErr) {
    console.error('save mock panel answer error:', dbErr.message);
  }

  res.json({ ok: true, follow_up: result.data.follow_up, is_last: isLast });
});

// ── POST /api/ai/mock-panel/debrief ─────────────────────────────────────────
// Body: { session_id }

router.post('/mock-panel/debrief', async (req, res) => {
  const { session_id } = req.body ?? {};
  if (!session_id) {
    return res.status(400).json({ ok: false, error: 'session_id is required', code: 'AI_ERROR' });
  }

  const dataResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'mock_panel'`,
    [req.userId]
  );
  const mockPanelData = dataResult.rows[0]?.data ?? { sessions: [] };
  const session = mockPanelData.sessions.find(s => s.id === session_id);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found', code: 'AI_ERROR' });
  }

  // Validate all questions answered
  const answeredCount = session.turns.filter(t => t && t.answer).length;
  if (answeredCount < session.config.question_count) {
    return res.status(400).json({ ok: false, error: 'Not all questions have been answered', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build content with all Q/A pairs
  const qaPairs = session.turns.map((t, i) =>
    `QUESTION ${i + 1}:\n${t.question}\n\nANSWER ${i + 1}:\n${t.answer}`
  ).join('\n\n---\n\n');

  const userContent = `PANEL SESSION Q&A:\n\n${qaPairs}\n\nCANDIDATE CONTEXT:\n${buildUserMessage(ctx)}`;

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: MOCK_PANEL_DEBRIEF_PROMPT,
    userContent,
    maxTokens:    2500,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'mock-panel-debrief',
  });

  if (!result.ok) return res.status(500).json(result);

  // Save debrief and mark complete
  session.debrief = result.data;
  session.status = 'completed';
  session.completed_at = new Date().toISOString();
  session.total_usage.input_tokens += result.usage?.input_tokens ?? 0;
  session.total_usage.output_tokens += result.usage?.output_tokens ?? 0;

  try {
    await db.query(
      `INSERT INTO user_data (user_id, domain, data, updated_at)
       VALUES ($1, 'mock_panel', $2::jsonb, NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(mockPanelData)]
    );
  } catch (dbErr) {
    console.error('save mock panel debrief error:', dbErr.message);
  }

  res.json({ ok: true, debrief: result.data, usage: result.usage });
});

// ── POST /api/ai/package/assemble ───────────────────────────────────────────
// Assembles raw promotion package sections from user data. No AI call.
// Body: { sections_enabled: { executive_summary: true, ... } }

router.post('/package/assemble', async (req, res) => {
  const { sections_enabled } = req.body ?? {};

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Load additional domain data not in buildContext
  const [readinessResult, competenciesResult, winsResult, storyResult, brandResult] = await Promise.all([
    db.query(`SELECT data FROM user_data WHERE user_id = $1 AND domain = 'readiness'`, [req.userId]),
    db.query(`SELECT data FROM user_data WHERE user_id = $1 AND domain = 'competencies'`, [req.userId]),
    db.query(`SELECT data FROM user_data WHERE user_id = $1 AND domain = 'wins'`, [req.userId]),
    db.query(`SELECT data FROM user_data WHERE user_id = $1 AND domain = 'story'`, [req.userId]),
    db.query(`SELECT data FROM user_data WHERE user_id = $1 AND domain = 'brand'`, [req.userId]),
  ]);

  const readiness    = readinessResult.rows[0]?.data ?? {};
  const competencies = competenciesResult.rows[0]?.data ?? { assessments: [] };
  const allWins      = winsResult.rows[0]?.data ?? [];
  const storyData    = storyResult.rows[0]?.data ?? {};
  const brandData    = brandResult.rows[0]?.data ?? {};

  // Attach story data (polished_narrative, plan_2027, gap_analysis) to context
  if (storyData.polished_narrative) ctx.polished_narrative = storyData.polished_narrative;
  if (storyData.plan_2027)          ctx.plan_2027 = storyData.plan_2027;
  if (storyData.gap_analysis)       ctx.gap_analysis = storyData.gap_analysis;
  if (brandData.tagline || brandData.positioning || (brandData.key_messages || []).length) {
    ctx.brand = brandData;
  }

  // Assemble raw sections
  const rawSections = assemblePackage(ctx, { readiness, competencies, allWins });

  // Filter disabled sections
  const sections = {};
  for (const [key, raw] of Object.entries(rawSections)) {
    if (sections_enabled && sections_enabled[key] === false) continue;
    sections[key] = { raw };
  }

  // Create package record
  const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const pkg = {
    id: uid,
    created_at: new Date().toISOString(),
    status: 'assembled',
    sections,
    section_count: Object.keys(sections).length,
  };

  // Save to promotion_package domain
  const pkgDataResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'promotion_package'`,
    [req.userId]
  );
  const pkgData = pkgDataResult.rows[0]?.data ?? { packages: [] };
  pkgData.packages = [pkg, ...pkgData.packages];

  await db.query(
    `INSERT INTO user_data (user_id, domain, data, updated_at)
     VALUES ($1, 'promotion_package', $2::jsonb, NOW())
     ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
    [req.userId, JSON.stringify(pkgData)]
  );

  res.json({ ok: true, package_id: uid, sections });
});

// ── POST /api/ai/package/polish ─────────────────────────────────────────────
// Body: { package_id, polish_level: 'light' | 'standard' | 'full' }

router.post('/package/polish', async (req, res) => {
  const { package_id, polish_level = 'standard' } = req.body ?? {};
  if (!package_id) {
    return res.status(400).json({ ok: false, error: 'package_id is required', code: 'AI_ERROR' });
  }

  // Load package
  const dataResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'promotion_package'`,
    [req.userId]
  );
  const pkgData = dataResult.rows[0]?.data ?? { packages: [] };
  const pkg = pkgData.packages.find(p => p.id === package_id);
  if (!pkg) {
    return res.status(404).json({ ok: false, error: 'Package not found', code: 'AI_ERROR' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Build user content: raw sections + polish level + user context
  const rawSections = {};
  for (const [key, section] of Object.entries(pkg.sections)) {
    rawSections[key] = section.raw;
  }

  const userContent = JSON.stringify({
    polish_level,
    user_context: ctx.user_context,
    sections: rawSections,
  });

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: PACKAGE_POLISH_PROMPT,
    userContent,
    maxTokens:    6000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'package-polish',
  });

  if (!result.ok) return res.status(500).json(result);

  // Merge polished text into sections
  const polishedSections = result.data.sections ?? {};
  for (const [key, polished] of Object.entries(polishedSections)) {
    if (pkg.sections[key]) {
      pkg.sections[key].polished = polished;
    }
  }
  pkg.status = 'generated';
  pkg.polished_at = new Date().toISOString();
  pkg.polish_level = polish_level;

  // Save back
  await db.query(
    `INSERT INTO user_data (user_id, domain, data, updated_at)
     VALUES ($1, 'promotion_package', $2::jsonb, NOW())
     ON CONFLICT (user_id, domain) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
    [req.userId, JSON.stringify(pkgData)]
  );

  res.json({ ok: true, sections: pkg.sections, usage: result.usage });
});

// ── POST /api/ai/package/export-deck ────────────────────────────────────────
// Body: { package_id }

router.post('/package/export-deck', async (req, res) => {
  const { package_id } = req.body ?? {};
  if (!package_id) {
    return res.status(400).json({ ok: false, error: 'package_id is required', code: 'AI_ERROR' });
  }

  // Load package
  const deckDataResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'promotion_package'`,
    [req.userId]
  );
  const deckPkgData = deckDataResult.rows[0]?.data ?? { packages: [] };
  const pkg = deckPkgData.packages.find(p => p.id === package_id);
  if (!pkg) {
    return res.status(404).json({ ok: false, error: 'Package not found', code: 'AI_ERROR' });
  }

  // Get user context
  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Prepare sections for deck (prefer polished, fall back to raw)
  const deckSections = {};
  for (const [key, section] of Object.entries(pkg.sections)) {
    deckSections[key] = section.polished || section.raw;
  }

  try {
    const buf = await renderPackageDeck(deckSections, ctx.user_context);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename="promotion-package.pptx"');
    res.send(buf);
  } catch (err) {
    console.error('export-deck error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to generate deck', code: 'AI_ERROR' });
  }
});

// ── POST /api/ai/auto-link-evidence ────────────────────────────────────────
// Classifies wins to competencies via AI, returning suggested evidence links.

router.post('/auto-link-evidence', async (req, res) => {
  // Load wins
  const winsResult = await db.query(
    `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'wins'`,
    [req.userId]
  );
  const allWins = winsResult.rows[0]?.data ?? [];
  if (!Array.isArray(allWins) || allWins.length === 0) {
    return res.status(400).json({ ok: false, error: 'No wins to link', code: 'INSUFFICIENT_DATA' });
  }

  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  const winsSummary = allWins.map(w => ({
    id: w.id,
    title: w.title,
    description: w.description,
    tags: w.tags,
    impact: w.impact,
    date: w.date,
  }));

  const result = await callAnthropic({
    apiKey:       ctx.anthropicKey,
    systemPrompt: require('../ai/prompts').AUTO_LINK_EVIDENCE_PROMPT,
    userContent:  JSON.stringify({ wins: winsSummary }),
    maxTokens:    2000,
    parseJson:    true,
    userId:       req.userId,
    endpoint:     'auto-link-evidence',
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
