// components/wins/WinFormModal.jsx
// Shared win form — 'prompt' mode (triggered on won/done), 'add'/'edit' from Wins tab.

import { useState } from 'react';
import { API_BASE, authHeaders } from '../../utils/api.js';
import { mapAiError } from '../../utils/aiErrors.js';
import { useAdminData, DEFAULT_LOGO_TYPES, DEFAULT_ORIGIN_TYPES } from '../../hooks/useAdminData.js';

function tagStyle(color, active) {
  return active
    ? { background: color + '30', color, borderColor: color, borderStyle: 'solid' }
    : { background: 'transparent', color, borderColor: color + '90', borderStyle: 'dashed' };
}

export default function WinFormModal({ mode, initial, promptContext, onSave, onClose }) {
  const { winTags, logoTypes, originTypes } = useAdminData();
  const LOGO_TYPE_OPTIONS = logoTypes ?? DEFAULT_LOGO_TYPES;
  const ORIGIN_OPTIONS    = originTypes ?? DEFAULT_ORIGIN_TYPES;

  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    impact: '',
    description: '',
    tags: [],
    strategicNote: '',
    logoType: '',
    relationshipOrigin: '',
    ...initial,
  });
  const [suggestingImpact, setSuggestingImpact] = useState(false);
  const [impactError,     setImpactError]     = useState(null);
  const [impactUsage,     setImpactUsage]     = useState(null);

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  async function handleSuggestImpact() {
    setSuggestingImpact(true);
    setImpactError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/ai/suggest-impact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({
          title:       form.title,
          description: form.description,
          sourceId:    initial?.sourceId ?? null,
          sourceType:  initial?.sourceType ?? null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setImpactError(mapAiError(data.code, data.error));
        return;
      }
      setField('impact', data.impact);
      if (data.usage) setImpactUsage(data.usage);
    } catch {
      setImpactError('Could not reach the AI service');
    } finally {
      setSuggestingImpact(false);
    }
  }

  function toggleTag(label) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(label) ? f.tags.filter(t => t !== label) : [...f.tags, label],
    }));
  }

  const isPrompt = mode === 'prompt';
  const heading  = isPrompt ? 'Log this as a win?' : mode === 'add' ? 'Add win' : 'Edit win';

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{heading}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {isPrompt && promptContext && (
          <p className="win-prompt-context">{promptContext}</p>
        )}

        <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Title<span className="form-required">*</span>
            <input className="form-input" value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="What did you achieve?" required autoFocus />
          </label>

          <div className="form-row">
            <label>Date<span className="form-required">*</span>
              <input className="form-input" type="date" value={form.date}
                onChange={e => setField('date', e.target.value)} required />
            </label>
          </div>

          <div className="form-field">
            <div className="form-label-row">
              <span className="form-label">Impact</span>
              <button type="button" className="btn-ai-inline"
                onClick={handleSuggestImpact} disabled={suggestingImpact}>
                {suggestingImpact ? 'Thinking…' : '✦ Suggest impact'}
              </button>
            </div>
            <input className="form-input" value={form.impact}
              onChange={e => setField('impact', e.target.value)}
              placeholder="One line for your promotion case, e.g. $2M revenue secured" />
            {impactError && <p className="form-field-error">{impactError}</p>}
            {impactUsage && (
              <p className="story-token-usage" style={{ textAlign: 'left', padding: '0.25rem 0 0' }}>
                {impactUsage.input_tokens} input · {impactUsage.output_tokens} output tokens
              </p>
            )}
          </div>

          <label>Description
            <textarea className="form-input form-textarea" value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={3} placeholder="Context, what you did, how it went" />
          </label>

          {/* ── Strategic context ── */}
          <div className="form-section-label">Strategic context</div>
          <div className="form-row">
            <label>Logo type
              <select className="form-input" value={form.logoType ?? ''}
                onChange={e => setField('logoType', e.target.value)}>
                <option value="">— select —</option>
                {LOGO_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>How it came in
              <select className="form-input" value={form.relationshipOrigin ?? ''}
                onChange={e => setField('relationshipOrigin', e.target.value)}>
                <option value="">— select —</option>
                {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          <label>Strategic rationale
            <input className="form-input" value={form.strategicNote ?? ''}
              onChange={e => setField('strategicNote', e.target.value)}
              placeholder="Why this win matters beyond the dollar value" />
          </label>

          <div className="form-field">
            <span className="form-label">Tags</span>
            <div className="win-tag-picker">
              {winTags.map(({ label, color }) => (
                <button key={label} type="button" className="win-tag win-tag--pick"
                  style={tagStyle(color, form.tags.includes(label))}
                  onClick={() => toggleTag(label)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {isPrompt ? 'Skip' : 'Cancel'}
            </button>
            <button type="submit" className="btn-primary">
              {isPrompt ? 'Log win' : mode === 'add' ? 'Add win' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
