// ActionItems.jsx — Task list with overdue/upcoming filtering and goal linking

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useActionsData } from '../hooks/useActionsData.js';
import { useGoalsData } from '../hooks/useGoalsData.js';
import { fmtDate } from '../data/sampleData.js';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';

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
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [extractModal, setExtractModal] = useState(false);
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
          <button className="btn-ghost" onClick={() => navigate('/import-export')}>Import / Export</button>
          <button className="btn-secondary btn-ai" onClick={() => setExtractModal(true)}>Extract from notes</button>
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

      {extractModal && (
        <ExtractActionsModal
          onAdd={(items) => {
            items.forEach(item => addAction({
              title: item.title,
              dueDate: item.dueDate || '',
              done: false,
              linkedGoalIds: [],
            }));
            setExtractModal(false);
          }}
          onClose={() => setExtractModal(false)}
        />
      )}
    </div>
  );
}

function ActionModal({ mode, initial, goals, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState({});
  const setField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  function toggleGoal(goalId) {
    setForm(f => ({
      ...f,
      linkedGoalIds: f.linkedGoalIds.includes(goalId)
        ? f.linkedGoalIds.filter(id => id !== goalId)
        : [...f.linkedGoalIds, goalId],
    }));
  }

  function validate() {
    const errs = {};
    if (!form.title?.trim()) errs.title = 'Required';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add action item' : 'Edit action item'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Title <span className="form-required">*</span>
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="What needs to be done?" autoFocus />
            {errors.title && <span className="field-error">{errors.title}</span>}
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

function ExtractActionsModal({ onAdd, onClose }) {
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | results | error
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [editTitles, setEditTitles] = useState({});
  const [error, setError] = useState('');

  async function handleExtract() {
    if (!text.trim()) return;
    setState('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/extract-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.code === 'NO_KEY') {
          setError('No API key configured — add one in Admin settings.');
        } else {
          setError(mapAiError(data.code, data.error));
        }
        setState('error');
        return;
      }
      if (data.actions.length === 0) {
        setError('No action items found in the text.');
        setState('error');
        return;
      }
      setResults(data.actions);
      setSelected(new Set(data.actions.map((_, i) => i)));
      setState('results');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  function toggleSelect(idx) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function updateTitle(idx, value) {
    setEditTitles(prev => ({ ...prev, [idx]: value }));
  }

  function handleAdd() {
    const items = results
      .map((item, i) => ({ ...item, title: editTitles[i] ?? item.title, _idx: i }))
      .filter(item => selected.has(item._idx))
      .map(({ _idx, ...item }) => item);
    onAdd(items);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Extract action items</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-form">
          {state === 'idle' || state === 'loading' || state === 'error' ? (
            <>
              <label>
                Paste text
                <textarea
                  className="form-input"
                  rows={8}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste meeting notes, email, or any text..."
                  style={{ resize: 'vertical', width: '100%' }}
                  autoFocus
                />
              </label>
              {state === 'error' && (
                <div className="field-error" style={{ marginBottom: 'var(--space-3)' }}>{error}</div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!text.trim() || state === 'loading'}
                  onClick={handleExtract}
                >
                  {state === 'loading' ? 'Extracting...' : 'Extract'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-secondary)' }}>
                {results.length} action{results.length !== 1 ? 's' : ''} found — uncheck any you do not want to add.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {results.map((item, i) => (
                  <label key={i} className="form-checkbox-row" style={{ alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        className="form-input"
                        value={editTitles[i] ?? item.title}
                        onChange={e => updateTitle(i, e.target.value)}
                        style={{ width: '100%', fontWeight: 500 }}
                      />
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {item.dueDate && <span>Due {fmtDate(item.dueDate)} · </span>}
                        {item.context}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setState('idle'); setResults([]); }}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selected.size === 0}
                  onClick={handleAdd}
                >
                  Add {selected.size} action{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
