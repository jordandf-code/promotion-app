// pages/Sharing.jsx
// Owner view: generate share/feedback links, configure what's visible, see feedback inbox, peer access.

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, apiGet, apiPut, authHeaders } from '../utils/api.js';

const DEFAULT_SETTINGS = { showWins: true, showNarrative: true, showScorecard: false, showReadiness: false };

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
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(null); // 'share' | 'feedback'
  const [resetting, setResetting] = useState(false);
  const settingsInitialized = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/share/tokens`, { headers: authHeaders() }).then(r => r.json()),
      apiGet('sharing'),
      fetch(`${API_BASE}/api/share/feedback`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([tokensData, settingsData, feedbackData]) => {
      setTokens({ shareToken: tokensData.shareToken, feedbackToken: tokensData.feedbackToken });
      if (settingsData) setSettings(settingsData);
      setFeedback(feedbackData.feedback ?? []);
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

      {/* ── Share link ─────────────────────────────────────────── */}
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
              <input type="checkbox" checked={settings.showWins}
                onChange={() => toggle('showWins')} />
              Show wins
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showNarrative}
                onChange={() => toggle('showNarrative')} />
              Show narrative
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showScorecard}
                onChange={() => toggle('showScorecard')} />
              Show scorecard summary
            </label>
            <label className="sharing-toggle">
              <input type="checkbox" checked={settings.showReadiness}
                onChange={() => toggle('showReadiness')} />
              Show readiness score
            </label>
          </div>

          <div className="sharing-link-row">
            <input className="form-input sharing-link-input" readOnly value={shareUrl()} />
            <button className="btn-secondary" onClick={() => copyLink('share')}>
              {copied === 'share' ? 'Copied!' : 'Copy link'}
            </button>
            <a className="btn-secondary" href={shareUrl()} target="_blank" rel="noreferrer">
              Preview
            </a>
          </div>
        </div>
      </section>

      {/* ── Feedback link ───────────────────────────────────────── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Collect feedback</h2>
        </div>
        <div className="card sharing-card">
          <p className="admin-description">
            Share this link with colleagues, mentors, or clients to collect structured feedback
            on your Partner readiness. Reviewers don't need an account.
          </p>
          <div className="sharing-link-row">
            <input className="form-input sharing-link-input" readOnly value={feedbackUrl()} />
            <button className="btn-secondary" onClick={() => copyLink('feedback')}>
              {copied === 'feedback' ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Reset ───────────────────────────────────────────────── */}
      <div className="sharing-reset-row">
        <button className="btn-danger-ghost" onClick={resetLinks} disabled={resetting}>
          {resetting ? 'Resetting…' : 'Reset all links'}
        </button>
        <span className="admin-description" style={{ margin: 0 }}>
          Invalidates both links and generates new ones.
        </span>
      </div>

      {/* ── Peer access ──────────────────────────────────────────── */}
      <PeerAccessSection />

      {/* ── Feedback inbox ──────────────────────────────────────── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Feedback received</h2>
          <span className="section-count">{feedback.length}</span>
        </div>
        <div className="card">
          {feedback.length === 0 ? (
            <p className="empty-state">No feedback yet — share the feedback link to get started.</p>
          ) : (
            <div className="feedback-inbox">
              {feedback.map(f => (
                <div key={f.id} className="feedback-inbox-item">
                  <div className="feedback-inbox-header">
                    <span className="feedback-inbox-reviewer">{f.reviewer}</span>
                    <span className="feedback-inbox-stars">{stars(f.rating)}</span>
                    <span className="feedback-inbox-date">{fmtDate(f.submitted_at)}</span>
                  </div>
                  {f.comments && <p className="feedback-inbox-comments">{f.comments}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Peer access section ─────────────────────────────────────────────────────

function PeerAccessSection() {
  const [granted, setGranted] = useState([]);
  const [email, setEmail] = useState('');
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
      // First look up user by email to get their ID
      // We'll pass the email to the grant endpoint and let the backend resolve it
      const res = await fetch(`${API_BASE}/api/access/grant`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmail('');
      setMsg('Access granted');
      loadGranted();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function revokeAccess(userId) {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/access/revoke`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGranted(prev => prev.filter(u => u.id !== userId));
      setMsg('Access revoked');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Peer access</h2>
      </div>
      <div className="card sharing-card">
        <p className="admin-description">
          Grant other users read-only access to your dashboard and narrative via the "View others" tab.
          This is separate from the public share link above.
        </p>

        {msg && <p className="muted" style={{ marginBottom: '0.5rem' }}>{msg}</p>}

        <form onSubmit={grantAccess} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="User's email address"
            required
            style={{ flex: 1 }}
          />
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
              <div key={u.id} className="admin-list-item">
                <div className="admin-list-row">
                  <span className="admin-list-label">{u.name} ({u.email})</span>
                  <button className="admin-list-btn admin-list-btn--danger" onClick={() => revokeAccess(u.id)}>
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
