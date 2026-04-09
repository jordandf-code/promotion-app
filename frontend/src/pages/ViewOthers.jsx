// ViewOthers.jsx — View data shared by peers who granted the user access

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import PeerDashboard from '../components/PeerDashboard.jsx';
import PeerNarrative from '../components/PeerNarrative.jsx';

export default function ViewOthers() {
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeer, setSelectedPeer] = useState(null); // { id, name, company }
  const [peerData, setPeerData] = useState(null);
  const [peerLoading, setPeerLoading] = useState(false);
  const [viewTab, setViewTab] = useState('dashboard');

  const loadPeers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/peers`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setPeers(data.peers);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPeers(); }, [loadPeers]);

  async function selectPeer(peer) {
    setSelectedPeer(peer);
    setPeerData(null);
    setPeerLoading(true);
    setViewTab('dashboard');
    try {
      const res = await fetch(`${API_BASE}/api/peers/${peer.id}/data`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setPeerData(data);
    } catch {
      // silent
    } finally {
      setPeerLoading(false);
    }
  }

  function goBack() {
    setSelectedPeer(null);
    setPeerData(null);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">View others</h1></div>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  // Viewing a specific peer
  if (selectedPeer) {
    return (
      <div className="page">
        <div className="peer-viewing-banner">
          <button className="btn-secondary btn-sm" onClick={goBack}>&larr; Back</button>
          <span>Viewing: <strong>{selectedPeer.name}</strong></span>
        </div>

        <div className="sc-tabs" style={{ marginTop: '0.5rem' }}>
          <button className={`sc-tab ${viewTab === 'dashboard' ? 'sc-tab--active' : ''}`}
            onClick={() => setViewTab('dashboard')}>Dashboard</button>
          <button className={`sc-tab ${viewTab === 'narrative' ? 'sc-tab--active' : ''}`}
            onClick={() => setViewTab('narrative')}>Narrative + Gaps</button>
        </div>

        {peerLoading && <p className="muted">Loading data…</p>}

        {peerData && viewTab === 'dashboard' && (
          <PeerDashboard data={peerData.data} peer={peerData.peer} />
        )}
        {peerData && viewTab === 'narrative' && (
          <PeerNarrative data={peerData.data} />
        )}
      </div>
    );
  }

  // Peer list
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">View others</h1>
      </div>

      {peers.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">No one has granted you access to view their data yet.</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Ask a colleague to go to Sharing &rarr; Peer access and enable viewing for you.
          </p>
        </div>
      ) : (
        <div className="peer-grid">
          {peers.map(peer => (
            <button key={peer.id} className="card peer-card" onClick={() => selectPeer(peer)}>
              <div className="peer-card-name">{peer.name}</div>
              {peer.company && <div className="peer-card-company">{peer.company}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
