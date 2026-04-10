// CompetencyGoals.jsx — CRUD UI for competency development goals.

import { useState } from 'react';

const LEVEL_LABELS = { 1: 'Developing', 2: 'Competent', 3: 'Advanced', 4: 'Exemplary' };

export default function CompetencyGoals({
  goals = [],
  competencies = [],
  currentRatings = {},
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ competency_id: '', target_level: 3, target_date: '', actions: [''] });

  function openNew() {
    setForm({ competency_id: competencies[0]?.id ?? '', target_level: 3, target_date: '', actions: [''] });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(goal) {
    setForm({
      competency_id: goal.competency_id,
      target_level: goal.target_level,
      target_date: goal.target_date,
      actions: goal.actions?.length ? [...goal.actions] : [''],
    });
    setEditId(goal.id);
    setShowForm(true);
  }

  function handleSave(e) {
    e.preventDefault();
    const cleaned = {
      ...form,
      actions: form.actions.filter(a => a.trim()),
    };
    if (editId) {
      onUpdate(editId, cleaned);
    } else {
      onAdd(cleaned);
    }
    setShowForm(false);
    setEditId(null);
  }

  function addAction() {
    setForm(f => ({ ...f, actions: [...f.actions, ''] }));
  }

  function updateAction(idx, val) {
    setForm(f => {
      const actions = [...f.actions];
      actions[idx] = val;
      return { ...f, actions };
    });
  }

  function removeAction(idx) {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) }));
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Development goals</h2>
        {!showForm && (
          <button className="btn-secondary" onClick={openNew}>Add goal</button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Competency<span className="form-required">*</span>
                <select
                  className="form-input"
                  value={form.competency_id}
                  onChange={e => setForm(f => ({ ...f, competency_id: e.target.value }))}
                  required
                >
                  {competencies.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Target level<span className="form-required">*</span>
                <select
                  className="form-input"
                  value={form.target_level}
                  onChange={e => setForm(f => ({ ...f, target_level: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4].map(l => (
                    <option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginTop: '0.75rem' }}>
              Target date
              <input
                type="date"
                className="form-input"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              />
            </label>

            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Action steps</p>
              {form.actions.map((action, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <input
                    className="form-input"
                    value={action}
                    onChange={e => updateAction(idx, e.target.value)}
                    placeholder="Action step..."
                    style={{ flex: 1 }}
                  />
                  {form.actions.length > 1 && (
                    <button type="button" className="row-btn row-btn--danger" onClick={() => removeAction(idx)}>
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="row-btn" style={{ fontSize: '0.8rem' }} onClick={addAction}>
                + Add step
              </button>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={!form.competency_id}>
                {editId ? 'Update goal' : 'Save goal'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p className="muted">No development goals set. Add a goal to track your competency growth.</p>
        </div>
      )}

      {goals.map(goal => {
        const comp = competencies.find(c => c.id === goal.competency_id);
        const current = currentRatings[goal.competency_id]?.composite_score ?? currentRatings[goal.competency_id]?.level ?? null;
        const progress = current != null && goal.target_level
          ? Math.min(Math.round((current / goal.target_level) * 100), 100)
          : null;
        return (
          <div key={goal.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {comp?.label ?? goal.competency_id}
                  <span className="badge" style={{ marginLeft: '0.5rem' }}>
                    Target: {goal.target_level} — {LEVEL_LABELS[goal.target_level]}
                  </span>
                </p>
                {goal.target_date && (
                  <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>By {goal.target_date}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="row-btn" onClick={() => openEdit(goal)}>Edit</button>
                <button className="row-btn row-btn--danger" onClick={() => { if (confirm('Remove this goal?')) onRemove(goal.id); }}>Remove</button>
              </div>
            </div>

            {/* Progress bar */}
            {progress != null && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                  <span>Current: {current?.toFixed?.(2) ?? current}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary, #e2e8f0)' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    background: progress >= 100 ? '#15803d' : progress >= 50 ? '#d97706' : '#dc2626',
                    width: `${progress}%`, transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}

            {/* Action steps */}
            {goal.actions?.length > 0 && (
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                {goal.actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
