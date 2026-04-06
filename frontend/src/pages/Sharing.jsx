// pages/Sharing.jsx
// Owner view: generate share/feedback links, configure what's visible, see feedback inbox.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, authHeaders } from '../utils/api.js';

const DEFAULT_SETTINGS = { showWins: true, showNarrative: true, showScorecard: false };

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
      fetch('/api/share/tokens', { headers: authHeaders() }).then(r => r.json()),
      apiGet('sharing'),
      fetch('/api/share/feedback', { headers: authHeaders() }).then(r => r.json()),
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
      const res  = await fetch('/api/share/reset', { method: 'POST', headers: authHeaders() });
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
