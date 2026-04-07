// components/learning/CertFormModal.jsx
// Add/edit certification modal.

import { useState } from 'react';
import { CERT_STATUSES, CERT_STATUS_LABELS } from '../../hooks/useLearningData.js';

const EMPTY = {
  name: '', issuer: '', status: 'planned',
  dateEarned: '', expiryDate: '', credentialId: '', badgeUrl: '', notes: '',
};

export default function CertFormModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add certification' : 'Edit certification'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Name<span className="form-required">*</span>
            <input className="form-input" value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. AWS Solutions Architect Professional" required autoFocus />
          </label>

          <div className="form-row">
            <label>Issuer<span className="form-required">*</span>
              <input className="form-input" value={form.issuer}
                onChange={e => setField('issuer', e.target.value)}
                placeholder="e.g. Amazon Web Services" required />
            </label>
            <label>Status<span className="form-required">*</span>
              <select className="form-input" value={form.status}
                onChange={e => setField('status', e.target.value)}>
                {CERT_STATUSES.map(s => <option key={s} value={s}>{CERT_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>Date earned
              <input className="form-input" type="date" value={form.dateEarned ?? ''}
                onChange={e => setField('dateEarned', e.target.value)} />
            </label>
            <label>Expiry date
              <input className="form-input" type="date" value={form.expiryDate ?? ''}
                onChange={e => setField('expiryDate', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Credential ID
              <input className="form-input" value={form.credentialId ?? ''}
                onChange={e => setField('credentialId', e.target.value)}
                placeholder="e.g. ABC-123456" />
            </label>
            <label>Badge URL
              <input className="form-input" value={form.badgeUrl ?? ''}
                onChange={e => setField('badgeUrl', e.target.value)}
                placeholder="https://..." />
            </label>
          </div>

          <label>Notes
            <textarea className="form-input form-textarea" value={form.notes ?? ''}
              onChange={e => setField('notes', e.target.value)}
              rows={3} placeholder="Study plan, renewal requirements, etc." />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add certification' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
