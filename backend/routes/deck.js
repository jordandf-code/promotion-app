// routes/deck.js
// PowerPoint deck generation endpoint (Phase 20).
// POST /api/ai/deck — generates a populated .pptx from user data via Claude.

const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { buildContext }   = require('../ai/buildContext');
const { callAnthropic }  = require('../ai/callAnthropic');
const { buildDeckPrompt } = require('../ai/deckPrompt');
const { renderDeck }     = require('../ai/renderDeck');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

// ── Helpers (duplicated from ai.js to keep routes self-contained) ──────────

function handleContextError(err, res) {
  if (err.code === 'NO_KEY' || err.code === 'NO_CRITERIA') {
    return res.status(400).json({ ok: false, error: err.message, code: err.code });
  }
  console.error('buildContext error:', err.message);
  return res.status(500).json({ ok: false, error: 'Failed to load user data', code: 'AI_ERROR' });
}

function buildUserMessage(ctx) {
  const { anthropicKey, _stats, career_history, ...payload } = ctx;
  if (career_history) payload.career_history = career_history;
  return JSON.stringify(payload);
}

// ── POST /api/ai/deck ──────────────────────────────────────────────────────

router.post('/deck', async (req, res) => {
  let ctx;
  try { ctx = await buildContext(req.userId); }
  catch (err) { return handleContextError(err, res); }

  // Load admin data for template and instructions
  let admin = {};
  try {
    const result = await db.query(
      `SELECT data FROM user_data WHERE user_id = $1 AND domain = 'admin'`,
      [req.userId]
    );
    admin = result.rows[0]?.data ?? {};
  } catch (err) {
    console.error('Failed to load admin data for deck:', err.message);
  }

  // Build prompt and call AI
  const systemPrompt = buildDeckPrompt(admin.deckContentInstructions || '');
  let result;
  try {
    result = await callAnthropic({
      apiKey:       ctx.anthropicKey,
      systemPrompt,
      userContent:  buildUserMessage(ctx),
      maxTokens:    4000,
      parseJson:    true,
    });
  } catch (err) {
    console.error('callAnthropic threw:', err.message);
    return res.status(500).json({ ok: false, error: 'AI request failed.', code: 'AI_ERROR' });
  }

  if (!result.ok) return res.status(500).json(result);

  // Render the populated deck
  let pptxBuffer;
  try {
    pptxBuffer = await renderDeck(result.data, admin.deckTemplate || null);
  } catch (err) {
    console.error('renderDeck error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to render deck — check your template.',
      code: 'PARSE_ERROR',
    });
  }

  // Return binary .pptx with usage in header
  const year = ctx.user_context?.qualifying_year || new Date().getFullYear();
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'Content-Disposition': `attachment; filename="PromotionCase_${year}.pptx"`,
    'X-Token-Usage': JSON.stringify(result.usage),
  });
  res.send(pptxBuffer);
});

module.exports = router;
