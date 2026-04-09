// Competencies.jsx — Competency self-assessment, radar chart, and AI perception-gap analysis

import { useState } from 'react';
import { useCompetenciesData } from '../hooks/useCompetenciesData.js';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';
import RadarChart from '../components/radar/RadarChart.jsx';

const COMPETENCIES = [
  { id: 'commercial_acumen',   label: 'Commercial acumen'    },
  { id: 'client_relationship', label: 'Client relationship'  },
  { id: 'leadership',          label: 'Leadership & people'  },
  { id: 'practice_building',   label: 'Practice building'    },
  { id: 'executive_presence',  label: 'Executive presence'   },
  { id: 'strategic_thinking',  label: 'Strategic thinking'   },
  { id: 'delivery_excellence', label: 'Delivery excellence'  },
];

const LEVEL_LABELS = {
  1: 'Developing',
  2: 'Competent',
  3: 'Advanced',
  4: 'Exemplary',
};

const GAP_TYPE_LABELS = {
  overrated:  'Overrated',
  underrated: 'Underrated',
  aligned:    'Aligned',
};

const PRIORITY_LABELS = {
  high:   'High',
  medium: 'Medium',
};

// Build a ratings-only object from a full assessment for radar chart
function extractRatings(assessment) {
  if (!assessment) return {};
  const out = {};
  for (const [id, val] of Object.entries(assessment.ratings ?? {})) {
    out[id] = val.level ?? 0;
  }
  return out;
}

