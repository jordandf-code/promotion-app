// MockPanel.jsx — AI mock promotion panel practice
// Three views: setup (default), active session, debrief

import { useState, useCallback } from 'react';
import { useMockPanelData } from '../hooks/useMockPanelData';
import { authHeaders, API_BASE } from '../utils/api.js';

const FOCUS_OPTIONS = [
  { key: 'commercial', label: 'Commercial' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'strategic_thinking', label: 'Strategic thinking' },
  { key: 'client_relationships', label: 'Client relationships' },
  { key: 'eminence', label: 'Eminence' },
  { key: 'people', label: 'People' },
];

function scoreColor(score) {
  if (score >= 70) return 'var(--color-green, #16a34a)';
  if (score >= 50) return 'var(--color-amber, #d97706)';
  return 'var(--color-red, #dc2626)';
}

function scoreBg(score) {
  if (score >= 70) return 'rgba(22, 163, 74, 0.1)';
  if (score >= 50) return 'rgba(217, 119, 6, 0.1)';
  return 'rgba(220, 38, 38, 0.1)';
}

export default function MockPanel() {
  const { data, initialized, updateSession } = useMockPanelData();

  // View state
  const [view, setView] = useState('setup'); // setup | active | debrief
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Setup state
  const [difficulty, setDifficulty] = useState('standard');
  const [focusAreas, setFocusAreas] = useState(FOCUS_OPTIONS.map(o => o.key));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  // Active session state
  const [questions, setQuestions] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [answer, setAnswer] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [debriefing, setDebriefing] = useState(false);

  // Debrief state
  const [debrief, setDebrief] = useState(null);

  const toggleFocus = useCallback((key) => {
    setFocusAreas(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // ── Start session ──────────────────────────────────────────────────────────

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/mock-panel/start`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ difficulty, focus_areas: focusAreas, question_count: 6 }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Failed to start session');
        return;
      }
      setActiveSessionId(json.session_id);
      setQuestions(json.questions);
      setCurrentTurn(1);
      setAnswer('');
      setFollowUp('');
      setShowFollowUp(false);
      setView('active');
    } catch {
      setError('Network error — check your connection');
    } finally {
      setStarting(false);
    }
  }

  // ── Submit answer ──────────────────────────────────────────────────────────

  async function handleSubmitAnswer() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/mock-panel/answer`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ session_id: activeSessionId, turn: currentTurn, answer }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Failed to submit answer');
        return;
      }
      setFollowUp(json.follow_up);
      setShowFollowUp(true);
    } catch {
      setError('Network error — check your connection');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Next question ──────────────────────────────────────────────────────────

  function handleNextQuestion() {
    setCurrentTurn(t => t + 1);
    setAnswer('');
    setFollowUp('');
    setShowFollowUp(false);
  }

  // ── Get debrief ────────────────────────────────────────────────────────────

  async function handleGetDebrief() {
    setDebriefing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/mock-panel/debrief`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ session_id: activeSessionId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Failed to generate debrief');
        return;
      }
      setDebrief(json.debrief);
      setView('debrief');
    } catch {
      setError('Network error — check your connection');
    } finally {
      setDebriefing(false);
    }
  }

  // ── View past session debrief ──────────────────────────────────────────────

  function viewPastSession(session) {
    if (session.debrief) {
      setActiveSessionId(session.id);
      setQuestions(session.questions);
      setDebrief(session.debrief);
      setView('debrief');
    }
  }

  // ── Reset to setup ─────────────────────────────────────────────────────────

  function backToSetup() {
    setView('setup');
    setActiveSessionId(null);
    setQuestions([]);
    setDebrief(null);
    setCurrentTurn(1);
    setAnswer('');
    setFollowUp('');
    setShowFollowUp(false);
    setError('');
  }

  if (!initialized) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Mock Panel</h1></div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'setup') {
    const pastSessions = (data.sessions ?? []).filter(s => s.status === 'completed');
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Mock Panel</h1>
        </div>

        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Mock Promotion Panel</h2>
          </div>

          {error && <div className="ai-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="card" style={{ padding: '1.5rem' }}>
            {/* Difficulty selector */}
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {['standard', 'challenging', 'tough'].map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="difficulty"
                      value={d}
                      checked={difficulty === d}
                      onChange={() => setDifficulty(d)}
                    />
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Focus areas */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Focus areas</label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {FOCUS_OPTIONS.map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={focusAreas.includes(opt.key)}
                      onChange={() => toggleFocus(opt.key)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              className="btn btn--primary"
              style={{ marginTop: '1.25rem' }}
              disabled={focusAreas.length === 0 || starting}
              onClick={handleStart}
            >
              {starting ? 'Starting...' : 'Start Practice Session'}
            </button>
          </div>
        </div>

        {/* Past sessions */}
        <div className="section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="section-title">Past Sessions</h2>
          </div>

          {pastSessions.length === 0 ? (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No sessions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pastSessions.map(s => (
                <div
                  key={s.id}
                  className="card card--list"
                  style={{ padding: '1rem', cursor: 'pointer' }}
                  onClick={() => viewPastSession(s)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1)} difficulty
                      </div>
                    </div>
                    {s.debrief?.overall_score != null && (
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: scoreColor(s.debrief.overall_score),
                        background: scoreBg(s.debrief.overall_score),
                        padding: '0.25rem 0.75rem',
                        borderRadius: '8px',
                      }}>
                        {s.debrief.overall_score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE SESSION VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'active') {
    const total = questions.length;
    const progressPct = ((currentTurn - 1) / total) * 100;
    const isLastQuestion = currentTurn >= total;

    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Mock Panel</h1>
        </div>

        <div className="section">
          {/* Progress bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600 }}>Question {currentTurn} of {total}</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-secondary, #e5e7eb)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-primary, #3b82f6)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {error && <div className="ai-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Follow-up from previous answer */}
          {showFollowUp && followUp && (
            <div style={{
              background: 'var(--bg-secondary, #f3f4f6)',
              border: '1px solid var(--border, #e5e7eb)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}>
              <strong style={{ fontStyle: 'normal' }}>Panelist:</strong> {followUp}
            </div>
          )}

          {/* Show next/debrief buttons when follow-up is showing */}
          {showFollowUp && (
            <div style={{ marginBottom: '1.25rem' }}>
              {isLastQuestion ? (
                <button
                  className="btn btn--primary"
                  onClick={handleGetDebrief}
                  disabled={debriefing}
                >
                  {debriefing ? 'Generating debrief...' : 'Get Debrief'}
                </button>
              ) : (
                <button className="btn btn--primary" onClick={handleNextQuestion}>
                  Next Question
                </button>
              )}
            </div>
          )}

          {/* Current question */}
          {!showFollowUp && (
            <>
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.05rem', lineHeight: 1.5 }}>
                  {questions[currentTurn - 1]}
                </div>
              </div>

              {/* Answer textarea */}
              <div className="form-group">
                <textarea
                  className="form-input"
                  placeholder="Type your response..."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <button
                className="btn btn--primary"
                disabled={answer.length < 50 || submitting}
                onClick={handleSubmitAnswer}
                style={{ marginTop: '0.5rem' }}
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>

              {answer.length > 0 && answer.length < 50 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {50 - answer.length} more characters needed
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBRIEF VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'debrief' && debrief) {
    // Find the session for Q-by-Q details
    const session = data.sessions.find(s => s.id === activeSessionId);

    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Mock Panel</h1>
        </div>

        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Panel Debrief</h2>
          </div>

          {error && <div className="ai-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Overall score */}
          <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Overall Score</div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: scoreColor(debrief.overall_score),
              lineHeight: 1,
            }}>
              {debrief.overall_score}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>/100</div>
          </div>

          {/* Strengths & Improvements - two columns on desktop, stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Strengths */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-green, #16a34a)' }}>Strengths</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {(debrief.strengths ?? []).map((s, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.4 }}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Areas for improvement */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-amber, #d97706)' }}>Areas for Improvement</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {(debrief.improvement_areas ?? []).map((a, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.4 }}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question-by-question feedback */}
          <div className="section" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Question-by-Question Feedback</h3>
            {(debrief.question_scores ?? []).map((qs, i) => {
              const turn = session?.turns?.[i];
              return (
                <details key={i} className="card" style={{ padding: '0', marginBottom: '0.5rem' }}>
                  <summary style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    listStyle: 'none',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>Question {qs.turn ?? (i + 1)}</span>
                    <span style={{
                      fontWeight: 700,
                      color: scoreColor(qs.score),
                      background: scoreBg(qs.score),
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      flexShrink: 0,
                    }}>
                      {qs.score}/100
                    </span>
                  </summary>
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border, #e5e7eb)' }}>
                    {turn?.question && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Question</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{turn.question}</div>
                      </div>
                    )}
                    {turn?.answer && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Your Answer</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{turn.answer}</div>
                      </div>
                    )}
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Feedback</div>
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{qs.feedback}</div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          {/* Coaching notes */}
          {debrief.coaching_notes && (
            <div className="card" style={{
              padding: '1.25rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-secondary, #f8fafc)',
              borderLeft: '3px solid var(--color-primary, #3b82f6)',
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Coaching Notes</h3>
              <div style={{ lineHeight: 1.5 }}>{debrief.coaching_notes}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={backToSetup}>
              Start New Session
            </button>
            <button className="btn btn--secondary" onClick={backToSetup}>
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Mock Panel</h1></div>
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    </div>
  );
}
