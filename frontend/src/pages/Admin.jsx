// Admin.jsx — User profile, GenAI settings (API key), and general user settings

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAdminData, DEFAULT_NAV_ORDER } from '../hooks/useAdminData.js';
import { useSettings } from '../context/SettingsContext.jsx';
import WipeSection from '../components/admin/WipeSection.jsx';
import AIUsageLog from '../components/admin/AIUsageLog.jsx';
import ModeShiftWizard from '../components/ModeShiftWizard.jsx';

export default function Admin() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const { demoMode, setDemoMode } = useSettings();
  const [journeyLoading, setJourneyLoading] = useState(false);

  async function directPut(domain, data) {
    const res = await fetch(`${API_BASE}/api/data/${domain}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ data }),
    });
    if (!res.ok) throw new Error(`PUT ${domain} failed`);
  }

  async function startJourney() {
    if (!window.confirm(
      'This will clear all sample data so you can start entering your real promotion data.\n\n' +
      'Your admin settings (categories, API key, IBM criteria) are kept.\n\nContinue?'
    )) return;

    setJourneyLoading(true);
    try {
      await Promise.all([
        directPut('wins',      []),
        directPut('goals',     []),
        directPut('actions',   []),
        directPut('people',    []),
        directPut('scorecard', { targets: {}, opportunities: [], projects: [], utilization: {} }),
        directPut('eminence',  { activities: [] }),
        directPut('learning',  { certifications: [], courses: [] }),
        directPut('story',     null),
      ]);
      // Write demoMode: false directly to bypass debounce
      const settingsRes = await fetch(`${API_BASE}/api/data/settings`, {
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      });
      const currentSettings = (await settingsRes.json()).data ?? {};
      await directPut('settings', { ...currentSettings, demoMode: false });
      window.location.reload();
    } catch {
      setJourneyLoading(false);
    }
  }

  const TABS = [
    { id: 'profile',    label: 'My profile'    },
    ...(!isViewer ? [
      { id: 'ai',         label: 'GenAI'         },
      { id: 'settings',   label: 'User settings' },
    ] : []),
  ];

  const [tab, setTab] = useState('profile');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
      </div>

      {demoMode && (
        <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', color: '#1e40af' }}>Ready to use your real data?</h3>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            You're currently viewing sample data. Click below to clear it and start tracking your real promotion journey.
            Your admin settings (categories, API key, IBM criteria) will be kept.
          </p>
          <button className="btn-primary" onClick={startJourney} disabled={journeyLoading}>
            {journeyLoading ? 'Clearing sample data…' : 'Start your promotion journey'}
          </button>
        </div>
      )}

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

      <NotificationPrefsSection />
    </div>
  );
}

// ── Notification preferences (shown in My Profile, all roles) ───────────────

const DAYS_OF_WEEK = [
  { value: 'monday',    label: 'Monday' },
  { value: 'tuesday',   label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday',  label: 'Thursday' },
  { value: 'friday',    label: 'Friday' },
  { value: 'saturday',  label: 'Saturday' },
  { value: 'sunday',    label: 'Sunday' },
];

const HOURS_UTC = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00 UTC`,
}));

