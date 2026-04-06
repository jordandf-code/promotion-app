// components/PrivateRoute.jsx
// Wraps a route that requires the user to be logged in.
// While auth state is being restored from localStorage, renders nothing
// (avoids a flash-of-login-page on refresh). Once resolved, redirects to
// /login if not authenticated. If mustChangePassword is set, shows a
// forced password-change overlay before allowing access.

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders } from '../utils/api.js';

export default function PrivateRoute({ children }) {
  const { user, loading, mustChangePassword, clearMustChangePassword } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (mustChangePassword) {
    return <ForcePasswordChange onDone={clearMustChangePassword} />;
  }

  return children;
}

function ForcePasswordChange({ onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentPassword: newPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Promotion Tracker</h1>
        <h2>Password reset required</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Your password was reset by an administrator. Please set a new password to continue.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            New password <span className="auth-hint">(min 8 characters)</span>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
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
            {submitting ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
