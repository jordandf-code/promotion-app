// data/sampleData.js
// Shared date/currency helpers used across the app.
// Sample data exports removed in Phase 14 — all data comes from PostgreSQL.

// ── Helpers ────────────────────────────────────────────────────────────────

export function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  return Math.floor((then - now) / (1000 * 60 * 60 * 24));
}

export function fmtCAD(amount) {
  if (amount >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (amount >= 1_000)
    return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
