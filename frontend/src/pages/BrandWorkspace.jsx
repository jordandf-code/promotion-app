// BrandWorkspace.jsx — Personal brand positioning and perception tracking

import { useState } from 'react';
import { useBrandData } from '../hooks/useBrandData.js';

const CATEGORY_LABELS = {
  expertise:  'Expertise',
  leadership: 'Leadership',
  impact:     'Impact',
  vision:     'Vision',
};

const EVIDENCE_TYPE_LABELS = {
  win:        'Win',
  eminence:   'Eminence',
  feedback:   'Feedback',
  competency: 'Competency',
};

const PLATFORM_LABELS = {
  linkedin:    'LinkedIn',
  conference:  'Conference',
  internal:    'Internal',
  publication: 'Publication',
};

const STATUS_LABELS = {
  planned:     'Planned',
  in_progress: 'In progress',
  done:        'Done',
};

const STATUS_CYCLE = { planned: 'in_progress', in_progress: 'done', done: 'planned' };

export default function BrandWorkspace() {
  const {
    data, initialized,
    updateBrand,
    addMessage, removeMessage,
    addProofPoint, removeProofPoint,
    addPerception, removePerception,
    addVisibilityGoal, updateVisibilityGoal, removeVisibilityGoal,
  } = useBrandData();

  // Section 2 — Key Messages
  const [showMessageForm, setShowMessageForm]   = useState(false);
  const [newMessage, setNewMessage]             = useState({ message: '', category: 'expertise' });

  // Section 3 — Proof Points
  const [showProofForm, setShowProofForm]       = useState(false);
  const [newProof, setNewProof]                 = useState({ claim: '', evidence_type: 'win', evidence_summary: '' });

  // Section 4 — Perception Log
  const [showPerceptionForm, setShowPerceptionForm] = useState(false);
  const [newPerception, setNewPerception]           = useState({
    date: new Date().toISOString().slice(0, 10), source: '', perception: '', context: '',
  });

  // Section 5 — Visibility Goals
  const [showGoalForm, setShowGoalForm]         = useState(false);
  const [newGoal, setNewGoal]                   = useState({ goal: '', platform: 'linkedin', target_date: '' });
  const [goalFilter, setGoalFilter]             = useState('all');

  if (!initialized) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Brand</h1></div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  // — Section 2: submit handler
  function handleAddMessage(e) {
    e.preventDefault();
    if (!newMessage.message.trim()) return;
    if ((data.key_messages || []).length >= 5) return;
    addMessage({ message: newMessage.message.trim(), category: newMessage.category });
    setNewMessage({ message: '', category: 'expertise' });
    setShowMessageForm(false);
  }

  // — Section 3: submit handler
  function handleAddProof(e) {
    e.preventDefault();
    if (!newProof.claim.trim()) return;
    addProofPoint({
      claim: newProof.claim.trim(),
      evidence_type: newProof.evidence_type,
      evidence_summary: newProof.evidence_summary.trim(),
    });
    setNewProof({ claim: '', evidence_type: 'win', evidence_summary: '' });
    setShowProofForm(false);
  }

  // — Section 4: submit handler
  function handleAddPerception(e) {
    e.preventDefault();
    if (!newPerception.source.trim() || !newPerception.perception.trim()) return;
    addPerception({
      date: newPerception.date,
      source: newPerception.source.trim(),
      perception: newPerception.perception.trim(),
      context: newPerception.context.trim(),
    });
    setNewPerception({ date: new Date().toISOString().slice(0, 10), source: '', perception: '', context: '' });
    setShowPerceptionForm(false);
  }

  // — Section 5: submit handler
  function handleAddGoal(e) {
    e.preventDefault();
    if (!newGoal.goal.trim()) return;
    addVisibilityGoal({
      goal: newGoal.goal.trim(),
      platform: newGoal.platform,
      target_date: newGoal.target_date,
    });
    setNewGoal({ goal: '', platform: 'linkedin', target_date: '' });
    setShowGoalForm(false);
  }

  const filteredGoals = (data.visibility_goals || []).filter(
    g => goalFilter === 'all' || g.status === goalFilter
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Brand</h1>
      </div>

      {/* ── Section 1: Positioning ───────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Positioning</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Your elevator pitch and how you want to be known
        </p>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Tagline</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. The go-to partner for digital transformation in financial services"
            defaultValue={data.tagline || ''}
            onBlur={e => updateBrand({ tagline: e.target.value.trim() })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Positioning statement</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="How do you want to be positioned? What's your unique value proposition?"
            defaultValue={data.positioning || ''}
            onBlur={e => updateBrand({ positioning: e.target.value.trim() })}
          />
        </div>
      </div>

      {/* ── Section 2: Key Messages ───────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Key Messages</h2>
          {(data.key_messages || []).length < 5 && !showMessageForm && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowMessageForm(true)}>
              + Add message
            </button>
          )}
        </div>

        {showMessageForm && (
          <form onSubmit={handleAddMessage} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Message <span className="form-required">*</span></label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="What's a key message you want people to associate with you?"
                value={newMessage.message}
                onChange={e => setNewMessage(m => ({ ...m, message: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={newMessage.category}
                onChange={e => setNewMessage(m => ({ ...m, category: e.target.value }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowMessageForm(false); setNewMessage({ message: '', category: 'expertise' }); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {(data.key_messages || []).length === 0 && !showMessageForm && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No key messages yet. Add up to 5.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data.key_messages || []).map(msg => (
            <div key={msg.id} className="card card--flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    marginBottom: '0.4rem',
                  }}
                >
                  {CATEGORY_LABELS[msg.category] || msg.category}
                </span>
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5 }}>{msg.message}</p>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                onClick={() => removeMessage(msg.id)}
                aria-label="Delete message"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {(data.key_messages || []).length >= 5 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
            Maximum 5 key messages reached.
          </p>
        )}
      </div>

      {/* ── Section 3: Proof Points ───────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Proof Points</h2>
          {!showProofForm && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowProofForm(true)}>
              + Add proof point
            </button>
          )}
        </div>

        {showProofForm && (
          <form onSubmit={handleAddProof} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Claim <span className="form-required">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Led $5M transformation deal end-to-end"
                value={newProof.claim}
                onChange={e => setNewProof(p => ({ ...p, claim: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Evidence type</label>
              <select
                className="form-input"
                value={newProof.evidence_type}
                onChange={e => setNewProof(p => ({ ...p, evidence_type: e.target.value }))}
              >
                {Object.entries(EVIDENCE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Evidence summary</label>
              <input
                className="form-input"
                type="text"
                placeholder="Brief description of the supporting evidence"
                value={newProof.evidence_summary}
                onChange={e => setNewProof(p => ({ ...p, evidence_summary: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowProofForm(false); setNewProof({ claim: '', evidence_type: 'win', evidence_summary: '' }); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {(data.proof_points || []).length === 0 && !showProofForm && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No proof points yet. Link your evidence to your claims.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data.proof_points || []).map(point => (
            <div key={point.id} className="card card--flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--success-light, #d1fae5)',
                      color: 'var(--success, #065f46)',
                    }}
                  >
                    {EVIDENCE_TYPE_LABELS[point.evidence_type] || point.evidence_type}
                  </span>
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem', marginBottom: point.evidence_summary ? '0.25rem' : 0 }}>
                  {point.claim}
                </p>
                {point.evidence_summary && (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{point.evidence_summary}</p>
                )}
              </div>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                onClick={() => removeProofPoint(point.id)}
                aria-label="Delete proof point"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Perception Log ─────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Perception Log</h2>
          {!showPerceptionForm && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowPerceptionForm(true)}>
              + Log a perception
            </button>
          )}
        </div>

        {showPerceptionForm && (
          <form onSubmit={handleAddPerception} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Date <span className="form-required">*</span></label>
                <input
                  className="form-input"
                  type="date"
                  value={newPerception.date}
                  onChange={e => setNewPerception(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source <span className="form-required">*</span></label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Who said it?"
                  value={newPerception.source}
                  onChange={e => setNewPerception(p => ({ ...p, source: e.target.value }))}
                  autoFocus
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Perception <span className="form-required">*</span></label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="What did they say or signal about how they see you?"
                value={newPerception.perception}
                onChange={e => setNewPerception(p => ({ ...p, perception: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Context</label>
              <input
                className="form-input"
                type="text"
                placeholder="Where or when did this come up?"
                value={newPerception.context}
                onChange={e => setNewPerception(p => ({ ...p, context: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => {
                setShowPerceptionForm(false);
                setNewPerception({ date: new Date().toISOString().slice(0, 10), source: '', perception: '', context: '' });
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {(data.perception_log || []).length === 0 && !showPerceptionForm && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No perceptions logged yet. Track how others see you over time.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data.perception_log || []).map(entry => (
            <div key={entry.id} className="card card--flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{entry.source}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{entry.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: entry.context ? '0.25rem' : 0 }}>
                  "{entry.perception}"
                </p>
                {entry.context && (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{entry.context}</p>
                )}
              </div>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                onClick={() => removePerception(entry.id)}
                aria-label="Delete perception entry"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: Visibility Goals ───────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Visibility Goals</h2>
          {!showGoalForm && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowGoalForm(true)}>
              + Add goal
            </button>
          )}
        </div>

        {/* Filter */}
        {(data.visibility_goals || []).length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['all', 'planned', 'in_progress', 'done'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${goalFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setGoalFilter(s)}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {showGoalForm && (
          <form onSubmit={handleAddGoal} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Goal <span className="form-required">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Publish article on AI in financial services"
                value={newGoal.goal}
                onChange={e => setNewGoal(g => ({ ...g, goal: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <select
                  className="form-input"
                  value={newGoal.platform}
                  onChange={e => setNewGoal(g => ({ ...g, platform: e.target.value }))}
                >
                  {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target date</label>
                <input
                  className="form-input"
                  type="date"
                  value={newGoal.target_date}
                  onChange={e => setNewGoal(g => ({ ...g, target_date: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowGoalForm(false); setNewGoal({ goal: '', platform: 'linkedin', target_date: '' }); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {(data.visibility_goals || []).length === 0 && !showGoalForm && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No visibility goals yet. Track where you want to show up.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredGoals.map(goal => (
            <div key={goal.id} className="card card--flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--bg-subtle, #f3f4f6)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {PLATFORM_LABELS[goal.platform] || goal.platform}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      background: goal.status === 'done'
                        ? 'var(--success-light, #d1fae5)'
                        : goal.status === 'in_progress'
                          ? 'var(--warning-light, #fef3c7)'
                          : 'var(--bg-subtle, #f3f4f6)',
                      color: goal.status === 'done'
                        ? 'var(--success, #065f46)'
                        : goal.status === 'in_progress'
                          ? 'var(--warning, #92400e)'
                          : 'var(--text-muted)',
                    }}
                    onClick={() => updateVisibilityGoal(goal.id, { status: STATUS_CYCLE[goal.status] })}
                    title="Click to advance status"
                  >
                    {STATUS_LABELS[goal.status]}
                  </button>
                </div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9375rem', marginBottom: goal.target_date ? '0.2rem' : 0 }}>
                  {goal.goal}
                </p>
                {goal.target_date && (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Target: {goal.target_date}
                  </p>
                )}
              </div>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                onClick={() => removeVisibilityGoal(goal.id)}
                aria-label="Delete goal"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {filteredGoals.length === 0 && (data.visibility_goals || []).length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            No goals with status "{STATUS_LABELS[goalFilter] || goalFilter}".
          </p>
        )}
      </div>
    </div>
  );
}
