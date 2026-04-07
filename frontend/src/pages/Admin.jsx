// pages/Admin.jsx
// App settings split into sub-tabs: My profile, GenAI, Categories, User Settings.

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAdminData, COLOR_PALETTE, DEFAULT_NAV_ORDER } from '../hooks/useAdminData.js';
import WipeSection from '../components/admin/WipeSection.jsx';
import { DEFAULT_WEIGHTS } from '../hooks/useReadinessScore.js';

export default function Admin() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const TABS = [
    { id: 'profile',    label: 'My profile'    },
    ...(!isViewer ? [
      { id: 'ai',         label: 'GenAI'         },
      { id: 'categories', label: 'Categories'    },
      { id: 'settings',   label: 'User settings' },
    ] : []),
  ];

  const [tab, setTab] = useState('profile');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
      </div>

      <div className="sc-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sc-tab ${tab === t.id ? 'sc-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'    && <ProfileTab />}
      {tab === 'ai'         && !isViewer && <GenAITab />}
      {tab === 'categories' && !isViewer && <CategoriesTab />}
      {tab === 'settings'   && !isViewer && <SettingsTab />}
    </div>
  );
}

// ── Tab: My Profile ─────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [sqForm, setSqForm] = useState({ currentPassword: '', question: '', answer: '' });
  const [sqSaving, setSqSaving] = useState(false);
  const [sqMsg, setSqMsg] = useState('');

  async function saveName(e) {
    e.preventDefault();
    setNameMsg('');
    setNameSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateUser({ name: data.user.name });
      setNameMsg('Name updated');
    } catch (err) {
      setNameMsg(err.message);
    } finally {
      setNameSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwMsg('Password changed');
    } catch (err) {
      setPwMsg(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function updateSQ(e) {
    e.preventDefault();
    setSqMsg('');
    setSqSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/update-security-question`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentPassword: sqForm.currentPassword,
          securityQuestion: sqForm.question,
          securityAnswer: sqForm.answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSqForm({ currentPassword: '', question: '', answer: '' });
      setSqMsg('Security question updated');
    } catch (err) {
      setSqMsg(err.message);
    } finally {
      setSqSaving(false);
    }
  }

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header"><h2 className="section-title">Profile</h2></div>
        <div className="card admin-card">
          <form onSubmit={saveName}>
            <label>
              Name
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
            </label>
            <label>
              Email <span className="form-unit">(read-only)</span>
              <input className="form-input" value={user?.email || ''} disabled />
            </label>
            <label>
              Role <span className="form-unit">(read-only)</span>
              <input className="form-input" value={user?.role || ''} disabled />
            </label>
            <div className="admin-save-row">
              {nameMsg && <span className="muted">{nameMsg}</span>}
              <button className="btn-primary" disabled={nameSaving || name === user?.name}>
                {nameSaving ? 'Saving…' : 'Update name'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">Change password</h2></div>
        <div className="card admin-card">
          <form onSubmit={changePassword}>
            <label>
              Current password
              <input className="form-input" type="password" value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required autoComplete="current-password" />
            </label>
            <label>
              New password <span className="auth-hint">(min 8 characters)</span>
              <input className="form-input" type="password" value={pwForm.newPw} minLength={8}
                onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} required autoComplete="new-password" />
            </label>
            <label>
              Confirm new password
              <input className="form-input" type="password" value={pwForm.confirm} minLength={8}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required autoComplete="new-password" />
            </label>
            <div className="admin-save-row">
              {pwMsg && <span className="muted">{pwMsg}</span>}
              <button className="btn-primary" disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change password'}</button>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">Security question</h2></div>
        <div className="card admin-card">
          {user?.securityQuestion && (
            <p className="admin-description">Current question: <strong>{user.securityQuestion}</strong></p>
          )}
          <form onSubmit={updateSQ}>
            <label>
              Current password <span className="form-unit">(re-authentication)</span>
              <input className="form-input" type="password" value={sqForm.currentPassword}
                onChange={e => setSqForm(f => ({ ...f, currentPassword: e.target.value }))} required autoComplete="current-password" />
            </label>
            <label>
              New security question
              <input className="form-input" value={sqForm.question}
                onChange={e => setSqForm(f => ({ ...f, question: e.target.value }))} required />
            </label>
            <label>
              New security answer
              <input className="form-input" value={sqForm.answer}
                onChange={e => setSqForm(f => ({ ...f, answer: e.target.value }))} required />
            </label>
            <div className="admin-save-row">
              {sqMsg && <span className="muted">{sqMsg}</span>}
              <button className="btn-primary" disabled={sqSaving}>{sqSaving ? 'Saving…' : 'Update security question'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

// ── Tab 1: GenAI ────────────────────────────────────────────────────────────

function GenAITab() {
  const { ibmCriteria, setIbmCriteria, careerHistory, setCareerHistory, anthropicKey, setAnthropicKey, readinessWeights, setReadinessWeights } = useAdminData();

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Anthropic API key</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Used for generating your promotion story, suggesting goals, and the impact helper on wins.
            Stored in this browser only.
          </p>
          <ApiKeySection value={anthropicKey} onSave={setAnthropicKey} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">IBM Partner criteria</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Paste the IBM Partner framework criteria here. Used by the AI to map your evidence,
            identify gaps, and suggest goals.
          </p>
          <TextSection value={ibmCriteria} onSave={setIbmCriteria}
            placeholder="Paste IBM Partner criteria here..." rows={10} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Career history</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            A brief career summary — key roles, IBM tenure, areas of expertise. Anchors the AI
            narrative to your background.
          </p>
          <TextSection value={careerHistory} onSave={setCareerHistory}
            placeholder="e.g. 12 years at IBM Canada. Started as a consultant, promoted to Senior Consultant (2017), Manager (2019), Associate Partner (2022). Focus on federal public sector IT transformation..." rows={7} />
        </div>
      </section>

      <ReadinessWeightsSection weights={readinessWeights} onChange={setReadinessWeights} />
    </div>
  );
}

// ── Readiness weights editor ────────────────────────────────────────────────

const WEIGHT_LABELS = {
  scorecard: 'Scorecard performance',
  pipeline:  'Pipeline coverage',
  gates:     'Gate completion',
  evidence:  'Evidence strength',
  wins:      'Wins & eminence',
};

function ReadinessWeightsSection({ weights, onChange }) {
  const current = weights ?? DEFAULT_WEIGHTS;
  const sum = Object.values(current).reduce((a, b) => a + (Number(b) || 0), 0);

  function setWeight(key, value) {
    onChange({ ...current, [key]: Math.max(0, Math.min(100, Number(value) || 0)) });
  }

  function resetDefaults() {
    onChange(DEFAULT_WEIGHTS);
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Readiness score weights</h2>
      </div>
      <div className="card admin-card">
        <p className="admin-description">
          Adjust how each dimension contributes to your overall readiness score.
          Values are automatically normalized to sum to 100%.
        </p>
        <div className="readiness-weights-grid">
          {Object.keys(DEFAULT_WEIGHTS).map(key => {
            const normalized = sum > 0 ? Math.round((current[key] / sum) * 100) : 0;
            return (
              <div key={key} className="readiness-weight-row">
                <label className="readiness-weight-label">{WEIGHT_LABELS[key]}</label>
                <input
                  type="number"
                  className="form-input readiness-weight-input"
                  min="0" max="100"
                  value={current[key]}
                  onChange={e => setWeight(key, e.target.value)}
                />
                <span className="readiness-weight-norm">{normalized}%</span>
              </div>
            );
          })}
        </div>
        <div className="readiness-weights-footer">
          <span className="muted">Total: {sum} (normalized to 100%)</span>
          <button type="button" className="btn-secondary btn-sm" onClick={resetDefaults}>Reset to defaults</button>
        </div>
      </div>
    </section>
  );
}

// ── Tab 2: Categories ───────────────────────────────────────────────────────

function CategoriesTab() {
  const {
    relationshipTypes, setRelationshipTypes,
    winTags,           setWinTags,
    pipelineStages,    setPipelineStages,
    dealTypes,         setDealTypes,
    logoTypes,         setLogoTypes,
    originTypes,       setOriginTypes,
  } = useAdminData();

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">People relationship types</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Categories for people in the People tab. Click the colour dot to change the badge colour.
          </p>
          <EditableColorList items={relationshipTypes} onChange={setRelationshipTypes} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Win categories</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Tags used to categorise wins. Click the colour dot to change the tag colour.
          </p>
          <EditableColorList items={winTags} onChange={setWinTags} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Pipeline stages</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Opportunity pipeline stages used in the Pursuits page and Scorecard. Click the colour dot to change the stage colour.
          </p>
          <EditableColorList items={pipelineStages ?? []} onChange={setPipelineStages} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Deal types</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Deal type options for opportunities. The value is used as a key — the label is what users see.
          </p>
          <EditableValueList items={dealTypes ?? []} onChange={setDealTypes} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Logo types</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Logo type options for opportunities and wins (e.g. net new vs expansion).
          </p>
          <EditableValueList items={logoTypes ?? []} onChange={setLogoTypes} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Relationship origins</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            How opportunities and wins originated (e.g. referral, cold outreach).
          </p>
          <EditableValueList items={originTypes ?? []} onChange={setOriginTypes} />
        </div>
      </section>
    </div>
  );
}

// ── Tab 3: User Settings ────────────────────────────────────────────────────

function SettingsTab() {
  const { navOrder, setNavOrder } = useAdminData();

  const NAV_LABELS = {
    '/': 'Dashboard', '/scorecard': 'Scorecard', '/pursuits': 'Pursuits', '/goals': 'Goals',
    '/people': 'People', '/wins': 'Wins', '/actions': 'Action items', '/learning': 'Learning',
    '/story': 'Narrative + Gaps', '/calendar': 'Calendar', '/sharing': 'Sharing', '/admin': 'Admin',
  };

  const savedOrder = navOrder ?? DEFAULT_NAV_ORDER;
  const order = [
    ...savedOrder,
    ...Object.keys(NAV_LABELS).filter(r => !savedOrder.includes(r)),
  ];

  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function moveTab(idx, dir) {
    const next = [...order];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setNavOrder(next);
  }

  function handleDragStart(idx)   { dragIdx.current = idx; }
  function handleDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  function handleDragEnd()        { dragIdx.current = null; setDragOver(null); }

  function handleDrop(e, idx) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) { setDragOver(null); return; }
    const next = [...order];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    setNavOrder(next);
    dragIdx.current = null;
    setDragOver(null);
  }

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Tab order</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Drag or use the arrows to reorder the sidebar navigation tabs.
          </p>
          <div className="admin-list">
            {order.map((route, idx) => (
              <div key={route}
                className={`admin-list-item${dragOver === idx ? ' admin-list-item--dragover' : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}>
                <div className="admin-list-row">
                  <span className="tab-order-handle">⠿</span>
                  <span className="admin-list-label">{NAV_LABELS[route] ?? route}</span>
                  <div className="admin-list-btns">
                    <button className="admin-list-btn" onClick={() => moveTab(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="admin-list-btn" onClick={() => moveTab(idx, 1)}  disabled={idx === order.length - 1}>↓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Account data</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Clear all transactional data and start fresh. A backup is saved automatically before
            wiping and can be restored at any time from this page.
          </p>
          <WipeSection />
        </div>
      </section>
    </div>
  );
}

// ── Shared drag-and-drop helpers ────────────────────────────────────────────

function useDragReorder(items, onChange) {
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const onDragStart = useCallback(idx => { dragIdx.current = idx; }, []);
  const onDragOver  = useCallback((e, idx) => { e.preventDefault(); setDragOver(idx); }, []);
  const onDragEnd   = useCallback(() => { dragIdx.current = null; setDragOver(null); }, []);

  const onDrop = useCallback((e, idx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) { setDragOver(null); return; }
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    onChange(next);
    dragIdx.current = null;
    setDragOver(null);
  }, [items, onChange]);

  return { dragOver, onDragStart, onDragOver, onDrop, onDragEnd };
}

// ── Editable colour list (relationship types, win tags) ─────────────────────

function EditableColorList({ items, onChange }) {
  const [draft,          setDraft]          = useState('');
  const [editingIdx,     setEditingIdx]     = useState(null);
  const [editValue,      setEditValue]      = useState('');
  const [colorPickerIdx, setColorPickerIdx] = useState(null);
  const { dragOver, onDragStart, onDragOver, onDrop, onDragEnd } = useDragReorder(items, onChange);

  function handleAdd(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || items.some(i => i.label === trimmed)) return;
    onChange([...items, { label: trimmed, color: COLOR_PALETTE[0] }]);
    setDraft('');
  }

  function handleRemove(idx) {
    onChange(items.filter((_, i) => i !== idx));
    if (colorPickerIdx === idx) setColorPickerIdx(null);
  }

  function startEdit(idx) {
    setEditingIdx(idx);
    setEditValue(items[idx].label);
    setColorPickerIdx(null);
  }

  function saveEdit(idx) {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingIdx(null); return; }
    onChange(items.map((item, i) => i === idx ? { ...item, label: trimmed } : item));
    setEditingIdx(null);
  }

  function handleEditKey(e, idx) {
    if (e.key === 'Enter')  saveEdit(idx);
    if (e.key === 'Escape') setEditingIdx(null);
  }

  function setColor(idx, color) {
    onChange(items.map((item, i) => i === idx ? { ...item, color } : item));
  }

  return (
    <div className="admin-list">
      {items.map((item, idx) => (
        <div key={idx}
          className={`admin-list-item${dragOver === idx ? ' admin-list-item--dragover' : ''}`}
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDrop={e => onDrop(e, idx)}
          onDragEnd={onDragEnd}>
          <div className="admin-list-row">
            <span className="tab-order-handle">⠿</span>
            <button type="button" className="admin-color-dot" style={{ background: item.color }}
              onClick={() => setColorPickerIdx(colorPickerIdx === idx ? null : idx)} title="Change colour" />
            {editingIdx === idx
              ? <input className="form-input admin-list-edit-input" value={editValue}
                  onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(idx)}
                  onKeyDown={e => handleEditKey(e, idx)} autoFocus />
              : <span className="admin-list-label">{item.label}</span>
            }
            <div className="admin-list-btns">
              <button className="admin-list-btn" onClick={() => startEdit(idx)}>Rename</button>
              <button className="admin-list-btn admin-list-btn--danger" onClick={() => handleRemove(idx)}>Remove</button>
            </div>
          </div>
          {colorPickerIdx === idx && (
            <div className="admin-color-picker">
              {COLOR_PALETTE.map(hex => (
                <button key={hex} type="button"
                  className={`admin-color-swatch ${item.color === hex ? 'admin-color-swatch--active' : ''}`}
                  style={{ background: hex }} onClick={() => setColor(idx, hex)} title={hex} />
              ))}
              <input type="color" className="admin-color-wheel"
                value={item.color}
                onChange={e => setColor(idx, e.target.value)}
                title="Custom colour" />
            </div>
          )}
        </div>
      ))}
      <form className="admin-list-add" onSubmit={handleAdd}>
        <input className="form-input" value={draft} onChange={e => setDraft(e.target.value)} placeholder="New item..." />
        <button type="submit" className="btn-primary">Add</button>
      </form>
    </div>
  );
}

