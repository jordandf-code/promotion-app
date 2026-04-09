// components/WelcomeWizard.jsx
// Post-registration onboarding wizard — shown once on first login.
// Tracks completion via settings.onboardingComplete flag.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext.jsx';

const CURRENT_YEAR = new Date().getFullYear();

export default function WelcomeWizard({ onComplete }) {
  const { user } = useAuth();
  const { currency, setCurrency, setPromotionYear, setOnboardingComplete } = useSettings();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [company, setCompany] = useState(user?.company || '');
  const [qualYear, setQualYear] = useState(CURRENT_YEAR);
  const [localCurrency, setLocalCurrency] = useState(currency || 'CAD');

  function handleDismiss() {
    markComplete();
    onComplete();
  }

  function markComplete() {
    // Update SettingsContext — it handles persistence via its own sync effect
    setCurrency(localCurrency);
    setPromotionYear(qualYear + 1);
    setOnboardingComplete(true);
  }

  function handleStep2Next() {
    // Save settings before moving to step 3
    setStep(3);
  }

  function handleGoToDashboard() {
    markComplete();
    onComplete();
  }

  function handleNavigateTo(path) {
    markComplete();
    onComplete();
    navigate(path);
  }

  const FIRST_STEPS = [
    { label: 'Set your scorecard targets', path: '/scorecard', icon: '📊' },
    { label: 'Add your first goal', path: '/goals', icon: '🎯' },
    { label: 'Log a recent win', path: '/wins', icon: '🏆' },
    { label: 'Set up your API key for AI features', path: '/admin', icon: '🤖' },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {step === 1 && 'Welcome'}
            {step === 2 && 'Quick setup'}
            {step === 3 && "What's next"}
          </h3>
          <button className="modal-close" onClick={handleDismiss} aria-label="Skip onboarding">×</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 1rem', justifyContent: 'center' }}>
          {[1, 2, 3].map(n => (
            <div
              key={n}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                background: n <= step ? 'var(--brand, #2563eb)' : 'var(--border, #e5e7eb)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div className="modal-form" style={{ paddingTop: 0 }}>
          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Welcome to Career Command Center, {user?.name?.split(' ')[0] || 'there'}!
              </h2>
              <p style={{ color: 'var(--text-light, #6b7280)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                Track your path to promotion with scorecards, goals, wins, and AI-powered insights.
              </p>
              <p style={{ color: 'var(--text-light, #6b7280)', lineHeight: 1.6, marginBottom: '2rem' }}>
                Let's set up a few things to get started.
              </p>
              <button className="btn-primary" onClick={() => setStep(2)} style={{ minWidth: 140 }}>
                Get started →
              </button>
            </div>
          )}

          {/* ── Step 2: Quick setup ── */}
          {step === 2 && (
            <>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                Company
                <input
                  className="form-input"
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. IBM Canada"
                  style={{ marginTop: '0.375rem' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                Qualifying year
                <select
                  className="form-input"
                  value={qualYear}
                  onChange={e => setQualYear(Number(e.target.value))}
                  style={{ marginTop: '0.375rem' }}
                >
                  <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>
                  <option value={CURRENT_YEAR + 1}>{CURRENT_YEAR + 1}</option>
                </select>
              </label>

              <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                <legend style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text, #111)' }}>
                  Currency preference
                </legend>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="wizard-currency"
                      value="CAD"
                      checked={localCurrency === 'CAD'}
                      onChange={() => setLocalCurrency('CAD')}
                    />
                    CAD
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="wizard-currency"
                      value="USD"
                      checked={localCurrency === 'USD'}
                      onChange={() => setLocalCurrency('USD')}
                    />
                    USD
                  </label>
                </div>
              </fieldset>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={handleStep2Next}>
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: What's next ── */}
          {step === 3 && (
            <>
              <p style={{ color: 'var(--text-light, #6b7280)', marginBottom: '1rem' }}>
                Here are some great first steps:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                {FIRST_STEPS.map(({ label, path, icon }) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => handleNavigateTo(path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--surface, #f9fafb)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--text, #111)',
                      transition: 'border-color 0.15s, background 0.15s',
                      width: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--brand, #2563eb)';
                      e.currentTarget.style.background = 'var(--brand-subtle, #eff6ff)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)';
                      e.currentTarget.style.background = 'var(--surface, #f9fafb)';
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                    <span>{label}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-light, #6b7280)' }}>→</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={handleGoToDashboard}>
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
