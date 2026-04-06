// ai/formatUtils.js
// Pure utilities shared across AI modules.

const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4'];
const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return 'n/a';
  if (n >= 1_000_000) return `CDN$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `CDN$${Math.round(n / 1_000)}K`;
  return `CDN$${Math.round(n)}`;
}

function qSum(quarters) {
  if (!quarters) return 0;
  return QUARTER_KEYS.reduce((s, k) => s + (Number(quarters[k]) || 0), 0);
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  const now  = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function pctOf(value, target) {
  if (!target) return null;
  return Math.round((value / target) * 100);
}

module.exports = { fmtCurrency, qSum, daysSince, pctOf, QUARTER_KEYS, MONTH_KEYS };
