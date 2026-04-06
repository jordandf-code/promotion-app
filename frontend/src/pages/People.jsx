// pages/People.jsx

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePeopleData, daysSinceContact } from '../hooks/usePeopleData.js';
import { useAdminData } from '../hooks/useAdminData.js';
import { useActionsData } from '../hooks/useActionsData.js';
import PersonCard from '../components/people/PersonCard.jsx';

const EMPTY_FORM = { name: '', title: '', org: '', type: '', email: '', phone: '', need: '' };

export default function People() {
  const {
    people, addPerson, updatePerson, removePerson,
    addTouchpoint, removeTouchpoint,
    addPlannedTouchpoint, removePlannedTouchpoint, logPlannedTouchpoint,
  } = usePeopleData();
  const { relationshipTypes } = useAdminData();
  const { actions, addAction, toggleDone } = useActionsData();

  const [typeFilter, setTypeFilter] = useState('all');
  const [modal,      setModal]      = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStale = searchParams.get('filter') === 'stale';

  const filtered = people
    .filter(p => typeFilter === 'all' || p.type === typeFilter)
    .filter(p => !filterStale || daysSinceContact(p) > 30)
    .sort((a, b) => daysSinceContact(b) - daysSinceContact(a));

  const staleCount = people.filter(p => daysSinceContact(p) > 30).length;

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
        </div>
        {staleCount > 0 && (
          <span className="stale-count-badge">{staleCount} contact{staleCount !== 1 ? 's' : ''} need follow-up</span>
        )}
      </div>

      <div className="people-grid">
        {filtered.map(p => (
          <PersonCard
            key={p.id}
            person={p}
            relationshipTypes={relationshipTypes}
            onEdit={() => openEdit(p)}
            onDelete={() => handleDelete(p.id)}
            onAddTouchpoint={addTouchpoint}
            onRemoveTouchpoint={removeTouchpoint}
            onAddPlannedTouchpoint={addPlannedTouchpoint}
            onRemovePlannedTouchpoint={removePlannedTouchpoint}
            onLogPlannedTouchpoint={logPlannedTouchpoint}
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
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function PersonModal({ mode, initial, relationshipTypes, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add person' : 'Edit person'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div className="form-row">
            <label>Name
              <input className="form-input" value={form.name}
                onChange={e => setField('name', e.target.value)} required autoFocus />
            </label>
            <label>Relationship type
              <select className="form-input" value={form.type} onChange={e => setField('type', e.target.value)}>
                {relationshipTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
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
