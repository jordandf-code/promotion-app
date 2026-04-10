// hooks/scorecard/statsHelpers.js
// Pure functions that compute scorecard stats from data slices.
// No side effects — takes data as arguments, returns plain objects.
// Tested in __tests__/statsHelpers.test.js

import { MONTH_KEYS, qSum } from './constants.js';

/**
 * Sales stats for a given year.
 * Won opportunities → realized. Open opportunities → forecast. Lost → excluded.
 */
export function getSalesStats(opportunities, targets, year) {
  const yearOpps = opportunities.filter(o => o.year === year);
  const realized = yearOpps
    .filter(o => o.status === 'won')
    .reduce((sum, o) => sum + (Number(o.signingsValue) || 0), 0);
  const forecast = yearOpps
    .filter(o => o.status === 'open')
    .reduce((sum, o) => sum + (Number(o.signingsValue) || 0), 0);
  const target = targets[year]?.sales ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

/**
 * Revenue stats for a given year.
 * Realized projects → realized. Forecast projects → forecast.
 */
export function getRevenueStats(projects, targets, year) {
  const yearProjects = projects.filter(p => year >= p.year && year <= (p.endYear || p.year));
  const realized = yearProjects
    .filter(p => p.status === 'realized')
    .reduce((sum, p) => sum + qSum(p.revenue), 0);
  const forecast = yearProjects
    .filter(p => p.status === 'forecast')
    .reduce((sum, p) => sum + qSum(p.revenue), 0);
  const target = targets[year]?.revenue ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

/**
 * Gross profit stats for a given year.
 * Realized projects → realized. Forecast projects → forecast.
 */
export function getGPStats(projects, targets, year) {
  const yearProjects = projects.filter(p => year >= p.year && year <= (p.endYear || p.year));
  const realized = yearProjects
    .filter(p => p.status === 'realized')
    .reduce((sum, p) => sum + qSum(p.grossProfit), 0);
  const forecast = yearProjects
    .filter(p => p.status === 'forecast')
    .reduce((sum, p) => sum + qSum(p.grossProfit), 0);
  const target = targets[year]?.grossProfit ?? null;
  return { realized, forecast, total: realized + forecast, target };
}

/**
 * Utilization stats for a given year.
 * Actuals override forecasts in the projection — enter actuals for completed months,
 * forecasts for the rest.
 */
export function getUtilStats(utilization, targets, year) {
  const cell = utilization[year] ?? { months: {} };
  const months = cell.months ?? {};
  const target = targets[year]?.utilization ?? null;

  let hoursToDate = 0;
  let projection = 0;

  for (const key of MONTH_KEYS) {
    const month = months[key] ?? {};
    const actual   = month.actual   !== '' && month.actual   != null ? Number(month.actual)   : null;
    const forecast = month.forecast !== '' && month.forecast != null ? Number(month.forecast) : null;

    if (actual != null) {
      hoursToDate += actual;
      projection  += actual;
    } else if (forecast != null) {
      projection += forecast;
    }
  }

  const pct = target ? Math.round((projection / target) * 100) : null;
  return { hoursToDate, projection, target, pct };
}

/**
 * Compliance status for a metric against its threshold.
 * thresholdPct is e.g. 85, meaning "must hit 85% of target to pass".
 */
export function getComplianceStatus(actual, target, thresholdPct) {
  if (!target || target === 0) return 'neutral';
  const pct = (actual / target) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= thresholdPct) return 'on-track';
  return 'below';
}
