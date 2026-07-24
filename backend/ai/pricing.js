// ai/pricing.js
// Single source of truth for Anthropic model pricing. Keyed by the exact model id
// used at ai/callAnthropic.js (currently 'claude-sonnet-4-6'). Both the post-hoc
// usage endpoint and the pre-send cost estimator import from here so the two can
// never drift.
//
// Prices are USD per million tokens (per-MTok), from Anthropic's published rates.
//   claude-sonnet-4-6: $3 / MTok input, $15 / MTok output

const MODEL_PRICING = {
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
};

// The model actually sent in ai/callAnthropic.js. Keep in sync if that changes.
const DEFAULT_MODEL = 'claude-sonnet-4-6';

function priceFor(model) {
  return MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];
}

// Returns unrounded USD cost. Callers round for display.
function estimateCostUsd(model, inputTokens = 0, outputTokens = 0) {
  const p = priceFor(model);
  return (inputTokens / 1_000_000) * p.inputPerMTok + (outputTokens / 1_000_000) * p.outputPerMTok;
}

// Rough token count from a serialized string (~4 chars/token). Used only for
// pre-send estimates — the real usage numbers come back from the API.
function estimateTokens(text) {
  return Math.ceil((text ? String(text).length : 0) / 4);
}

module.exports = { MODEL_PRICING, DEFAULT_MODEL, priceFor, estimateCostUsd, estimateTokens };
