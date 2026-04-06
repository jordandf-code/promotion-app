// components/scorecard/TargetsTab.jsx
// Editable targets table — one row per metric, one column per scorecard year.

import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { METRIC_KEYS, METRIC_LABELS } from '../../hooks/useScorecardData.js';

const CURRENT_YEAR = new Date().getFullYear();

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
  return (
    <div className="card scorecard-card">
      <p className="targets-hint">
        Click any cell to set a target. Press Enter or click away to save.
      </p>
      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th className="sc-th sc-th--metric">Metric</th>
              {scorecardYears.map(yr => (
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
                {scorecardYears.map(yr => (
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
