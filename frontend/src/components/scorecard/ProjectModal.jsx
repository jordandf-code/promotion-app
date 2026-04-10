// components/scorecard/ProjectModal.jsx
// Add / edit modal for a single Revenue/GP project.

import { useState } from 'react';
import { qSum, QUARTER_LABELS } from '../../hooks/useScorecardData.js';
import { useSettings } from '../../context/SettingsContext.jsx';

function toNumbers(q) {
  if (!q) return { q1: 0, q2: 0, q3: 0, q4: 0 };
  return { q1: Number(q.q1) || 0, q2: Number(q.q2) || 0, q3: Number(q.q3) || 0, q4: Number(q.q4) || 0 };
}

function convertQuarters(q, convertFn) {
  if (!q) return { q1: '', q2: '', q3: '', q4: '' };
  return {
    q1: convertFn(q.q1),
    q2: convertFn(q.q2),
    q3: convertFn(q.q3),
    q4: convertFn(q.q4),
  };
}

export default function ProjectModal({ mode, initial, scorecardYears, opportunities, onSave, onClose }) {
  const { currencySymbol, toInputValue, fromInputValue } = useSettings();

  const [form, setForm] = useState(() => {
    const base = JSON.parse(JSON.stringify(initial));
    return {
      ...base,
      revenue:     convertQuarters(base.revenue,     toInputValue),
      grossProfit: convertQuarters(base.grossProfit, toInputValue),
    };
  });

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setQuarterField(metric, quarter, value) {
    setForm(f => ({ ...f, [metric]: { ...f[metric], [quarter]: value } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      revenue:     convertQuarters(form.revenue,     fromInputValue),
      grossProfit: convertQuarters(form.grossProfit, fromInputValue),
    });
  }

  // Display totals in user currency using raw input values (already in user currency)
  const revInputTotal = qSum(toNumbers(form.revenue));
  const gpInputTotal  = qSum(toNumbers(form.grossProfit));
  const gpMargin = revInputTotal > 0 ? Math.round((gpInputTotal / revInputTotal) * 100) : null;

  // Format input totals directly (they're already in the user's currency as raw numbers)
  const fmtInputTotal = v => {
    if (v >= 1_000_000) return `${currencySymbol}${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
    if (v >= 1_000)     return `${currencySymbol}${Math.round(v / 1_000)}K`;
    return `${currencySymbol}${Math.round(v)}`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add project' : 'Edit project'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Project name<span className="form-required">*</span>
              <input className="form-input" value={form.name}
                onChange={e => setField('name', e.target.value)} required />
            </label>
            <label>Client<span className="form-required">*</span>
              <input className="form-input" value={form.client}
                onChange={e => setField('client', e.target.value)} required />
            </label>
          </div>

          <div className="form-row">
            <label>Start year
              <select className="form-input" value={form.year}
                onChange={e => setField('year', e.target.value)}>
                {scorecardYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </label>
            <label>End year
              <select className="form-input" value={form.endYear ?? ''}
                onChange={e => setField('endYear', e.target.value)}>
                <option value="">Same as start</option>
                {scorecardYears.filter(yr => yr >= Number(form.year)).map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </label>
            <label>Status
              <select className="form-input" value={form.status}
                onChange={e => setField('status', e.target.value)}>
                <option value="forecast">Forecast</option>
                <option value="realized">Realized</option>
              </select>
            </label>
            <label>Linked opportunity
              <select className="form-input" value={form.opportunityId ?? ''}
                onChange={e => setField('opportunityId', e.target.value)}>
                <option value="">None</option>
                {opportunities.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.year})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-quarters-section">
            <div className="form-quarters-header">
              <span className="form-quarters-label">Revenue by quarter ({currencySymbol})</span>
              <span className="form-quarters-total">Total: {fmtInputTotal(revInputTotal)}</span>
            </div>
            <div className="form-quarters-grid">
              {['q1','q2','q3','q4'].map((q, i) => (
                <label key={q}>
                  {QUARTER_LABELS[i]}
                  <input className="form-input" type="number" min="0" inputMode="decimal"
                    value={form.revenue[q] ?? ''}
                    onChange={e => setQuarterField('revenue', q, e.target.value)}
                    placeholder="0" />
                </label>
              ))}
            </div>

            <div className="form-quarters-header" style={{ marginTop: '1rem' }}>
              <span className="form-quarters-label">Gross profit by quarter ({currencySymbol})</span>
              <span className="form-quarters-total">
                Total: {fmtInputTotal(gpInputTotal)}
                {gpMargin != null && <span className="form-hint"> · {gpMargin}% margin</span>}
              </span>
            </div>
            <div className="form-quarters-grid">
              {['q1','q2','q3','q4'].map((q, i) => (
                <label key={q}>
                  {QUARTER_LABELS[i]}
                  <input className="form-input" type="number" min="0" inputMode="decimal"
                    value={form.grossProfit[q] ?? ''}
                    onChange={e => setQuarterField('grossProfit', q, e.target.value)}
                    placeholder="0" />
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add project' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
