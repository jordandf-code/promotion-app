// pages/Scorecard.jsx
// Sub-tabs: Overview · Opportunities · Projects · Utilization

import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useScorecardData, METRIC_KEYS, METRIC_LABELS } from '../hooks/useScorecardData.js';
import StackedCell      from '../components/scorecard/StackedCell.jsx';
import OpportunitiesTab from '../components/scorecard/OpportunitiesTab.jsx';
import ProjectsTab      from '../components/scorecard/ProjectsTab.jsx';
import UtilizationTab   from '../components/scorecard/UtilizationTab.jsx';
import TargetsTab       from '../components/scorecard/TargetsTab.jsx';

const CURRENT_YEAR   = new Date().getFullYear();
const PROMO_OPTIONS  = Array.from({ length: 16 }, (_, i) => 2025 + i);

const TABS = [
  { id: 'overview',      label: 'Overview'      },
  { id: 'targets',       label: 'Targets'       },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'projects',      label: 'Projects'      },
  { id: 'utilization',   label: 'Utilization'   },
];

// ── Year column helpers ────────────────────────────────────────────────────

function yearColumnClass(year, promotionYear) {
  return [
    year === promotionYear - 1 && 'sc-th--qual',
    year === promotionYear     && 'sc-th--partner',
    year === CURRENT_YEAR      && 'sc-th--current',
    year >  CURRENT_YEAR       && 'sc-th--future',
  ].filter(Boolean).join(' ');
}

function yearCellClass(year, promotionYear) {
  return [
    year === promotionYear - 1 && 'sc-td--qual',
    year === promotionYear     && 'sc-td--partner',
    year === CURRENT_YEAR      && 'sc-td--current',
    year >  CURRENT_YEAR       && 'sc-td--future',
  ].filter(Boolean).join(' ');
}

const WINDOW_SIZE = 3;

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

// ── Overview grid ──────────────────────────────────────────────────────────

function ScorecardOverview({ scorecard, scorecardYears, promotionYear }) {
  const isMobile = useIsMobile();
  const windowSize = isMobile ? 1 : WINDOW_SIZE;

  // Default window: on mobile show current year, on desktop centre on current year
  const currentIdx = scorecardYears.indexOf(CURRENT_YEAR);
  const defaultStart = Math.max(0, Math.min(
    isMobile ? currentIdx : currentIdx - 1,
    scorecardYears.length - windowSize,
  ));
  const [windowStart, setWindowStart] = useState(defaultStart < 0 ? 0 : defaultStart);
  const [expanded,    setExpanded]    = useState(false);

  const visibleYears = expanded
    ? scorecardYears
    : scorecardYears.slice(windowStart, windowStart + windowSize);

  const canGoLeft  = !expanded && windowStart > 0;
  const canGoRight = !expanded && windowStart + windowSize < scorecardYears.length;

  function getStatsForCell(year, metric) {
    if (metric === 'sales')       return scorecard.getSalesStats(year);
    if (metric === 'revenue')     return scorecard.getRevenueStats(year);
    if (metric === 'grossProfit') return scorecard.getGPStats(year);
    if (metric === 'utilization') {
      const u = scorecard.getUtilStats(year);
      return { realized: u.hoursToDate, forecast: u.projection - u.hoursToDate, total: u.projection, target: u.target };
    }
    return { realized: 0, forecast: 0, total: 0, target: null };
  }

  return (
    <div className="card scorecard-card">
      <div className="sc-overview-toolbar">
        <div className="sc-year-nav">
          <button
            className={`sc-nav-btn ${isMobile ? 'sc-nav-btn--mobile' : ''}`}
            onClick={() => setWindowStart(s => Math.max(0, s - 1))}
            disabled={!canGoLeft}
            title="Earlier years"
          >‹</button>
          {isMobile && visibleYears.length === 1 && (
            <span className="sc-year-current-label">
              {visibleYears[0]}
              {visibleYears[0] === promotionYear - 1 && <span className="sc-year-star"> ★</span>}
            </span>
          )}
          <button
            className={`sc-nav-btn ${isMobile ? 'sc-nav-btn--mobile' : ''}`}
            onClick={() => setWindowStart(s => Math.min(scorecardYears.length - windowSize, s + 1))}
            disabled={!canGoRight}
            title="Later years"
          >›</button>
        </div>
        <button
          className="sc-expand-btn"
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse' : 'Show all years'}
        >
          {expanded ? '⊠ Collapse' : '⊞ All years'}
        </button>
      </div>

      <div className={`sc-table-wrap ${expanded ? 'sc-table-wrap--expanded' : ''}`}>
        <table className="sc-table">
          {!isMobile && (
            <thead>
              <tr>
                <th className="sc-th sc-th--metric">Metric</th>
                {visibleYears.map(yr => (
                  <th key={yr} className={`sc-th sc-th--year ${yearColumnClass(yr, promotionYear)}`}>
                    <span className="sc-th-year">{yr}</span>
                    {yr === CURRENT_YEAR && <span className="sc-current-star">★</span>}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {METRIC_KEYS.map(metric => (
              <tr key={metric}>
                <td className="sc-td sc-td--metric">{METRIC_LABELS[metric]}</td>
                {visibleYears.map(yr => {
                  const stats = getStatsForCell(yr, metric);
                  return (
                    <td key={yr} className={`sc-td ${yearCellClass(yr, promotionYear)}`}>
                      <StackedCell
                        realized={stats.realized}
                        forecast={stats.forecast}
                        target={stats.target}
                        unit={metric === 'utilization' ? 'hours' : 'currency'}
                        year={yr}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Scorecard() {
  const { promotionYear, setPromotionYear, qualifyingYear, scorecardYears } = useSettings();
  const scorecard = useScorecardData();
  const [tab, setTab] = useState('overview');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Scorecard</h1>
        <div className="sc-year-picker">
          <label htmlFor="promo-year-select" className="sc-year-picker-label">Partner year</label>
          <select
            id="promo-year-select"
            className="sc-year-select"
            value={promotionYear}
            onChange={e => setPromotionYear(parseInt(e.target.value, 10))}
          >
            {PROMO_OPTIONS.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        </div>
      </div>

      <div className="sc-legend">
        <span className="sc-legend-item sc-legend-item--qual">Qualifying ({qualifyingYear})</span>
        <span className="sc-legend-item sc-legend-item--partner">Partner ({promotionYear})</span>
      </div>

      {/* Desktop: tab bar */}
      <div className="sc-tabs sc-tabs--desktop">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sc-tab ${tab === t.id ? 'sc-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile: dropdown */}
      <div className="sc-tabs--mobile">
        <select
          className="form-input sc-tab-select"
          value={tab}
          onChange={e => setTab(e.target.value)}
        >
          {TABS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {tab === 'overview'      && <ScorecardOverview scorecard={scorecard} scorecardYears={scorecardYears} promotionYear={promotionYear} />}
      {tab === 'targets'       && <TargetsTab        scorecard={scorecard} scorecardYears={scorecardYears} promotionYear={promotionYear} />}
      {tab === 'opportunities' && <OpportunitiesTab  scorecard={scorecard} scorecardYears={scorecardYears} />}
      {tab === 'projects'      && <ProjectsTab       scorecard={scorecard} scorecardYears={scorecardYears} />}
      {tab === 'utilization'   && <UtilizationTab    scorecard={scorecard} scorecardYears={scorecardYears} />}
    </div>
  );
}