function NotificationPrefsSection() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [history, setHistory] = useState([]);
  const initialized = useRef(false);

  const loadPrefs = useCallback(async () => {
    try {
      const [prefsRes, histRes] = await Promise.all([
        fetch(`${API_BASE}/api/notifications/prefs`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/notifications/history`, { headers: authHeaders() }),
      ]);
      const prefsData = await prefsRes.json();
      const histData = await histRes.json();
      setPrefs(prefsData.prefs || {});
      setHistory(histData.notifications || []);
      initialized.current = true;
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  async function savePrefs(updated) {
    setPrefs(updated);
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/notifications/prefs`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefs: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Saved');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key) {
    const updated = { ...prefs, [key]: prefs[key] === false ? true : false };
    // If turning off 'paused', default to true (re-enable)
    if (key === 'paused') updated.paused = !prefs.paused;
    savePrefs(updated);
  }

  function setDigestDay(day) { savePrefs({ ...prefs, digestDay: day }); }
  function setDigestHour(hour) { savePrefs({ ...prefs, digestHour: Number(hour) }); }

  async function sendTestDigest() {
    setTestMsg('Sending…');
    try {
      const res = await fetch(`${API_BASE}/api/notifications/test-digest`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      setTestMsg(data.ok ? 'Test digest sent — check your email!' : data.message || 'Failed to send');
    } catch (err) {
      setTestMsg(err.message);
    }
  }

  if (loading) return null;
  if (!prefs) return null;

  const paused = !!prefs.paused;
  const digestEnabled = prefs.weeklyDigest !== false;
  const feedbackEnabled = prefs.feedbackReceived !== false;

  return (
    <section className="section">
      <div className="section-header"><h2 className="section-title">Notifications</h2></div>
      <div className="card admin-card">
        {msg && <p className="muted" style={{ marginBottom: '0.5rem' }}>{msg}</p>}

        <label className="sharing-toggle" style={{ marginBottom: '1rem' }}>
          <input type="checkbox" checked={!paused} onChange={() => toggle('paused')} />
          <strong>Email notifications</strong>
        </label>

        {!paused && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label className="sharing-toggle">
                <input type="checkbox" checked={digestEnabled}
                  onChange={() => savePrefs({ ...prefs, weeklyDigest: !digestEnabled })} />
                Weekly digest
              </label>
              <label className="sharing-toggle">
                <input type="checkbox" checked={feedbackEnabled}
                  onChange={() => savePrefs({ ...prefs, feedbackReceived: !feedbackEnabled })} />
                Feedback received
              </label>
              <label className="sharing-toggle">
                <input type="checkbox" checked={prefs.overdueAction !== false}
                  onChange={() => savePrefs({ ...prefs, overdueAction: prefs.overdueAction === false })} />
                Overdue action items
              </label>
              <label className="sharing-toggle">
                <input type="checkbox" checked={prefs.staleContact !== false}
                  onChange={() => savePrefs({ ...prefs, staleContact: prefs.staleContact === false })} />
                Stale key contacts
              </label>
              <label className="sharing-toggle">
                <input type="checkbox" checked={prefs.goalDeadline !== false}
                  onChange={() => savePrefs({ ...prefs, goalDeadline: prefs.goalDeadline === false })} />
                Goal deadlines approaching
              </label>
              <label className="sharing-toggle">
                <input type="checkbox" checked={prefs.scorecardAtRisk !== false}
                  onChange={() => savePrefs({ ...prefs, scorecardAtRisk: prefs.scorecardAtRisk === false })} />
                Scorecard metrics at risk
              </label>
            </div>

            {digestEnabled && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <label>
                  Digest day
                  <select className="form-input" value={prefs.digestDay || 'monday'}
                    onChange={e => setDigestDay(e.target.value)} style={{ width: 'auto' }}>
                    {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </label>
                <label>
                  Digest time
                  <select className="form-input" value={prefs.digestHour != null ? prefs.digestHour : 12}
                    onChange={e => setDigestHour(e.target.value)} style={{ width: 'auto' }}>
                    {HOURS_UTC.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <button className="btn-secondary" onClick={sendTestDigest}>Send test digest</button>
              {testMsg && <span className="muted">{testMsg}</span>}
            </div>
          </>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p className="admin-description" style={{ marginBottom: '0.5rem' }}><strong>Recent notifications</strong></p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {history.slice(0, 10).map(n => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{n.type === 'weekly_digest' ? 'Weekly digest' : n.type === 'feedback_received' ? 'Feedback received' : n.type}</span>
                  <span>{new Date(n.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Tab 1: GenAI ────────────────────────────────────────────────────────────

function GenAITab() {
  const {
    ibmCriteria, setIbmCriteria, careerHistory, setCareerHistory,
    anthropicKey, setAnthropicKey,
  } = useAdminData();

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

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">AI usage</h2>
        </div>
        <AIUsageLog />
      </section>
    </div>
  );
}

// ── Tab 2: User Settings ────────────────────────────────────────────────────

function SettingsTab() {
  const { navOrder, setNavOrder, autoFollowUp, setAutoFollowUp } = useAdminData();
  const followUp = autoFollowUp ?? { enabled: true, intervalDays: 30 };
  const [showModeShift, setShowModeShift] = useState(false);

  const NAV_LABELS = {
    '/': 'Dashboard', '/scorecard': 'Scorecard', '/opportunities': 'Opportunities', '/goals': 'Goals',
    '/people': 'People', '/wins': 'Wins', '/eminence': 'Eminence', '/actions': 'Action items', '/learning': 'Learning',
    '/story': 'Narrative + Gaps', '/calendar': 'Calendar', '/sharing': 'Sharing', '/admin': 'Admin',
  };

  const allRoutes = Object.keys(NAV_LABELS);
  const savedOrder = navOrder ?? DEFAULT_NAV_ORDER;
  const order = [
    ...savedOrder,
    ...allRoutes.filter(r => !savedOrder.includes(r)),
  ];

  const dragIdx = useRef(null);
  const dragRoute = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function moveTab(idx, dir) {
    const next = [...order];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setNavOrder(next);
  }

  function handleDragStart(idx)   { dragIdx.current = idx; dragRoute.current = order[idx]; }
  function handleDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  function handleDragEnd()        { dragIdx.current = null; dragRoute.current = null; setDragOver(null); }

  function handleDrop(e, idx) {
    e.preventDefault();
    const fromRoute = dragRoute.current;
    const toRoute = order[idx];
    if (!fromRoute || fromRoute === toRoute) { setDragOver(null); return; }
    const next = [...order];
    const fromIdx = next.indexOf(fromRoute);
    if (fromIdx === -1) { setDragOver(null); return; }
    next.splice(fromIdx, 1);
    const toIdx = next.indexOf(toRoute);
    next.splice(toIdx === -1 ? idx : toIdx, 0, fromRoute);
    setNavOrder(next);
    dragIdx.current = null;
    dragRoute.current = null;
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
          <h2 className="section-title">Follow-up actions</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Automatically create follow-up action items for contacts you haven't reached out to in a while.
          </p>
          <label className="sharing-toggle" style={{ marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={followUp.enabled !== false}
              onChange={e => setAutoFollowUp({ ...followUp, enabled: e.target.checked })}
            />
            <strong>Auto-create follow-up actions</strong>
          </label>
          {followUp.enabled !== false && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
              Days without contact before creating follow-up
              <input
                className="form-input"
                type="number"
                min={1}
                value={followUp.intervalDays || 30}
                onChange={e => setAutoFollowUp({
                  ...followUp,
                  intervalDays: Math.max(1, parseInt(e.target.value) || 30),
                })}
                style={{ width: '5rem' }}
              />
            </label>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Role transition</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            When you're promoted or changing roles, this wizard helps you archive your current progress
            and set up for your new role.
          </p>
          <button className="btn-primary" onClick={() => setShowModeShift(true)}>
            Start role transition
          </button>
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

      {showModeShift && (
        <ModeShiftWizard
          onComplete={() => { setShowModeShift(false); window.location.reload(); }}
          onClose={() => setShowModeShift(false)}
        />
      )}
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
