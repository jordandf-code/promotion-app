// components/scorecard/UtilizationTab.jsx
// Monthly actual and forecast hours per year, with auto-calculated projection.

import { useState } from 'react';
import { MONTH_KEYS, MONTH_LABELS } from '../../hooks/useScorecardData.js';

export default function UtilizationTab({ scorecard, scorecardYears }) {
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return scorecardYears.includes(currentYear) ? currentYear : scorecardYears[0];
  });

  const stats  = scorecard.getUtilStats(selectedYear);
  const util   = scorecard.utilization[selectedYear] ?? { months: {} };
  const months = util.months ?? {};
  const target = stats.target;
  const [targetInput, setTargetInput] = useState(target ?? '');

  function saveTarget(value) {
    scorecard.setTarget(selectedYear, 'utilization', value);
  }

  function handleYearChange(year) {
    setSelectedYear(year);
    setTargetInput(scorecard.getTarget(year, 'utilization') ?? '');
  }

  return (
    <div className="tab-content">
      <div className="util-tab-header">
        <div className="tab-filters">
          {scorecardYears.map(yr => (
            <button
              key={yr}
              className={`year-btn ${selectedYear === yr ? 'year-btn--active' : ''}`}
              onClick={() => handleYearChange(yr)}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      <div className="util-tab-body">
        <div className="util-target-row">
          <label className="util-target-label">Annual target (hours)</label>
          <div className="util-target-input-row">
            <input
              className="form-input util-target-input"
              type="number"
              min="0"
              inputMode="numeric"
              value={targetInput}
              placeholder="e.g. 1820"
              onChange={e => setTargetInput(e.target.value)}
              onBlur={() => saveTarget(targetInput)}
              onKeyDown={e => e.key === 'Enter' && saveTarget(targetInput)}
            />
            {targetInput !== '' && (
              <span className="util-target-hint">{Number(targetInput).toLocaleString()} hrs</span>
            )}
          </div>
        </div>

        <div className="util-layout">
          <div className="util-grid-wrap">
            <table className="util-grid-table">
              <thead>
                <tr>
                  <th className="util-th">Month</th>
                  <th className="util-th util-th--right">Actual hrs</th>
                  <th className="util-th util-th--right">Forecast hrs</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_KEYS.map((key, i) => {
                  const month = months[key] ?? {};
                  const hasActual = month.actual !== '' && month.actual != null;
                  return (
                    <tr key={key} className={hasActual ? 'util-row--has-actual' : ''}>
                      <td className="util-td-month">{MONTH_LABELS[i]}</td>
                      <td className="util-td-num">
                        <input
                          className="util-input"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="—"
                          value={month.actual ?? ''}
                          onChange={e => scorecard.setMonthField(selectedYear, key, 'actual', e.target.value)}
                        />
                      </td>
                      <td className="util-td-num">
                        <input
                          className="util-input"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="—"
                          value={month.forecast ?? ''}
                          onChange={e => scorecard.setMonthField(selectedYear, key, 'forecast', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="util-stats-panel">
            <div className="util-stat-card">
              <div className="util-stat-label">Hours to date</div>
              <div className="util-stat-big">{stats.hoursToDate.toLocaleString()}</div>
              <div className="util-stat-sub">from actuals entered</div>
            </div>

            <div className="util-stat-card">
              <div className="util-stat-label">Full-year projection</div>
              <div className="util-stat-big">{stats.projection.toLocaleString()}</div>
              <div className="util-stat-sub">actuals + forecasts</div>
            </div>

            {target && (
              <>
                <div className="util-stat-card">
                  <div className="util-stat-label">Annual target</div>
                  <div className="util-stat-big">{Number(target).toLocaleString()}</div>
                  <div className="util-stat-sub">hours</div>
                </div>

                <div className="util-stat-card util-stat-card--pct">
                  <div className="util-stat-label">Progress</div>
                  <div className={`util-stat-pct ${
                    stats.pct >= 100 ? 'util-pct--achieved' :
                    stats.pct >= 65  ? 'util-pct--ok' : 'util-pct--low'
                  }`}>
                    {stats.pct ?? 0}%
                  </div>
                  <div className="util-progress-bar">
                    <div className="util-progress-fill" style={{ width: `${Math.min(stats.pct ?? 0, 100)}%` }} />
                  </div>
                  <div className="util-stat-sub">of annual target</div>
                </div>
              </>
            )}

            <p className="util-note">
              Actual hours override forecasts in the projection. Enter actuals for completed months, forecasts for the rest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