// ── Editable value/label list (deal types, logo types, origin types) ────────

function EditableValueList({ items, onChange }) {
  const [draftValue, setDraftValue] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue,  setEditValue]  = useState('');
  const [editLabel,  setEditLabel]  = useState('');
  const { dragOver, onDragStart, onDragOver, onDrop, onDragEnd } = useDragReorder(items, onChange);

  function handleAdd(e) {
    e.preventDefault();
    const val = draftValue.trim();
    const lbl = draftLabel.trim();
    if (!val || !lbl || items.some(i => i.value === val)) return;
    onChange([...items, { value: val, label: lbl }]);
    setDraftValue('');
    setDraftLabel('');
  }

  function handleRemove(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function startEdit(idx) {
    setEditingIdx(idx);
    setEditValue(items[idx].value);
    setEditLabel(items[idx].label);
  }

  function saveEdit(idx) {
    const val = editValue.trim();
    const lbl = editLabel.trim();
    if (!val || !lbl) { setEditingIdx(null); return; }
    onChange(items.map((item, i) => i === idx ? { value: val, label: lbl } : item));
    setEditingIdx(null);
  }

  function handleEditKey(e, idx) {
    if (e.key === 'Enter')  saveEdit(idx);
    if (e.key === 'Escape') setEditingIdx(null);
  }

  return (
    <div className="admin-list">
      {items.map((item, idx) => (
        <div key={idx}
          className={`admin-list-item${dragOver === idx ? ' admin-list-item--dragover' : ''}`}
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDrop={e => onDrop(e, idx)}
          onDragEnd={onDragEnd}>
          <div className="admin-list-row">
            <span className="tab-order-handle">⠿</span>
            {editingIdx === idx ? (
              <>
                <input className="form-input admin-list-edit-input admin-list-edit-input--short"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => handleEditKey(e, idx)}
                  placeholder="key" autoFocus />
                <input className="form-input admin-list-edit-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => handleEditKey(e, idx)}
                  placeholder="Display label" />
                <div className="admin-list-btns">
                  <button className="admin-list-btn" type="button" onClick={() => saveEdit(idx)}>Save</button>
                  <button className="admin-list-btn" type="button" onClick={() => setEditingIdx(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <span className="admin-list-value-key">{item.value}</span>
                <span className="admin-list-label">{item.label}</span>
                <div className="admin-list-btns">
                  <button className="admin-list-btn" onClick={() => startEdit(idx)}>Edit</button>
                  <button className="admin-list-btn admin-list-btn--danger" onClick={() => handleRemove(idx)}>Remove</button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
      <form className="admin-list-add admin-list-add--dual" onSubmit={handleAdd}>
        <input className="form-input admin-list-edit-input--short" value={draftValue}
          onChange={e => setDraftValue(e.target.value)} placeholder="key (e.g. referral)" />
        <input className="form-input" value={draftLabel}
          onChange={e => setDraftLabel(e.target.value)} placeholder="Label (e.g. Referral)" />
        <button type="submit" className="btn-primary">Add</button>
      </form>
    </div>
  );
}

// ── Large text sections ──────────────────────────────────────────────────────

function TextSection({ value, onSave, placeholder, rows }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;

  return (
    <div>
      <textarea className="form-input admin-textarea" rows={rows} value={draft}
        onChange={e => setDraft(e.target.value)} placeholder={placeholder} />
      <div className="admin-save-row">
        {dirty && <span className="admin-unsaved">Unsaved changes</span>}
        <button className="btn-primary" disabled={!dirty} onClick={() => onSave(draft)}>Save</button>
      </div>
    </div>
  );
}

function ApiKeySection({ value, onSave }) {
  const [draft,      setDraft]      = useState(value);
  const [show,       setShow]       = useState(false);
  const [keyStatus,  setKeyStatus]  = useState(null);
  useEffect(() => { setDraft(value); setKeyStatus(null); }, [value]);
  const dirty  = draft !== value;
  const masked = value ? `${value.slice(0, 14)}...${value.slice(-4)}` : '';

  async function testKey() {
    setKeyStatus('checking');
    try {
      const res  = await fetch(`${API_BASE}/api/ai/check-key`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apiKey: value }),
      });
      const data = await res.json();
      setKeyStatus(data.ok ? 'ok' : data.error ?? 'Unknown error');
    } catch {
      setKeyStatus('Could not reach backend — is it running?');
    }
  }

  return (
    <div>
      {value && !dirty && <p className="admin-key-saved">Saved: {masked}</p>}
      <div className="admin-key-row">
        <input className="form-input" type={show ? 'text' : 'password'} value={draft}
          onChange={e => { setDraft(e.target.value); setKeyStatus(null); }}
          placeholder="sk-ant-..." autoComplete="off" />
        <button type="button" className="admin-list-btn" onClick={() => setShow(s => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="admin-save-row">
        {value && !dirty && (
          <button type="button" className="admin-list-btn" onClick={testKey}
            disabled={keyStatus === 'checking'}>
            {keyStatus === 'checking' ? 'Testing…' : 'Test key'}
          </button>
        )}
        {keyStatus && keyStatus !== 'checking' && (
          <span className={keyStatus === 'ok' ? 'admin-key-ok' : 'admin-key-error'}>
            {keyStatus === 'ok' ? '✓ Key is valid' : keyStatus}
          </span>
        )}
        {dirty && <span className="admin-unsaved">Unsaved changes</span>}
        <button className="btn-primary" disabled={!dirty} onClick={() => onSave(draft)}>Save</button>
      </div>
    </div>
  );
}
