// Competencies.jsx — Competency self-assessment with BARS wizard, radar chart, and AI analysis

import { useState } from 'react';
import { useCompetenciesData } from '../hooks/useCompetenciesData.js';
import { useWinsData } from '../hooks/useWinsData.js';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';
import RadarChart from '../components/radar/RadarChart.jsx';
import StepperWizard from '../components/competencies/StepperWizard.jsx';
import CompetencyGoals from '../components/competencies/CompetencyGoals.jsx';
import EvidenceLinker from '../components/competencies/EvidenceLinker.jsx';
import TrendSparkline from '../components/competencies/TrendSparkline.jsx';
import JohariWindow, { computeJohariWindow } from '../components/competencies/JohariWindow.jsx';
import CompositeScoreCard, { computeCompositeScores } from '../components/competencies/CompositeScoreCard.jsx';
import MultiRaterRequest from '../components/competencies/MultiRaterRequest.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

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
// Uses composite_score if available (fractional), otherwise falls back to level
function extractRatings(assessment) {
  if (!assessment) return {};
  const out = {};
  for (const [id, val] of Object.entries(assessment.ratings ?? {})) {
    out[id] = val.composite_score ?? val.level ?? 0;
  }
  return out;
}

function AutoLinkButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleAutoLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/auto-link-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const d = await res.json();
      if (!d.ok) { setError(mapAiError(d.code, d.error)); return; }
      setResult(d.data);
    } catch {
      setError('Could not reach the AI service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button className="btn-secondary" onClick={handleAutoLink} disabled={loading} style={{ fontSize: '0.8rem' }}>
        {loading ? 'Linking...' : 'Auto-link with AI'}
      </button>
      {error && <span className="form-field-error" style={{ fontSize: '0.75rem' }}>{error}</span>}
      {result?.links?.length > 0 && (
        <span className="muted" style={{ fontSize: '0.75rem' }}>
          {result.links.length} suggestion{result.links.length !== 1 ? 's' : ''} — apply below
        </span>
      )}
    </div>
  );
}

