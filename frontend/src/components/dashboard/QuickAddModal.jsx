// components/dashboard/QuickAddModal.jsx
// Quick-add modal for Win, Action item, Goal, Person, and Opportunity from the Dashboard.

import { useState } from 'react';
import { useAdminData } from '../../hooks/useAdminData.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const TODAY = new Date();

function todayStr() {
  return TODAY.toISOString().slice(0, 10);
}
function plusDays(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const MODES = [
  { id: 'win',         label: 'Win'         },
  { id: 'action',      label: 'Action item' },
  { id: 'goal',        label: 'Goal'        },
  { id: 'person',      label: 'Person'      },
  { id: 'opportunity', label: 'Opportunity' },
];

export default function QuickAddModal({ onAddWin, onAddAction, onAddGoal, onAddPerson, onAddOpportunity, onClose }) {
  const { winTags, relationshipTypes } = useAdminData();
  const { scorecardYears, currencySymbol, fromInputValue } = useSettings();
  const currentYear = TODAY.getFullYear();

  const [mode, setMode] = useState('win');

  const [win,  setWin]  = useState({ title: '', date: todayStr(), description: '', impact: '', tags: [] });
  const [action, setAction] = useState({ title: '', dueDate: plusDays(7) });
  const [goal,   setGoal]   = useState({ title: '', dueDate: '', description: '' });
  const [person, setPerson] = useState({ name: '', type: relationshipTypes[0]?.label ?? '', title: '', org: '' });
  const [opp,    setOpp]    = useState({ name: '', client: '', year: currentYear, status: 'open', signingsValue: '' });

  function toggleWinTag(tag) {
    setWin(w => ({
      ...w,
      tags: w.tags.includes(tag) ? w.tags.filter(t => t !== tag) : [...w.tags, tag],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    switch (mode) {
      case 'win':
        if (!win.title.trim()) return;
        onAddWin({ ...win, title: win.title.trim(), description: win.description.trim(), impact: win.impact.trim() });
        break;
      case 'action':
        if (!action.title.trim()) return;
        onAddAction({ title: action.title.trim(), dueDate: action.dueDate, linkedGoalIds: [] });
        break;
      case 'goal':
        if (!goal.title.trim()) return;
        onAddGoal({ title: goal.title.trim(), dueDate: goal.dueDate || null, description: goal.description.trim(), status: 'not-started', linkedActionIds: [] });
        break;
      case 'person':
        if (!person.name.trim()) return;
        onAddPerson({ name: person.name.trim(), title: person.title.trim(), org: person.org.trim(), type: person.type, email: '', phone: '', need: '' });
        break;
      case 'opportunity':
        if (!opp.name.trim() || !opp.client.trim()) return;
        onAddOpportunity({
          name: opp.name.trim(), client: opp.client.trim(),
          year: Number(opp.year), status: opp.status, winDate: null,
          totalValue: fromInputValue(opp.signingsValue) ?? 0,
          signingsValue: fromInputValue(opp.signingsValue) ?? 0,
        });
        break;
    }
    onClose();
  }

  const submitLabel = {
    win: 'Add win', action: 'Add action', goal: 'Add goal',
    person: 'Add person', opportunity: 'Add opportunity',
  }[mode];

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Quick add</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="qa-mode-tabs">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              className={`qa-mode-tab ${mode === m.id ? 'qa-mode-tab--active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="qa-form-body">

          {/* ── Win ── */}
          {mode === 'win' && (
            <>
              <div className="form-row">
                <label>Title
                  <input className="form-input" value={win.title}
                    onChange={e => setWin(w => ({ ...w, title: e.target.value }))}
                    placeholder="What did you achieve?" required autoFocus />
                </label>
                <label>Date
                  <input className="form-input" type="date" value={win.date}
                    onChange={e => setWin(w => ({ ...w, date: e.target.value }))} required />
                </label>
              </div>
              <label>Impact
                <input className="form-input" value={win.impact}
                  onChange={e => setWin(w => ({ ...w, impact: e.target.value }))}
                  placeholder="Quantify the result if possible" />
              </label>
              <label>Description
                <textarea className="form-input form-textarea" value={win.description}
                  onChange={e => setWin(w => ({ ...w, description: e.target.value }))}
                  rows={3} placeholder="Context or details" />
              </label>
              <div className="form-field">
                <span className="form-label">Tags</span>
                <div className="qa-tags">
                  {winTags.map(({ label, color }) => {
                    const active = win.tags.includes(label);
                    return (
                      <button key={label} type="button"
                        className={`qa-tag ${active ? 'qa-tag--active' : 'qa-tag--idle'}`}
                        style={active ? { background: color + '20', color, borderColor: color, borderStyle: 'solid' } : {}}
                        onClick={() => toggleWinTag(label)}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Action item ── */}
          {mode === 'action' && (
            <>
              <label>Title
                <input className="form-input" value={action.title}
                  onChange={e => setAction(a => ({ ...a, title: e.target.value }))}
                  placeholder="What needs to be done?" required autoFocus />
              </label>
              <label>Due date
                <input className="form-input" type="date" value={action.dueDate}
                  onChange={e => setAction(a => ({ ...a, dueDate: e.target.value }))} required />
              </label>
            </>
          )}

          {/* ── Goal ── */}
          {mode === 'goal' && (
            <>
              <label>Title
                <input className="form-input" value={goal.title}
                  onChange={e => setGoal(g => ({ ...g, title: e.target.value }))}
                  placeholder="What do you want to achieve?" required autoFocus />
              </label>
              <label>Due date
                <input className="form-input" type="date" value={goal.dueDate}
                  onChange={e => setGoal(g => ({ ...g, dueDate: e.target.value }))} />
              </label>
              <label>Description
                <textarea className="form-input form-textarea" value={goal.description}
                  onChange={e => setGoal(g => ({ ...g, description: e.target.value }))}
                  rows={2} placeholder="Context or success criteria" />
              </label>
            </>
          )}

          {/* ── Person ── */}
          {mode === 'person' && (
            <>
              <label>Name
                <input className="form-input" value={person.name}
                  onChange={e => setPerson(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full name" required autoFocus />
              </label>
              <div className="form-row">
                <label>Role / title
                  <input className="form-input" value={person.title}
                    onChange={e => setPerson(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Director" />
                </label>
                <label>Organization
                  <input className="form-input" value={person.org}
                    onChange={e => setPerson(p => ({ ...p, org: e.target.value }))}
                    placeholder="e.g. Acme Corp" />
                </label>
              </div>
              <label>Relationship type
                <select className="form-input" value={person.type}
                  onChange={e => setPerson(p => ({ ...p, type: e.target.value }))}>
                  {relationshipTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </label>
            </>
          )}

          {/* ── Opportunity ── */}
          {mode === 'opportunity' && (
            <>
              <div className="form-row">
                <label>Opportunity name<span className="form-required">*</span>
                  <input className="form-input" value={opp.name}
                    onChange={e => setOpp(o => ({ ...o, name: e.target.value }))}
                    placeholder="Deal or engagement name" required autoFocus />
                </label>
                <label>Client<span className="form-required">*</span>
                  <input className="form-input" value={opp.client}
                    onChange={e => setOpp(o => ({ ...o, client: e.target.value }))}
                    placeholder="Client name" required />
                </label>
              </div>
              <div className="form-row">
                <label>Year
                  <select className="form-input" value={opp.year}
                    onChange={e => setOpp(o => ({ ...o, year: e.target.value }))}>
                    {scorecardYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                </label>
                <label>Status
                  <select className="form-input" value={opp.status}
                    onChange={e => setOpp(o => ({ ...o, status: e.target.value }))}>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </label>
              </div>
              <label>Signings value<span className="form-unit">{currencySymbol}</span>
                <input className="form-input" type="number" min="0" inputMode="decimal" value={opp.signingsValue}
                  onChange={e => setOpp(o => ({ ...o, signingsValue: e.target.value }))}
                  placeholder="0" />
              </label>
            </>
          )}

          </div>{/* qa-form-body */}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
