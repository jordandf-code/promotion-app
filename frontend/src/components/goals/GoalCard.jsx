// components/goals/GoalCard.jsx
// Renders a single goal with its linked action items.
// linkedActions   — actions already linked to this goal
// availableActions — actions not yet linked to this goal (for the "link existing" dropdown)

import { useState } from 'react';
import { STATUS_LABELS, nextStatus } from '../../hooks/useGoalsData.js';
import { fmtDate } from '../../data/sampleData.js';

export default function GoalCard({ goal, linkedActions, availableActions, onEdit, onDelete, onCycle, onAddAction, onLinkAction, onUnlinkAction, onToggleActionDone }) {
  const [showNewForm,   setShowNewForm]   = useState(false);
  const [newTitle,      setNewTitle]      = useState('');
  const [newDueDate,    setNewDueDate]    = useState('');
  const [linkSelection, setLinkSelection] = useState('');

  const isOverdue = goal.status !== 'done' && goal.targetDate && new Date(goal.targetDate) < new Date();

  function handleAddNew(e) {
    e.preventDefault();
    onAddAction(goal.id, { title: newTitle.trim(), dueDate: newDueDate });
    setNewTitle('');
    setNewDueDate('');
    setShowNewForm(false);
  }

  function handleLinkExisting() {
    if (!linkSelection) return;
    onLinkAction(linkSelection, goal.id);
    setLinkSelection('');
  }

  const openLinked   = linkedActions.filter(a => !a.done);
  const doneLinked   = linkedActions.filter(a =>  a.done);

  return (
    <div className={`goal-card ${goal.isGate ? 'goal-card--milestone' : ''} ${goal.status === 'done' ? 'goal-card--done' : ''}`}>

      {/* ── Card header ── */}
      <div className="goal-card-top">
        <div className="goal-card-left">
          {goal.isGate && <span className="milestone-badge">IBM milestone</span>}
          <h3 className="goal-card-title">{goal.title}</h3>
          {goal.notes && <p className="goal-card-notes">{goal.notes}</p>}
        </div>
        <div className="goal-card-right">
          <button
            className={`status-badge status-badge--${goal.status} status-badge--btn`}
            onClick={onCycle}
            title={`Click to advance → ${STATUS_LABELS[nextStatus(goal.status)]}`}
          >
            {STATUS_LABELS[goal.status]}
          </button>
          {goal.targetDate && (
            <div className={`goal-card-date ${isOverdue ? 'goal-card-date--overdue' : ''}`}>
              {isOverdue ? 'Overdue · ' : 'Due '}{fmtDate(goal.targetDate)}
            </div>
          )}
          <div className="goal-card-actions">
            <button className="row-btn" onClick={onEdit}>Edit</button>
            <button className="row-btn row-btn--danger" onClick={onDelete}>✕</button>
          </div>
        </div>
      </div>

      {/* ── Linked action items ── */}
      <div className="goal-actions-section">
        <div className="goal-actions-header">
          <span className="goal-actions-title">
            Action items{linkedActions.length > 0 ? ` (${linkedActions.length})` : ''}
          </span>
          <div className="goal-actions-header-btns">
            <button className="goal-action-add-btn" onClick={() => { setShowNewForm(s => !s); setLinkSelection(''); }}>
              + New
            </button>
            {availableActions.length > 0 && !showNewForm && (
              <select
                className="goal-link-select"
                value={linkSelection}
                onChange={e => setLinkSelection(e.target.value)}
              >
                <option value="">Link existing…</option>
                {availableActions.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            )}
            {linkSelection && (
              <button className="goal-action-add-btn" onClick={handleLinkExisting}>Link</button>
            )}
          </div>
        </div>

        {showNewForm && (
          <form className="goal-new-action-form" onSubmit={handleAddNew}>
            <input
              className="form-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Action item title"
              required
              autoFocus
            />
            <input
              className="form-input"
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              required
            />
            <div className="goal-new-action-btns">
              <button type="button" className="btn-secondary" onClick={() => setShowNewForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Add</button>
            </div>
          </form>
        )}

        {openLinked.map(a => (
          <ActionRow key={a.id} action={a} goalId={goal.id} onToggleDone={onToggleActionDone} onUnlink={onUnlinkAction} />
        ))}

        {doneLinked.length > 0 && openLinked.length > 0 && (
          <div className="goal-actions-divider">Completed</div>
        )}

        {doneLinked.map(a => (
          <ActionRow key={a.id} action={a} goalId={goal.id} onToggleDone={onToggleActionDone} onUnlink={onUnlinkAction} />
        ))}

        {linkedActions.length === 0 && !showNewForm && (
          <p className="goal-actions-empty">No action items linked yet.</p>
        )}
      </div>
    </div>
  );
}

function ActionRow({ action, goalId, onToggleDone, onUnlink }) {
  const isOverdue = !action.done && new Date(action.dueDate) < new Date();
  return (
    <div className={`goal-action-row ${action.done ? 'goal-action-row--done' : ''}`}>
      <button
        className={`goal-action-check ${action.done ? 'goal-action-check--done' : ''}`}
        onClick={() => onToggleDone(action.id)}
        title={action.done ? 'Mark undone' : 'Mark done'}
      />
      <span className={`goal-action-title ${action.done ? 'goal-action-title--done' : ''}`}>
        {action.title}
      </span>
      {action.dueDate && (
        <span className={`goal-action-due ${isOverdue ? 'goal-action-due--overdue' : ''}`}>
          {fmtDate(action.dueDate)}
        </span>
      )}
      <button className="goal-action-unlink" onClick={() => onUnlink(action.id, goalId)} title="Unlink from this goal">✕</button>
    </div>
  );
}
