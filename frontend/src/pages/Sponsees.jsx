// Sponsees.jsx — Sponsor view of people who granted sponsor access

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import PeerDashboard from '../components/PeerDashboard.jsx';
import PeerNarrative from '../components/PeerNarrative.jsx';

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
        <p className="muted">Loading…</p>
      </div>
    );
  }

  // Viewing a specific sponsee
  if (selectedSponsee) {
    return (
      <div className="page">
        <div className="peer-viewing-banner">
          <button className="btn-secondary btn-sm" onClick={goBack}>&larr; Back</button>
          <span>Viewing: <strong>{selectedSponsee.name}</strong></span>
        </div>

        <div className="sc-tabs" style={{ marginTop: '0.5rem' }}>
          <button className={`sc-tab ${viewTab === 'dashboard' ? 'sc-tab--active' : ''}`}
            onClick={() => setViewTab('dashboard')}>Dashboard</button>
          <button className={`sc-tab ${viewTab === 'narrative' ? 'sc-tab--active' : ''}`}
            onClick={() => setViewTab('narrative')}>Narrative + Gaps</button>
        </div>

        {dataLoading && <p className="muted">Loading data…</p>}

        {sponseeData && viewTab === 'dashboard' && (
          <PeerDashboard data={sponseeData.data} peer={sponseeData.peer} />
        )}
        {sponseeData && viewTab === 'narrative' && (
          <PeerNarrative data={sponseeData.data} />
        )}
      </div>
    );
  }

  // Sponsee list
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Sponsees</h1>
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
            <button key={sponsee.id} className="card peer-card" onClick={() => selectSponsee(sponsee)}>
              <div className="peer-card-name">{sponsee.name}</div>
              {sponsee.company && <div className="peer-card-company">{sponsee.company}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
