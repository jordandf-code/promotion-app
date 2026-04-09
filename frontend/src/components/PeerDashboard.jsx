// components/PeerDashboard.jsx
// Read-only summary of a peer's scorecard and recent wins.

import { useSettings } from '../context/SettingsContext.jsx';

export default function PeerDashboard({ data, peer }) {
  const { fmtCurrency } = useSettings();
  const scorecard = data?.scorecard;
  const wins      = data?.wins;
  const goals     = data?.goals;
  const readiness = data?.readiness;
  const actions   = data?.actions ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = actions.filter(a => !a.done && a.dueDate && a.dueDate < today).length;
  const overallReadiness = readiness?.overall ?? readiness?.score ?? null;

  return (
    <div className="tab-content">
      {/* Key stats strip */}
      {(overallReadiness != null || overdueCount > 0) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {overallReadiness != null && (
            <div className="card" style={{ padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
              <div className="muted" style={{ fontSize: '0.75rem' }}>Readiness</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(overallReadiness)}%</div>
            </div>
          )}
          <div className="card" style={{ padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Overdue actions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: overdueCount > 0 ? '#dc2626' : '#16a34a' }}>{overdueCount}</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Total actions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{actions.length}</div>
          </div>
        </div>
      )}

      {/* Scorecard snapshot */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Scorecard</h2>
        </div>
        {scorecard ? (
          <ScorecardSnapshot scorecard={scorecard} fmtCurrency={fmtCurrency} />
        ) : (
          <div className="card"><p className="muted">No scorecard data available.</p></div>
        )}
      </section>

      {/* Recent wins */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Recent wins</h2>
        </div>
        {wins?.length ? (
          <div className="card">
            {wins.slice(0, 5).map((win, i) => (
              <div key={i} className="peer-win-item">
                <strong>{win.title}</strong>
                {win.date && <span className="muted"> — {win.date}</span>}
                {win.impact && <p className="muted">{win.impact}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><p className="muted">No wins recorded.</p></div>
        )}
      </section>

      {/* Goals summary */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Goals</h2>
        </div>
        {goals?.length ? (
          <div className="card">
            {goals.map((goal, i) => (
              <div key={i} className="peer-win-item">
                <strong>{goal.title}</strong>
                {goal.status && <span className={`badge badge--${goal.status === 'done' ? 'success' : 'default'}`} style={{ marginLeft: '0.5rem' }}>{goal.status}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><p className="muted">No goals set.</p></div>
        )}
      </section>
    </div>
  );
}

function ScorecardSnapshot({ scorecard, fmtCurrency }) {
  // Extract qualifying year data from the scorecard object
  const overview = scorecard?.overview || {};
  const targets  = scorecard?.targets  || {};

  const metrics = [
    { label: 'Signings', value: overview.signingsRealized, target: targets.signings },
    { label: 'Revenue',  value: overview.revenueRealized,  target: targets.revenue  },
    { label: 'Gross profit', value: overview.gpRealized,   target: targets.gp       },
  ].filter(m => m.value != null || m.target != null);

  if (!metrics.length) {
    return <div className="card"><p className="muted">No scorecard data available.</p></div>;
  }

  return (
    <div className="card">
      <div className="peer-scorecard-grid">
        {metrics.map(m => {
          const pct = m.target ? Math.round(((m.value || 0) / m.target) * 100) : null;
          return (
            <div key={m.label} className="peer-scorecard-metric">
              <div className="muted">{m.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {fmtCurrency(m.value || 0)}
              </div>
              {m.target != null && (
                <div className="muted">
                  / {fmtCurrency(m.target)} ({pct}%)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
