// pages/Goals.jsx

import { useState } from 'react';
import { useGoalsData, STATUS_LABELS, STATUSES, nextStatus } from '../hooks/useGoalsData.js';
import { useActionsData }  from '../hooks/useActionsData.js';
import { useWinsData }     from '../hooks/useWinsData.js';
import { useAdminData }    from '../hooks/useAdminData.js';
import GoalCard            from '../components/goals/GoalCard.jsx';
import WinFormModal        from '../components/wins/WinFormModal.jsx';
import SuggestGoalsModal   from '../components/goals/SuggestGoalsModal.jsx';

const EMPTY_FORM = { title: '', targetDate: '', status: 'not_started', notes: '', isGate: false };

export default function Goals() {
  const { goals, addGoal, updateGoal, removeGoal, cycleStatus } = useGoalsData();
  const { actions, addAction, toggleDone, linkToGoal, unlinkFromGoal } = useActionsData();
  const { wins, addWin, hasWinForSource } = useWinsData();
  const { ibmCriteria, careerHistory, anthropicKey } = useAdminData();

  const [modal,        setModal]        = useState(null);
  const [winPrompt,    setWinPrompt]    = useState(null);
  const [suggestState, setSuggestState] = useState(null); // null | 'loading' | { suggestions } | { error }

  const milestones = goals.filter(g => g.isGate);
  const otherGoals = goals.filter(g => !g.isGate);

  function openAdd()      { setModal({ mode: 'add',  data: { ...EMPTY_FORM } }); }
  function openEdit(goal) { setModal({ mode: 'edit', data: { ...goal } }); }
  function closeModal()   { setModal(null); }

  function handleSave(form) {
    if (modal.mode === 'add') addGoal(form);
    else updateGoal(modal.data.id, form);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this goal?')) removeGoal(id);
  }

  function handleCycle(goal) {
    const next = nextStatus(goal.status);
    cycleStatus(goal.id);
    if (next === 'done' && !hasWinForSource(goal.id)) {
      const linkedActions = actions.filter(a => (a.linkedGoalIds ?? []).includes(goal.id));
      const actionLines   = linkedActions.length > 0
        ? '\n\nLinked actions:\n' + linkedActions.map(a => `• ${a.title}`).join('\n')
        : '';
      setWinPrompt({
        sourceType:  'goal',
        sourceId:    goal.id,
        sourceName:  goal.title,
        title:       goal.title,
        date:        new Date().toISOString().slice(0, 10),
        impact:      '',
        description: (goal.notes || '') + actionLines,
        tags:        [],
      });
    }
  }

  function handleWinSave(form) {
    addWin({ ...winPrompt, ...form });
    setWinPrompt(null);
  }

  function handleAddAction(goalId, fields) {
    addAction({ ...fields, linkedGoalIds: [goalId] });
  }

  async function handleSuggestGoals() {
    if (!anthropicKey || !ibmCriteria) {
      setSuggestState({ missingConfig: true });
      return;
    }
    setSuggestState('loading');
    try {
      const res = await fetch('/api/ai/suggest-goals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey:       anthropicKey,
          ibmCriteria,
          careerHistory,
          currentGoals: goals.map(g => ({ title: g.title, status: g.status })),
          wins:         wins.map(w => ({ title: w.title, impact: w.impact })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestState({ suggestions: data.suggestions });
    } catch (err) {
      setSuggestState({ error: err.message });
    }
  }

  function buildCardProps(goal) {
    return {
      goal,
      linkedActions:    actions.filter(a => (a.linkedGoalIds ?? []).includes(goal.id)),
      availableActions: actions.filter(a => !(a.linkedGoalIds ?? []).includes(goal.id)),
      onEdit:           () => openEdit(goal),
      onDelete:         () => handleDelete(goal.id),
      onCycle:          () => handleCycle(goal),
      onAddAction:      handleAddAction,
      onLinkAction:     linkToGoal,
      onUnlinkAction:   unlinkFromGoal,
      onToggleActionDone: toggleDone,
    };
  }

  const milestonesDone = milestones.filter(g => g.status === 'done').length;
  const otherDone      = otherGoals.filter(g => g.status === 'done').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Goals</h1>
        <div className="page-header-actions">
          <button className="btn-secondary btn-ai" onClick={handleSuggestGoals}
            disabled={suggestState === 'loading'}>
            {suggestState === 'loading' ? 'Thinking…' : '✦ Suggest goals'}
          </button>
          <button className="btn-primary" onClick={openAdd}>+ Add goal</button>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">IBM milestones</h2>
          <span className="section-sub">{milestonesDone} / {milestones.length} completed</span>
        </div>
        <div className="goal-list">
          {milestones.map(g => <GoalCard key={g.id} {...buildCardProps(g)} />)}
          {milestones.length === 0 && (
            <p className="list-empty">No IBM milestones set. Add a goal and mark it as an IBM milestone.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Other goals</h2>
          {otherGoals.length > 0 && (
            <span className="section-sub">{otherDone} / {otherGoals.length} done</span>
          )}
        </div>
        <div className="goal-list">
          {otherGoals.map(g => <GoalCard key={g.id} {...buildCardProps(g)} />)}
          {otherGoals.length === 0 && (
            <p className="list-empty">No other goals yet. Add one to start tracking.</p>
          )}
        </div>
      </section>

      {modal && <GoalModal mode={modal.mode} initial={modal.data} onSave={handleSave} onClose={closeModal} />}

      {winPrompt && (
        <WinFormModal mode="prompt" initial={winPrompt}
          promptContext={`"${winPrompt.sourceName}" was just marked as done. Want to log this as a win?`}
          onSave={handleWinSave} onClose={() => setWinPrompt(null)} />
      )}

      {suggestState === 'loading' && null}

      {suggestState?.missingConfig && (
        <SuggestConfigModal onClose={() => setSuggestState(null)} />
      )}

      {suggestState?.error && (
        <SuggestErrorModal error={suggestState.error} onClose={() => setSuggestState(null)} />
      )}

      {suggestState?.suggestions && (
        <SuggestGoalsModal
          suggestions={suggestState.suggestions}
          onAdd={title => addGoal({ title, targetDate: '', status: 'not_started', notes: '', isGate: false })}
          onClose={() => setSuggestState(null)}
        />
      )}
    </div>
  );
}

function GoalModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add goal' : 'Edit goal'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Title
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="What do you want to achieve?" required autoFocus />
          </label>
          <div className="form-row">
            <label>Target date
              <input className="form-input" type="date" value={form.targetDate ?? ''}
                onChange={e => setField('targetDate', e.target.value)} />
            </label>
            <label>Status
              <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
          </div>
          <label>Notes
            <textarea className="form-input form-textarea" value={form.notes ?? ''}
              onChange={e => setField('notes', e.target.value)}
              rows={3} placeholder="Context, milestones, or blockers" />
          </label>
          <label className="form-checkbox-row">
            <input type="checkbox" checked={!!form.isGate} onChange={e => setField('isGate', e.target.checked)} />
            <span>IBM milestone <span className="form-hint">— required by IBM for promotion qualifying</span></span>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{mode === 'add' ? 'Add goal' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuggestConfigModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✦ Setup required</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="suggest-info-text">
            To suggest goals, configure two things in <strong>Admin</strong>:
          </p>
          <ul className="suggest-info-list">
            <li><strong>IBM Partner criteria</strong> — the AI uses these to identify gaps</li>
            <li><strong>AI settings</strong> — your Anthropic API key</li>
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <a className="btn-primary" href="/admin">Go to Admin →</a>
        </div>
      </div>
    </div>
  );
}

function SuggestErrorModal({ error, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Suggestion failed</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="suggest-info-text">{error}</p>
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
