// components/dashboard/SnapshotMetric.jsx
// Single scorecard metric card for the Dashboard qualifying-year snapshot.

import { useSettings } from '../../context/SettingsContext.jsx';


function deriveProgressClass(pct) {
  if (pct >= 100) return 'progress-fill--done';
  if (pct >= 60)  return 'progress-fill--ok';
  return 'progress-fill--low';
}

export default function SnapshotMetric({ label, realized, forecast, target, unit }) {
  const { fmtCurrency } = useSettings();
  const formatValue = (value) => unit === 'hours' ? `${value.toLocaleString()} hrs` : fmtCurrency(value);
  const total  = realized + forecast;
  const rPct   = target ? Math.min((realized / target) * 100, 100) : 0;
  const fPct   = target ? Math.min(((realized + forecast) / target) * 100, 100) - rPct : 0;
  const totPct = target ? Math.round((total / target) * 100) : null;

  return (
    <div className="snapshot-metric">
      <div className="snapshot-label">{label}</div>
      <div className="snapshot-values">
        <span className="snapshot-actual">{formatValue(realized, unit)}</span>
        {forecast > 0 && (
          <span className="snapshot-forecast"> +{formatValue(forecast, unit)} fcst</span>
        )}
        {target != null && (
          <>
            <span className="snapshot-of"> / </span>
            <span className="snapshot-target">{formatValue(target, unit)}</span>
          </>
        )}
      </div>
      {target != null && (
        <>
          <div className="progress-bar">
            <div className={`progress-fill ${deriveProgressClass(totPct ?? 0)}`} style={{ width: `${rPct}%` }} />
            <div className="progress-fill progress-fill--forecast" style={{ width: `${fPct}%` }} />
          </div>
          {totPct !== null && <div className="snapshot-pct">{totPct}%</div>}
        </>
      )}
    </div>
  );
}
