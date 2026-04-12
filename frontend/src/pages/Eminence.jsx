// Eminence.jsx — Speaking, publications, panels, awards, and other visibility activities

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEminenceData } from '../hooks/useEminenceData.js';
import { useAdminData } from '../hooks/useAdminData.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { fmtDate } from '../data/sampleData.js';
import EmptyState from '../components/EmptyState.jsx';

const EMPTY_FORM = {
  title: '', type: '', date: '', venue: '', audience: 'external',
  url: '', description: '', tags: [],
};

export default function Eminence() {
  const { activities, addActivity, updateActivity, removeActivity } = useEminenceData();
  const { eminenceTypes, winTags } = useAdminData();
  const { qualifyingYear } = useSettings();

  const navigate = useNavigate();
  const [modal, setModal]       = useState(null);
  const [yearFilter, setYearFilter] = useState('qualifying');

  /* ── Filtering ── */
  const years = useMemo(() => {
    const dataYears = activities.map(a => a.year).filter(Boolean);
    const now = new Date().getFullYear();
    const minYear = dataYears.length > 0 ? Math.min(...dataYears, now - 3) : now - 3;
    const maxYear = dataYears.length > 0 ? Math.max(...dataYears, now) + 1 : now + 1;
    const range = [];
    for (let y = maxYear; y >= minYear; y--) range.push(y);
    return range;
  }, [activities]);

  const filtered = useMemo(() => {
    if (yearFilter === 'all') return activities;
    const yr = yearFilter === 'qualifying' ? qualifyingYear : Number(yearFilter);
    return activities.filter(a => a.year === yr);
  }, [activities, yearFilter, qualifyingYear]);

  const external = filtered.filter(a => a.audience === 'external');
  const internal = filtered.filter(a => a.audience === 'internal');

  /* ── Modal handlers ── */
  function openAdd() {
    setModal({ mode: 'add', data: { ...EMPTY_FORM, type: eminenceTypes[0]?.value || '' } });
  }
  function openEdit(activity) { setModal({ mode: 'edit', data: { ...activity } }); }
  function closeModal()       { setModal(null); }

  function handleSave(form) {
    if (modal.mode === 'add') addActivity(form);
    else updateActivity(modal.data.id, form);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this eminence activity?')) removeActivity(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Eminence</h1>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={() => navigate('/import-export')}>Import / Export</button>
          <button className="btn-primary" onClick={openAdd}>+ Add activity</button>
        </div>
      </div>

      {/* ── Year filter ── */}
      <div className="tab-toolbar">
        <div className="tab-filters">
          <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="qualifying">Qualifying year ({qualifyingYear})</option>
            <option value="all">All years</option>
            {years.filter(y => y !== qualifyingYear).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── External section ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">External</h2>
          <span className="section-sub">{external.length} activit{external.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <div className="learning-list">
          {external.map(a => (
            <ActivityCard key={a.id} activity={a} eminenceTypes={eminenceTypes} winTags={winTags}
              onEdit={() => openEdit(a)} onDelete={() => handleDelete(a.id)} />
          ))}
          {external.length === 0 && (
            <EmptyState title="No external activities yet" description="Log speaking engagements, publications, and industry panels to demonstrate your market presence." />
          )}
        </div>
      </section>

      {/* ── Internal section ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Internal</h2>
          <span className="section-sub">{internal.length} activit{internal.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <div className="learning-list">
          {internal.map(a => (
            <ActivityCard key={a.id} activity={a} eminenceTypes={eminenceTypes} winTags={winTags}
              onEdit={() => openEdit(a)} onDelete={() => handleDelete(a.id)} />
          ))}
          {internal.length === 0 && (
            <EmptyState title="No internal activities yet" description="Track internal presentations, training sessions, and practice-building contributions." />
          )}
        </div>
      </section>

      {/* ── Modal ── */}
      {modal && (
        <EminenceModal
          mode={modal.mode}
          initial={modal.data}
          eminenceTypes={eminenceTypes}
          winTags={winTags}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

/* ── Activity card ── */

function ActivityCard({ activity, eminenceTypes, winTags, onEdit, onDelete }) {
  const typeLabel = eminenceTypes.find(t => t.value === activity.type)?.label ?? activity.type;

  function tagColor(label) {
    return winTags.find(t => t.label === label)?.color ?? '#64748b';
  }

  return (
    <div className="learning-card">
      <div className="learning-card-header">
        <div className="learning-card-title-row">
          <h3 className="learning-card-name">{activity.title}</h3>
          <div className="learning-card-actions">
            <button className="row-btn" onClick={onEdit}>Edit</button>
            <button className="row-btn row-btn--danger" onClick={onDelete}>Remove</button>
          </div>
        </div>
        <div className="learning-card-meta">
          <span className="type-badge" style={{ background: '#64748b18', color: '#64748b', border: '1px solid #64748b55' }}>
            {typeLabel}
          </span>
          <span className={`type-badge ${activity.audience === 'external' ? 'eminence-pill--external' : 'eminence-pill--internal'}`}>
            {activity.audience === 'external' ? 'External' : 'Internal'}
          </span>
        </div>
      </div>

      <div className="learning-card-body">
        {activity.venue && <span className="learning-card-detail">{activity.venue}</span>}
        {activity.date && <span className="learning-card-detail">{fmtDate(activity.date)}</span>}
      </div>

      {activity.description && <p className="learning-card-notes">{activity.description}</p>}

      {activity.url && (
        <a href={activity.url} target="_blank" rel="noopener noreferrer"
          className="learning-badge-link">View</a>
      )}

      {(activity.tags ?? []).length > 0 && (
        <div className="win-tags">
          {activity.tags.map(t => {
            const color = tagColor(t);
            return (
              <span key={t} className="win-tag" style={{
                background: color + '20', color, borderColor: color + '60',
              }}>{t}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Add/edit modal ── */

function EminenceModal({ mode, initial, eminenceTypes, winTags, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState({});
  const setField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  function toggleTag(label) {
    setForm(f => {
      const tags = f.tags ?? [];
      return { ...f, tags: tags.includes(label) ? tags.filter(t => t !== label) : [...tags, label] };
    });
  }

  function validate() {
    const errs = {};
    if (!form.title?.trim()) errs.title = 'Required';
    if (!form.type?.trim()) errs.type = 'Required';
    if (!form.date?.trim()) errs.date = 'Required';
    if (!form.audience?.trim()) errs.audience = 'Required';
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
          <h3>{mode === 'add' ? 'Add eminence activity' : 'Edit eminence activity'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Title <span className="form-required">*</span>
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)} autoFocus />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </label>

          <div className="form-row">
            <label>Type <span className="form-required">*</span>
              <select className="form-input" value={form.type} onChange={e => setField('type', e.target.value)}>
                <option value="" disabled>Select type</option>
                {eminenceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.type && <span className="field-error">{errors.type}</span>}
            </label>
            <label>Date <span className="form-required">*</span>
              <input className="form-input" type="date" value={form.date}
                onChange={e => setField('date', e.target.value)} />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </label>
          </div>

          <label>Audience <span className="form-required">*</span>
            <div className="seg-group" style={{ marginTop: '0.35rem' }}>
              <button type="button" className={`seg-btn ${form.audience === 'external' ? 'seg-btn--active' : ''}`}
                onClick={() => setField('audience', 'external')}>External</button>
              <button type="button" className={`seg-btn ${form.audience === 'internal' ? 'seg-btn--active' : ''}`}
                onClick={() => setField('audience', 'internal')}>Internal</button>
            </div>
            {errors.audience && <span className="field-error">{errors.audience}</span>}
          </label>

          <label>Venue
            <input className="form-input" value={form.venue ?? ''}
              onChange={e => setField('venue', e.target.value)}
              placeholder="Event name, publication, media outlet" />
          </label>

          <label>URL
            <input className="form-input" type="url" value={form.url ?? ''}
              onChange={e => setField('url', e.target.value)}
              placeholder="Link to article, recording, etc." />
          </label>

          <label>Description
            <textarea className="form-input form-textarea" value={form.description ?? ''}
              onChange={e => setField('description', e.target.value)}
              rows={3} placeholder="Brief description of the activity" />
          </label>

          {winTags.length > 0 && (
            <div className="form-field">
              <span className="form-label">Tags</span>
              <div className="win-tag-picker">
                {winTags.map(t => {
                  const selected = (form.tags ?? []).includes(t.label);
                  return (
                    <button key={t.label} type="button"
                      className="win-tag win-tag--pick"
                      style={{
                        background: selected ? t.color + '20' : 'var(--surface)',
                        color: selected ? t.color : 'var(--text-muted)',
                        borderColor: selected ? t.color + '60' : 'var(--border-med)',
                      }}
                      onClick={() => toggleTag(t.label)}
                    >{t.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add activity' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
