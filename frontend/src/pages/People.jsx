// People.jsx — Relationship management with influence tiers, contact log, and planned touchpoints

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePeopleData, daysSinceContact, RELATIONSHIP_STATUSES, RELATIONSHIP_STATUS_LABELS, INFLUENCE_TIERS, INFLUENCE_TIER_LABELS, STRATEGIC_IMPORTANCE, STRATEGIC_IMPORTANCE_LABELS, DEFAULT_STAKEHOLDER_GROUPS } from '../hooks/usePeopleData.js';
import CoverageSummary from '../components/people/CoverageSummary.jsx';
import MeetingPrepModal from '../components/people/MeetingPrepModal.jsx';
import { useAdminData } from '../hooks/useAdminData.js';
import { useActionsData } from '../hooks/useActionsData.js';
import PersonCard from '../components/people/PersonCard.jsx';
import { API_BASE, authHeaders } from '../utils/api.js';

const EMPTY_FORM = { name: '', title: '', org: '', type: '', relationshipStatus: 'in-progress', email: '', phone: '', need: '', influenceTier: '', strategicImportance: '', stakeholderGroup: '' };

export default function People() {
  const {
    people, addPerson, updatePerson, removePerson,
    addTouchpoint, removeTouchpoint,
    addPlannedTouchpoint, removePlannedTouchpoint, logPlannedTouchpoint,
  } = usePeopleData();
  const { relationshipTypes } = useAdminData();
  const { actions, addAction, toggleDone } = useActionsData();

  const [typeFilter,      setTypeFilter]      = useState('all');
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [influenceFilter, setInfluenceFilter] = useState('all');
  const [modal,      setModal]      = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null); // { person }
  const [prepPerson, setPrepPerson] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStale = searchParams.get('filter') === 'stale';

  function isStale(person) {
    return daysSinceContact(person) > 30;
  }

  const filtered = people
    .filter(p => typeFilter === 'all' || p.type === typeFilter)
    .filter(p => statusFilter === 'all' || p.relationshipStatus === statusFilter)
    .filter(p => influenceFilter === 'all' || p.influenceTier === influenceFilter)
    .filter(p => !filterStale || isStale(p))
    .sort((a, b) => daysSinceContact(b) - daysSinceContact(a));

  const staleCount = people.filter(p => isStale(p)).length;

  // Merge default groups with any custom groups users have entered
  const stakeholderGroups = [...new Set([...DEFAULT_STAKEHOLDER_GROUPS, ...people.map(p => p.stakeholderGroup).filter(Boolean)])];

  function openAdd()        { setModal({ mode: 'add',  data: { ...EMPTY_FORM, type: relationshipTypes[0]?.label || '' } }); }
  function openEdit(person) { setModal({ mode: 'edit', data: { ...person } }); }
  function closeModal()     { setModal(null); }

  function handleSave(form) {
    if (modal.mode === 'add') addPerson(form);
    else updatePerson(modal.data.id, form);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this person?')) removePerson(id);
  }

  function handlePrepSave(prep) {
    const person = prepPerson;
    updatePerson(person.id, {
      meeting_preps: [...(person.meeting_preps || []), prep],
    });
    // Add a touchpoint if debrief has outcomes
    if (prep.debrief?.outcomes) {
      addTouchpoint(person.id, {
        date: prep.date,
        note: 'Meeting: ' + prep.debrief.outcomes.slice(0, 100),
      });
    }
    setPrepPerson(null);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">People</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add person</button>
      </div>

      {filterStale && (
        <div className="filter-banner">
          Showing contacts needing follow-up only
          <button className="filter-banner-clear" onClick={() => setSearchParams({})}>Show all</button>
        </div>
      )}

      <div className="tab-toolbar">
        <div className="tab-filters">
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {relationshipTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
          </select>
          <select className="filter-select" value={influenceFilter} onChange={e => setInfluenceFilter(e.target.value)}>
            <option value="all">All influence</option>
            {INFLUENCE_TIERS.map(t => <option key={t} value={t}>{INFLUENCE_TIER_LABELS[t]}</option>)}
          </select>
          <div className="seg-group">
            <button className={`seg-btn ${statusFilter === 'all' ? 'seg-btn--active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
            {RELATIONSHIP_STATUSES.map(s => (
              <button key={s} className={`seg-btn ${statusFilter === s ? 'seg-btn--active' : ''}`} onClick={() => setStatusFilter(s)}>
                {RELATIONSHIP_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        {staleCount > 0 && (
          <span className="stale-count-badge">{staleCount} contact{staleCount !== 1 ? 's' : ''} {staleCount === 1 ? 'needs' : 'need'} follow-up</span>
        )}
      </div>

      <CoverageSummary people={people} />

      <div className="people-grid">
        {filtered.map(p => (
          <PersonCard
            key={p.id}
            person={p}
            relationshipTypes={relationshipTypes}
            onEdit={() => openEdit(p)}
            onDelete={() => handleDelete(p.id)}
            onUpdatePerson={updatePerson}
            onAddTouchpoint={addTouchpoint}
            onRemoveTouchpoint={removeTouchpoint}
            onAddPlannedTouchpoint={addPlannedTouchpoint}
            onRemovePlannedTouchpoint={removePlannedTouchpoint}
            onLogPlannedTouchpoint={logPlannedTouchpoint}
            onRequestFeedback={(person) => setFeedbackModal({ person })}
            onPrepMeeting={(person) => setPrepPerson(person)}
            actions={actions}
            onAddAction={addAction}
            onToggleActionDone={toggleDone}
          />
        ))}
        {filtered.length === 0 && (
          <p className="list-empty">No people match the current filter.</p>
        )}
      </div>

      {modal && (
        <PersonModal
          mode={modal.mode}
          initial={modal.data}
          relationshipTypes={relationshipTypes}
          stakeholderGroups={stakeholderGroups}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {feedbackModal && (
        <FeedbackRequestModal
          person={feedbackModal.person}
          onClose={() => setFeedbackModal(null)}
        />
      )}

      {prepPerson && (
        <MeetingPrepModal
          person={prepPerson}
          onSave={handlePrepSave}
          onClose={() => setPrepPerson(null)}
        />
      )}
    </div>
  );
}

function FeedbackRequestModal({ person, onClose }) {
  const [email, setEmail] = useState(person.email || '');
  const [name, setName] = useState(person.name || '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/share/request-feedback`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          recipientEmail: email.trim(),
          recipientName: name.trim(),
          personId: person.id,
          message: message.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request 360 feedback</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {state === 'done' ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Request sent to {name}</p>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>They'll receive an email with a link to the structured feedback form. The link expires in 30 days.</p>
            <button className="btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <p className="admin-description" style={{ margin: '0 0 0.75rem' }}>
              Send a structured 360 feedback request to {person.name}. They'll rate you across 5 dimensions.
            </p>
            <div className="form-row">
              <label>Name<span className="form-required">*</span>
                <input className="form-input" value={name} required
                  onChange={e => setName(e.target.value)} />
              </label>
              <label>Email<span className="form-required">*</span>
                <input className="form-input" type="email" value={email} required
                  onChange={e => setEmail(e.target.value)} />
              </label>
            </div>
            <label>Personal message
              <textarea className="form-input form-textarea" rows={3} value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Add context about what you'd like them to focus on" />
            </label>
            {state === 'error' && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!email.trim() || !name.trim() || state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PersonModal({ mode, initial, relationshipTypes, stakeholderGroups, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState({});
  const setField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  function validate() {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Required';
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
          <h3>{mode === 'add' ? 'Add person' : 'Edit person'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Name <span className="form-required">*</span>
              <input className="form-input" value={form.name}
                onChange={e => setField('name', e.target.value)} autoFocus />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label>Relationship type
              <select className="form-input" value={form.type} onChange={e => setField('type', e.target.value)}>
                {relationshipTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>Status
              <select className="form-input" value={form.relationshipStatus ?? 'in-progress'} onChange={e => setField('relationshipStatus', e.target.value)}>
                {RELATIONSHIP_STATUSES.map(s => <option key={s} value={s}>{RELATIONSHIP_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label>Job title
              <input className="form-input" value={form.title ?? ''}
                onChange={e => setField('title', e.target.value)} />
            </label>
            <label>Organization
              <input className="form-input" value={form.org ?? ''}
                onChange={e => setField('org', e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>Email
              <input className="form-input" type="email" value={form.email ?? ''}
                onChange={e => setField('email', e.target.value)} />
            </label>
            <label>Phone
              <input className="form-input" type="tel" value={form.phone ?? ''}
                onChange={e => setField('phone', e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>Influence tier
              <select className="form-input" value={form.influenceTier ?? ''} onChange={e => setField('influenceTier', e.target.value)}>
                <option value="">—</option>
                {INFLUENCE_TIERS.map(t => <option key={t} value={t}>{INFLUENCE_TIER_LABELS[t]}</option>)}
              </select>
            </label>
            <label>Strategic importance
              <select className="form-input" value={form.strategicImportance ?? ''} onChange={e => setField('strategicImportance', e.target.value)}>
                <option value="">—</option>
                {STRATEGIC_IMPORTANCE.map(s => <option key={s} value={s}>{STRATEGIC_IMPORTANCE_LABELS[s]}</option>)}
              </select>
            </label>
            <label>Stakeholder group
              <input className="form-input" list="stakeholder-groups-list" value={form.stakeholderGroup ?? ''}
                onChange={e => setField('stakeholderGroup', e.target.value)}
                placeholder="Type or select" />
              <datalist id="stakeholder-groups-list">
                {stakeholderGroups.map(g => <option key={g} value={g} />)}
              </datalist>
            </label>
          </div>
          <label>What I need from them
            <textarea className="form-input form-textarea" value={form.need ?? ''}
              onChange={e => setField('need', e.target.value)}
              rows={2} placeholder="What do you need this person to do or provide?" />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add person' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
