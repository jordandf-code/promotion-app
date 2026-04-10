// components/people/PersonCard.jsx
// Person card: header with edit/remove, contact info, touchpoint log, planned contacts.

import { useState } from 'react';
import { lastContactDate, daysSinceContact, RELATIONSHIP_STATUS_LABELS, nextRelationshipStatus, INFLUENCE_TIER_LABELS, INFLUENCE_TIER_COLORS, STRATEGIC_IMPORTANCE_LABELS } from '../../hooks/usePeopleData.js';
import { fmtDate } from '../../data/sampleData.js';
import PlannedContactSection from './PlannedContactSection.jsx';

const TODAY_STR = new Date().toISOString().slice(0, 10);

export default function PersonCard({
  person,
  relationshipTypes,

  onEdit,
  onDelete,
  onUpdatePerson,
  onAddTouchpoint,
  onRemoveTouchpoint,
  onAddPlannedTouchpoint,
  onRemovePlannedTouchpoint,
  onLogPlannedTouchpoint,
  onRequestFeedback,
  onPrepMeeting,
  actions,
  onAddAction,
  onToggleActionDone,
}) {
  const [showLog,  setShowLog]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tpDate,   setTpDate]   = useState(TODAY_STR);
  const [tpNote,   setTpNote]   = useState('');

  const typeColor = (relationshipTypes ?? []).find(t => t.label === person.type)?.color ?? '#64748b';
  const since    = daysSinceContact(person);
  const lastDate = lastContactDate(person);
  const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const stale = since > 30;

  function handleAddTouchpoint(e) {
    e.preventDefault();
    onAddTouchpoint(person.id, { date: tpDate, note: tpNote.trim() });
    setTpNote('');
    setTpDate(TODAY_STR);
    setShowForm(false);
    setShowLog(true);
  }

  return (
    <div className={`person-card ${stale ? 'person-card--stale' : ''}`}>

      {/* ── Header ── */}
      <div className="person-card-top">
        <div className="person-avatar">{initials}</div>
        <div className="person-card-info">
          <div className="person-name">{person.name}</div>
          <div className="person-title">{person.title}</div>
          <div className="person-org">{person.org}</div>
        </div>
        <div className="person-card-actions">
          {onPrepMeeting && (
            <button className="row-btn" onClick={() => onPrepMeeting(person)} title="Prep meeting">Prep meeting</button>
          )}
          {person.email && onRequestFeedback && (
            <button className="row-btn" onClick={() => onRequestFeedback(person)} title="Request 360 feedback">Feedback</button>
          )}
          <button className="row-btn" onClick={onEdit}>Edit</button>
          <button className="row-btn row-btn--danger" onClick={onDelete}>Remove</button>
        </div>
      </div>

      {/* ── Type + stale flag ── */}
      <div className="person-type-row">
        <span className="type-badge" style={{
          background:  typeColor + '18',
          color:       typeColor,
          border:      `1px solid ${typeColor}55`,
        }}>{person.type}</span>
        <button
          className={`status-badge status-badge--${person.relationshipStatus === 'established' ? 'done' : 'in_progress'} status-badge--btn`}
          onClick={() => onUpdatePerson(person.id, { relationshipStatus: nextRelationshipStatus(person.relationshipStatus ?? 'in-progress') })}
          title={`Click to change → ${RELATIONSHIP_STATUS_LABELS[nextRelationshipStatus(person.relationshipStatus ?? 'in-progress')]}`}
        >
          {RELATIONSHIP_STATUS_LABELS[person.relationshipStatus ?? 'in-progress']}
        </button>
        {person.influenceTier && (
          <span className="type-badge" style={{
            background: INFLUENCE_TIER_COLORS[person.influenceTier] + '18',
            color: INFLUENCE_TIER_COLORS[person.influenceTier],
            border: `1px solid ${INFLUENCE_TIER_COLORS[person.influenceTier]}55`,
          }}>{INFLUENCE_TIER_LABELS[person.influenceTier]}</span>
        )}
        {person.strategicImportance && (
          <span className="type-badge" style={{
            background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1',
          }}>{STRATEGIC_IMPORTANCE_LABELS[person.strategicImportance]}</span>
        )}
        {stale && <span className="stale-badge">Follow up needed</span>}
      </div>

      {/* ── Stakeholder group ── */}
      {person.stakeholderGroup && (
        <div className="person-stakeholder-group" style={{ padding: '0 0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
          {person.stakeholderGroup}
        </div>
      )}

      {/* ── Contact info ── */}
      {(person.email || person.phone) && (
        <div className="person-contact-info">
          {person.email && <a className="person-contact-link" href={`mailto:${person.email}`}>{person.email}</a>}
          {person.phone && <span className="person-contact-phone">{person.phone}</span>}
        </div>
      )}

      {/* ── What I need ── */}
      {person.need && <p className="person-need"><strong>What I need:</strong> {person.need}</p>}

      {/* ── Last contact ── */}
      <div className="person-last-contact">
        {lastDate
          ? <>Last contact: {fmtDate(lastDate)} · <span className={stale ? 'stale-days' : 'fresh-days'}>{since === Infinity ? 'never' : `${since}d ago`}</span></>
          : <span className="stale-days">No contact logged yet</span>
        }
      </div>

      {/* ── Planned contacts ── */}
      <PlannedContactSection
        person={person}
        actions={actions}
        onAdd={onAddPlannedTouchpoint}
        onRemove={onRemovePlannedTouchpoint}
        onLog={onLogPlannedTouchpoint}
        onAddAction={onAddAction}
        onToggleActionDone={onToggleActionDone}
      />

      {/* ── Past touchpoints ── */}
      <div className="person-log-section">
        <div className="person-log-header">
          <button className="person-log-toggle" onClick={() => setShowLog(s => !s)}>
            {showLog ? '▾' : '▸'} Touchpoints ({person.touchpoints.length})
          </button>
          <button className="goal-action-add-btn" onClick={() => { setShowForm(s => !s); setShowLog(true); }}>
            + Log touchpoint
          </button>
        </div>

        {(showLog || showForm) && (
          <div className="person-log-body">
            {showForm && (
              <form className="tp-form" onSubmit={handleAddTouchpoint}>
                <label className="tp-label">Date
                  <input className="form-input" type="date" value={tpDate}
                    onChange={e => setTpDate(e.target.value)} required />
                </label>
                <label className="tp-label">Note
                  <textarea className="form-input form-textarea" value={tpNote}
                    onChange={e => setTpNote(e.target.value)}
                    placeholder="Brief note on the interaction"
                    required autoFocus rows={2} />
                </label>
                <div className="tp-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save</button>
                </div>
              </form>
            )}

            {person.touchpoints.length === 0 && !showForm && (
              <p className="goal-actions-empty">No touchpoints logged yet.</p>
            )}

            {person.touchpoints
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(tp => (
                <div key={tp.id} className="tp-row">
                  <span className="tp-date-label">{fmtDate(tp.date)}</span>
                  <span className="tp-note-text">{tp.note}</span>
                  <button className="goal-action-unlink" onClick={() => onRemoveTouchpoint(person.id, tp.id)} title="Remove">✕</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
