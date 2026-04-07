// components/learning/CourseFormModal.jsx
// Add/edit course modal.

import { useState } from 'react';
import { COURSE_STATUSES, COURSE_STATUS_LABELS } from '../../hooks/useLearningData.js';

const EMPTY = {
  title: '', provider: '', status: 'planned',
  dateCompleted: '', hours: '', notes: '',
};

export default function CourseFormModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add course' : 'Edit course'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Title<span className="form-required">*</span>
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="e.g. IBM AI Foundations for Business" required autoFocus />
          </label>

          <div className="form-row">
            <label>Provider
              <input className="form-input" value={form.provider ?? ''}
                onChange={e => setField('provider', e.target.value)}
                placeholder="e.g. IBM, Coursera, Udemy" />
            </label>
            <label>Status<span className="form-required">*</span>
              <select className="form-input" value={form.status}
                onChange={e => setField('status', e.target.value)}>
                {COURSE_STATUSES.map(s => <option key={s} value={s}>{COURSE_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>Date completed
              <input className="form-input" type="date" value={form.dateCompleted ?? ''}
                onChange={e => setField('dateCompleted', e.target.value)} />
            </label>
            <label>Hours<span className="form-unit">hrs</span>
              <input className="form-input" type="number" min="0" step="0.5" inputMode="numeric"
                value={form.hours ?? ''}
                onChange={e => setField('hours', e.target.value)}
                placeholder="e.g. 8" />
            </label>
          </div>

          <label>Notes
            <textarea className="form-input form-textarea" value={form.notes ?? ''}
              onChange={e => setField('notes', e.target.value)}
              rows={3} placeholder="Key takeaways, relevance to promotion case" />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add course' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
