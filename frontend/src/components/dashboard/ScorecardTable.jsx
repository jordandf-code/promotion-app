// components/dashboard/ScorecardTable.jsx
// Multi-year scorecard summary table for the Dashboard.
// Past years: compact (value + forecast + target). Qualifying year: full detail with status badge.

import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';

const TODAY         = new Date();
const CURRENT_YEAR  = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1; // 1-indexed

// ── Status logic ─────────────────────────────────────────────────────────────

// statusByProjected: when true, status is derived from projected total rather than realized pace.
// Used for utilization where forecast hours are a reliable signal.
function deriveStatus(realized, projected, target, year, statusByProjected = false) {
  if (target === null) return 'no-target';
  if (realized >= target) return 'achieved';

  const isPastYear = year < CURRENT_YEAR;
  if (isPastYear) return 'missed';

  if (statusByProjected) {
    if (projected >= target)          return 'on-track';
    if (projected >= target * 0.8)    return 'at-risk';
    return 'behind';
  }

  const expectedPace = (CURRENT_MONTH / 12) * target;
  if (realized >= expectedPace && projected >= target) return 'on-track';
  if (realized >= expectedPace * 0.8)                  return 'at-risk';
  return 'behind';
}

const STATUS_CONFIG = {
  'achieved':  { label: 'Achieved',  color: '#639922' },
  'on-track':  { label: 'On track',  color: '#639922' },
  'at-risk':   { label: 'At risk',   color: '#BA7517' },
  'behind':    { label: 'Behind',    color: '#E24B4A' },
  'missed':    { label: 'Missed',    color: '#E24B4A' },
  'no-target': { label: 'No target', color: '#9ca3af' },
};

function pctColor(pct) {
  if (pct === null)  return '#9ca3af';
  if (pct >= 100)    return '#639922';
  if (pct >= 60)     return '#BA7517';
  return '#E24B4A';
}

function fmtPct(value, target) {
  if (!target) return null;
  return Math.round((value / target) * 100);
}

// ── ScorecardTable ────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

export default function ScorecardTable({ scorecard, qualifyingYear, scorecardYears }) {
  const { fmtCurrency } = useSettings();
  const isMobile = useIsMobile();

  const desktopYears = [qualifyingYear - 2, qualifyingYear - 1, qualifyingYear];
  // On mobile: navigate all scorecard years; on desktop: show 3-year window
  const mobileYears = scorecardYears ?? desktopYears;
  const currentIdx = mobileYears.indexOf(CURRENT_YEAR);
  const [windowStart, setWindowStart] = useState(Math.max(0, currentIdx >= 0 ? currentIdx : mobileYears.length - 1));
  const years = isMobile ? [mobileYears[windowStart]] : desktopYears;

  const canGoLeft  = isMobile && windowStart > 0;
  const canGoRight = isMobile && windowStart < mobileYears.length - 1;

  const rows = [
    {
      label:    'Signings',
      getStats: (year) => {
        const s = scorecard.getSalesStats(year);
        return { realized: s.realized, projected: s.total, target: s.target };
      },
      format: (v) => fmtCurrency(v),
      unit: 'currency',
      statusByProjected: false,
    },
    {
      label:    'Revenue',
      getStats: (year) => {
        const s = scorecard.getRevenueStats(year);
        return { realized: s.realized, projected: s.total, target: s.target };
      },
      format: (v) => fmtCurrency(v),
      unit: 'currency',
      statusByProjected: false,
    },
    {
      label:    'Gross profit',
      getStats: (year) => {
        const s = scorecard.getGPStats(year);
        return { realized: s.realized, projected: s.total, target: s.target };
      },
      format: (v) => fmtCurrency(v),
      unit: 'currency',
      statusByProjected: false,
    },
    {
      label:    'Chargeable utilization',
      getStats: (year) => {
        const s = scorecard.getUtilStats(year);
        return { realized: s.hoursToDate, projected: s.projection, target: s.target };
      },
      format: (v) => `${Math.round(v).toLocaleString()}h`,
      unit: 'hours',
      statusByProjected: true,
    },
  ];

  return (
    <div className="sc-table-wrap">
      {isMobile && (
        <div className="sc-overview-toolbar">
          <div className="sc-year-nav">
            <button
              className="sc-nav-btn sc-nav-btn--mobile"
              onClick={() => setWindowStart(s => Math.max(0, s - 1))}
              disabled={!canGoLeft}
              title="Earlier year"
            >‹</button>
            <span className="sc-year-current-label">
              {years[0]}
              {years[0] === qualifyingYear && <span className="sc-year-star"> ★</span>}
            </span>
            <button
              className="sc-nav-btn sc-nav-btn--mobile"
              onClick={() => setWindowStart(s => Math.min(mobileYears.length - 1, s + 1))}
              disabled={!canGoRight}
              title="Later year"
            >›</button>
          </div>
        </div>
      )}
      <table className="sc-table">
        {!isMobile && (
          <thead>
            <tr>
              <th className="sc-th sc-th--label" />
              {years.map(year => {
                const isQual = year === qualifyingYear;
                return (
                  <th key={year} className={`sc-th ${isQual ? 'sc-th--qual' : ''}`}>
                    {year}{isQual && <span className="sc-qual-star"> ★</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="sc-row">
              <td className="sc-td sc-td--label">{row.label}</td>
              {years.map(year => {
                const isQual = year === qualifyingYear;
                const { realized, projected, target } = row.getStats(year);
                const status = isQual
                  ? deriveStatus(realized, projected, target, year, row.statusByProjected)
                  : null;

                const isUtil      = row.unit === 'hours';
                const actualPct   = fmtPct(realized, target);
                const forecastPct = fmtPct(projected, target);
                const hasForecast = projected > realized && target;

                const statusCfg = status ? STATUS_CONFIG[status] : null;

                return (
                  <td key={year} className={`sc-td ${isQual ? 'sc-td--qual' : ''}`}>

                    {/* Top row: status dot+label on left, actual value on right */}
                    <div className="sc-top-row">
                      {isQual && statusCfg ? (
                        <span className="sc-status" style={{ color: statusCfg.color }}>
                          <span className="sc-status-dot" style={{ background: statusCfg.color }} />
                          {statusCfg.label}
                        </span>
                      ) : <span />}
                      <span className="sc-actual">
                        {row.format(realized)}
                        {isUtil && actualPct !== null && (
                          <span className="sc-util-pct"> ({actualPct}%)</span>
                        )}
                      </span>
                    </div>

                    {/* Forecast line */}
                    {hasForecast && (
                      <div className="sc-forecast-line">
                        fcst {row.format(projected)}
                        {forecastPct !== null && (
                          <span className="sc-forecast-pct" style={{ color: pctColor(forecastPct) }}>
                            {' '}({forecastPct}%)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Target line */}
                    {target !== null
                      ? <div className="sc-target">target {row.format(target)}</div>
                      : <div className="sc-target sc-target--none">—</div>
                    }
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
