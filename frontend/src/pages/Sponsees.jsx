// Sponsees.jsx — Sponsor view of people who granted sponsor access
// Enhanced with readiness scores, action status, and multi-sponsee overview cards.

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import PeerDashboard from '../components/PeerDashboard.jsx';
import PeerNarrative from '../components/PeerNarrative.jsx';

const STATUS_CONFIG = {
  on_track:        { label: 'On track',        color: '#16a34a', bg: '#f0fdf4' },
  needs_attention: { label: 'Needs attention',  color: '#ca8a04', bg: '#fefce8' },
  at_risk:         { label: 'At risk',          color: '#dc2626', bg: '#fef2f2' },
};

export default function Sponsees() {
  const [sponsees, setSponsees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsee, setSelectedSponsee] = useState(null);
  const [sponseeData, setSponseeData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewTab, setViewTab] = useState('dashboard');

  const loadSponsees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sponsees`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setSponsees(data.sponsees);
    } catch (e) {
      console.warn('Failed to load sponsees:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSponsees(); }, [loadSponsees]);

  async function selectSponsee(sponsee) {
    setSelectedSponsee(sponsee);
    setSponseeData(null);
    setDataLoading(true);
    setViewTab('dashboard');
    try {
      const res = await fetch(`${API_BASE}/api/peers/${sponsee.id}/data`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setSponseeData(data);
    } catch (e) {
      console.warn('Failed to load sponsee data:', e.message);
    } finally {
      setDataLoading(false);
    }
  }

  function goBack() {
    setSelectedSponsee(null);
    setSponseeData(null);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Sponsees</h1></div>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  // Viewing a specific sponsee
  if (selectedSponsee) {
    const TABS = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'narrative', label: 'Narrative + Gaps' },
      { id: 'readiness', label: 'Readiness' },
      { id: 'actions',   label: 'Actions' },
    ];

    return (
      <div className="page">
        <div className="peer-viewing-banner">
          <button className="btn-secondary btn-sm" onClick={goBack}>&larr; Back</button>
          <span>Viewing: <strong>{selectedSponsee.name}</strong></span>
          {selectedSponsee.status && (
            <StatusBadge status={selectedSponsee.status} />
          )}
        </div>

        {/* Desktop tabs */}
        <div className="sc-tabs" style={{ marginTop: '0.5rem' }}>
          {TABS.map(t => (
            <button key={t.id} className={`sc-tab ${viewTab === t.id ? 'sc-tab--active' : ''}`}
              onClick={() => setViewTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Mobile select */}
        <select className="mobile-tab-select" value={viewTab}
          onChange={e => setViewTab(e.target.value)}>
          {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {dataLoading && <p className="muted">Loading data...</p>}

        {sponseeData && viewTab === 'dashboard' && (
          <PeerDashboard data={sponseeData.data} peer={sponseeData.peer} />
        )}
        {sponseeData && viewTab === 'narrative' && (
          <PeerNarrative data={sponseeData.data} />
        )}
        {sponseeData && viewTab === 'readiness' && (
          <ReadinessTab data={sponseeData.data} />
        )}
        {sponseeData && viewTab === 'actions' && (
          <ActionsTab data={sponseeData.data} />
        )}
      </div>
    );
  }

  // Sponsee list
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Sponsees</h1>
        <span className="page-count">{sponsees.length} sponsee{sponsees.length !== 1 ? 's' : ''}</span>
      </div>

      {sponsees.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">No one has granted you sponsor access yet.</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Ask a colleague to go to Sharing &rarr; Peer access and grant you sponsor access.
          </p>
        </div>
      ) : (
        <div className="peer-grid">
          {sponsees.map(sponsee => (
            <button key={sponsee.id} className="card peer-card" onClick={() => selectSponsee(sponsee)}
              style={{ textAlign: 'left', cursor: 'pointer' }}>
              <div className="peer-card-name">{sponsee.name}</div>
              {sponsee.company && <div className="peer-card-company">{sponsee.company}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={sponsee.status} />
                {sponsee.readinessScore != null && (
                  <span className="badge" style={{ fontSize: '0.75rem' }}>
                    Readiness: {Math.round(sponsee.readinessScore)}%
                  </span>
                )}
                {sponsee.overdueActions > 0 && (
                  <span className="badge" style={{ fontSize: '0.75rem', background: '#fef2f2', color: '#dc2626' }}>
                    {sponsee.overdueActions} overdue
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.on_track;
  return (
    <span className="badge" style={{ background: config.bg, color: config.color, fontSize: '0.75rem' }}>
      {config.label}
    </span>
  );
}

function ReadinessTab({ data }) {
  const readiness = data?.readiness;
  if (!readiness) {
    return <div className="card" style={{ padding: '1.5rem' }}><p className="muted">No readiness data available.</p></div>;
  }

  const overall = readiness.overall ?? readiness.score ?? null;
  const dimensions = readiness.dimensions ?? readiness.breakdown ?? [];

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header"><h2 className="section-title">Readiness score</h2></div>
        <div className="card" style={{ padding: '1rem' }}>
          {overall != null && (
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {Math.round(overall)}%
              <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400, marginLeft: '0.5rem' }}>overall readiness</span>
            </div>
          )}
          {Array.isArray(dimensions) && dimensions.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {dimensions.map((d, i) => (
                <div key={i} style={{ padding: '0.5rem', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: '0.375rem' }}>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>{d.label ?? d.name ?? d.key}</div>
                  <div style={{ fontWeight: 600 }}>{d.score != null ? `${Math.round(d.score)}%` : d.value ?? 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ActionsTab({ data }) {
  const actions = data?.actions ?? [];
  if (!actions.length) {
    return <div className="card" style={{ padding: '1.5rem' }}><p className="muted">No action items.</p></div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = actions.filter(a => !a.done && a.dueDate && a.dueDate < today);
  const upcoming = actions.filter(a => !a.done && (!a.dueDate || a.dueDate >= today));
  const done = actions.filter(a => a.done);

  return (
    <div className="tab-content">
      {overdue.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ color: '#dc2626' }}>Overdue ({overdue.length})</h2>
          </div>
          <ActionList items={overdue} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Upcoming ({upcoming.length})</h2>
          </div>
          <ActionList items={upcoming} />
        </section>
      )}

      {done.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ color: '#16a34a' }}>Done ({done.length})</h2>
          </div>
          <ActionList items={done.slice(0, 10)} />
        </section>
      )}
    </div>
  );
}

function ActionList({ items }) {
  return (
    <div className="card">
      {items.map((a, i) => (
        <div key={a.id || i} style={{ padding: '0.5rem 0.75rem', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ textDecoration: a.done ? 'line-through' : 'none', color: a.done ? 'var(--text-muted)' : 'inherit' }}>
            {a.title}
          </span>
          {a.dueDate && <span className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{a.dueDate}</span>}
        </div>
      ))}
    </div>
  );
}
