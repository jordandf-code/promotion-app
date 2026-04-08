// pages/Sharing.jsx
// Owner view: sub-tabs for Links (share/feedback links, peer access) and
// Feedback (request tracking, inbox with expandable dimensions, AI synthesis).

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, apiGet, apiPut, authHeaders } from '../utils/api.js';

const DEFAULT_SETTINGS = { showWins: true, showNarrative: true, showScorecard: false, showReadiness: false, showLearning: false, showEminence: false };

const SUBTABS = [
  { id: 'links',    label: 'Links' },
  { id: 'feedback', label: 'Feedback' },
];

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Sharing() {
  const [tokens,   setTokens]   = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [feedback, setFeedback] = useState([]);
  const [requests, setRequests] = useState([]);
  const [synthesis, setSynthesis] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(null);
  const [resetting, setResetting] = useState(false);
  const [subtab, setSubtab] = useState('links');
  const settingsInitialized = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/share/tokens`, { headers: authHeaders() }).then(r => r.json()),
      apiGet('sharing'),
      fetch(`${API_BASE}/api/share/feedback`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API_BASE}/api/share/feedback-requests`, { headers: authHeaders() }).then(r => r.json()).catch(() => ({ requests: [] })),
      apiGet('feedback_synthesis'),
    ]).then(([tokensData, settingsData, feedbackData, requestsData, synthesisData]) => {
      setTokens({ shareToken: tokensData.shareToken, feedbackToken: tokensData.feedbackToken });
      if (settingsData) setSettings(settingsData);
      setFeedback(feedbackData.feedback ?? []);
      setRequests(requestsData.requests ?? []);
      if (synthesisData) setSynthesis(synthesisData);
      settingsInitialized.current = true;
      setLoading(false);
    }).catch(() => {
      settingsInitialized.current = true;
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!settingsInitialized.current) return;
    apiPut('sharing', settings);
  }, [settings]);

  function shareUrl()    { return `${window.location.origin}/share/${tokens?.shareToken}`; }
  function feedbackUrl() { return `${window.location.origin}/feedback/${tokens?.feedbackToken}`; }

  function copyLink(type) {
    const url = type === 'share' ? shareUrl() : feedbackUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function resetLinks() {
    if (!window.confirm('Resetting will invalidate your current links — anyone with the old links won\'t be able to access them. Continue?')) return;
    setResetting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/share/reset`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      setTokens({ shareToken: data.shareToken, feedbackToken: data.feedbackToken });
    } finally {
      setResetting(false);
    }
  }

  function toggle(key) {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  }

  if (loading) return <div className="page"><p className="text-muted">Loading…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Sharing</h1>
      </div>

      {/* Desktop: tab bar */}
      <div className="sc-tabs sc-tabs--desktop">
        {SUBTABS.map(t => (
          <button
            key={t.id}
            className={`sc-tab ${subtab === t.id ? 'sc-tab--active' : ''}`}
            onClick={() => setSubtab(t.id)}
          >
            {t.label}
            {t.id === 'feedback' && feedback.length > 0 && (
              <span className="section-count" style={{ marginLeft: '0.4rem' }}>{feedback.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile: dropdown */}
      <div className="sc-tabs--mobile">
        <select
          className="form-input sc-tab-select"
          value={subtab}
          onChange={e => setSubtab(e.target.value)}
        >
          {SUBTABS.map(t => (
            <option key={t.id} value={t.id}>{t.label}{t.id === 'feedback' && feedback.length > 0 ? ` (${feedback.length})` : ''}</option>
          ))}
        </select>
      </div>

      {subtab === 'links' && (
        <LinksTab
          settings={settings}
          tokens={tokens}
          copied={copied}
          resetting={resetting}
          shareUrl={shareUrl}
          feedbackUrl={feedbackUrl}
          onCopyLink={copyLink}
          onResetLinks={resetLinks}
          onToggle={toggle}
        />
      )}

      {subtab === 'feedback' && (
        <FeedbackTab
          feedback={feedback}
          requests={requests}
          synthesis={synthesis}
          onSynthesisUpdate={setSynthesis}
        />
      )}
    </div>
  );
}

// ── Links sub-tab ───────────────────────────────────────────────────────────

function LinksTab({ settings, tokens, copied, resetting, shareUrl, feedbackUrl, onCopyLink, onResetLinks, onToggle }) {
  return (
    <>
      {/* ── Share link ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Share your story</h2>
        </div>
        <div className="card sharing-card">
          <p className="admin-description">
            Send this read-only link to sponsors or decision-makers. They can see your wins,
            narrative, and scorecard — nothing else is exposed.
          </p>

          <div className="sharing-toggles">
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showWins} onChange={() => onToggle('showWins')} />
              Show wins
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showNarrative} onChange={() => onToggle('showNarrative')} />
              Show narrative
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showScorecard} onChange={() => onToggle('showScorecard')} />
              Show scorecard summary
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showReadiness} onChange={() => onToggle('showReadiness')} />
              Show readiness score
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showLearning} onChange={() => onToggle('showLearning')} />
              Show certifications
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showEminence} onChange={() => onToggle('showEminence')} />
              Show eminence (external only)
            </label>
          </div>

          <div className="sharing-link-row">
            <input className="form-input sharing-link-input" readOnly value={shareUrl()} />
            <button className="btn-secondary" onClick={() => onCopyLink('share')}>
              {copied === 'share' ? 'Copied!' : 'Copy link'}
            </button>
            <a className="btn-secondary" href={shareUrl()} target="_blank" rel="noreferrer">
              Preview
            </a>
          </div>
        </div>
      </section>

      {/* ── Feedback link ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Collect feedback</h2>
        </div>
        <div className="card sharing-card">
          <p className="admin-description">
            Share this link for anonymous feedback. For structured 360 feedback, use the
            "Request feedback" button on People cards — it sends a personalized email with a
            unique link and tracks responses.
          </p>
          <div className="sharing-link-row">
            <input className="form-input sharing-link-input" readOnly value={feedbackUrl()} />
            <button className="btn-secondary" onClick={() => onCopyLink('feedback')}>
              {copied === 'feedback' ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Reset ── */}
      <div className="sharing-reset-row">
        <button className="btn-danger-ghost" onClick={onResetLinks} disabled={resetting}>
          {resetting ? 'Resetting…' : 'Reset all links'}
        </button>
        <span className="admin-description" style={{ margin: 0 }}>
          Invalidates both links and generates new ones.
        </span>
      </div>

      {/* ── Peer access ── */}
      <PeerAccessSection />
    </>
  );
}

// ── Feedback sub-tab ────────────────────────────────────────────────────────

function FeedbackTab({ feedback, requests, synthesis, onSynthesisUpdate }) {
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState('');

  const structuredCount = feedback.filter(f => f.dimensions).length;

  async function runSynthesis() {
    setSynthesizing(true);
    setSynthError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/synthesize-feedback`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Synthesis failed');
      onSynthesisUpdate(data.data);
    } catch (err) {
      setSynthError(err.message);
    } finally {
      setSynthesizing(false);
    }
  }

  return (
    <>
      {/* ── Request tracking ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Feedback requests</h2>
          <span className="section-count">{requests.length}</span>
        </div>
        <div className="card">
          {requests.length === 0 ? (
            <p className="empty-state">No feedback requests sent yet. Use the "Feedback" button on People cards to send structured 360 feedback requests.</p>
          ) : (
            <div className="feedback-requests">
              {requests.map(r => (
                <div key={r.id} className="feedback-request-item">
                  <span className="feedback-request-name">{r.reviewerName}</span>
                  <span className="feedback-request-email">{r.reviewerEmail}</span>
                  <span className={`feedback-request-status feedback-request-status--${r.status}`}>
                    {r.status}
                  </span>
                  <span className="feedback-request-date">{fmtDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Feedback inbox ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Feedback received</h2>
          <span className="section-count">{feedback.length}</span>
        </div>
        <div className="card">
          {feedback.length === 0 ? (
            <p className="empty-state">No feedback yet — share the feedback link or send requests to get started.</p>
          ) : (
            <>
              {structuredCount > 0 && (
                <DimensionSummaryBar feedback={feedback.filter(f => f.dimensions)} />
              )}
              <div className="feedback-inbox">
                {feedback.map(f => (
                  <FeedbackInboxItem key={f.id} item={f} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── AI Synthesis ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">AI Synthesis</h2>
        </div>
        <div className="card">
          {structuredCount < 1 ? (
            <p className="empty-state">Need at least 1 structured feedback response to synthesize. Send feedback requests from the People tab.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="btn-primary btn-ai" onClick={runSynthesis} disabled={synthesizing}>
                  {synthesizing ? 'Synthesizing...' : synthesis ? 'Refresh synthesis' : 'Synthesize feedback'}
                </button>
                {synthesis && <span className="text-muted" style={{ fontSize: '0.8rem' }}>{structuredCount} response{structuredCount !== 1 ? 's' : ''} analyzed</span>}
              </div>
              {synthError && <p className="form-error" style={{ marginBottom: '0.75rem' }}>{synthError}</p>}
              {synthesis && <SynthesisDisplay data={synthesis} />}
            </>
          )}
        </div>
      </section>
    </>
  );
}

// ── Dimension summary bar ──────────────────────────────────────────────────

function DimensionSummaryBar({ feedback }) {
  const dimTotals = {};
  const dimCounts = {};
  for (const f of feedback) {
    if (!Array.isArray(f.dimensions)) continue;
    for (const d of f.dimensions) {
      dimTotals[d.key] = (dimTotals[d.key] || 0) + d.rating;
      dimCounts[d.key] = (dimCounts[d.key] || 0) + 1;
    }
  }
  const dims = Object.entries(dimTotals).map(([key, total]) => ({
    key,
    label: feedback.flatMap(f => f.dimensions || []).find(d => d.key === key)?.label || key,
    avg: (total / dimCounts[key]).toFixed(1),
  }));
  if (!dims.length) return null;

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem 0', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'center' }}>Averages:</span>
      {dims.map(d => (
        <span key={d.key} style={{ fontSize: '0.8rem', background: 'var(--surface, #f8f9fa)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          {d.label}: <strong style={{ color: '#f59e0b' }}>{d.avg}</strong>
        </span>
      ))}
    </div>
  );
}

// ── Feedback inbox item (expandable for structured) ─────────────────────────

function FeedbackInboxItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const isStructured = Array.isArray(item.dimensions) && item.dimensions.length > 0;

  return (
    <div className={`feedback-inbox-item ${isStructured ? 'feedback-inbox-item--expandable' : ''}`}
      onClick={isStructured ? () => setExpanded(e => !e) : undefined}>
      <div className="feedback-inbox-header">
        <span className="feedback-inbox-reviewer">{item.reviewer}</span>
        <span className="feedback-inbox-stars">{stars(item.rating)}</span>
        {isStructured && (
          <span className="feedback-inbox-toggle">{expanded ? '▾' : '▸'} 5 dimensions</span>
        )}
        <span className="feedback-inbox-date">{fmtDate(item.submitted_at)}</span>
      </div>
      {item.comments && <p className="feedback-inbox-comments">{item.comments}</p>}
      {expanded && isStructured && (
        <div className="feedback-inbox-dimensions">
          {item.dimensions.map(d => (
            <div key={d.key} className="feedback-inbox-dim">
              <span className="feedback-inbox-dim-label">{d.label}</span>
              <span className="feedback-inbox-dim-stars">{stars(d.rating)}</span>
              {d.comment && <span className="feedback-inbox-dim-comment">{d.comment}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Synthesis display ───────────────────────────────────────────────────────

function SynthesisDisplay({ data }) {
  return (
    <div className="feedback-synthesis">
      {/* Per-dimension cards */}
      {Array.isArray(data.dimensions) && data.dimensions.length > 0 && (
        <div className="feedback-synthesis-dims">
          {data.dimensions.map(d => (
            <div key={d.key} className="feedback-synthesis-dim">
              <div className="feedback-synthesis-dim-header">
                <span className="feedback-synthesis-dim-label">{d.label}</span>
                <span className="feedback-synthesis-dim-rating">{d.avgRating?.toFixed?.(1) || d.avgRating}/5</span>
              </div>
              {d.theme && <p className="feedback-synthesis-dim-theme">{d.theme}</p>}
              {d.quote && <p className="feedback-synthesis-dim-quote">"{d.quote}"</p>}
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {Array.isArray(data.strengths) && data.strengths.length > 0 && (
        <div className="feedback-synthesis-section">
          <h4>Top strengths</h4>
          <ul>
            {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Development areas */}
      {Array.isArray(data.developmentAreas) && data.developmentAreas.length > 0 && (
        <div className="feedback-synthesis-section">
          <h4>Development areas</h4>
          <ul>
            {data.developmentAreas.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
        <div className="feedback-synthesis-section">
          <h4>Recommendations</h4>
          <ul>
            {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Peer access section ─────────────────────────────────────────────────────

function PeerAccessSection() {
  const [granted, setGranted] = useState([]);
  const [email, setEmail] = useState('');
  const [relType, setRelType] = useState('peer');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const loadGranted = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/access/granted`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setGranted(data.users);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGranted(); }, [loadGranted]);

  async function grantAccess(e) {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/access/grant`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: email.trim(), relationshipType: relType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmail('');
      setRelType('peer');
      setMsg('Access granted');
      loadGranted();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function revokeAccess(userId, relationshipType) {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/access/revoke`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, relationshipType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGranted(prev => prev.filter(u => !(u.id === userId && u.relationship_type === relationshipType)));
      setMsg('Access revoked');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Peer &amp; sponsor access</h2>
      </div>
      <div className="card sharing-card">
        <p className="admin-description">
          Grant other users read-only access to your dashboard and narrative.
          Peers see your data via "View others". Sponsors see it via "Sponsees".
        </p>

        {msg && <p className="muted" style={{ marginBottom: '0.5rem' }}>{msg}</p>}

        <form onSubmit={grantAccess} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="User's email address"
            required
            style={{ flex: 1, minWidth: '180px' }}
          />
          <select
            className="form-input"
            value={relType}
            onChange={e => setRelType(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="peer">Peer</option>
            <option value="sponsor">Sponsor</option>
          </select>
          <button className="btn-primary" disabled={saving || !email.trim()}>
            {saving ? 'Granting…' : 'Grant access'}
          </button>
        </form>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : granted.length === 0 ? (
          <p className="muted">No users have been granted access.</p>
        ) : (
          <div className="admin-list">
            {granted.map(u => (
              <div key={`${u.id}-${u.relationship_type}`} className="admin-list-item">
                <div className="admin-list-row">
                  <span className="admin-list-label">
                    {u.name} ({u.email})
                    <span className={`badge badge--${u.relationship_type === 'sponsor' ? 'info' : 'default'}`} style={{ marginLeft: '0.5rem' }}>
                      {u.relationship_type}
                    </span>
                  </span>
                  <button className="admin-list-btn admin-list-btn--danger" onClick={() => revokeAccess(u.id, u.relationship_type)}>
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
