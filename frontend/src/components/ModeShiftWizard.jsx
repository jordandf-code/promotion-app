// ModeShiftWizard.jsx — Multi-step wizard for role transition (Feature 2G)
// Launched from Admin > User Settings. Archives current data, updates role labels,
// and prepares the user for their new role.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authHeaders } from '../utils/api.js';
import { useSettings } from '../context/SettingsContext.jsx';

export default function ModeShiftWizard({ onComplete, onClose }) {
  const navigate = useNavigate();
  const { promotionYear } = useSettings();

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [currentRole, setCurrentRole] = useState('Associate Partner');
  const [newRole, setNewRole] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);

  // Step 2 data
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Step 3 resets
  const [resetScorecard, setResetScorecard] = useState(true);
  const [resetDoneActions, setResetDoneActions] = useState(true);
  const [resetYear, setResetYear] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Load current role from settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/data/settings`, { headers: authHeaders() });
        const json = await res.json();
        const saved = json.data ?? {};
        if (saved.currentRole) setCurrentRole(saved.currentRole);
      } catch {
        // use default
      }
    }
    loadSettings();
  }, []);

  // Load summary data when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const [readinessRes, winsRes, goalsRes, actionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/data/readiness`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/data/wins`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/data/goals`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/data/actions`, { headers: authHeaders() }),
        ]);
        const [readiness, wins, goals, actions] = await Promise.all([
          readinessRes.json(),
          winsRes.json(),
          goalsRes.json(),
          actionsRes.json(),
        ]);

        const readinessScore = readiness.data?.score ?? readiness.data?.overallScore ?? null;
        const winsCount = Array.isArray(wins.data) ? wins.data.length : 0;
        const goalsCount = Array.isArray(goals.data) ? goals.data.length : 0;
        const actionsCount = Array.isArray(actions.data) ? actions.data.length : 0;

        setSummaryData({ readinessScore, winsCount, goalsCount, actionsCount });
      } catch {
        setSummaryData({ readinessScore: null, winsCount: 0, goalsCount: 0, actionsCount: 0 });
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, [step]);

  async function createArchive() {
    setArchiving(true);
    try {
      // Load current settings first
      const settingsRes = await fetch(`${API_BASE}/api/data/settings`, { headers: authHeaders() });
      const current = (await settingsRes.json()).data ?? {};

      const archive = {
        id: `archive_${Date.now()}`,
        archivedAt: new Date().toISOString(),
        fromRole: currentRole,
        toRole: newRole,
        fromYear: promotionYear,
        readinessScore: summaryData?.readinessScore ?? null,
        winsCount: summaryData?.winsCount ?? 0,
        goalsCount: summaryData?.goalsCount ?? 0,
        actionsCount: summaryData?.actionsCount ?? 0,
      };

      await fetch(`${API_BASE}/api/data/settings`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          data: {
            ...current,
            modeShiftArchives: [...(current.modeShiftArchives || []), archive],
            currentRole: newRole,
          },
        }),
      });

      setStep(3);
    } catch {
      // stay on step 2, user can retry
    } finally {
      setArchiving(false);
    }
  }

  async function applyResets() {
    setApplying(true);
    setApplyError('');
    try {
      const tasks = [];

      if (resetScorecard) {
        tasks.push(
          fetch(`${API_BASE}/api/data/scorecard`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ data: { targets: {}, opportunities: [], projects: [], utilization: {} } }),
          })
        );
      }

      if (resetDoneActions) {
        const actionsRes = await fetch(`${API_BASE}/api/data/actions`, { headers: authHeaders() });
        const actionsJson = await actionsRes.json();
        const allActions = Array.isArray(actionsJson.data) ? actionsJson.data : [];
        const remaining = allActions.filter(a => a.status !== 'done' && !a.done);
        tasks.push(
          fetch(`${API_BASE}/api/data/actions`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ data: remaining }),
          })
        );
      }

      if (resetYear) {
        const settingsRes = await fetch(`${API_BASE}/api/data/settings`, { headers: authHeaders() });
        const currentSettings = (await settingsRes.json()).data ?? {};
        tasks.push(
          fetch(`${API_BASE}/api/data/settings`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ data: { ...currentSettings, promotionYear: newYear } }),
          })
        );
      }

      await Promise.all(tasks);
      setStep(4);
    } catch {
      setApplyError('Something went wrong. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  const NEXT_STEPS = [
    {
      title: 'Update your scorecard targets',
      description: `Set new targets aligned with your ${newRole || 'new role'} expectations.`,
      route: '/scorecard',
    },
    {
      title: `Set new goals`,
      description: `Define goals that reflect ${newRole || 'your new role'}'s promotion criteria.`,
      route: '/goals',
    },
    {
      title: 'Run a fresh competency self-assessment',
      description: 'Establish a new baseline for your competency ratings.',
      route: '/competencies',
    },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '540px', width: '100%' }}>
        <div className="modal-header">
          <h2 className="modal-title">Role transition</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: n <= step ? 'var(--primary, #2563eb)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* ── Step 1: Confirm Transition ──────────────────────────────── */}
          {step === 1 && (
            <div>
              <p className="muted" style={{ marginBottom: '1.25rem' }}>
                Are you transitioning to a new role? This wizard will archive your current progress
                and help you set up for your next chapter.
              </p>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                Current role <span className="form-unit">(read-only)</span>
                <input className="form-input" value={currentRole} disabled />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                New role title <span className="form-required">*</span>
                <input
                  className="form-input"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="e.g. Partner"
                  autoFocus
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1.5rem' }}>
                New qualifying year <span className="form-required">*</span>
                <input
                  className="form-input"
                  type="number"
                  value={newYear}
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 10}
                  onChange={e => setNewYear(parseInt(e.target.value) || new Date().getFullYear() + 1)}
                  style={{ width: '8rem' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-primary"
                  disabled={!newRole.trim()}
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Archive Current Data ────────────────────────────── */}
          {step === 2 && (
            <div>
              <p className="muted" style={{ marginBottom: '1.25rem' }}>
                We'll save a snapshot of your current progress before transitioning.
                This archive will be preserved in your settings.
              </p>

              {summaryLoading ? (
                <p className="muted">Loading your data summary…</p>
              ) : summaryData && (
                <div className="card" style={{ background: 'var(--surface-alt, #f8fafc)', marginBottom: '1.25rem', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Snapshot preview</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Current role</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>{currentRole}</p>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Qualifying year</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>{promotionYear}</p>
                    </div>
                    {summaryData.readinessScore !== null && (
                      <div>
                        <span className="muted" style={{ fontSize: '0.8rem' }}>Readiness score</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>{summaryData.readinessScore}%</p>
                      </div>
                    )}
                    <div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Wins logged</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>{summaryData.winsCount}</p>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Goals</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>{summaryData.goalsCount}</p>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Action items</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>{summaryData.actionsCount}</p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button
                  className="btn-primary"
                  onClick={createArchive}
                  disabled={archiving || summaryLoading}
                >
                  {archiving ? 'Saving archive…' : 'Create archive'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Reset Options ────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <p className="muted" style={{ marginBottom: '1.25rem' }}>
                Choose what to clear for your fresh start as <strong>{newRole}</strong>.
                Your historical data will remain in the archive.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <label className="sharing-toggle">
                  <input
                    type="checkbox"
                    checked={resetScorecard}
                    onChange={e => setResetScorecard(e.target.checked)}
                  />
                  <span>
                    Clear scorecard targets
                    <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Recommended — targets differ at each level</span>
                  </span>
                </label>

                <label className="sharing-toggle">
                  <input
                    type="checkbox"
                    checked={resetDoneActions}
                    onChange={e => setResetDoneActions(e.target.checked)}
                  />
                  <span>
                    Clear completed action items
                    <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Removes items marked as done</span>
                  </span>
                </label>

                <label className="sharing-toggle">
                  <input
                    type="checkbox"
                    checked={resetYear}
                    onChange={e => setResetYear(e.target.checked)}
                  />
                  <span>
                    Reset qualifying year to {newYear}
                    <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Updates your promotion timeline</span>
                  </span>
                </label>
              </div>

              {applyError && <p style={{ color: 'var(--error, #dc2626)', marginBottom: '1rem', fontSize: '0.875rem' }}>{applyError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-primary"
                  onClick={applyResets}
                  disabled={applying}
                >
                  {applying ? 'Applying…' : 'Apply resets'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: New Focus ────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Welcome to your new role as {newRole}!
              </p>
              <p className="muted" style={{ marginBottom: '1.5rem' }}>
                Your archive has been saved and your data is ready for the next chapter.
                Here are a few good first steps:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {NEXT_STEPS.map((item, i) => (
                  <button
                    key={i}
                    className="card"
                    style={{
                      background: 'var(--surface-alt, #f8fafc)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.875rem 1rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    onClick={() => { onComplete(); navigate(item.route); }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</p>
                      <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{item.description}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={onComplete}>
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