export default function Competencies() {
  const {
    data,
    initialized,
    addAssessment,
    updateAssessment,
    removeAssessment,
    updateAiAnalysis,
    addCompetencyGoal,
    updateCompetencyGoal,
    removeCompetencyGoal,
  } = useCompetenciesData();

  const { data: winsRaw, initialized: winsInit } = useWinsData();
  const wins = Array.isArray(winsRaw) ? winsRaw : (winsRaw?.wins ?? []);

  const { questionBank } = useAdminData();

  const assessments   = data.assessments ?? [];
  const selfAssessments = assessments.filter(a => a.type === 'self');
  const otherAssessments = assessments.filter(a => a.type === 'peer' || a.type === 'sponsor');
  const aiAnalysis    = data.ai_analysis ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const todayAssessment = selfAssessments.find(a => a.date === today);
  const latestAssessment = selfAssessments.length
    ? selfAssessments[selfAssessments.length - 1]
    : null;
  const previousAssessment = selfAssessments.length >= 2
    ? selfAssessments[selfAssessments.length - 2]
    : null;

  const [showForm, setShowForm]   = useState(!todayAssessment && selfAssessments.length === 0);
  const [show360Overlay, setShow360Overlay] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError]     = useState(null);
  const [aiUsage, setAiUsage]     = useState(null);

  // Compute multi-rater derived data
  const competencyIds = COMPETENCIES.map(c => c.id);
  const compositeScores = latestAssessment
    ? computeCompositeScores(latestAssessment, otherAssessments, competencyIds)
    : {};
  const johariData = latestAssessment && otherAssessments.length > 0
    ? computeJohariWindow(latestAssessment, otherAssessments, COMPETENCIES)
    : null;

  // Build 360 average ratings for radar overlay
  const othersRatings = otherAssessments.length > 0 ? (() => {
    const avg = {};
    for (const comp of COMPETENCIES) {
      const scores = otherAssessments
        .map(a => a.ratings?.[comp.id]?.composite_score ?? a.ratings?.[comp.id]?.level)
        .filter(v => v != null);
      if (scores.length) avg[comp.id] = scores.reduce((s, v) => s + v, 0) / scores.length;
    }
    return avg;
  })() : null;

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

  if (!initialized) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Competencies</h1>
        <span className="page-count">
          {selfAssessments.length} assessment{selfAssessments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Section 1: Self-Assessment */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Self-assessment</h2>
          {selfAssessments.length > 0 && !showForm && (
            <button className="btn-secondary" onClick={() => setShowForm(true)}>
              {todayAssessment ? "Edit today's assessment" : 'New assessment'}
            </button>
          )}
        </div>

        {selfAssessments.length === 0 && !showForm && (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '0.75rem' }}>Rate yourself against 7 leadership competencies using behavioral anchors.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Start your first self-assessment
            </button>
          </div>
        )}

        {showForm && (
          <StepperWizard
            competencies={COMPETENCIES}
            questionBank={questionBank}
            existing={todayAssessment}
            onSave={(fields) => {
              if (todayAssessment) {
                updateAssessment(todayAssessment.id, fields);
              } else {
                addAssessment(fields);
              }
              setShowForm(false);
            }}
            onCancel={selfAssessments.length > 0 ? () => setShowForm(false) : null}
          />
        )}

        {!showForm && latestAssessment && (
          <AssessmentSummary
            assessment={latestAssessment}
            onEdit={() => setShowForm(true)}
            onRemove={() => {
              if (confirm('Remove this assessment?')) removeAssessment(latestAssessment.id);
            }}
          />
        )}

        {!showForm && selfAssessments.length > 1 && (
          <AssessmentHistory
            assessments={selfAssessments.slice(0, -1).reverse()}
            onRemove={(id) => { if (confirm('Remove this assessment?')) removeAssessment(id); }}
          />
        )}
      </section>

      {/* Section 2: Radar Chart */}
      {latestAssessment && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Competency radar</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {othersRatings && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={show360Overlay} onChange={e => setShow360Overlay(e.target.checked)} />
                  Show 360 overlay
                </label>
              )}
              {previousAssessment && (
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Blue = latest{show360Overlay ? ' · Green = 360 avg' : ''} · Dashed = previous
                </span>
              )}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <RadarChart
              ratings={extractRatings(latestAssessment)}
              previousRatings={previousAssessment ? extractRatings(previousAssessment) : undefined}
              othersRatings={show360Overlay ? othersRatings : undefined}
              competencies={COMPETENCIES}
              size={300}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
              {COMPETENCIES.map(comp => {
                const r = latestAssessment.ratings?.[comp.id];
                const composite = r?.composite_score;
                const level = r?.level;
                return (
                  <span key={comp.id} className="badge" style={{ fontSize: '0.75rem' }}>
                    {comp.label}: {composite != null ? composite.toFixed(2) : (level ? LEVEL_LABELS[level] : '—')}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Evidence Linking + Trends */}
      {latestAssessment && (
        <CollapsibleSection id="comp-evidence" title="Evidence & trends" defaultOpen={false}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <AutoLinkButton />
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            {COMPETENCIES.map(comp => {
              const r = latestAssessment.ratings?.[comp.id];
              if (!r) return null;
              const trendData = selfAssessments.map(a => {
                const cr = a.ratings?.[comp.id];
                return cr?.composite_score ?? cr?.level ?? null;
              }).filter(v => v != null);
              return (
                <div key={comp.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{comp.label}</strong>
                    <span className="badge" style={{ fontSize: '0.75rem' }}>
                      {r.composite_score != null ? r.composite_score.toFixed(2) : LEVEL_LABELS[r.level]}
                    </span>
                    {trendData.length >= 2 && <TrendSparkline data={trendData} />}
                  </div>
                  <EvidenceLinker
                    competencyId={comp.id}
                    competencyLabel={comp.label}
                    evidenceIds={r.evidence_ids ?? []}
                    wins={wins}
                    onUpdate={(newIds) => {
                      const updatedRatings = { ...latestAssessment.ratings };
                      updatedRatings[comp.id] = { ...updatedRatings[comp.id], evidence_ids: newIds };
                      updateAssessment(latestAssessment.id, { ratings: updatedRatings });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Section 4: Development Goals */}
      <CompetencyGoals
        goals={data.competency_goals ?? []}
        competencies={COMPETENCIES}
        currentRatings={latestAssessment?.ratings ?? {}}
        onAdd={addCompetencyGoal}
        onUpdate={updateCompetencyGoal}
        onRemove={removeCompetencyGoal}
      />

      {/* Section 5: Johari Window (shown when multi-rater data exists) */}
      {johariData && (
        <CollapsibleSection id="comp-johari" title="Perception map" defaultOpen={false}>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
            Based on {otherAssessments.length} rater{otherAssessments.length !== 1 ? 's' : ''}
          </p>
          <JohariWindow johariData={johariData} competencies={COMPETENCIES} />
        </CollapsibleSection>
      )}

      {/* Section 6: Composite Score Breakdown */}
      {Object.keys(compositeScores).length > 0 && (
        <CollapsibleSection id="comp-composite" title="Composite scores" defaultOpen={false}>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
            Self {otherAssessments.length > 0 ? '40%' : '60%'} + Evidence {otherAssessments.length > 0 ? '30%' : '40%'}{otherAssessments.length > 0 ? ' + 360 30%' : ''}
          </p>
          <CompositeScoreCard compositeScores={compositeScores} competencies={COMPETENCIES} />
        </CollapsibleSection>
      )}

      {/* Section 7: Request Assessments */}
      <CollapsibleSection id="comp-multirater" title="Multi-rater assessments" count={otherAssessments.length > 0 ? otherAssessments.length : undefined} defaultOpen={false}>
        <div className="card" style={{ padding: '1rem' }}>
          <MultiRaterRequest />
          {otherAssessments.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '0.75rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Received assessments</p>
              {otherAssessments.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span>
                    {a.assessor_name ?? 'Anonymous'}
                    <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>{a.type}</span>
                  </span>
                  <span className="muted">{a.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Section 8: AI Analysis */}
      <CollapsibleSection id="comp-ai" title="AI analysis" defaultOpen={!!aiAnalysis.competency_summary}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={analyzing || selfAssessments.length === 0}
            >
              {analyzing ? 'Analyzing...' : 'Analyze my competencies'}
            </button>
            {selfAssessments.length === 0 && (
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
      </CollapsibleSection>
    </div>
  );
}

// Assessment Summary (latest)
function AssessmentSummary({ assessment, onEdit, onRemove }) {
  const a = assessment;
  const ratedCount = Object.keys(a.ratings ?? {}).length;
  const hasComposite = Object.values(a.ratings ?? {}).some(r => r.composite_score != null);

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

      {/* Bias flags */}
      {a.bias_flags?.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {a.bias_flags.map((flag, i) => (
            <p key={i} style={{
              fontSize: '0.8rem', margin: '0.25rem 0', padding: '0.3rem 0.5rem',
              background: 'rgba(234, 179, 8, 0.1)', borderRadius: '4px',
              color: 'var(--text-primary)',
            }}>
              <strong style={{ textTransform: 'capitalize' }}>{flag.type.replace(/_/g, ' ')}:</strong> {flag.message}
            </p>
          ))}
        </div>
      )}

      {ratedCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
          {COMPETENCIES.map(comp => {
            const r = a.ratings?.[comp.id];
            if (!r) return null;
            return (
              <span key={comp.id} className="badge" style={{ fontSize: '0.75rem' }}>
                {comp.label}: {hasComposite && r.composite_score != null
                  ? r.composite_score.toFixed(2)
                  : (LEVEL_LABELS[r.level] ?? r.level)}
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

// Assessment History
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
        const hasComposite = Object.values(a.ratings ?? {}).some(r => r.composite_score != null);
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
                        {comp.label}: {hasComposite && r.composite_score != null
                          ? r.composite_score.toFixed(2)
                          : (LEVEL_LABELS[r.level] ?? r.level)}
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
