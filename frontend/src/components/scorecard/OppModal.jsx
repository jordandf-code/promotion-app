// components/scorecard/OppModal.jsx
// Add / edit modal for a single Sales opportunity.

import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAdminData, DEFAULT_DEAL_TYPES, DEFAULT_LOGO_TYPES, DEFAULT_ORIGIN_TYPES, DEFAULT_PIPELINE_STAGES } from '../../hooks/useAdminData.js';

const STATUSES = ['open', 'won', 'lost'];
const STATUS_LABELS = { open: 'Open', won: 'Won', lost: 'Lost' };

export default function OppModal({ mode, initial, scorecardYears, onSave, onClose }) {
  const { currencySymbol, toInputValue, fromInputValue } = useSettings();
  const { dealTypes, logoTypes, originTypes, pipelineStages } = useAdminData();
  const DEAL_TYPE_OPTIONS = dealTypes ?? DEFAULT_DEAL_TYPES;
  const LOGO_TYPE_OPTIONS = logoTypes ?? DEFAULT_LOGO_TYPES;
  const ORIGIN_OPTIONS    = originTypes ?? DEFAULT_ORIGIN_TYPES;
  const STAGES            = (pipelineStages ?? DEFAULT_PIPELINE_STAGES).map(s => s.label);

  const [form, setForm] = useState(() => ({
    stage: 'Qualified',
    probability: '',
    expectedClose: '',
    dealType: 'one-time',
    logoType: 'net-new',
    strategicNote: '',
    relationshipOrigin: '',
    iscId: '',
    ...initial,
    totalValue:    toInputValue(initial.totalValue),
    signingsValue: toInputValue(initial.signingsValue),
  }));

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      totalValue:    fromInputValue(form.totalValue),
      signingsValue: fromInputValue(form.signingsValue),
      probability:   form.probability !== '' ? Number(form.probability) : null,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add opportunity' : 'Edit opportunity'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>

          {/* ── Basic info ── */}
          <div className="form-row">
            <label>Opportunity name<span className="form-required">*</span>
              <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} required autoFocus />
            </label>
            <label>Client<span className="form-required">*</span>
              <input className="form-input" value={form.client} onChange={e => setField('client', e.target.value)} required />
            </label>
          </div>

          <div className="form-row">
            <label>Year
              <select className="form-input" value={form.year} onChange={e => setField('year', e.target.value)}>
                {scorecardYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </label>
            <label>Status
              <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label>
              Win / close date{form.status !== 'open' && <span className="form-required">*</span>}
              <input className="form-input" type="date" value={form.winDate ?? ''}
                onChange={e => setField('winDate', e.target.value)}
                required={form.status !== 'open'} />
            </label>
          </div>

          {/* ── Pipeline fields ── */}
          <div className="form-section-label">Pipeline</div>
          <div className="form-row">
            <label>Stage
              <select className="form-input" value={form.stage} onChange={e => setField('stage', e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Probability<span className="form-unit">%</span>
              <input className="form-input" type="number" min="0" max="100"
                value={form.probability ?? ''}
                onChange={e => setField('probability', e.target.value)}
                placeholder="e.g. 60" />
            </label>
            <label>Expected close
              <input className="form-input" type="date" value={form.expectedClose ?? ''}
                onChange={e => setField('expectedClose', e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>ISC Opportunity Link
              <input className="form-input" type="url" value={form.iscId ?? ''}
                onChange={e => setField('iscId', e.target.value)}
                placeholder="https://isc.ibm.com/opportunities/..." />
            </label>
          </div>

          {/* ── Values ── */}
          <div className="form-section-label">Value</div>
          <div className="form-row">
            <label>Total deal value<span className="form-unit">{currencySymbol}</span><span className="form-required">*</span>
              <input className="form-input" type="number" min="0" value={form.totalValue}
                onChange={e => setField('totalValue', e.target.value)} required />
            </label>
            <label>Signings value<span className="form-unit">{currencySymbol}</span><span className="form-required">*</span>
              <input className="form-input" type="number" min="0" value={form.signingsValue}
                onChange={e => setField('signingsValue', e.target.value)}
                required placeholder="Your credited portion" />
            </label>
          </div>

          {/* ── Strategic context ── */}
          <div className="form-section-label">Strategic context</div>
          <div className="form-row">
            <label>Deal type
              <select className="form-input" value={form.dealType} onChange={e => setField('dealType', e.target.value)}>
                {DEAL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>Logo type
              <select className="form-input" value={form.logoType} onChange={e => setField('logoType', e.target.value)}>
                {LOGO_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>How it came in
              <select className="form-input" value={form.relationshipOrigin ?? ''} onChange={e => setField('relationshipOrigin', e.target.value)}>
                <option value="">— select —</option>
                {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          <label>Strategic rationale
            <input className="form-input" value={form.strategicNote ?? ''}
              onChange={e => setField('strategicNote', e.target.value)}
              placeholder="Why this deal matters beyond the dollar value" />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add opportunity' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
