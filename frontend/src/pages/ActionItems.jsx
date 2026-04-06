// pages/ActionItems.jsx

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActionsData } from '../hooks/useActionsData.js';
import { useGoalsData } from '../hooks/useGoalsData.js';
import { fmtDate } from '../data/sampleData.js';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function isOverdue(item) {
  if (!item.dueDate) return false;
  const d = new Date(item.dueDate);
  d.setHours(0, 0, 0, 0);
  return !item.done && d < TODAY;
}

const EMPTY_FORM = { title: '', dueDate: '', linkedGoalIds: [] };

export default function ActionItems() {
  const { actions, addAction, updateAction, removeAction, toggleDone } = useActionsData();
  const { goals } = useGoalsData();
  const [modal, setModal] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterOverdue = searchParams.get('filter') === 'overdue';
  const highlightId   = searchParams.get('id');
  const highlightRef  = useRef(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  const open = actions
    .filter(a => !a.done)
    .sort((a, b) => {
      // overdue first, then by due date ascending, then no-date last
      const aOver = isOverdue(a), bOver = isOverdue(b);
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  const done = actions.filter(a => a.done);

  function linkedGoalNames(action) {
    return (action.linkedGoalIds ?? [])
      .map(id => goals.find(g => g.id === id)?.title)
      .filter(Boolean);
  }

  function openAdd()          { setModal({ mode: 'add',  data: { ...EMPTY_FORM } }); }
  function openEdit(action)   { setModal({ mode: 'edit', data: { ...action } }); }
  function closeModal()       { setModal(null); }

  function handleSave(form) {
    if (modal.mode === 'add') addAction(form);
    else updateAction(modal.data.id, form);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this action item?')) removeAction(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Action items</h1>
        <div className="page-header-actions">
          <span className="page-count">{open.length} open</span>
          <button className="btn-primary" onClick={openAdd}>+ Add action</button>
        </div>
      </div>

      {filterOverdue && (
        <div className="filter-banner">
          Showing overdue items only
          <button className="filter-banner-clear" onClick={() => setSearchParams({})}>Show all</button>
        </div>
      )}

      <div className="card card--list">
        {(filterOverdue ? open.filter(isOverdue) : open).map(a => {
          const overdue    = isOverdue(a);
          const goalNames  = linkedGoalNames(a);
          const isHighlit  = a.id === highlightId;
          return (
            <div key={a.id}
              ref={isHighlit ? highlightRef : null}
              className={`action-item ${overdue ? 'action-item--overdue' : ''} ${isHighlit ? 'action-item--highlight' : ''}`}>
              <button className="action-check action-check--open" onClick={() => toggleDone(a.id)} title="Mark done" />
              <div className="action-body">
                <div className="action-title">{a.title}</div>
                <div className="action-meta">
                  {a.dueDate && (
                    <span className={overdue ? 'action-due action-due--overdue' : 'action-due'}>
                      {overdue ? 'Overdue · ' : 'Due '}{fmtDate(a.dueDate)}
                    </span>
                  )}
                  {goalNames.map(name => (
                    <span key={name} className="action-goal">→ {name}</span>
                  ))}
                </div>
              </div>
              <div className="action-item-btns">
                <button className="row-btn" onClick={() => openEdit(a)}>Edit</button>
                <button className="row-btn row-btn--danger" onClick={() => handleDelete(a.id)}>Remove</button>
              </div>
            </div>
          );
        })}

        {open.length === 0 && done.length === 0 && (
          <div className="list-empty">No action items yet. Add one above or use Quick add on the Dashboard.</div>
        )}
        {open.length === 0 && done.length > 0 && (
          <div className="list-empty">All caught up — no open action items.</div>
        )}

        {done.length > 0 && (
          <>
            <div className="action-divider">Completed</div>
            {done.map(a => {
              const goalNames = linkedGoalNames(a);
              const isHighlit = a.id === highlightId;
              return (
                <div key={a.id}
                  ref={isHighlit ? highlightRef : null}
                  className={`action-item action-item--done ${isHighlit ? 'action-item--highlight' : ''}`}>
                  <button className="action-check action-check--done" onClick={() => toggleDone(a.id)} title="Mark undone" />
                  <div className="action-body">
                    <div className="action-title action-title--done">{a.title}</div>
                    <div className="action-meta">
                      {a.dueDate && (
                        <span className="action-due">Completed · {fmtDate(a.dueDate)}</span>
                      )}
                      {goalNames.map(name => (
                        <span key={name} className="action-goal">→ {name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="action-item-btns">
                    <button className="row-btn" onClick={() => openEdit(a)}>Edit</button>
                    <button className="row-btn row-btn--danger" onClick={() => handleDelete(a.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {modal && (
        <ActionModal
          mode={modal.mode}
          initial={modal.data}
          goals={goals}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function ActionModal({ mode, initial, goals, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function toggleGoal(goalId) {
    setForm(f => ({
      ...f,
      linkedGoalIds: f.linkedGoalIds.includes(goalId)
        ? f.linkedGoalIds.filter(id => id !== goalId)
        : [...f.linkedGoalIds, goalId],
    }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add action item' : 'Edit action item'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Title
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="What needs to be done?" required autoFocus />
          </label>

          <label>Due date
            <input className="form-input" type="date" value={form.dueDate ?? ''}
              onChange={e => setField('dueDate', e.target.value)} />
          </label>

          {goals.length > 0 && (
            <div className="form-field">
              <span className="form-label">Linked goals</span>
              <div className="action-goal-list">
                {goals.map(g => (
                  <label key={g.id} className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.linkedGoalIds.includes(g.id)}
                      onChange={() => toggleGoal(g.id)}
                    />
                    <span className={g.status === 'done' ? 'action-goal-done-label' : ''}>{g.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add action' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
