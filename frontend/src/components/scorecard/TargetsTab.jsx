// components/scorecard/TargetsTab.jsx
// Editable targets table — one row per metric, one column per scorecard year.

import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { METRIC_KEYS, METRIC_LABELS } from '../../hooks/useScorecardData.js';

const CURRENT_YEAR = new Date().getFullYear();

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

const METRIC_UNIT = {
  sales:       'currency',
  revenue:     'currency',
  grossProfit: 'currency',
  utilization: 'hours',
};

function yearColumnClass(year, promotionYear) {
  if (year === promotionYear - 1) return 'sc-th--qual';
  if (year === promotionYear)     return 'sc-th--partner';
  if (year === CURRENT_YEAR)      return 'sc-th--current';
  if (year >  CURRENT_YEAR)      return 'sc-th--future';
  return '';
}

function yearCellClass(year, promotionYear) {
  if (year === promotionYear - 1) return 'sc-td--qual';
  if (year === promotionYear)     return 'sc-td--partner';
  if (year === CURRENT_YEAR)      return 'sc-td--current';
  if (year >  CURRENT_YEAR)      return 'sc-td--future';
  return '';
}

function TargetCell({ value, unit, onSave }) {
  const { fmtCurrency, currencySymbol, toInputValue, fromInputValue } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');

  function startEdit() {
    setDraft(unit === 'currency' ? toInputValue(value) : (value != null ? String(value) : ''));
    setEditing(true);
  }

  function commit() {
    const stored = unit === 'currency' ? fromInputValue(draft) : (draft === '' ? null : Number(draft));
    onSave(stored);
    setEditing(false);
  }

  function display() {
    if (value == null) return <span className="targets-cell-empty">—</span>;
    return unit === 'hours'
      ? `${Number(value).toLocaleString()} hrs`
      : fmtCurrency(Number(value));
  }

  if (editing) {
    return (
      <input
        className="targets-cell-input"
        type="number"
        inputMode="decimal"
        autoFocus
        value={draft}
        placeholder={unit === 'hours' ? 'hrs' : currencySymbol}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <button className="targets-cell-btn" onClick={startEdit} title="Click to edit">
      {display()}
    </button>
  );
}

export default function TargetsTab({ scorecard, scorecardYears, promotionYear }) {
  const { currencySymbol } = useSettings();
  const isMobile = useIsMobile();

  const currentIdx = scorecardYears.indexOf(CURRENT_YEAR);
  const [windowStart, setWindowStart] = useState(Math.max(0, currentIdx));

  const windowSize = isMobile ? 1 : scorecardYears.length;
  const visibleYears = isMobile
    ? scorecardYears.slice(windowStart, windowStart + 1)
    : scorecardYears;

  const canGoLeft  = isMobile && windowStart > 0;
  const canGoRight = isMobile && windowStart < scorecardYears.length - 1;

  return (
    <div className="card scorecard-card">
      <p className="targets-hint">
        Click any cell to set a target. Press Enter or click away to save.
      </p>

      {isMobile && (
        <div className="sc-overview-toolbar">
          <button
            className="sc-nav-btn sc-nav-btn--mobile"
            onClick={() => setWindowStart(s => Math.max(0, s - 1))}
            disabled={!canGoLeft}
            title="Earlier year"
          >‹</button>
          <span className="sc-year-current-label">
            {visibleYears[0]}
            {visibleYears[0] === promotionYear - 1 && <span className="sc-year-star"> ★</span>}
          </span>
          <button
            className="sc-nav-btn sc-nav-btn--mobile"
            onClick={() => setWindowStart(s => Math.min(scorecardYears.length - 1, s + 1))}
            disabled={!canGoRight}
            title="Later year"
          >›</button>
        </div>
      )}

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th className="sc-th sc-th--metric">Metric</th>
              {visibleYears.map(yr => (
                <th key={yr} className={`sc-th sc-th--year ${yearColumnClass(yr, promotionYear)}`}>
                  <span className="sc-th-year">{yr}</span>
                  {yr === CURRENT_YEAR && <span className="sc-current-dot" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_KEYS.map(metric => (
              <tr key={metric}>
                <td className="sc-td sc-td--metric">
                  {METRIC_LABELS[metric]}
                  <span className="targets-unit-hint">
                    {METRIC_UNIT[metric] === 'hours' ? ' (hrs)' : ` (${currencySymbol})`}
                  </span>
                </td>
                {visibleYears.map(yr => (
                  <td key={yr} className={`sc-td ${yearCellClass(yr, promotionYear)}`}>
                    <TargetCell
                      value={scorecard.getTarget(yr, metric)}
                      unit={METRIC_UNIT[metric]}
                      onSave={val => scorecard.setTarget(yr, metric, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
