// components/scorecard/StackedCell.jsx
// Scorecard overview cell — same visual style as the dashboard ScorecardTable.
// Shows: status dot + label (left) · value (right), forecast line, target line.

import { useSettings } from '../../context/SettingsContext.jsx';

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1; // 1-indexed

// ── Status logic ──────────────────────────────────────────────────────────────

function deriveStatus(realized, projected, target, year, statusByProjected) {
  if (target === null) return 'no-target';
  if (realized >= target) return 'achieved';

  const isPastYear = year < CURRENT_YEAR;
  if (isPastYear) return 'missed';

  if (statusByProjected) {
    if (projected >= target)        return 'on-track';
    if (projected >= target * 0.8)  return 'at-risk';
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function StackedCell({ realized, forecast, target, unit = 'currency', year = CURRENT_YEAR }) {
  const { fmtCurrency } = useSettings();

  const projected         = realized + (forecast ?? 0);
  const isUtil            = unit === 'hours';
  const statusByProjected = isUtil;
  const status            = deriveStatus(realized, projected, target, year, statusByProjected);
  const statusCfg         = STATUS_CONFIG[status];

  const fmt = v => isUtil
    ? `${Math.round(v).toLocaleString()}h`
    : fmtCurrency(v);

  const actualPct   = target ? Math.round((realized   / target) * 100) : null;
  const forecastPct = target ? Math.round((projected  / target) * 100) : null;
  const hasForecast = (forecast ?? 0) > 0 && target;

  return (
    <div className="sc-cell">
      {/* Status dot + label left · value right */}
      <div className="sc-top-row">
        <span className="sc-status" style={{ color: statusCfg.color }}>
          <span className="sc-status-dot" style={{ background: statusCfg.color }} />
          {statusCfg.label}
        </span>
        <span className="sc-actual">
          {fmt(realized)}
          {isUtil && actualPct !== null && (
            <span className="sc-util-pct"> ({actualPct}%)</span>
          )}
        </span>
      </div>

      {/* Forecast line */}
      {hasForecast && (
        <div className="sc-forecast-line">
          fcst {fmt(projected)}
          {forecastPct !== null && (
            <span className="sc-forecast-pct" style={{ color: pctColor(forecastPct) }}>
              {' '}({forecastPct}%)
            </span>
          )}
        </div>
      )}

      {/* Target */}
      {target !== null
        ? <div className="sc-target">target {fmt(target)}</div>
        : <div className="sc-target sc-target--none">—</div>
      }
    </div>
  );
}
