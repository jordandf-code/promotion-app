// hooks/useReadinessScore.js
// Pure computation of a 0–100 readiness score from five dimensions.
// No API calls, no persistence — recomputes reactively from in-memory data.

import { useMemo } from 'react';
import { useScorecardData } from './useScorecardData.js';
import { useGoalsData } from './useGoalsData.js';
import { useWinsData } from './useWinsData.js';
import { useStoryData } from './useStoryData.js';
import { useAdminData } from './useAdminData.js';
import { useSettings } from '../context/SettingsContext.jsx';

export const DEFAULT_WEIGHTS = {
  scorecard: 35,
  pipeline:  20,
  gates:     20,
  evidence:  15,
  wins:      10,
};

const DIMENSION_LABELS = {
  scorecard: 'Scorecard performance',
  pipeline:  'Pipeline coverage',
  gates:     'Gate completion',
  evidence:  'Evidence strength',
  wins:      'Wins & eminence',
};

const DIMENSION_ROUTES = {
  scorecard: '/scorecard',
  pipeline:  '/pursuits',
  gates:     '/goals',
  evidence:  '/story',
  wins:      '/wins',
};

const ACTION_PROMPTS = {
  scorecard: 'Update your scorecard targets and log deals to improve this score',
  pipeline:  'Add open opportunities with expected values to strengthen pipeline coverage',
  gates:     'Flag your IBM milestone goals and mark them done as you complete them',
  evidence:  'Generate a gap analysis to score evidence strength',
  wins:      'Log qualifying-year wins and tag them with eminence categories',
};

/**
 * Pure computation — no hooks, no side effects.
 * Exported for direct testing.
 */
export function computeReadinessScore({
  salesStats, revenueStats, gpStats, utilStats,
  opportunities, goals, wins, gapAnalysis,
  weights, qualifyingYear,
}) {
  const warnings = [];
  const w = normalizeWeights(weights ?? DEFAULT_WEIGHTS);

  // ── 1. Scorecard performance ──
  const metricScores = [salesStats, revenueStats, gpStats]
    .filter(s => s.target != null && s.target > 0)
    .map(s => Math.min(s.total / s.target, 1) * 100);

  if (utilStats.target != null && utilStats.target > 0) {
    metricScores.push(Math.min(utilStats.projection / utilStats.target, 1) * 100);
  }

  const scorecardScore = metricScores.length > 0
    ? metricScores.reduce((a, b) => a + b, 0) / metricScores.length
    : 0;

  // ── 2. Pipeline coverage ──
  let pipelineScore;
  if (salesStats.target == null || salesStats.target <= 0) {
    pipelineScore = 0;
  } else if (salesStats.total >= salesStats.target) {
    pipelineScore = 100;
  } else {
    const signingsGap = Math.max(salesStats.target - salesStats.realized, 0);
    if (signingsGap === 0) {
      pipelineScore = 100;
    } else {
      const openOpps = (opportunities ?? []).filter(
        o => o.year === qualifyingYear && o.status === 'open'
      );
      const weightedPipeline = openOpps.reduce((sum, o) => {
        const prob = (o.probability != null && o.probability !== '') ? Number(o.probability) : 50;
        return sum + (Number(o.signingsValue) || 0) * (prob / 100);
      }, 0);
      pipelineScore = Math.min(weightedPipeline / signingsGap, 1) * 100;
    }
  }

  // ── 3. Gate completion ──
  const gateGoals = (goals ?? []).filter(g => g.isGate);
  let gatesScore;
  if (gateGoals.length === 0) {
    gatesScore = 0;
    warnings.push('No gate goals flagged — mark your IBM milestone goals as gates');
  } else {
    const done = gateGoals.filter(g => g.status === 'done').length;
    gatesScore = (done / gateGoals.length) * 100;
  }

  // ── 4. Evidence strength ──
  let evidenceScore;
  const criteria = gapAnalysis ?? [];
  if (criteria.length === 0) {
    evidenceScore = 0;
    warnings.push('No gap analysis generated — generate one to score evidence strength');
  } else {
    const strengthMap = { Strong: 100, Partial: 50, Missing: 0 };
    const scores = criteria.map(c => strengthMap[c.strength] ?? 0);
    evidenceScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // ── 5. Wins & eminence ──
  const qyWins = (wins ?? []).filter(win => {
    const d = new Date(win.date);
    return !isNaN(d) && d.getFullYear() === qualifyingYear;
  });
  const countScore = Math.min(qyWins.length, 5) / 5 * 100;
  const eminenceWins = qyWins.filter(win =>
    (win.tags ?? []).some(t => t === 'Internal eminence' || t === 'External eminence')
  ).length;
  const eminenceScore = eminenceWins >= 2 ? 100 : eminenceWins === 1 ? 50 : 0;
  const winsScore = (countScore + eminenceScore) / 2;

  // ── Weighted average ──
  const dimensions = {
    scorecard: { score: Math.round(scorecardScore), weight: w.scorecard, label: DIMENSION_LABELS.scorecard, route: DIMENSION_ROUTES.scorecard },
    pipeline:  { score: Math.round(pipelineScore),  weight: w.pipeline,  label: DIMENSION_LABELS.pipeline,  route: DIMENSION_ROUTES.pipeline },
    gates:     { score: Math.round(gatesScore),      weight: w.gates,     label: DIMENSION_LABELS.gates,     route: DIMENSION_ROUTES.gates },
    evidence:  { score: Math.round(evidenceScore),   weight: w.evidence,  label: DIMENSION_LABELS.evidence,  route: DIMENSION_ROUTES.evidence },
    wins:      { score: Math.round(winsScore),       weight: w.wins,      label: DIMENSION_LABELS.wins,      route: DIMENSION_ROUTES.wins },
  };

  const overall = Math.round(
    Object.entries(dimensions).reduce((sum, [key, dim]) => sum + dim.score * (w[key] / 100), 0)
  );

  const weakest = Object.entries(dimensions)
    .reduce((min, [key, dim]) => dim.score < min.score ? { key, score: dim.score } : min, { key: 'scorecard', score: Infinity })
    .key;

  return { overall, dimensions, weakest, warnings };
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

/**
 * React hook — consumes all data hooks and returns the readiness score.
 */
export function useReadinessScore() {
  const { qualifyingYear } = useSettings();
  const scorecard = useScorecardData();
  const { goals } = useGoalsData();
  const { wins } = useWinsData();
  const { story } = useStoryData();
  const adminData = useAdminData();

  return useMemo(() => {
    const salesStats   = scorecard.getSalesStats(qualifyingYear);
    const revenueStats = scorecard.getRevenueStats(qualifyingYear);
    const gpStats      = scorecard.getGPStats(qualifyingYear);
    const utilStats    = scorecard.getUtilStats(qualifyingYear);

    return computeReadinessScore({
      salesStats, revenueStats, gpStats, utilStats,
      opportunities: scorecard.opportunities,
      goals, wins,
      gapAnalysis: story?.gap_analysis?.data ?? [],
      weights: adminData?.readinessWeights ?? DEFAULT_WEIGHTS,
      qualifyingYear,
    });
  }, [scorecard, goals, wins, story, adminData?.readinessWeights, qualifyingYear]);
}

export { ACTION_PROMPTS };
