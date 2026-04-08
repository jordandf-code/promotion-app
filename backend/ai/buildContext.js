// ai/buildContext.js
// Assembles the full AI context payload from a user's DB data.
// Returns the AIprompt.md input schema plus the anthropicKey for callAnthropic.

const db = require('../db');
const { fmtCurrency, qSum, daysSince, pctOf, QUARTER_KEYS, MONTH_KEYS } = require('./formatUtils');

// ── Strip nulls recursively to reduce token count ───────────────────────────

function removeNulls(obj) {
  if (Array.isArray(obj)) return obj.map(removeNulls);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      out[k] = removeNulls(v);
    }
    return out;
  }
  return obj;
}

function hasData(metrics) {
  const s = metrics.signings;
  const r = metrics.revenue;
  const g = metrics.gross_profit;
  const u = metrics.utilization;
  return (s.target || s.actual || s.forecast ||
          r.target || r.actual || r.forecast ||
          g.target || g.actual || g.forecast ||
          u.target_hours || u.actual_hours || u.projected_hours);
}

// ── Scorecard stat helpers (ported from frontend statsHelpers.js) ───────────

function getSalesStats(opportunities, targets, year) {
  const yearOpps = opportunities.filter(o => o.year === year);
  const realized = yearOpps.filter(o => o.status === 'won').reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const forecast = yearOpps.filter(o => o.status === 'open').reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const target = targets[year]?.sales ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

function getRevenueStats(projects, targets, year) {
  const yp = projects.filter(p => p.year === year);
  const realized = yp.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.revenue), 0);
  const forecast = yp.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.revenue), 0);
  const target = targets[year]?.revenue ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

function getGPStats(projects, targets, year) {
  const yp = projects.filter(p => p.year === year);
  const realized = yp.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.grossProfit), 0);
  const forecast = yp.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.grossProfit), 0);
  const target = targets[year]?.grossProfit ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

function getUtilStats(utilization, targets, year) {
  const months = utilization[year]?.months ?? {};
  const target = targets[year]?.utilization ?? null;
  let hoursToDate = 0, projection = 0;
  for (const key of MONTH_KEYS) {
    const m = months[key] ?? {};
    const actual   = m.actual !== '' && m.actual != null ? Number(m.actual) : null;
    const forecast = m.forecast !== '' && m.forecast != null ? Number(m.forecast) : null;
    if (actual != null)        { hoursToDate += actual; projection += actual; }
    else if (forecast != null) { projection += forecast; }
  }
  return { hoursToDate, projection, target, pct: pctOf(projection, target) };
}

// ── Main builder ────────────────────────────────────────────────────────────

// ── Firm config defaults (used when no platform firm_config is set) ──────────

const FIRM_CONFIG_DEFAULTS = {
  companyName:      'IBM Canada',
  currentRoleLabel: 'Associate Partner',
  targetRoleLabel:  'Partner',
  marketDescription: 'Canadian public sector',
  criteriaLabel:    'Promotion criteria',
  metricLabels: {
    signings:    'Signings',
    revenue:     'Revenue',
    grossProfit: 'Gross profit',
    utilization: 'Chargeable utilization',
  },
};

async function loadFirmConfig() {
  try {
    const result = await db.query("SELECT value FROM app_settings WHERE key = 'firm_config'");
    if (result.rows[0]?.value) {
      const raw = JSON.parse(result.rows[0].value);
      return {
        ...FIRM_CONFIG_DEFAULTS,
        ...raw,
        metricLabels: { ...FIRM_CONFIG_DEFAULTS.metricLabels, ...(raw.metricLabels || {}) },
      };
    }
  } catch {}
  return FIRM_CONFIG_DEFAULTS;
}

