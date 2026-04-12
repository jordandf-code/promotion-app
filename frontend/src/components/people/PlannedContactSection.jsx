// components/people/PlannedContactSection.jsx
// Planned (future) contacts: date, note, optional action item link.
// "Log as done" converts the planned entry to a real touchpoint.

import { useState } from 'react';
import { fmtDate } from '../../data/sampleData.js';

const TODAY_STR = new Date().toISOString().slice(0, 10);

export default function PlannedContactSection({
  person,
  actions,
  onAdd,
  onRemove,
  onLog,
  onUpdateDate,
  onAddAction,
  onToggleActionDone,
}) {
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date,        setDate]        = useState(TODAY_STR);
  const [note,        setNote]        = useState('');
  const [actionMode,  setActionMode]  = useState('create');
  const [actionTitle, setActionTitle] = useState('');
  const [linkId,      setLinkId]      = useState('');
  const [recurring,   setRecurring]   = useState(false);
  const [intervalDays, setIntervalDays] = useState(14);

  // Log confirmation state — which planned touchpoint is being confirmed
  const [loggingPt,  setLoggingPt]  = useState(null);
  const [logDate,    setLogDate]    = useState('');
  const [logNote,    setLogNote]    = useState('');

  // Inline date edit state
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');

  const planned          = person.plannedTouchpoints || [];
  const incompleteActions = actions.filter(a => !a.done);

  function openForm() {
    setDate(TODAY_STR);
    setNote('');
    setActionMode('create');
    setActionTitle(`Contact ${person.name}`);
    setLinkId('');
    setRecurring(false);
    setIntervalDays(14);
    setShowForm(true);
    setShowList(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    let actionId = null;
    if (actionMode === 'create') {
      actionId = onAddAction({ title: actionTitle.trim(), dueDate: date });
    } else if (actionMode === 'link' && linkId) {
      actionId = linkId;
    }
    // Issue #50: Auto-create prep action 3 days before the planned touchpoint
    let prepActionId = null;
    if (actionMode !== 'none') {
      const prepDate = new Date(date);
      prepDate.setDate(prepDate.getDate() - 3);
      const prepDateStr = prepDate.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      prepActionId = onAddAction({
        title: `Prepare for ${person.name} touchpoint — what's my goal?`,
        dueDate: prepDateStr < today ? today : prepDateStr,
      });
    }

    const recurrence = recurring ? { enabled: true, intervalDays } : undefined;
    onAdd(person.id, { date, note: note.trim(), actionId, prepActionId, ...(recurrence && { recurrence }) });

    setShowForm(false);
  }

  function startLog(pt) {
    setLoggingPt(pt);
    setLogDate(pt.date);
    setLogNote('');
    setShowList(true);
  }

  function confirmLog(e) {
    e.preventDefault();
    onLog(person.id, loggingPt.id, { date: logDate, note: logNote.trim() });
    if (loggingPt.actionId) onToggleActionDone(loggingPt.actionId);
    setLoggingPt(null);
  }

  return (
    <div className="person-log-section">
      <div className="person-log-header">
        <button className="person-log-toggle" onClick={() => setShowList(s => !s)}>
          {showList ? '▾' : '▸'} Planned contacts ({planned.length})
        </button>
        <button className="goal-action-add-btn" onClick={openForm}>+ Plan contact</button>
      </div>

      {(showList || showForm) && (
        <div className="person-log-body">
          {showForm && (
            <form className="tp-form" onSubmit={handleSubmit}>
              <label className="tp-label">Date
                <input className="form-input" type="date" value={date}
                  onChange={e => setDate(e.target.value)} required />
              </label>
              <label className="tp-label">Note
                <textarea className="form-input form-textarea" value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Purpose of the contact"
                  rows={2} />
              </label>
              <div className="tp-label">Action item
                <div className="planned-action-modes">
                  {['create', 'link', 'none'].map(mode => (
                    <label key={mode} className="planned-mode-option">
                      <input type="radio" value={mode} checked={actionMode === mode}
                        onChange={() => setActionMode(mode)} />
                      {mode === 'create' ? 'Create new' : mode === 'link' ? 'Link existing' : 'None'}
                    </label>
                  ))}
                </div>
              </div>
              {actionMode === 'create' && (
                <label className="tp-label">Action title
                  <input className="form-input" value={actionTitle}
                    onChange={e => setActionTitle(e.target.value)} required />
                </label>
              )}
              {actionMode === 'link' && (
                <label className="tp-label">Select action
                  <select className="form-input" value={linkId}
                    onChange={e => setLinkId(e.target.value)} required>
                    <option value="">— choose —</option>
                    {incompleteActions.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="tp-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={recurring}
                  onChange={e => setRecurring(e.target.checked)} />
                Recurring
              </label>
              {recurring && (
                <label className="tp-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '1.5rem' }}>
                  Repeat every
                  <input className="form-input" type="number" min={1} value={intervalDays}
                    onChange={e => setIntervalDays(Math.max(1, parseInt(e.target.value) || 14))}
                    style={{ width: '4rem', padding: '0.2rem 0.4rem' }} />
                  <span className="form-unit">days</span>
                </label>
              )}
              <div className="tp-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          )}

          {planned.length === 0 && !showForm && (
            <p className="goal-actions-empty">No planned contacts.</p>
          )}

          {[...planned]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(pt => {
              const linkedAction = pt.actionId ? actions.find(a => a.id === pt.actionId) : null;
              const isLogging = loggingPt?.id === pt.id;
              return (
                <div key={pt.id}>
                  <div className="tp-row tp-row--planned">
                    <span className="tp-date-label">
                      {editingDateId === pt.id ? (
                        <input
                          className="form-input"
                          type="date"
                          value={editDateValue}
                          onChange={e => setEditDateValue(e.target.value)}
                          onBlur={() => {
                            if (editDateValue && editDateValue !== pt.date && onUpdateDate) {
                              onUpdateDate(person.id, pt.id, editDateValue);
                            }
                            setEditingDateId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') setEditingDateId(null);
                          }}
                          autoFocus
                          style={{ width: '9rem', padding: '0.15rem 0.3rem', fontSize: '0.85rem' }}
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => { setEditingDateId(pt.id); setEditDateValue(pt.date); }}
                            style={{ cursor: 'pointer' }}
                            title="Click to edit date"
                          >
                            {fmtDate(pt.date)}
                          </span>
                          {pt.recurrence?.enabled && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.8em', opacity: 0.7 }}>
                              ↻ every {pt.recurrence.intervalDays}d
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <div className="tp-planned-body">
                      {pt.note && <span className="tp-note-text">{pt.note}</span>}
                      {linkedAction && (
                        <span className="tp-action-link">→ {linkedAction.title}</span>
                      )}
                    </div>
                    <div className="tp-planned-btns">
                      <button className="tp-log-btn" onClick={() => startLog(pt)}>Mark done</button>
                      <button className="goal-action-unlink" onClick={() => onRemove(person.id, pt.id)} title="Remove">✕</button>
                    </div>
                  </div>
                  {isLogging && (
                    <form className="tp-form tp-log-form" onSubmit={confirmLog}>
                      <p className="tp-log-form-heading">Log this contact as done</p>
                      <label className="tp-label">Date
                        <input className="form-input" type="date" value={logDate}
                          onChange={e => setLogDate(e.target.value)} required />
                      </label>
                      <label className="tp-label">Outcome note
                        <textarea className="form-input form-textarea" value={logNote}
                          onChange={e => setLogNote(e.target.value)}
                          placeholder="What happened in this interaction?"
                          autoFocus rows={2} />
                      </label>
                      <div className="tp-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setLoggingPt(null)}>Cancel</button>
                        <button type="submit" className="btn-primary">Confirm</button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
