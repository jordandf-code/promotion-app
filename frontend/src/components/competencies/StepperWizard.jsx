// StepperWizard.jsx — Multi-step competency assessment wizard with BARS + cross-validation questions.
// 7 steps (one per competency) + review step.

import { useState } from 'react';
import BARSCard from './BARSCard.jsx';
import { detectBias } from './BiasDetector.js';

const LEVEL_LABELS = { 1: 'Developing', 2: 'Competent', 3: 'Advanced', 4: 'Exemplary' };

function computeComposite(barsLevel, questionResponses) {
  if (barsLevel == null) return null;
  const answered = questionResponses.filter(r => r.response != null);
  if (!answered.length) return barsLevel;
  const qAvg = answered.reduce((s, r) => s + r.response, 0) / answered.length;
  return Number((barsLevel * 0.6 + qAvg * 0.4).toFixed(2));
}

export default function StepperWizard({ competencies, questionBank, existing, onSave, onCancel }) {
  const totalSteps = competencies.length + 1; // +1 for review step

  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState(() => {
    const init = {};
    for (const comp of competencies) {
      const ex = existing?.ratings?.[comp.id];
      init[comp.id] = {
        bars_level: ex?.bars_level ?? ex?.level ?? null,
        notes: ex?.notes ?? '',
        question_responses: ex?.question_responses ?? [],
        evidence_ids: ex?.evidence_ids ?? [],
      };
    }
    return init;
  });
  const [overallNotes, setOverallNotes] = useState(existing?.overall_notes ?? '');
  const [showNotes, setShowNotes] = useState({});

  const currentComp = step < competencies.length ? competencies[step] : null;
  const bankEntry = currentComp && questionBank?.competencies?.[currentComp.id];
  const bars = bankEntry?.bars;
  const questions = bankEntry?.questions ?? [];
  const currentRating = currentComp ? ratings[currentComp.id] : null;

  function setBarsLevel(level) {
    setRatings(r => ({
      ...r,
      [currentComp.id]: { ...r[currentComp.id], bars_level: level },
    }));
  }

  function setQuestionResponse(qId, response) {
    setRatings(r => {
      const prev = r[currentComp.id];
      const responses = [...(prev.question_responses ?? [])];
      const idx = responses.findIndex(qr => qr.question_id === qId);
      if (idx >= 0) responses[idx] = { ...responses[idx], response };
      else responses.push({ question_id: qId, response });
      return { ...r, [currentComp.id]: { ...prev, question_responses: responses } };
    });
  }

  function setNotes(notes) {
    setRatings(r => ({
      ...r,
      [currentComp.id]: { ...r[currentComp.id], notes },
    }));
  }

  function handleSave() {
    const cleanRatings = {};
    for (const comp of competencies) {
      const r = ratings[comp.id];
      if (r.bars_level == null) continue;
      const qResponses = r.question_responses.filter(qr => qr.response != null);
      const qAvg = qResponses.length
        ? Number((qResponses.reduce((s, qr) => s + qr.response, 0) / qResponses.length).toFixed(2))
        : null;
      cleanRatings[comp.id] = {
        level: r.bars_level,
        bars_level: r.bars_level,
        notes: r.notes || '',
        evidence_ids: r.evidence_ids,
        question_responses: qResponses,
        question_avg: qAvg,
        composite_score: computeComposite(r.bars_level, qResponses),
      };
    }
    const biasFlags = detectBias(cleanRatings, competencies.map(c => c.id));
    onSave({ ratings: cleanRatings, overall_notes: overallNotes, bias_flags: biasFlags });
  }

  const ratedCount = competencies.filter(c => ratings[c.id]?.bars_level != null).length;
  const isReviewStep = step === competencies.length;

  // Build review data
  const reviewBiasFlags = isReviewStep
    ? detectBias(
        Object.fromEntries(competencies.map(c => [c.id, ratings[c.id]])),
        competencies.map(c => c.id)
      )
    : [];

  return (
    <div className="card" style={{ padding: '1rem' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{
          flex: 1, height: '4px', borderRadius: '2px',
          background: 'var(--bg-secondary, #e2e8f0)',
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: 'var(--blue, #3b82f6)',
            width: `${((step + 1) / totalSteps) * 100}%`,
            transition: 'width 0.2s',
          }} />
        </div>
        <span className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {step + 1} / {totalSteps}
        </span>
      </div>

      {/* Step content */}
      {!isReviewStep && currentComp && (
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>
            {currentComp.label}
          </h3>

          {/* BARS selection */}
          {bars ? (
            <BARSCard bars={bars} selectedLevel={currentRating?.bars_level} onSelect={setBarsLevel} />
          ) : (
            /* Fallback if no question bank loaded — simple level selector */
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  type="button"
                  className={currentRating?.bars_level === level ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setBarsLevel(level)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {level} — {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          )}

          {/* Cross-validation questions */}
          {questions.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Cross-validation questions
              </p>
              {questions.map(q => {
                const resp = currentRating?.question_responses?.find(r => r.question_id === q.id);
                return (
                  <div key={q.id} style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>{q.text}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setQuestionResponse(q.id, level)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            border: `1px solid ${resp?.response === level ? 'var(--blue, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
                            background: resp?.response === level ? 'var(--blue-light, rgba(59,130,246,0.1))' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: resp?.response === level ? 600 : 400,
                          }}
                        >
                          {q.anchors?.[String(level)] ?? `${level}`}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes toggle */}
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="row-btn"
              style={{ fontSize: '0.8rem' }}
              onClick={() => setShowNotes(s => ({ ...s, [currentComp.id]: !s[currentComp.id] }))}
            >
              {showNotes[currentComp.id] ? 'Hide notes' : 'Add notes'}
            </button>
            {showNotes[currentComp.id] && (
              <textarea
                className="form-input form-textarea"
                value={currentRating?.notes ?? ''}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional context or evidence..."
                style={{ marginTop: '0.4rem' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Review step */}
      {isReviewStep && (
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>Review & submit</h3>

          {/* Bias warnings */}
          {reviewBiasFlags.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {reviewBiasFlags.map((flag, i) => (
                <div key={i} className="card" style={{
                  padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
                  background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)',
                }}>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>
                    <strong style={{ textTransform: 'capitalize' }}>{flag.type.replace(/_/g, ' ')}:</strong>{' '}
                    {flag.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Ratings summary table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem', width: '100%' }}>
              <thead>
                <tr>
                  <th>Competency</th>
                  <th>BARS level</th>
                  <th>Question avg</th>
                  <th>Composite</th>
                </tr>
              </thead>
              <tbody>
                {competencies.map(comp => {
                  const r = ratings[comp.id];
                  if (r?.bars_level == null) return (
                    <tr key={comp.id} style={{ opacity: 0.5 }}>
                      <td>{comp.label}</td>
                      <td colSpan={3}>Not rated</td>
                    </tr>
                  );
                  const answered = (r.question_responses ?? []).filter(qr => qr.response != null);
                  const qAvg = answered.length
                    ? (answered.reduce((s, qr) => s + qr.response, 0) / answered.length).toFixed(1)
                    : '—';
                  const composite = computeComposite(r.bars_level, answered);
                  return (
                    <tr key={comp.id}>
                      <td>{comp.label}</td>
                      <td>{r.bars_level} — {LEVEL_LABELS[r.bars_level]}</td>
                      <td>{qAvg}</td>
                      <td style={{ fontWeight: 600 }}>{composite?.toFixed(2) ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card fallback */}
          <div className="mobile-cards" style={{ display: 'none' }}>
            {competencies.map(comp => {
              const r = ratings[comp.id];
              if (r?.bars_level == null) return null;
              const answered = (r.question_responses ?? []).filter(qr => qr.response != null);
              const qAvg = answered.length
                ? (answered.reduce((s, qr) => s + qr.response, 0) / answered.length).toFixed(1)
                : '—';
              const composite = computeComposite(r.bars_level, answered);
              return (
                <div key={comp.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{comp.label}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                    <span>BARS: {r.bars_level}</span>
                    <span>Q avg: {qAvg}</span>
                    <span style={{ fontWeight: 600 }}>Composite: {composite?.toFixed(2) ?? '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <label style={{ display: 'block', marginTop: '1rem' }}>
            Overall notes
            <textarea
              className="form-input form-textarea"
              value={overallNotes}
              onChange={e => setOverallNotes(e.target.value)}
              rows={3}
              placeholder="Any overall reflections on this assessment..."
            />
          </label>
        </div>
      )}

      {/* Navigation */}
      <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {step > 0 && (
            <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            {ratedCount}/{competencies.length} rated
          </span>
          {!isReviewStep ? (
            <button type="button" className="btn-primary" onClick={() => setStep(s => s + 1)}>
              {step < competencies.length - 1 ? 'Next' : 'Review'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={ratedCount === 0}
              onClick={handleSave}
            >
              {existing ? 'Update assessment' : 'Save assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
