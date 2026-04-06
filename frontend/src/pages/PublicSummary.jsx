// pages/PublicSummary.jsx
// Public read-only view of a user's promotion profile.
// Accessible at /share/:token — no authentication required.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../utils/api.js';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PublicSummary() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'notfound' | 'error'
  const [data,  setData]  = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/share/view/${token}`)
      .then(res => {
        if (res.status === 404) { setState('notfound'); return null; }
        if (!res.ok)            { setState('error');    return null; }
        return res.json();
      })
      .then(d => { if (d) { setData(d); setState('ok'); } })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading')  return <PublicShell><p className="public-loading">Loading…</p></PublicShell>;
  if (state === 'notfound') return <PublicShell><p className="public-error">This share link is no longer active.</p></PublicShell>;
  if (state === 'error')    return <PublicShell><p className="public-error">Something went wrong — please try again.</p></PublicShell>;

  const { owner, wins, narrative, scorecard, readiness } = data;

  return (
    <PublicShell>
      <div className="public-header">
        <h1 className="public-owner">{owner.name}</h1>
        <p className="public-subtitle">IBM Associate Partner — Partner promotion profile</p>
      </div>

      {readiness && (
        <section className="public-section">
          <h2 className="public-section-title">Promotion readiness — {readiness.overall}%</h2>
          <div className="public-readiness-bars">
            {Object.entries(readiness.dimensions).map(([key, dim]) => (
              <div key={key} className="public-readiness-row">
                <span className="public-readiness-label">{dim.label}</span>
                <div className="public-readiness-track">
                  <div className="public-readiness-fill" style={{
                    width: `${dim.score}%`,
                    backgroundColor: dim.score >= 80 ? '#15803d' : dim.score >= 50 ? '#d97706' : '#dc2626'
                  }} />
                </div>
                <span className="public-readiness-pct">{dim.score}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {scorecard && (
        <section className="public-section">
          <h2 className="public-section-title">Scorecard highlights — {scorecard.year}</h2>
          <table className="public-scorecard-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Realized</th>
                <th>Forecast</th>
                <th>Total</th>
                <th>Target</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.rows.map(row => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.realized}</td>
                  <td>{row.forecast}</td>
                  <td><strong>{row.total}</strong></td>
                  <td>{row.target}</td>
                  <td>{row.pct != null ? <span className={`public-scorecard-pct ${row.pct >= 100 ? 'public-scorecard-pct--on' : ''}`}>{row.pct}%</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="public-scorecard-util">
            <span className="public-scorecard-util-label">Utilization</span>
            <span>{scorecard.util.actual + scorecard.util.forecast} hrs total</span>
            {scorecard.util.target && (
              <span className={`public-scorecard-pct ${scorecard.util.pct >= 100 ? 'public-scorecard-pct--on' : ''}`}>
                {scorecard.util.pct}% of {scorecard.util.target} hr target
              </span>
            )}
          </div>
        </section>
      )}

      {narrative && (
        <section className="public-section">
          <h2 className="public-section-title">Promotion narrative</h2>
          <div className="public-narrative">
            {narrative.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      {wins && wins.length > 0 && (
        <section className="public-section">
          <h2 className="public-section-title">Key wins</h2>
          <div className="public-wins">
            {wins.map(win => (
              <div key={win.id} className="public-win-card">
                <div className="public-win-header">
                  <span className="public-win-title">{win.title}</span>
                  <span className="public-win-date">{fmtDate(win.date)}</span>
                </div>
                {win.impact && <p className="public-win-impact">{win.impact}</p>}
                {win.description && <p className="public-win-desc">{win.description}</p>}
                {win.tags?.length > 0 && (
                  <div className="public-win-tags">
                    {win.tags.map(t => <span key={t} className="public-win-tag">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="public-footer">
        <p>Generated by Promotion Tracker</p>
      </footer>
    </PublicShell>
  );
}

function PublicShell({ children }) {
  return (
    <div className="public-page">
      <div className="public-container">{children}</div>
    </div>
  );
}
