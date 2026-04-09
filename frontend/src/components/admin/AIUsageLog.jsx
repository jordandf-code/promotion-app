// components/admin/AIUsageLog.jsx
// Displays AI API usage stats: total tokens, cost estimate, by-endpoint breakdown, recent calls.

import { useState, useEffect } from 'react';
import { API_BASE, authHeaders } from '../../utils/api.js';

function fmt(n) { return n.toLocaleString(); }

const ENDPOINT_LABELS = {
  'generate-story:gap_analysis':       'Gap analysis',
  'generate-story:polished_narrative': 'Polished narrative',
  'generate-story:plan_2027':          '2027 plan',
  'suggest-goals':                     'Suggest goals',
  'suggest-impact':                    'Suggest impact',
  'synthesize-feedback':               'Feedback synthesis',
  'enhance-win':                       'Enhance win',
  'reflection-synthesis':              'Reflection synthesis',
};

export default function AIUsageLog() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/ai/usage?days=${days}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="muted">Loading usage data...</p>;
  if (!data) return <p className="muted">Could not load usage data.</p>;

  const { summary, byEndpoint, recentCalls } = data;

  if (summary.totalCalls === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p className="muted">No AI calls recorded yet. Usage will appear here after you use AI features.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.8rem' }}>Period:</span>
        {[7, 30, 90].map(d => (
          <button key={d} type="button"
            className={`sc-tab ${days === d ? 'sc-tab--active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => setDays(d)}>
            {d}d
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
          <div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Total calls</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{fmt(summary.totalCalls)}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Input tokens</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{fmt(summary.totalInputTokens)}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Output tokens</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{fmt(summary.totalOutputTokens)}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Est. cost</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${summary.estimatedCostUsd.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* By endpoint */}
      {byEndpoint.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>By endpoint</p>
          <div style={{ fontSize: '0.8rem' }}>
            {byEndpoint.map(e => (
              <div key={e.endpoint} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{ENDPOINT_LABELS[e.endpoint] ?? e.endpoint}</span>
                <span className="muted">{e.calls} calls · {fmt(e.input_tokens + e.output_tokens)} tokens</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <div className="card" style={{ padding: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Recent calls</p>
          <div style={{ fontSize: '0.8rem' }}>
            {recentCalls.map((c, i) => {
              const label = c.narrative_mode
                ? (ENDPOINT_LABELS[`${c.endpoint}:${c.narrative_mode}`] ?? `${c.endpoint}:${c.narrative_mode}`)
                : (ENDPOINT_LABELS[c.endpoint] ?? c.endpoint);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span>{label}</span>
                  <span className="muted">
                    {fmt(c.input_tokens)}+{fmt(c.output_tokens)} tokens
                    {c.response_time_ms != null && ` · ${(c.response_time_ms / 1000).toFixed(1)}s`}
                    {' · '}{new Date(c.called_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
