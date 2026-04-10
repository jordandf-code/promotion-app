// CompetencyAssessmentPublic.jsx — Public page for external raters to complete competency assessments via token.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../utils/api.js';
import BARSCard from '../components/competencies/BARSCard.jsx';

const COMPETENCIES = [
  { id: 'commercial_acumen',   label: 'Commercial acumen'    },
  { id: 'client_relationship', label: 'Client relationship'  },
  { id: 'leadership',          label: 'Leadership & people'  },
  { id: 'practice_building',   label: 'Practice building'    },
  { id: 'executive_presence',  label: 'Executive presence'   },
  { id: 'strategic_thinking',  label: 'Strategic thinking'   },
  { id: 'delivery_excellence', label: 'Delivery excellence'  },
];

const LEVEL_LABELS = { 1: 'Developing', 2: 'Competent', 3: 'Advanced', 4: 'Exemplary' };

export default function CompetencyAssessmentPublic() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/share/competency-assessment-info/${token}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
        return r.json();
      })
      .then(d => setInfo(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '3rem' }}><p className="muted">Loading...</p></div>;
  if (error) return (
    <div className="page" style={{ textAlign: 'center', padding: '3rem' }}>
      <h2>Assessment unavailable</h2>
      <p className="muted">{error}</p>
    </div>
  );
  if (submitted) return (
    <div className="page" style={{ textAlign: 'center', padding: '3rem' }}>
      <h2>Thank you!</h2>
      <p>Your competency assessment has been submitted. {info?.ownerName} will see your ratings.</p>
    </div>
  );

  const questionBank = info?.questionBank;
  const totalSteps = COMPETENCIES.length + 1;
  const isReview = step === COMPETENCIES.length;
  const currentComp = !isReview ? COMPETENCIES[step] : null;
  const bankEntry = currentComp && questionBank?.competencies?.[currentComp.id];
  const bars = bankEntry?.bars;
  const questions = bankEntry?.questions ?? [];
  const currentRating = currentComp ? (ratings[currentComp.id] ?? {}) : null;
  const ratedCount = COMPETENCIES.filter(c => ratings[c.id]?.bars_level != null).length;

  function setBarsLevel(level) {
    setRatings(r => ({
      ...r,
      [currentComp.id]: { ...(r[currentComp.id] ?? {}), bars_level: level },
    }));
  }

  function setQuestionResponse(qId, response) {
    setRatings(r => {
      const prev = r[currentComp.id] ?? {};
      const responses = [...(prev.question_responses ?? [])];
      const idx = responses.findIndex(qr => qr.question_id === qId);
      if (idx >= 0) responses[idx] = { ...responses[idx], response };
      else responses.push({ question_id: qId, response });
      return { ...r, [currentComp.id]: { ...prev, question_responses: responses } };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    const cleanRatings = {};
    for (const comp of COMPETENCIES) {
      const r = ratings[comp.id];
      if (!r?.bars_level) continue;
      const qResponses = (r.question_responses ?? []).filter(qr => qr.response != null);
      const qAvg = qResponses.length
        ? Number((qResponses.reduce((s, qr) => s + qr.response, 0) / qResponses.length).toFixed(2))
        : null;
      cleanRatings[comp.id] = {
        level: r.bars_level,
        bars_level: r.bars_level,
        question_responses: qResponses,
        question_avg: qAvg,
        composite_score: qAvg != null
          ? Number((r.bars_level * 0.6 + qAvg * 0.4).toFixed(2))
          : r.bars_level,
      };
    }
    try {
      const res = await fetch(`${API_BASE}/api/share/competency-assessment/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: cleanRatings, overall_notes: overallNotes }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Competency Assessment</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        You're assessing <strong>{info?.ownerName}</strong>'s leadership competencies.
        {info?.reviewerName && <> Responding as <strong>{info.reviewerName}</strong>.</>}
      </p>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#e2e8f0' }}>
          <div style={{
            height: '100%', borderRadius: '2px', background: '#3b82f6',
            width: `${((step + 1) / totalSteps) * 100}%`, transition: 'width 0.2s',
          }} />
        </div>
        <span className="muted" style={{ fontSize: '0.8rem' }}>{step + 1} / {totalSteps}</span>
      </div>

      {/* Competency step */}
      {!isReview && currentComp && (
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>{currentComp.label}</h3>
          {bars ? (
            <BARSCard bars={bars} selectedLevel={currentRating?.bars_level} onSelect={setBarsLevel} />
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map(level => (
                <button key={level} type="button"
                  className={currentRating?.bars_level === level ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setBarsLevel(level)}>
                  {level} — {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          )}

          {questions.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Cross-validation questions</p>
              {questions.map(q => {
                const resp = currentRating?.question_responses?.find(r => r.question_id === q.id);
                return (
                  <div key={q.id} style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>{q.text}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4].map(level => (
                        <button key={level} type="button"
                          onClick={() => setQuestionResponse(q.id, level)}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem',
                            border: `1px solid ${resp?.response === level ? '#3b82f6' : '#e2e8f0'}`,
                            background: resp?.response === level ? 'rgba(59,130,246,0.1)' : 'transparent',
                            cursor: 'pointer', fontWeight: resp?.response === level ? 600 : 400,
                          }}>
                          {q.anchors?.[String(level)] ?? `${level}`}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review step */}
      {isReview && (
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Review & submit</h3>
          {COMPETENCIES.map(comp => {
            const r = ratings[comp.id];
            if (!r?.bars_level) return (
              <div key={comp.id} style={{ fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.5 }}>
                {comp.label}: Not rated
              </div>
            );
            return (
              <div key={comp.id} style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <strong>{comp.label}:</strong> {r.bars_level} — {LEVEL_LABELS[r.bars_level]}
              </div>
            );
          })}
          <label style={{ display: 'block', marginTop: '0.75rem' }}>
            Overall notes
            <textarea className="form-input form-textarea" rows={3} value={overallNotes}
              onChange={e => setOverallNotes(e.target.value)}
              placeholder="Any overall observations..." />
          </label>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <div>
          {step > 0 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{ratedCount}/{COMPETENCIES.length} rated</span>
          {!isReview ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              {step < COMPETENCIES.length - 1 ? 'Next' : 'Review'}
            </button>
          ) : (
            <button className="btn-primary" disabled={ratedCount === 0 || submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting...' : 'Submit assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
