// Reflections.jsx — Weekly check-in form, history, and AI synthesis

import { useState } from 'react';
import { useReflectionsData, getMonday } from '../hooks/useReflectionsData.js';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';

const COMPETENCY_LABELS = {
  commercial_acumen: 'Commercial acumen',
  client_relationship: 'Client relationship',
  leadership: 'Leadership',
  practice_building: 'Practice building',
  executive_presence: 'Executive presence',
  strategic_thinking: 'Strategic thinking',
  delivery_excellence: 'Delivery excellence',
};

export default function Reflections() {
  const { data, addCheckin, updateCheckin, removeCheckin, updateSynthesis } = useReflectionsData();
  const checkins = data.checkins ?? [];
  const synthesis = data.ai_synthesis ?? {};

  const currentWeek = getMonday();
  const existingThisWeek = checkins.find(c => c.week_start === currentWeek);

  const [expandedId, setExpandedId] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState(null);
  const [synthUsage, setSynthUsage] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reflections</h1>
        <span className="page-count">{checkins.length} check-in{checkins.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Check-in form */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Weekly check-in</h2>
          <span className="muted" style={{ fontSize: '0.8rem' }}>Week of {currentWeek}</span>
        </div>
        <CheckinForm
          existing={existingThisWeek}
          onSubmit={(fields) => {
            if (existingThisWeek) {
              updateCheckin(existingThisWeek.id, fields);
            } else {
              addCheckin(fields);
            }
          }}
        />
      </section>

      {/* History */}
      {checkins.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Check-in history</h2>
          </div>
          <div className="win-list">
            {[...checkins].reverse().map(c => (
              <CheckinCard
                key={c.id}
                checkin={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onRemove={() => { if (confirm('Remove this check-in?')) removeCheckin(c.id); }}
              />
            ))}
          </div>
        </section>
      )}

      {/* AI Synthesis */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">AI synthesis</h2>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={async () => {
                setSynthesizing(true);
                setSynthError(null);
                try {
                  const res = await fetch(`${API_BASE}/api/ai/reflection-synthesis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                  });
                  const d = await res.json();
                  if (!d.ok) { setSynthError(mapAiError(d.code, d.error)); return; }
                  updateSynthesis({ ...d.data, last_generated: new Date().toISOString() });
                  if (d.usage) setSynthUsage(d.usage);
                } catch {
                  setSynthError('Could not reach the AI service');
                } finally {
                  setSynthesizing(false);
                }
              }}
              disabled={synthesizing || checkins.length < 3}
            >
              {synthesizing ? 'Analyzing...' : 'Analyze my reflections'}
            </button>
            {checkins.length < 3 && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>Need at least 3 check-ins</span>
            )}
            {synthesis.last_generated && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Last generated: {new Date(synthesis.last_generated).toLocaleDateString('en-CA')}
              </span>
            )}
          </div>

          {synthError && <p className="form-field-error" style={{ marginTop: '0.5rem' }}>{synthError}</p>}

          {synthUsage && (
            <p className="story-token-usage" style={{ textAlign: 'left', padding: '0.25rem 0 0' }}>
              {synthUsage.input_tokens} input · {synthUsage.output_tokens} output tokens
            </p>
          )}

          {synthesis.themes?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Recurring themes</p>
              {synthesis.themes.map((t, i) => (
                <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-secondary, #f8f9fa)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <strong>{t.theme}</strong>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <span className="badge">{t.frequency}x</span>
                      <span className="badge badge--default">{COMPETENCY_LABELS[t.related_competency] ?? t.related_competency}</span>
                    </div>
                  </div>
                  <p className="muted" style={{ marginTop: '0.25rem', marginBottom: 0, fontSize: '0.85rem' }}>{t.insight}</p>
                </div>
              ))}
            </div>
          )}

          {synthesis.confidence_trend && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Confidence trend</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div><span className="muted">Current: </span><strong>{synthesis.confidence_trend.current}/10</strong></div>
                <div><span className="muted">4-week avg: </span><strong>{synthesis.confidence_trend['4_week_avg']}/10</strong></div>
                <div><span className="muted">12-week avg: </span><strong>{synthesis.confidence_trend['12_week_avg']}/10</strong></div>
                <div><span className="muted">Trend: </span><strong>{synthesis.confidence_trend.trend === 'rising' ? '↑' : synthesis.confidence_trend.trend === 'falling' ? '↓' : '→'} {synthesis.confidence_trend.trend}</strong></div>
              </div>
            </div>
          )}

          {synthesis.patterns?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Patterns</p>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {synthesis.patterns.map((p, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CheckinForm({ existing, onSubmit }) {
  const [form, setForm] = useState({
    biggest_win: existing?.biggest_win ?? '',
    biggest_challenge: existing?.biggest_challenge ?? '',
    learning: existing?.learning ?? '',
    next_week_focus: existing?.next_week_focus ?? '',
    confidence: existing?.confidence ?? 7,
    need_help: existing?.need_help ?? '',
  });
  const [saved, setSaved] = useState(false);

  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
    setSaved(true);
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      {existing && <p className="muted" style={{ marginBottom: '0.75rem' }}>You already checked in this week. Edit below to update.</p>}
      <form onSubmit={handleSubmit}>
        <label>Biggest win this week<span className="form-required">*</span>
          <textarea className="form-input form-textarea" value={form.biggest_win}
            onChange={e => setField('biggest_win', e.target.value)}
            rows={2} placeholder="What went well?" required />
        </label>

        <label>Biggest challenge<span className="form-required">*</span>
          <textarea className="form-input form-textarea" value={form.biggest_challenge}
            onChange={e => setField('biggest_challenge', e.target.value)}
            rows={2} placeholder="What was hard?" required />
        </label>

        <label>What I learned<span className="form-required">*</span>
          <textarea className="form-input form-textarea" value={form.learning}
            onChange={e => setField('learning', e.target.value)}
            rows={2} placeholder="Key insight or takeaway" required />
        </label>

        <label>Next week's focus<span className="form-required">*</span>
          <textarea className="form-input form-textarea" value={form.next_week_focus}
            onChange={e => setField('next_week_focus', e.target.value)}
            rows={2} placeholder="What will you prioritize?" required />
        </label>

        <div className="form-field">
          <div className="form-label-row">
            <span className="form-label">Confidence<span className="form-required">*</span></span>
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{form.confidence}/10</span>
          </div>
          <input type="range" min="1" max="10" value={form.confidence}
            onChange={e => setField('confidence', parseInt(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <label>Need help with anything?
          <textarea className="form-input form-textarea" value={form.need_help}
            onChange={e => setField('need_help', e.target.value)}
            rows={2} placeholder="Anything you need support on" />
        </label>

        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn-primary">
            {existing ? 'Update check-in' : 'Save check-in'}
          </button>
          {saved && <span className="muted">Saved</span>}
        </div>
      </form>
    </div>
  );
}

function CheckinCard({ checkin, expanded, onToggle, onRemove }) {
  const c = checkin;
  return (
    <div className="win-card" style={{ cursor: 'pointer' }} onClick={onToggle}>
      <div className="win-card-header">
        <div className="win-card-title-row">
          <h3 className="win-title" style={{ fontSize: '0.9rem' }}>
            Week of {c.week_start}
            <span className="badge" style={{ marginLeft: '0.5rem' }}>{c.confidence}/10</span>
          </h3>
          <div className="win-card-actions" onClick={e => e.stopPropagation()}>
            <button className="row-btn row-btn--danger" onClick={onRemove}>Remove</button>
          </div>
        </div>
        {!expanded && (
          <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            {c.biggest_win?.slice(0, 80)}{(c.biggest_win?.length ?? 0) > 80 ? '...' : ''}
          </p>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          <p><strong>Biggest win:</strong> {c.biggest_win}</p>
          <p><strong>Biggest challenge:</strong> {c.biggest_challenge}</p>
          <p><strong>Learning:</strong> {c.learning}</p>
          <p><strong>Next week's focus:</strong> {c.next_week_focus}</p>
          {c.need_help && <p><strong>Need help:</strong> {c.need_help}</p>}
          <p className="muted" style={{ fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
            Submitted: {new Date(c.submitted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}