export default function Competencies() {
  const {
    data,
    initialized,
    addAssessment,
    updateAssessment,
    removeAssessment,
    updateAiAnalysis,
  } = useCompetenciesData();

  const assessments   = data.assessments ?? [];
  const aiAnalysis    = data.ai_analysis ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const todayAssessment = assessments.find(a => a.date === today && a.type === 'self');
  const latestAssessment = assessments.length
    ? assessments[assessments.length - 1]
    : null;
  const previousAssessment = assessments.length >= 2
    ? assessments[assessments.length - 2]
    : null;

  const [showForm, setShowForm]   = useState(!todayAssessment && assessments.length === 0);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError]     = useState(null);
  const [aiUsage, setAiUsage]     = useState(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/competency-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const d = await res.json();
      if (!d.ok) { setAiError(mapAiError(d.code, d.error)); return; }
      updateAiAnalysis({ ...d.data, generated_at: new Date().toISOString() });
      if (d.usage) setAiUsage(d.usage);
    } catch {
      setAiError('Could not reach the AI service');
    } finally {
      setAnalyzing(false);
    }
  }

  if (!initialized) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Competencies</h1>
        <span className="page-count">
          {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Section 1: Self-Assessment Form ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Self-assessment</h2>
          {assessments.length > 0 && !showForm && (
            <button className="btn-secondary" onClick={() => setShowForm(true)}>
              {todayAssessment ? 'Edit today\'s assessment' : 'New assessment'}
            </button>
          )}
        </div>

        {assessments.length === 0 && !showForm && (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '0.75rem' }}>Rate yourself against IBM's 7 leadership competencies.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Start your first self-assessment
            </button>
          </div>
        )}

        {showForm && (
          <AssessmentForm
            existing={todayAssessment}
            onSave={(fields) => {
              if (todayAssessment) {
                updateAssessment(todayAssessment.id, fields);
              } else {
                addAssessment(fields);
              }
              setShowForm(false);
            }}
            onCancel={assessments.length > 0 ? () => setShowForm(false) : null}
          />
        )}

        {!showForm && latestAssessment && (
          <AssessmentSummary
            assessment={latestAssessment}
            onEdit={() => {
              if (latestAssessment.date === today) {
                setShowForm(true);
              } else {
                setShowForm(true);
              }
            }}
            onRemove={() => {
              if (confirm('Remove this assessment?')) removeAssessment(latestAssessment.id);
            }}
          />
        )}

        {!showForm && assessments.length > 1 && (
          <AssessmentHistory
            assessments={assessments.slice(0, -1).reverse()}
            onRemove={(id) => { if (confirm('Remove this assessment?')) removeAssessment(id); }}
          />
        )}
      </section>

      {/* ── Section 2: Radar Chart ── */}
      {latestAssessment && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Competency radar</h2>
            {previousAssessment && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Blue = latest · Dashed = previous ({previousAssessment.date})
              </span>
            )}
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <RadarChart
              ratings={extractRatings(latestAssessment)}
              previousRatings={previousAssessment ? extractRatings(previousAssessment) : undefined}
              competencies={COMPETENCIES}
              size={300}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
              {COMPETENCIES.map(comp => {
                const r = latestAssessment.ratings?.[comp.id];
                const level = r?.level;
                return (
                  <span key={comp.id} className="badge" style={{ fontSize: '0.75rem' }}>
                    {comp.label}: {level ? LEVEL_LABELS[level] : '—'}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 3: AI Analysis ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">AI analysis</h2>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={analyzing || assessments.length === 0}
            >
              {analyzing ? 'Analyzing…' : 'Analyze my competencies'}
            </button>
            {assessments.length === 0 && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>Complete a self-assessment first</span>
            )}
            {aiAnalysis.generated_at && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Last generated: {new Date(aiAnalysis.generated_at).toLocaleDateString('en-CA')}
              </span>
            )}
          </div>

          {aiError && (
            <p className="form-field-error" style={{ marginTop: '0.5rem' }}>{aiError}</p>
          )}

          {aiUsage && (
            <p className="story-token-usage" style={{ textAlign: 'left', padding: '0.25rem 0 0' }}>
              {aiUsage.input_tokens} input · {aiUsage.output_tokens} output tokens
            </p>
          )}

          {aiAnalysis.competency_summary && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Summary</p>
              <p style={{ fontSize: '0.9rem' }}>{aiAnalysis.competency_summary}</p>
            </div>
          )}

          {aiAnalysis.perception_gaps?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Perception gaps</p>
              {aiAnalysis.perception_gaps.map((gap, i) => (
                <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-secondary, #f8f9fa)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{gap.competency}</strong>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <span className={`story-strength story-strength--${
                        gap.evidence_strength === 'Strong'  ? 'strong'  :
                        gap.evidence_strength === 'Partial' ? 'partial' :
                        'missing'
                      }`}>
                        {gap.evidence_strength ?? 'Missing'}
                      </span>
                      <span className={`story-strength story-strength--${
                        gap.gap_type === 'overrated'  ? 'missing' :
                        gap.gap_type === 'underrated' ? 'strong'  :
                        'partial'
                      }`}>
                        {GAP_TYPE_LABELS[gap.gap_type] ?? gap.gap_type}
                      </span>
                    </div>
                  </div>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                    Self-rating: {gap.self_rating ? `${gap.self_rating} — ${LEVEL_LABELS[gap.self_rating] ?? gap.self_rating}` : '—'}
                  </p>
                  {gap.insight && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{gap.insight}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {aiAnalysis.focus_areas?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Focus areas</p>
              {aiAnalysis.focus_areas.map((area, i) => (
                <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-secondary, #f8f9fa)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{area.competency}</strong>
                    <span className={`story-strength story-strength--${area.priority === 'high' ? 'missing' : 'partial'}`}>
                      {PRIORITY_LABELS[area.priority] ?? area.priority} priority
                    </span>
                  </div>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{area.rationale}</p>
                  {area.suggested_action && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                      <strong>Action: </strong>{area.suggested_action}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Assessment Form ────────────────────────────────────────────────────────────

function AssessmentForm({ existing, onSave, onCancel }) {
  const initialRatings = {};
  for (const comp of COMPETENCIES) {
    initialRatings[comp.id] = existing?.ratings?.[comp.id] ?? { level: null, notes: '' };
  }

  const [ratings, setRatings]       = useState(initialRatings);
  const [overallNotes, setOverallNotes] = useState(existing?.overall_notes ?? '');
  const [expandedNotes, setExpandedNotes] = useState({});

  function setLevel(compId, level) {
    setRatings(r => ({
      ...r,
      [compId]: { ...r[compId], level },
    }));
  }

  function setNotes(compId, notes) {
    setRatings(r => ({
      ...r,
      [compId]: { ...r[compId], notes },
    }));
  }

  function toggleNotes(compId) {
    setExpandedNotes(e => ({ ...e, [compId]: !e[compId] }));
  }

  function handleSave(e) {
    e.preventDefault();
    // Clean ratings: only include competencies that have been rated
    const cleanRatings = {};
    for (const [id, val] of Object.entries(ratings)) {
      if (val.level != null) {
        cleanRatings[id] = {
          level: val.level,
          notes: val.notes || '',
          evidence_ids: existing?.ratings?.[id]?.evidence_ids ?? [],
        };
      }
    }
    onSave({ ratings: cleanRatings, overall_notes: overallNotes });
  }

  const ratedCount = Object.values(ratings).filter(r => r.level != null).length;

  return (
    <div className="card" style={{ padding: '1rem' }}>
      {existing && (
        <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          Editing today's assessment.
        </p>
      )}
      <form onSubmit={handleSave}>
        {COMPETENCIES.map(comp => {
          const r = ratings[comp.id];
          const notesExpanded = expandedNotes[comp.id];
          return (
            <div key={comp.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>{comp.label}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4].map(level => (
                  <label
                    key={level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: `1px solid ${r.level === level ? 'var(--blue, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
                      background: r.level === level ? 'var(--blue-light, rgba(59,130,246,0.1))' : 'transparent',
                      transition: 'all 0.1s',
                    }}
                  >
                    <input
                      type="radio"
                      name={`level-${comp.id}`}
                      value={level}
                      checked={r.level === level}
                      onChange={() => setLevel(comp.id, level)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: r.level === level ? 600 : 400 }}>
                      {level} — {LEVEL_LABELS[level]}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="row-btn"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => toggleNotes(comp.id)}
                >
                  {notesExpanded ? 'Hide notes' : 'Add notes'}
                </button>
                {notesExpanded && (
                  <textarea
                    className="form-input form-textarea"
                    value={r.notes}
                    onChange={e => setNotes(comp.id, e.target.value)}
                    rows={2}
                    placeholder="Optional context or evidence…"
                    style={{ marginTop: '0.4rem' }}
                  />
                )}
              </div>
            </div>
          );
        })}

        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Overall notes
          <textarea
            className="form-input form-textarea"
            value={overallNotes}
            onChange={e => setOverallNotes(e.target.value)}
            rows={3}
            placeholder="Any overall reflections on this assessment…"
          />
        </label>

        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn-primary" disabled={ratedCount === 0}>
            {existing ? 'Update assessment' : 'Save assessment'}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            {ratedCount}/{COMPETENCIES.length} rated
          </span>
        </div>
      </form>
    </div>
  );
}

