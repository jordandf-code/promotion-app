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

  // Log confirmation state — which planned touchpoint is being confirmed
  const [loggingPt,  setLoggingPt]  = useState(null);
  const [logDate,    setLogDate]    = useState('');
  const [logNote,    setLogNote]    = useState('');

  const planned          = person.plannedTouchpoints || [];
  const incompleteActions = actions.filter(a => !a.done);

  function openForm() {
    setDate(TODAY_STR);
    setNote('');
    setActionMode('create');
    setActionTitle(`Contact ${person.name}`);
    setLinkId('');
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
    onAdd(person.id, { date, note: note.trim(), actionId });
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
                    <span className="tp-date-label">{fmtDate(pt.date)}</span>
                    <div className="tp-planned-body">
                      {pt.note && <span className="tp-note-text">{pt.note}</span>}
                      {linkedAction && (
                        <span className="tp-action-link">→ {linkedAction.title}</span>
                      )}
                    </div>
                    <div className="tp-planned-btns">
                      <button className="tp-log-btn" onClick={() => startLog(pt)}>✓ Log</button>
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
