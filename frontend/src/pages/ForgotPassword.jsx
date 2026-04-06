// pages/ForgotPassword.jsx
// Two-step forgot password flow: email → security question → new password.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../utils/api.js';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = email, 2 = answer + new password
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleStep1(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setQuestion(data.question);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep2(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answer, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Promotion Tracker</h1>
          <h2>Password reset</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Your password has been reset successfully.
          </p>
          <p className="auth-switch">
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Promotion Tracker</h1>
        <h2>Forgot password</h2>

        {error && <p className="auth-error">{error}</p>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="auth-form">
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </label>
            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Looking up…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="auth-form">
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Security question:</strong> {question}
            </p>
            <label>
              Your answer
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
            </label>
            <label>
              New password <span className="auth-hint">(min 8 characters)</span>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
