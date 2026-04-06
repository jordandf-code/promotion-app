// pages/FeedbackForm.jsx
// Reviewer feedback form — accessible at /feedback/:token, no auth required.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../utils/api.js';

export default function FeedbackForm() {
  const { token } = useParams();
  const [ownerName, setOwnerName] = useState('');
  const [infoState, setInfoState] = useState('loading'); // 'loading' | 'ok' | 'notfound' | 'error'

  const [reviewer, setReviewer] = useState('');
  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [comments, setComments] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // 'idle' | 'submitting' | 'done' | 'error'
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/share/feedback-info/${token}`)
      .then(res => {
        if (res.status === 404) { setInfoState('notfound'); return null; }
        if (!res.ok)            { setInfoState('error');    return null; }
        return res.json();
      })
      .then(d => { if (d) { setOwnerName(d.owner.name); setInfoState('ok'); } })
      .catch(() => setInfoState('error'));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return;
    setSubmitState('submitting');
    setSubmitError('');
    try {
      const res  = await fetch(`${API_BASE}/api/share/feedback/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewer, rating, comments }),
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
          <p>Your input has been submitted and will help {ownerName} build their Partner case.</p>
        </div>
      </FeedbackShell>
    );
  }

  const activeRating = hovered || rating;

  return (
    <FeedbackShell>
      <div className="feedback-form-header">
        <p className="feedback-form-label">Partner readiness feedback for</p>
        <h1 className="feedback-form-name">{ownerName}</h1>
        <p className="feedback-form-desc">
          You've been asked to share your perspective on this person's readiness for IBM Partner.
          Your feedback is shared only with them.
        </p>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <label>
          Your name
          <input className="form-input" value={reviewer} required
            onChange={e => setReviewer(e.target.value)} placeholder="Name and title" autoFocus />
        </label>

        <div className="feedback-rating-field">
          <span className="feedback-rating-label">
            Overall Partner readiness rating
          </span>
          <div className="feedback-stars"
            onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`feedback-star ${n <= activeRating ? 'feedback-star--active' : ''}`}
                onMouseEnter={() => setHovered(n)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          {activeRating > 0 && (
            <span className="feedback-rating-desc">
              {['', 'Not yet ready', 'Early stages', 'Making progress', 'Nearly ready', 'Ready now'][activeRating]}
            </span>
          )}
        </div>

        <label>
          Comments
          <textarea className="form-input form-textarea" rows={5} value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="What evidence supports your rating? What gaps remain? What would strengthen their case?" />
        </label>

        {submitState === 'error' && (
          <p className="form-error">{submitError}</p>
        )}

        <button type="submit" className="btn-primary"
          disabled={!reviewer.trim() || !rating || submitState === 'submitting'}>
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
