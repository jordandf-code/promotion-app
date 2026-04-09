// PeerBenchmark.jsx — Anonymized comparison of readiness scores, scorecard metrics, and activity levels.

import { useState, useEffect } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';

// Box-and-whisker style SVG bar for a single metric
function BenchmarkBar({ metric }) {
  const { min, p25, median, p75, max, userValue } = metric;
  const range = max - min || 1;

  // Normalize positions to 0–300 scale
  const toX = v => ((v - min) / range) * 280 + 10;

  const p25x  = toX(p25);
  const p75x  = toX(p75);
  const medx  = toX(median);
  const userX = toX(Math.min(Math.max(userValue, min), max));

  // Color dot: green if above median, red if below
  const dotColor = userValue >= median ? '#16a34a' : '#dc2626';

  return (
    <svg viewBox="0 0 300 30" width="100%" style={{ display: 'block', maxWidth: 300 }} aria-hidden="true">
      {/* Background track */}
      <rect x="10" y="12" width="280" height="6" rx="3" fill="#e5e7eb" />
      {/* IQR box (25th–75th percentile) */}
      <rect x={p25x} y="9" width={p75x - p25x} height="12" rx="2" fill="#3b82f6" opacity="0.7" />
      {/* Median line */}
      <line x1={medx} y1="7" x2={medx} y2="23" stroke="#1d4ed8" strokeWidth="2" />
      {/* User dot */}
      <circle cx={userX} cy="15" r="6" fill={dotColor} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function MetricCard({ metric }) {
  const unit = metric.unit === '%' ? '%' : '';
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 600 }}>{metric.label}</span>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          You're in the <strong>{metric.userPercentile}th percentile</strong>
          {' '}· Your value: <strong>{metric.userValue}{unit}</strong>
        </span>
      </div>
      <BenchmarkBar metric={metric} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
        <span>{metric.min}{unit} min</span>
        <span>p25: {metric.p25}{unit}</span>
        <span>median: {metric.median}{unit}</span>
        <span>p75: {metric.p75}{unit}</span>
        <span>{metric.max}{unit} max</span>
      </div>
    </div>
  );
}

export default function PeerBenchmark() {
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [optIn, setOptIn]         = useState(true);
  const [savingOpt, setSavingOpt] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_BASE}/api/benchmark`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json);
        // Also load current opt-in setting
        const sRes  = await fetch(`${API_BASE}/api/data/settings`, { headers: authHeaders() });
        const sJson = await sRes.json();
        if (sRes.ok && sJson.data) {
          setOptIn(sJson.data.benchmarkOptOut !== true);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleOptChange(e) {
    const checked = e.target.checked;
    setOptIn(checked);
    setSavingOpt(true);
    try {
      // Load current settings first to merge
      const getRes  = await fetch(`${API_BASE}/api/data/settings`, { headers: authHeaders() });
      const getJson = await getRes.json();
      const current = (getRes.ok && getJson.data) ? getJson.data : {};
      const updated = { ...current, benchmarkOptOut: !checked };
      await fetch(`${API_BASE}/api/data/settings`, {
        method:  'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body:    JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Failed to save benchmark opt setting:', e.message);
    } finally {
      setSavingOpt(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Peer Benchmarking</h1>

      {/* Privacy notice */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#f0f9ff', borderLeft: '4px solid #3b82f6' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
          Your data is anonymized. Benchmarks require at least 5 participants to display.
        </p>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>Loading benchmarks…</div>
      )}

      {error && (
        <div className="card" style={{ color: '#dc2626' }}>Failed to load benchmarks: {error}</div>
      )}

      {!loading && !error && data && (
        <>
          {data.participantCount < 5 ? (
            <div className="card" style={{ color: '#6b7280' }}>
              Not enough participants yet. Benchmarks will appear when 5+ users are active.
              <br />
              <span style={{ fontSize: '0.85rem' }}>Current participants: {data.participantCount}</span>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
                Based on {data.participantCount} anonymized participants
              </div>
              {data.metrics.map(m => (
                <MetricCard key={m.key} metric={m} />
              ))}
            </>
          )}
        </>
      )}

      {/* Opt-out toggle */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={handleOptChange}
            disabled={savingOpt}
          />
          <span>Include my data in benchmarks</span>
          {savingOpt && <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Saving…</span>}
        </label>
      </div>
    </div>
  );
}
