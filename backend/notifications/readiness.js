// notifications/readiness.js
// Server-side port of computeReadinessScore from frontend/src/hooks/useReadinessScore.js
// Pure functions — no React, no side effects.

const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4'];
const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

const DEFAULT_WEIGHTS = { scorecard: 35, pipeline: 20, gates: 20, evidence: 15, wins: 10 };

function qSum(quarters) {
  if (!quarters) return 0;
  return QUARTER_KEYS.reduce((s, k) => s + (Number(quarters[k]) || 0), 0);
}

function getSalesStats(opportunities, targets, year) {
  const yearOpps = (opportunities || []).filter(o => o.year === year);
  const realized = yearOpps.filter(o => o.status === 'won').reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const forecast = yearOpps.filter(o => o.status === 'open').reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  return { realized, forecast, total: realized + forecast, target: targets[year]?.sales ?? null };
}

function getRevenueStats(projects, targets, year) {
  const yp = (projects || []).filter(p => year >= p.year && year <= (p.endYear || p.year));
  const realized = yp.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.revenue), 0);
  const forecast = yp.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.revenue), 0);
  return { realized, forecast, total: realized + forecast, target: targets[year]?.revenue ?? null };
}

function getGPStats(projects, targets, year) {
  const yp = (projects || []).filter(p => year >= p.year && year <= (p.endYear || p.year));
  const realized = yp.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.grossProfit), 0);
  const forecast = yp.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.grossProfit), 0);
  return { realized, forecast, total: realized + forecast, target: targets[year]?.grossProfit ?? null };
}

function getUtilStats(utilization, targets, year) {
  const cell = (utilization || {})[year] || { months: {} };
  const months = cell.months || {};
  const target = targets[year]?.utilization ?? null;
  let hoursToDate = 0, projection = 0;
  for (const key of MONTH_KEYS) {
    const m = months[key] || {};
    const actual = m.actual !== '' && m.actual != null ? Number(m.actual) : null;
    const fc = m.forecast !== '' && m.forecast != null ? Number(m.forecast) : null;
    if (actual != null) { hoursToDate += actual; projection += actual; }
    else if (fc != null) { projection += fc; }
  }
  return { hoursToDate, projection, target, pct: target ? Math.round((projection / target) * 100) : null };
}

function normalizeWeights(raw) {
  const sum = Object.values(raw).reduce((a, b) => a + (Number(b) || 0), 0);
  if (sum <= 0) return DEFAULT_WEIGHTS;
  const scale = 100 / sum;
  return {
    scorecard: (Number(raw.scorecard) || 0) * scale,
    pipeline:  (Number(raw.pipeline)  || 0) * scale,
    gates:     (Number(raw.gates)     || 0) * scale,
    evidence:  (Number(raw.evidence)  || 0) * scale,
    wins:      (Number(raw.wins)      || 0) * scale,
  };
}

function computeReadinessScore({ scorecardData, goals, wins, gapAnalysis, eminenceActivities, weights, qualifyingYear }) {
  const opps = scorecardData.opportunities || [];
  const projects = scorecardData.projects || [];
  const targets = scorecardData.targets || {};
  const utilization = scorecardData.utilization || {};

  const salesStats = getSalesStats(opps, targets, qualifyingYear);
  const revenueStats = getRevenueStats(projects, targets, qualifyingYear);
  const gpStats = getGPStats(projects, targets, qualifyingYear);
  const utilStats = getUtilStats(utilization, targets, qualifyingYear);

  const warnings = [];
  const w = normalizeWeights(weights || DEFAULT_WEIGHTS);

  // 1. Scorecard performance
  const metricScores = [salesStats, revenueStats, gpStats]
    .filter(s => s.target != null && s.target > 0)
    .map(s => Math.min(s.total / s.target, 1) * 100);
  if (utilStats.target != null && utilStats.target > 0) {
    metricScores.push(Math.min(utilStats.projection / utilStats.target, 1) * 100);
  }
  const scorecardScore = metricScores.length > 0
    ? metricScores.reduce((a, b) => a + b, 0) / metricScores.length : 0;

  // 2. Pipeline coverage
  let pipelineScore;
  if (salesStats.target == null || salesStats.target <= 0) { pipelineScore = 0; }
  else if (salesStats.total >= salesStats.target) { pipelineScore = 100; }
  else {
    const gap = Math.max(salesStats.target - salesStats.realized, 0);
    if (gap === 0) { pipelineScore = 100; }
    else {
      const openOpps = opps.filter(o => o.year === qualifyingYear && o.status === 'open');
      const weighted = openOpps.reduce((sum, o) => {
        const prob = (o.probability != null && o.probability !== '') ? Number(o.probability) : 50;
        return sum + (Number(o.signingsValue) || 0) * (prob / 100);
      }, 0);
      pipelineScore = Math.min(weighted / gap, 1) * 100;
    }
  }

  // 3. Gate completion
  const gateGoals = (goals || []).filter(g => g.isGate);
  let gatesScore;
  if (gateGoals.length === 0) { gatesScore = 0; warnings.push('No gate goals flagged'); }
  else { gatesScore = (gateGoals.filter(g => g.status === 'done').length / gateGoals.length) * 100; }

  // 4. Evidence strength
  const criteria = gapAnalysis || [];
  let evidenceScore;
  if (criteria.length === 0) { evidenceScore = 0; warnings.push('No gap analysis generated'); }
  else {
    const map = { Strong: 100, Partial: 50, Missing: 0 };
    const scores = criteria.map(c => map[c.strength] ?? 0);
    evidenceScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // 5. Wins & eminence
  const qyWins = (wins || []).filter(win => { const d = new Date(win.date); return !isNaN(d) && d.getFullYear() === qualifyingYear; });
  const countScore = Math.min(qyWins.length, 5) / 5 * 100;
  const eminenceWins = qyWins.filter(win => (win.tags || []).some(t => t === 'Internal eminence' || t === 'External eminence')).length;
  const qyEminence = (eminenceActivities || []).filter(a => { const d = new Date(a.date); return !isNaN(d) && d.getFullYear() === qualifyingYear; }).length;
  const totalEminence = eminenceWins + qyEminence;
  const eminenceScore = totalEminence >= 2 ? 100 : totalEminence === 1 ? 50 : 0;
  const winsScore = (countScore + eminenceScore) / 2;

  // Weighted average
  const dimensions = {
    scorecard: { score: Math.round(scorecardScore), weight: w.scorecard, label: 'Scorecard performance' },
    pipeline:  { score: Math.round(pipelineScore),  weight: w.pipeline,  label: 'Pipeline coverage' },
    gates:     { score: Math.round(gatesScore),      weight: w.gates,     label: 'Gate completion' },
    evidence:  { score: Math.round(evidenceScore),   weight: w.evidence,  label: 'Evidence strength' },
    wins:      { score: Math.round(winsScore),       weight: w.wins,      label: 'Wins & eminence' },
  };

  const overall = Math.round(
    Object.entries(dimensions).reduce((sum, [key, dim]) => sum + dim.score * (w[key] / 100), 0)
  );

  return { overall, dimensions, warnings };
}

module.exports = { computeReadinessScore, DEFAULT_WEIGHTS };
