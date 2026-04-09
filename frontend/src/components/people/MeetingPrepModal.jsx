// components/people/MeetingPrepModal.jsx
// Modal for meeting prep (AI-generated prep card) and post-meeting debrief.

import { useState } from 'react';
import { API_BASE, authHeaders } from '../../utils/api.js';
import { mapAiError } from '../../utils/aiErrors.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_COMMITMENT = () => ({ id: uid(), text: '', due: '' });

const COVERAGE_OPTIONS = [
  { value: '',            label: 'No change' },
  { value: 'strong',      label: 'Strong' },
  { value: 'developing',  label: 'Developing' },
  { value: 'gap',         label: 'Gap' },
];

export default function MeetingPrepModal({ person, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('prep');

  // ── Prep tab state ─────────────────────────────────────────────────────────
  const [date, setDate] = useState(today());
  const [prepNotes, setPrepNotes] = useState('');
  const [aiPrep, setAiPrep] = useState(null);        // { summary, talking_points[], context_notes }
  const [talkingPoints, setTalkingPoints] = useState([]);  // [{ text, checked }]
  const [aiState, setAiState] = useState('idle');     // 'idle' | 'loading' | 'error'
  const [aiError, setAiError] = useState('');
  const [aiUsage, setAiUsage] = useState(null);

  // ── Debrief tab state ──────────────────────────────────────────────────────
  const [sentiment, setSentiment] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [commitmentsMine, setCommitmentsMine] = useState([EMPTY_COMMITMENT()]);
  const [commitmentsTheirs, setCommitmentsTheirs] = useState([EMPTY_COMMITMENT()]);
  const [coverageUpdate, setCoverageUpdate] = useState('');
  const [cadenceUpdate, setCadenceUpdate] = useState('');

  // ── AI prep generation ────────────────────────────────────────────────────
  async function handleGeneratePrep() {
    setAiState('loading');
    setAiError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/meeting-prep`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ contactId: person.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAiError(mapAiError(data.code, data.error));
        setAiState('error');
        return;
      }
      setAiPrep(data.data);
      setTalkingPoints((data.data.talking_points ?? []).map(text => ({ id: uid(), text, checked: false })));
      setAiUsage(data.usage ?? null);
      setAiState('done');
    } catch {
      setAiError('Network error — check your connection and try again.');
      setAiState('error');
    }
  }

  function toggleTalkingPoint(id) {
    setTalkingPoints(pts => pts.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  }

  // ── Commitment helpers ────────────────────────────────────────────────────
  function addCommitment(setter) {
    setter(prev => [...prev, EMPTY_COMMITMENT()]);
  }

  function updateCommitment(setter, id, field, value) {
    setter(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCommitment(setter, id) {
    setter(prev => prev.filter(c => c.id !== id));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    const hasDebrief = sentiment || outcomes.trim() ||
      commitmentsMine.some(c => c.text.trim()) ||
      commitmentsTheirs.some(c => c.text.trim()) ||
      coverageUpdate || cadenceUpdate;

    const prep = {
      id: uid(),
      contact_id: person.id,
      date,
      prep_notes: prepNotes.trim() || null,
      ai_prep: aiPrep ?? null,
      talking_points: talkingPoints.length ? talkingPoints.map(({ id: _id, ...rest }) => rest) : [],
      debrief: hasDebrief ? {
        sentiment: sentiment || null,
        outcomes: outcomes.trim() || null,
        commitments_mine: commitmentsMine
          .filter(c => c.text.trim())
          .map(({ id: _id, ...rest }) => ({ ...rest, action_id: null })),
        commitments_theirs: commitmentsTheirs
          .filter(c => c.text.trim())
          .map(({ id: _id, ...rest }) => rest),
        coverage_update: coverageUpdate || null,
        cadence_update: cadenceUpdate.trim() || null,
      } : null,
    };

    onSave(prep);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Meeting prep — {person.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
          {['prep', 'debrief'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.6rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
                fontSize: '0.9rem',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'prep' ? 'Prep' : 'Debrief'}
            </button>
          ))}
        </div>

        <div className="modal-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {activeTab === 'prep' && (
            <PrepTab
              date={date}
              setDate={setDate}
              prepNotes={prepNotes}
              setPrepNotes={setPrepNotes}
              aiState={aiState}
              aiError={aiError}
              aiPrep={aiPrep}
              aiUsage={aiUsage}
              talkingPoints={talkingPoints}
              onGeneratePrep={handleGeneratePrep}
              onToggleTalkingPoint={toggleTalkingPoint}
            />
          )}
          {activeTab === 'debrief' && (
            <DebriefTab
              sentiment={sentiment}
              setSentiment={setSentiment}
              outcomes={outcomes}
              setOutcomes={setOutcomes}
              commitmentsMine={commitmentsMine}
              commitmentsTheirs={commitmentsTheirs}
              coverageUpdate={coverageUpdate}
              setCoverageUpdate={setCoverageUpdate}
              cadenceUpdate={cadenceUpdate}
              setCadenceUpdate={setCadenceUpdate}
              onAddMine={() => addCommitment(setCommitmentsMine)}
              onUpdateMine={(id, field, val) => updateCommitment(setCommitmentsMine, id, field, val)}
              onRemoveMine={id => removeCommitment(setCommitmentsMine, id)}
              onAddTheirs={() => addCommitment(setCommitmentsTheirs)}
              onUpdateTheirs={(id, field, val) => updateCommitment(setCommitmentsTheirs, id, field, val)}
              onRemoveTheirs={id => removeCommitment(setCommitmentsTheirs, id)}
            />
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Prep Tab ──────────────────────────────────────────────────────────────────

function PrepTab({
  date, setDate, prepNotes, setPrepNotes,
  aiState, aiError, aiPrep, aiUsage,
  talkingPoints, onGeneratePrep, onToggleTalkingPoint,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label>
        Date<span className="form-required">*</span>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </label>

      <label>
        What do you want to discuss?
        <textarea
          className="form-input form-textarea"
          rows={3}
          value={prepNotes}
          onChange={e => setPrepNotes(e.target.value)}
          placeholder="Key topics, questions, goals for this meeting…"
        />
      </label>

      <div>
        <button
          type="button"
          className="btn-secondary"
          onClick={onGeneratePrep}
          disabled={aiState === 'loading'}
          style={{ width: '100%' }}
        >
          {aiState === 'loading' ? 'Generating…' : '✦ Generate AI prep'}
        </button>
      </div>

      {aiState === 'error' && (
        <p className="form-error">{aiError}</p>
      )}

      {aiState === 'done' && aiPrep && (
        <AIPrepCard
          aiPrep={aiPrep}
          talkingPoints={talkingPoints}
          aiUsage={aiUsage}
          onToggle={onToggleTalkingPoint}
        />
      )}
    </div>
  );
}

function AIPrepCard({ aiPrep, talkingPoints, aiUsage, onToggle }) {
  return (
    <div style={{
      background: 'var(--bg-subtle, #f8f9fa)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      {aiPrep.summary && (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Relationship summary</p>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>{aiPrep.summary}</p>
        </div>
      )}

      {talkingPoints.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Suggested talking points</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {talkingPoints.map(pt => (
              <label key={pt.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pt.checked}
                  onChange={() => onToggle(pt.id)}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span style={{
                  fontSize: '0.9rem',
                  textDecoration: pt.checked ? 'line-through' : 'none',
                  color: pt.checked ? 'var(--text-muted)' : 'inherit',
                }}>
                  {pt.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {aiPrep.context_notes && (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Context</p>
          <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>{aiPrep.context_notes}</p>
        </div>
      )}

      {aiUsage && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textAlign: 'right' }}>
          {aiUsage.input_tokens + aiUsage.output_tokens} tokens
        </p>
      )}
    </div>
  );
}

// ── Debrief Tab ───────────────────────────────────────────────────────────────

function DebriefTab({
  sentiment, setSentiment,
  outcomes, setOutcomes,
  commitmentsMine, commitmentsTheirs,
  coverageUpdate, setCoverageUpdate,
  cadenceUpdate, setCadenceUpdate,
  onAddMine, onUpdateMine, onRemoveMine,
  onAddTheirs, onUpdateTheirs, onRemoveTheirs,
}) {
  const sentiments = [
    { value: 'positive', label: 'Positive', symbol: '✓' },
    { value: 'neutral',  label: 'Neutral',  symbol: '○' },
    { value: 'negative', label: 'Negative', symbol: '✗' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sentiment */}
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>How did it go?</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sentiments.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSentiment(sentiment === s.value ? '' : s.value)}
              style={{
                padding: '0.4rem 0.9rem',
                border: `1px solid ${sentiment === s.value ? 'var(--primary)' : 'var(--border)'}`,
                background: sentiment === s.value ? 'var(--primary)' : 'transparent',
                color: sentiment === s.value ? '#fff' : 'inherit',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: sentiment === s.value ? 600 : 400,
              }}
            >
              {s.symbol} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Outcomes */}
      <label>
        Outcomes<span className="form-required">*</span>
        <textarea
          className="form-input form-textarea"
          rows={3}
          value={outcomes}
          onChange={e => setOutcomes(e.target.value)}
          placeholder="What was decided or accomplished in this meeting?"
          required
        />
      </label>

      {/* My commitments */}
      <CommitmentsSection
        label="My commitments"
        items={commitmentsMine}
        onAdd={onAddMine}
        onUpdate={onUpdateMine}
        onRemove={onRemoveMine}
      />

      {/* Their commitments */}
      <CommitmentsSection
        label="Their commitments"
        items={commitmentsTheirs}
        onAdd={onAddTheirs}
        onUpdate={onUpdateTheirs}
        onRemove={onRemoveTheirs}
      />

      {/* Coverage update */}
      <label>
        Coverage update
        <select
          className="form-input"
          value={coverageUpdate}
          onChange={e => setCoverageUpdate(e.target.value)}
        >
          {COVERAGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {/* Cadence update */}
      <label>
        Cadence update
        <input
          className="form-input"
          value={cadenceUpdate}
          onChange={e => setCadenceUpdate(e.target.value)}
          placeholder="e.g. Monthly, Quarterly, As needed"
        />
      </label>
    </div>
  );
}

function CommitmentsSection({ label, items, onAdd, onUpdate, onRemove }) {
  return (
    <div>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: '2 1 150px', minWidth: 0 }}
              value={item.text}
              onChange={e => onUpdate(item.id, 'text', e.target.value)}
              placeholder={`Commitment ${idx + 1}`}
            />
            <input
              className="form-input"
              type="date"
              style={{ flex: '1 1 120px', minWidth: 0 }}
              value={item.due}
              onChange={e => onUpdate(item.id, 'due', e.target.value)}
            />
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '1.1rem',
                padding: '0 0.25rem',
                flexShrink: 0,
              }}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={onAdd}
        style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
      >
        + Add
      </button>
    </div>
  );
}
