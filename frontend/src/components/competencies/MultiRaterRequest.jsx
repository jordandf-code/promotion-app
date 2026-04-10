// MultiRaterRequest.jsx — Request competency assessments from peers/sponsors.

import { useState, useEffect } from 'react';
import { API_BASE, authHeaders } from '../../utils/api.js';

export default function MultiRaterRequest() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);

  // Load existing assessment requests
  useEffect(() => {
    fetch(`${API_BASE}/api/share/feedback-requests`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        // Filter to competency_assessment purpose only
        const compRequests = (d.requests ?? []).filter(r => r.purpose === 'competency_assessment');
        setRequests(compRequests);
      })
      .catch(() => {});
  }, [sent]);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const res = await fetch(`${API_BASE}/api/share/request-competency-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ recipientEmail: email, recipientName: name, message }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      setSent(name);
      setEmail('');
      setName('');
      setMessage('');
    } catch {
      setError('Failed to send request');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSend}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <label>
            Name<span className="form-required">*</span>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Reviewer's name" />
          </label>
          <label>
            Email<span className="form-required">*</span>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="reviewer@company.com" />
          </label>
        </div>
        <label style={{ display: 'block', marginTop: '0.5rem' }}>
          Personal message
          <textarea className="form-input form-textarea" rows={2} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Optional message to include in the email..." />
        </label>
        <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: '0.5rem' }}>
          <button type="submit" className="btn-primary" disabled={sending || !name.trim() || !email.trim()}>
            {sending ? 'Sending...' : 'Send request'}
          </button>
          {sent && <span style={{ color: '#15803d', fontSize: '0.85rem' }}>Sent to {sent}</span>}
          {error && <span className="form-field-error" style={{ fontSize: '0.85rem' }}>{error}</span>}
        </div>
      </form>

      {requests.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Sent requests</p>
          {requests.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <span>{r.reviewer_name} ({r.reviewer_email})</span>
              <span className={`badge ${r.status === 'completed' ? 'badge--success' : r.status === 'expired' ? 'badge--danger' : ''}`} style={{ fontSize: '0.7rem' }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
