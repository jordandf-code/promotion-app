// Register.jsx — Registration with invite code, security question, and company selection

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Promotion Tracker</h1>
        <h2>Create account</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full name
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
            Email
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
            Password <span className="auth-hint">(min 8 characters)</span>
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

          <label>
            Company <span className="auth-hint">(optional)</span>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="e.g. IBM Canada"
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
          </label>

          <label>
            Security question
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
            Security answer
            <input
              type="text"
              name="securityAnswer"
              value={form.securityAnswer}
              onChange={handleChange}
              required
              autoComplete="off"
            />
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
