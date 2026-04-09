// Register.jsx — Registration with invite code, security question, and company selection

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getPasswordStrength(password) {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (len < 8) return { level: 'weak', label: 'Too short', color: '#ef4444', width: '25%' };
  if (len >= 12 && hasUpper && hasLower && hasNumber && hasSpecial) {
    return { level: 'strong', label: 'Strong', color: '#22c55e', width: '100%' };
  }
  if ((hasUpper || hasNumber) && hasLower) {
    return { level: 'fair', label: 'Fair', color: '#f59e0b', width: '60%' };
  }
  return { level: 'weak', label: 'Weak', color: '#ef4444', width: '33%' };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    inviteCode: '',
    securityQuestion: '',
    securityAnswer: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const strength = getPasswordStrength(form.password);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Promotion Tracker</h1>
        <h2>Create account</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">

          {/* ── Account section ── */}
          <p className="auth-section-label">Account</p>

          <label>
            Full name <span className="form-required">*</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
              autoComplete="name"
            />
          </label>

          <label>
            Email <span className="form-required">*</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password <span className="form-required">*</span>
            <span className="auth-hint"> (min 8 characters)</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {form.password && strength && (
            <div style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: strength.width,
                    background: strength.color,
                    borderRadius: 2,
                    transition: 'width 0.2s, background 0.2s',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>
                {strength.label}
              </span>
            </div>
          )}

          <label>
            Company
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="e.g. IBM Canada"
            />
          </label>

          {/* ── Security section ── */}
          <p className="auth-section-label" style={{ marginTop: '0.5rem' }}>Security</p>

          <label>
            Security question <span className="form-required">*</span>
            <input
              type="text"
              name="securityQuestion"
              value={form.securityQuestion}
              onChange={handleChange}
              required
              placeholder="e.g. What city were you born in?"
              autoComplete="off"
            />
          </label>

          <label>
            Security answer <span className="form-required">*</span>
            <input
              type="text"
              name="securityAnswer"
              value={form.securityAnswer}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </label>

          <label>
            Invite code
            <input
              type="text"
              name="inviteCode"
              value={form.inviteCode}
              onChange={handleChange}
              placeholder="Provided by your admin"
              autoComplete="off"
            />
            <span className="auth-hint">Leave blank if not required</span>
          </label>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
