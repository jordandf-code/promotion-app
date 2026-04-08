// pages/FeedbackForm.jsx
// Reviewer feedback form — accessible at /feedback/:token, no auth required.
// Supports both legacy (single rating) and structured 360 (5 dimensions) feedback.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../utils/api.js';

const DIMENSIONS = [
  { key: 'strategic_thinking',       label: 'Strategic thinking',       desc: 'Ability to see the big picture, anticipate trends, and make sound long-term decisions' },
  { key: 'executive_presence',       label: 'Executive presence',       desc: 'Confidence, communication clarity, and ability to command a room' },
  { key: 'collaboration_influence',  label: 'Collaboration & influence', desc: 'Builds consensus, works across teams, and persuades without authority' },
  { key: 'delivery_excellence',      label: 'Delivery excellence',      desc: 'Consistently delivers high-quality results on time and within scope' },
  { key: 'growth_mindset',           label: 'Growth mindset',           desc: 'Seeks feedback, adapts to change, and continuously develops new skills' },
];

const RATING_LABELS = ['', 'Significant gap', 'Developing', 'Competent', 'Strong', 'Exceptional'];

export default function FeedbackForm() {
  const { token } = useParams();
  const [ownerName, setOwnerName] = useState('');
  const [tokenType, setTokenType] = useState('legacy');
  const [infoState, setInfoState] = useState('loading');

  const [reviewer, setReviewer] = useState('');
  const [dimensions, setDimensions] = useState(
    DIMENSIONS.map(d => ({ ...d, rating: 0, comment: '' }))
  );
  const [comments, setComments] = useState('');
  const [hovered, setHovered] = useState({}); // { dimKey: n }

  // Legacy fallback
  const [legacyRating, setLegacyRating] = useState(0);
  const [legacyHovered, setLegacyHovered] = useState(0);

  const [submitState, setSubmitState] = useState('idle');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/share/feedback-info/${token}`)
      .then(res => {
        if (res.status === 404 || res.status === 410) { setInfoState('notfound'); return null; }
        if (!res.ok) { setInfoState('error'); return null; }
        return res.json();
      })
      .then(d => {
        if (d) {
          setOwnerName(d.owner.name);
          setTokenType(d.tokenType || 'legacy');
          if (d.reviewerName) setReviewer(d.reviewerName);
          setInfoState('ok');
        }
      })
      .catch(() => setInfoState('error'));
  }, [token]);

  function setDimRating(key, rating) {
    setDimensions(prev => prev.map(d => d.key === key ? { ...d, rating } : d));
  }

  function setDimComment(key, comment) {
    setDimensions(prev => prev.map(d => d.key === key ? { ...d, comment } : d));
  }

  const allRated = dimensions.every(d => d.rating > 0);

  async function handleSubmit(e) {
    e.preventDefault();

    const isStructured = tokenType === 'review_token';
    if (isStructured && !allRated) return;
    if (!isStructured && !legacyRating) return;

    setSubmitState('submitting');
    setSubmitError('');

    const body = isStructured
      ? {
          reviewer,
          dimensions: dimensions.map(d => ({
            key: d.key,
            label: d.label,
            rating: d.rating,
            comment: d.comment.trim() || null,
          })),
          comments: comments.trim() || null,
        }
      : { reviewer, rating: legacyRating, comments: comments.trim() || null };

    try {
      const res = await fetch(`${API_BASE}/api/share/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || 'Submission failed'); setSubmitState('error'); return; }
      setSubmitState('done');
    } catch {
      setSubmitError('Could not reach the server — please try again.');
      setSubmitState('error');
    }
  }

  if (infoState === 'loading')  return <FeedbackShell><p className="public-loading">Loading…</p></FeedbackShell>;
  if (infoState === 'notfound') return <FeedbackShell><p className="public-error">This feedback link is no longer active.</p></FeedbackShell>;
  if (infoState === 'error')    return <FeedbackShell><p className="public-error">Something went wrong — please try again.</p></FeedbackShell>;

  if (submitState === 'done') {
    return (
      <FeedbackShell>
        <div className="feedback-thanks">
          <div className="feedback-thanks-icon">✓</div>
          <h2>Thank you for your feedback</h2>
          <p>Your input has been submitted and will help {ownerName} build their promotion case.</p>
        </div>
      </FeedbackShell>
    );
  }

  const isStructured = tokenType === 'review_token';

  return (
    <FeedbackShell>
      <div className="feedback-form-header">
        <p className="feedback-form-label">360 feedback for</p>
        <h1 className="feedback-form-name">{ownerName}</h1>
        <p className="feedback-form-desc">
          {isStructured
            ? 'Please rate this person across 5 dimensions. Your feedback is confidential and shared only with them.'
            : 'You\'ve been asked to share your perspective on this person\'s readiness for promotion. Your feedback is shared only with them.'}
        </p>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <label>
          Your name<span className="form-required">*</span>
          <input className="form-input" value={reviewer} required
            onChange={e => setReviewer(e.target.value)} placeholder="Name and title" autoFocus />
        </label>

        {isStructured ? (
          /* ── Structured 360: 5 dimensions ── */
          <div className="feedback-dimensions">
            {dimensions.map(dim => {
              const activeRating = hovered[dim.key] || dim.rating;
              return (
                <div key={dim.key} className="feedback-dimension">
                  <div className="feedback-dimension-header">
                    <span className="feedback-dimension-label">{dim.label}<span className="form-required">*</span></span>
                    <span className="feedback-dimension-desc">{dim.desc}</span>
                  </div>
                  <div className="feedback-stars" onMouseLeave={() => setHovered(h => ({ ...h, [dim.key]: 0 }))}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`feedback-star ${n <= activeRating ? 'feedback-star--active' : ''}`}
                        onMouseEnter={() => setHovered(h => ({ ...h, [dim.key]: n }))}
                        onClick={() => setDimRating(dim.key, n)}
                        aria-label={`${n} star${n > 1 ? 's' : ''} — ${RATING_LABELS[n]}`}
                      >
                        ★
                      </button>
                    ))}
                    {activeRating > 0 && (
                      <span className="feedback-rating-desc">{RATING_LABELS[activeRating]}</span>
                    )}
                  </div>
                  <textarea
                    className="form-input form-textarea feedback-dimension-comment"
                    rows={2}
                    value={dim.comment}
                    onChange={e => setDimComment(dim.key, e.target.value)}
                    placeholder="Optional: specific examples or observations"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Legacy: single overall rating ── */
          <div className="feedback-rating-field">
            <span className="feedback-rating-label">Overall readiness rating<span className="form-required">*</span></span>
            <div className="feedback-stars" onMouseLeave={() => setLegacyHovered(0)}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`feedback-star ${n <= (legacyHovered || legacyRating) ? 'feedback-star--active' : ''}`}
                  onMouseEnter={() => setLegacyHovered(n)}
                  onClick={() => setLegacyRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            {(legacyHovered || legacyRating) > 0 && (
              <span className="feedback-rating-desc">
                {['', 'Not yet ready', 'Early stages', 'Making progress', 'Nearly ready', 'Ready now'][legacyHovered || legacyRating]}
              </span>
            )}
          </div>
        )}

        <label>
          Overall comments
          <textarea className="form-input form-textarea" rows={4} value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Any additional observations, themes, or advice?" />
        </label>

        {submitState === 'error' && (
          <p className="form-error">{submitError}</p>
        )}

        <button type="submit" className="btn-primary feedback-submit-btn"
          disabled={!reviewer.trim() || (isStructured ? !allRated : !legacyRating) || submitState === 'submitting'}>
          {submitState === 'submitting' ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </FeedbackShell>
  );
}

function FeedbackShell({ children }) {
  return (
    <div className="public-page">
      <div className="public-container public-container--narrow">{children}</div>
    </div>
  );
}
