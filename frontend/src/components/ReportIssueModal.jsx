// components/ReportIssueModal.jsx
// Modal for submitting bug reports / feature requests to GitHub.

import { useState } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';

const TYPES = [
  { value: 'bug',      label: 'Bug report' },
  { value: 'feature',  label: 'Feature request' },
  { value: 'question', label: 'Question' },
];

export default function ReportIssueModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { issueUrl, issueNumber }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title, description, type, page: window.location.pathname, browser: navigator.userAgent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess({ issueUrl: data.issueUrl, issueNumber: data.issueNumber });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop modal-backdrop--centered">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Report an issue</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div className="modal-form" style={{ textAlign: 'center', padding: '2rem 1.25rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Issue submitted!</p>
            <p className="muted">
              <a href={success.issueUrl} target="_blank" rel="noreferrer">
                #{success.issueNumber} — View on GitHub
              </a>
            </p>
            <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            {error && <p className="auth-error">{error}</p>}

            <label>
              Title<span className="form-required">*</span>
              <input
                className="form-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                required
                autoFocus
              />
            </label>

            <label>
              Type
              <select
                className="form-input"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label>
              Description<span className="form-required">*</span>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                required
                rows={5}
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting || !title.trim() || !description.trim()}>
                {submitting ? 'Submitting…' : 'Submit issue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
