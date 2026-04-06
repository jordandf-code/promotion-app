// hooks/scorecard/constants.js
// Shared constants and pure utility functions for the scorecard domain.

export const METRIC_KEYS   = ['sales', 'revenue', 'grossProfit', 'utilization'];
export const METRIC_LABELS = {
  sales: 'Signings', revenue: 'Revenue', grossProfit: 'Gross profit', utilization: 'Chargeable utilization',
};

export const MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const QUARTER_KEYS   = ['q1','q2','q3','q4'];
export const QUARTER_LABELS = ['Q1','Q2','Q3','Q4'];

export const OPP_STATUSES     = ['open','won','lost'];
export const PROJECT_STATUSES = ['forecast','realized'];

export function qSum(quarters) {
  if (!quarters) return 0;
  return QUARTER_KEYS.reduce((s, k) => s + (Number(quarters[k]) || 0), 0);
}

export function emptyMonths() {
  return Object.fromEntries(MONTH_KEYS.map(k => [k, { actual: '', forecast: '' }]));
}

export function emptyQuarters() {
  return { q1: '', q2: '', q3: '', q4: '' };
}

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