// ── Assessment Summary (latest) ───────────────────────────────────────────────

function AssessmentSummary({ assessment, onEdit, onRemove }) {
  const a = assessment;
  const ratedCount = Object.keys(a.ratings ?? {}).length;

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            Latest assessment
            <span className="badge" style={{ marginLeft: '0.5rem' }}>{a.date}</span>
          </p>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            {ratedCount} of {COMPETENCIES.length} competencies rated
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="row-btn" onClick={onEdit}>Edit</button>
          <button className="row-btn row-btn--danger" onClick={onRemove}>Remove</button>
        </div>
      </div>
      {ratedCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
          {COMPETENCIES.map(comp => {
            const r = a.ratings?.[comp.id];
            if (!r) return null;
            return (
              <span key={comp.id} className="badge" style={{ fontSize: '0.75rem' }}>
                {comp.label}: {LEVEL_LABELS[r.level] ?? r.level}
              </span>
            );
          })}
        </div>
      )}
      {a.overall_notes && (
        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          {a.overall_notes}
        </p>
      )}
    </div>
  );
}

// ── Assessment History ─────────────────────────────────────────────────────────

function AssessmentHistory({ assessments, onRemove }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!assessments.length) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Previous assessments ({assessments.length})
      </p>
      {assessments.map(a => {
        const ratedCount = Object.keys(a.ratings ?? {}).length;
        const expanded = expandedId === a.id;
        return (
          <div
            key={a.id}
            className="win-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setExpandedId(expanded ? null : a.id)}
          >
            <div className="win-card-header">
              <div className="win-card-title-row">
                <h3 className="win-title" style={{ fontSize: '0.85rem' }}>
                  {a.date}
                  <span className="badge" style={{ marginLeft: '0.5rem' }}>{ratedCount}/{COMPETENCIES.length} rated</span>
                </h3>
                <div className="win-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="row-btn row-btn--danger" onClick={() => onRemove(a.id)}>Remove</button>
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {COMPETENCIES.map(comp => {
                    const r = a.ratings?.[comp.id];
                    if (!r) return null;
                    return (
                      <span key={comp.id} className="badge" style={{ fontSize: '0.75rem' }}>
                        {comp.label}: {LEVEL_LABELS[r.level] ?? r.level}
                      </span>
                    );
                  })}
                </div>
                {a.overall_notes && <p className="muted">{a.overall_notes}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