async function buildContext(userId) {
  const [dataResult, firmConfig] = await Promise.all([
    db.query(
      `SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)`,
      [userId, ['admin', 'settings', 'scorecard', 'wins', 'goals', 'people', 'learning', 'eminence']]
    ),
    loadFirmConfig(),
  ]);
  const byDomain = Object.fromEntries(dataResult.rows.map(r => [r.domain, r.data]));

  const admin    = byDomain.admin    ?? {};
  const settings = byDomain.settings ?? {};
  const sc       = byDomain.scorecard ?? { targets: {}, opportunities: [], projects: [], utilization: {} };
  const rawWins  = byDomain.wins     ?? [];
  const rawGoals = byDomain.goals    ?? [];
  const rawPeople   = byDomain.people   ?? [];
  const rawLearning  = byDomain.learning  ?? { certifications: [], courses: [] };
  const rawEminence  = byDomain.eminence  ?? { activities: [] };

  // Validate required config
  const anthropicKey = admin.anthropicKey;
  if (!anthropicKey) {
    const err = new Error('No API key configured');
    err.code = 'NO_KEY';
    throw err;
  }
  if (!admin.ibmCriteria) {
    const err = new Error(`No ${firmConfig.criteriaLabel.toLowerCase()} configured`);
    err.code = 'NO_CRITERIA';
    throw err;
  }

  const promotionYear  = settings.promotionYear ?? 2027;
  const qualifyingYear = promotionYear - 1;
  const currentYear    = new Date().getFullYear();

  // ── user_context (labels from firm config) ──
  const user_context = {
    current_role:    firmConfig.currentRoleLabel,
    target_role:     firmConfig.targetRoleLabel,
    company:         firmConfig.companyName,
    market:          firmConfig.marketDescription,
    qualifying_year: qualifyingYear,
    target_year:     promotionYear,
  };

  // ── scorecard.years ──
  const targets       = sc.targets       ?? {};
  const opportunities = sc.opportunities ?? [];
  const projects      = sc.projects      ?? [];
  const utilization   = sc.utilization   ?? {};

  const allYears = new Set([
    ...Object.keys(targets).map(Number),
    ...opportunities.map(o => o.year),
    ...projects.map(p => p.year),
  ]);

  const scorecardYears = [...allYears].sort().map(year => {
    const sales = getSalesStats(opportunities, targets, year);
    const rev   = getRevenueStats(projects, targets, year);
    const gp    = getGPStats(projects, targets, year);
    const util  = getUtilStats(utilization, targets, year);

    let status = 'complete';
    if (year === qualifyingYear) status = 'qualifying';
    else if (year > currentYear) status = 'future';

    return {
      year,
      status,
      metrics: {
        signings: {
          target: sales.target,   actual: sales.realized,
          forecast: sales.forecast, pct: pctOf(sales.total, sales.target),
        },
        revenue: {
          target: rev.target,     actual: rev.realized,
          forecast: rev.forecast, pct: pctOf(rev.total, rev.target),
        },
        gross_profit: {
          target: gp.target,      actual: gp.realized,
          forecast: gp.forecast,  pct: pctOf(gp.total, gp.target),
        },
        utilization: {
          target_hours: util.target,      actual_hours: util.hoursToDate,
          projected_hours: util.projection, pct_of_target: util.pct,
        },
      },
    };
  }).filter(y => hasData(y.metrics));

  // ── opportunities (open + won only, snake_case) ──
  const opps = opportunities
    .filter(o => o.status === 'open' || o.status === 'won')
    .map(o => ({
      name:                o.name,
      client:              o.client,
      year:                o.year,
      status:              o.status,
      stage:               o.stage ?? null,
      tcv:                 Number(o.totalValue) || 0,
      signings_credit:     Number(o.signingsValue) || 0,
      probability:         o.probability != null ? Number(o.probability) : null,
      deal_type:           o.dealType ?? null,
      logo_type:           o.logoType ?? null,
      relationship_origin: o.relationshipOrigin ?? null,
      strategic_note:      o.strategicNote ?? null,
    }));

  // ── wins (20 most recent, trimmed) ──
  const wins = [...rawWins]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)
    .map(w => ({
      title:               w.title,
      date:                w.date,
      impact:              w.impact ?? null,
      tags:                w.tags ?? [],
      logo_type:           w.logoType ?? null,
      relationship_origin: w.relationshipOrigin ?? null,
      strategic_note:      w.strategicNote ?? null,
    }));

  // ── goals ──
  const goals = rawGoals.map(g => ({
    title:   g.title,
    status:  (g.status ?? 'not_started').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    is_gate: !!g.isGate,
    notes:   g.notes ?? null,
  }));

  // ── people (name + type + org + last contact only) ──
  const people = rawPeople.map(p => {
    const lastTp = (p.touchpoints ?? []).sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      name:                p.name,
      title:               p.title ?? null,
      org:                 p.org ?? null,
      relationship_type:   p.type ?? null,
      relationship_status: p.relationshipStatus ?? null,
      last_touchpoint:     lastTp?.date ?? null,
    };
  });

  // ── pre-computed summary stats ──
  const qyOpps = opportunities.filter(o => o.year === qualifyingYear);
  const wonOpps  = qyOpps.filter(o => o.status === 'won');
  const lostOpps = qyOpps.filter(o => o.status === 'lost');
  const openOpps = qyOpps.filter(o => o.status === 'open');

  const _stats = {
    net_new_won_count:  wonOpps.filter(o => o.logoType === 'net-new').length,
    expansion_won_count: wonOpps.filter(o => o.logoType === 'expansion').length,
    win_rate:           (wonOpps.length + lostOpps.length) > 0
                          ? Math.round(wonOpps.length / (wonOpps.length + lostOpps.length) * 100) : null,
    weighted_pipeline:  openOpps.reduce((s, o) => {
      const prob = o.probability != null ? Number(o.probability) : 50;
      return s + (Number(o.signingsValue) || 0) * (prob / 100);
    }, 0),
    total_pipeline:     openOpps.reduce((s, o) => s + (Number(o.signingsValue) || 0), 0),
    largest_pursuit:    openOpps.length
                          ? openOpps.reduce((max, o) => (Number(o.signingsValue) || 0) > (Number(max.signingsValue) || 0) ? o : max)
                          : null,
    wins_by_tag:        rawWins.reduce((acc, w) => {
      (w.tags ?? []).forEach(t => { acc[t] = (acc[t] || 0) + 1; });
      return acc;
    }, {}),
    people_by_type:     rawPeople.reduce((acc, p) => {
      const t = p.type ?? 'Other';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
  };

  const context = {
    anthropicKey,
    ibm_criteria: admin.ibmCriteria,
    user_context,
    scorecard: { years: scorecardYears },
    _stats,
  };
  if (admin.careerHistory)  context.career_history = admin.careerHistory;
  if (opps.length)          context.opportunities = opps;
  if (wins.length)          context.wins = wins;
  if (goals.length)         context.goals = goals;
  if (people.length)        context.people = people;

  // ── eminence (20 most recent) ──
  const eminenceActivities = [...(rawEminence.activities ?? [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 20)
    .map(e => ({
      title:    e.title,
      type:     e.type ?? null,
      date:     e.date ?? null,
      audience: e.audience ?? null,
      venue:    e.venue ?? null,
    }));
  if (eminenceActivities.length) context.eminence = eminenceActivities;

  // ── learning (all earned/completed + up to 5 planned) ──
  const rawCerts   = rawLearning.certifications ?? [];
  const rawCourses = rawLearning.courses ?? [];

  const earnedCerts  = rawCerts.filter(c => c.status === 'earned' || c.status === 'expired');
  const plannedCerts = rawCerts.filter(c => c.status === 'planned' || c.status === 'in_progress').slice(0, 5);
  const aiCerts = [...earnedCerts, ...plannedCerts].map(c => ({
    name:        c.name,
    issuer:      c.issuer ?? null,
    status:      c.status,
    date_earned: c.dateEarned ?? null,
    expiry_date: c.expiryDate ?? null,
  }));

  const completedCourses = rawCourses.filter(c => c.status === 'completed');
  const plannedCourses   = rawCourses.filter(c => c.status === 'planned' || c.status === 'in_progress').slice(0, 5);
  const aiCourses = [...completedCourses, ...plannedCourses].map(c => ({
    title:          c.title,
    provider:       c.provider ?? null,
    status:         c.status,
    date_completed: c.dateCompleted ?? null,
    hours:          c.hours ? Number(c.hours) : null,
  }));

  const totalTrainingHours = completedCourses.reduce((s, c) => s + (Number(c.hours) || 0), 0);

  if (aiCerts.length || aiCourses.length) {
    context.learning = {
      certifications:       aiCerts,
      courses:              aiCourses,
      total_training_hours: totalTrainingHours,
    };
  }

  return removeNulls(context);
}

module.exports = { buildContext };
