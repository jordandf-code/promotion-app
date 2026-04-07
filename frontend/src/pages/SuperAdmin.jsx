// pages/SuperAdmin.jsx
// Superuser admin panel: manage users, invite code, platform settings.

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';

const TABS = [
  { id: 'users',   label: 'Users'       },
  { id: 'invite',  label: 'Invite code' },
  { id: 'platform', label: 'Platform'   },
];

export default function SuperAdmin() {
  const [tab, setTab] = useState('users');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Super Admin</h1>
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

      {tab === 'users'    && <UsersTab />}
      {tab === 'invite'   && <InviteCodeTab />}
      {tab === 'platform' && <PlatformTab />}
    </div>
  );
}

// ── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetModal, setResetModal] = useState(null); // userId or null
  const [deleteModal, setDeleteModal] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function changeRole(userId, role) {
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setActionMsg(`Role updated to ${role}`);
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  async function resetPassword() {
    if (!resetPw || resetPw.length < 8) { setActionMsg('Password must be at least 8 characters'); return; }
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resetModal}/reset-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ newPassword: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg('Password reset — user must change on next login');
      setResetModal(null);
      setResetPw('');
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  async function deleteUser() {
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${deleteModal}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.filter(u => u.id !== deleteModal));
      setActionMsg('User deleted');
      setDeleteModal(null);
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  if (loading) return <div className="tab-content"><p className="muted">Loading users…</p></div>;
  if (error) return <div className="tab-content"><p className="auth-error">{error}</p></div>;

  // Get current user ID from the token (stored users list includes self)
  const currentUserId = users.find(u => u.role === 'superuser')?.id;

  return (
    <div className="tab-content">
      {actionMsg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{actionMsg}</p>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="super-admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.role === 'superuser';
              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {isSelf ? (
                      <span>{u.role}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}
                        className="form-input"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
                      >
                        <option value="user">user</option>
                        <option value="viewer">viewer</option>
                      </select>
                    )}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {!isSelf && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary btn-sm" onClick={() => { setResetModal(u.id); setResetPw(''); }}>
                          Reset password
                        </button>
                        <button className="btn-secondary btn-sm btn-danger" onClick={() => setDeleteModal(u.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Reset password</h3>
              <button className="modal-close" onClick={() => setResetModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="muted" style={{ marginBottom: '0.75rem' }}>
                Set a temporary password for this user. They will be required to change it on next login.
              </p>
              <label>
                New password <span className="auth-hint">(min 8 characters)</span>
                <input className="form-input" type="password" value={resetPw}
                  onChange={e => setResetPw(e.target.value)} minLength={8} autoFocus />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setResetModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={resetPassword}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Delete account</h3>
              <button className="modal-close" onClick={() => setDeleteModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this user account? All their data will be removed. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn-primary btn-danger" onClick={deleteUser}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Invite code tab ─────────────────────────────────────────────────────────

function InviteCodeTab() {
  const [isSet, setIsSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/invite-code`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setIsSet(d.isSet))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveCode(e) {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/invite-code`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsSet(data.isSet);
      if (data.isSet) {
        setMsg(`Invite code set to: ${code} — copy this now, it will not be shown again.`);
      } else {
        setMsg('Invite code cleared — registration is now open.');
      }
      setCode('');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearCode() {
    setMsg('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/invite-code`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ inviteCode: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsSet(false);
      setMsg('Invite code cleared — registration is now open.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="tab-content"><p className="muted">Loading…</p></div>;

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Invite code</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Status: <strong>{isSet ? 'Code is set' : 'No code set (registration open)'}</strong>
          </p>

          {msg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{msg}</p>}

          <form onSubmit={saveCode} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <input
              className="form-input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter new invite code"
              style={{ flex: 1 }}
            />
            <button className="btn-primary" disabled={saving || !code.trim()}>
              {saving ? 'Saving…' : 'Set code'}
            </button>
          </form>

          {isSet && (
            <button className="btn-secondary" onClick={clearCode} disabled={saving}>
              Remove code (open registration)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Platform tab ────────────────────────────────────────────────────────────

function PlatformTab() {
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [ghLoading, setGhLoading] = useState(true);
  const [ghMsg, setGhMsg] = useState('');
  const [ghSaving, setGhSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/platform-settings`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setGithubConfigured(d.githubConfigured);
        setGithubRepo(d.githubRepo || '');
      })
      .catch(() => {})
      .finally(() => setGhLoading(false));
  }, []);

  async function saveGithubSettings(e) {
    e.preventDefault();
    setGhMsg('');
    setGhSaving(true);
    try {
      const body = { githubRepo };
      if (githubToken) body.githubToken = githubToken;
      const res = await fetch(`${API_BASE}/api/admin/platform-settings`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGithubConfigured(data.githubConfigured);
      setGithubToken('');
      setGhMsg(data.githubConfigured ? 'GitHub integration configured.' : 'Settings saved (incomplete — both token and repo are required).');
    } catch (err) {
      setGhMsg(err.message);
    } finally {
      setGhSaving(false);
    }
  }

  async function clearGithubSettings() {
    setGhMsg('');
    setGhSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/platform-settings`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ githubToken: '', githubRepo: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGithubConfigured(false);
      setGithubRepo('');
      setGithubToken('');
      setGhMsg('GitHub integration removed.');
    } catch (err) {
      setGhMsg(err.message);
    } finally {
      setGhSaving(false);
    }
  }

  return (
    <div className="tab-content">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Platform</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description"><strong>App:</strong> Promotion Tracker</p>
          <p className="admin-description" style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
            Email notifications — coming in a future phase.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">GitHub issue reporting</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Let users report bugs and request features directly from the app. Issues are created in your GitHub repository.
          </p>
          <p className="admin-description" style={{ marginBottom: '1rem' }}>
            Status: <strong>{ghLoading ? 'Loading…' : githubConfigured ? 'Configured' : 'Not configured'}</strong>
          </p>

          {ghMsg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{ghMsg}</p>}

          <form onSubmit={saveGithubSettings} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label>
              GitHub personal access token
              <input
                className="form-input"
                type="password"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder={githubConfigured ? '••••••••  (leave blank to keep current)' : 'ghp_...'}
                autoComplete="off"
              />
            </label>
            <label>
              Repository<span className="form-required">*</span>
              <input
                className="form-input"
                type="text"
                value={githubRepo}
                onChange={e => setGithubRepo(e.target.value)}
                placeholder="owner/repo"
                required
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" disabled={ghSaving || !githubRepo.trim()}>
                {ghSaving ? 'Saving…' : 'Save'}
              </button>
              {githubConfigured && (
                <button type="button" className="btn-secondary" onClick={clearGithubSettings} disabled={ghSaving}>
                  Remove integration
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
