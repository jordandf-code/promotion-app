// SuperAdmin.jsx — Superuser admin panel for users, invite codes, categories, and platform settings

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { useAdminData, COLOR_PALETTE } from '../hooks/useAdminData.js';
import { DEFAULT_WEIGHTS } from '../hooks/useReadinessScore.js';

const TABS = [
  { id: 'users',      label: 'Users'       },
  { id: 'invite',     label: 'Invite code' },
  { id: 'categories', label: 'Categories'  },
  { id: 'platform',   label: 'Platform'    },
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

      {tab === 'users'      && <UsersTab />}
      {tab === 'invite'     && <InviteCodeTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'platform'   && <PlatformTab />}
    </div>
  );
}

// ── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users,       setUsers]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [actionMsg,   setActionMsg]   = useState('');

  // Search / filter / sort / page state
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [sort,        setSort]        = useState('created_at');
  const [order,       setOrder]       = useState('desc');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRole,    setBulkRole]    = useState('user');

  // Modals
  const [resetModal, setResetModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [resetPw,    setResetPw]    = useState('');

  // Expanded card on mobile
  const [expandedId, setExpandedId] = useState(null);

  // Debounce ref for search
  const searchTimer = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async (searchVal, roleVal, pageVal, sortVal, orderVal) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:   pageVal,
        limit:  25,
        search: searchVal,
        role:   roleVal,
        sort:   sortVal,
        order:  orderVal,
      });
      const res  = await fetch(`${API_BASE}/api/admin/users?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever filter/sort/page changes
  useEffect(() => {
    loadUsers(search, roleFilter, page, sort, order);
  }, [loadUsers, roleFilter, page, sort, order]); // search excluded — handled by debounce below

  // Debounce search input: wait 300ms after last keystroke, then reset to page 1 and fetch
  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadUsers(val, roleFilter, 1, sort, order);
    }, 300);
  }

  // Sort: clicking same column toggles asc/desc; clicking a new column defaults to asc
  function handleSort(col) {
    if (col === sort) {
      const nextOrder = order === 'asc' ? 'desc' : 'asc';
      setOrder(nextOrder);
      loadUsers(search, roleFilter, page, col, nextOrder);
    } else {
      setSort(col);
      setOrder('asc');
      loadUsers(search, roleFilter, page, col, 'asc');
    }
  }

  function sortIndicator(col) {
    if (col !== sort) return null;
    return <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem' }}>{order === 'asc' ? '▲' : '▼'}</span>;
  }

  // ── Individual actions ─────────────────────────────────────────────────────

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
      setTotal(prev => prev - 1);
      setActionMsg('User deleted');
      setDeleteModal(null);
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const nonSuperIds = users.filter(u => u.role !== 'superuser').map(u => u.id);
    if (nonSuperIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nonSuperIds));
    }
  }

  async function applyBulkRole() {
    if (selectedIds.size === 0) return;
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/bulk-role`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userIds: [...selectedIds], role: bulkRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Updated ${data.updated} user${data.updated !== 1 ? 's' : ''} to ${bulkRole}`);
      setSelectedIds(new Set());
      loadUsers(search, roleFilter, page, sort, order);
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const nonSuperIds = users.filter(u => u.role !== 'superuser').map(u => u.id);
  const allSelected = nonSuperIds.length > 0 && nonSuperIds.every(id => selectedIds.has(id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="tab-content">

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          className="form-input"
          style={{ flex: '1 1 180px', minWidth: 0 }}
          placeholder="Search name or email…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
        <select
          className="form-input"
          style={{ flex: '0 0 auto' }}
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
          <option value="superuser">Superuser</option>
        </select>
      </div>

      {/* Status line */}
      {actionMsg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{actionMsg}</p>}
      {error     && <p className="auth-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle, #f5f5f5)', borderRadius: '6px' }}>
          <span className="muted">{selectedIds.size} selected</span>
          <span className="muted">— Change role to</span>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
            value={bulkRole}
            onChange={e => setBulkRole(e.target.value)}
          >
            <option value="user">user</option>
            <option value="viewer">viewer</option>
          </select>
          <button className="btn-primary btn-sm" onClick={applyBulkRole}>Apply</button>
          <button className="btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>Clear</button>
        </div>
      )}

      {/* Desktop table (≥768px) */}
      <div className="card users-table-wrap" style={{ overflowX: 'auto', display: 'none' }} data-desktop>
        <table className="super-admin-table">
          <thead>
            <tr>
              <th style={{ width: '2rem' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Name{sortIndicator('name')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('email')}>
                Email{sortIndicator('email')}
              </th>
              <th>Role</th>
              <th>Company</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                Joined{sortIndicator('created_at')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>No users found</td></tr>
            ) : users.map(u => {
              const isSelf = u.role === 'superuser';
              return (
                <tr key={u.id}>
                  <td>
                    {!isSelf && (
                      <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} />
                    )}
                  </td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {isSelf ? (
                      <span className="badge">{u.role}</span>
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
                  <td>{u.company || <span className="muted">—</span>}</td>
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

      {/* Mobile cards (<768px) */}
      <div className="users-cards-wrap">
        {loading ? (
          <p className="muted" style={{ padding: '1rem 0' }}>Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted" style={{ padding: '1rem 0' }}>No users found</p>
        ) : users.map(u => {
          const isSelf = u.role === 'superuser';
          const isExpanded = expandedId === u.id;
          return (
            <div key={u.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div className="muted" style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                    <span className="badge">{u.role}</span>
                    {u.company && <span className="muted">{u.company}</span>}
                    <span className="muted">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {!isSelf && (
                  <button
                    className="btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => setExpandedId(isExpanded ? null : u.id)}
                  >
                    {isExpanded ? 'Close' : 'Actions'}
                  </button>
                )}
              </div>

              {isExpanded && !isSelf && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem' }}>
                    Role
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="form-input"
                      style={{ marginTop: '0.25rem' }}
                    >
                      <option value="user">user</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn-secondary btn-sm" onClick={() => { setResetModal(u.id); setResetPw(''); setExpandedId(null); }}>
                      Reset password
                    </button>
                    <button className="btn-secondary btn-sm btn-danger" onClick={() => { setDeleteModal(u.id); setExpandedId(null); }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button
            className="btn-secondary btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
          <span className="muted" style={{ marginLeft: '0.25rem' }}>({total} total)</span>
        </div>
      )}
      {totalPages <= 1 && total > 0 && !loading && (
        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{total} user{total !== 1 ? 's' : ''}</p>
      )}

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

      {/* Responsive CSS: show table on desktop, cards on mobile */}
      <style>{`
        @media (min-width: 768px) {
          .users-table-wrap { display: block !important; }
          .users-cards-wrap { display: none !important; }
        }
        @media (max-width: 767px) {
          .users-table-wrap { display: none !important; }
          .users-cards-wrap { display: block !important; }
        }
      `}</style>
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

// ── Categories tab (site-wide, stored in platform data) ─────────────────────

function CategoriesTab() {
  const {
    relationshipTypes, setRelationshipTypes,
    winTags,           setWinTags,
    pipelineStages,    setPipelineStages,
    dealTypes,         setDealTypes,
    logoTypes,         setLogoTypes,
    originTypes,       setOriginTypes,
    eminenceTypes,     setEminenceTypes,
    stakeholderGroups, setStakeholderGroups,
    readinessWeights,  setReadinessWeights,
    deckTemplate, deckTemplateFilename, setDeckTemplate,
    deckContentInstructions, setDeckContentInstructions,
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
            Opportunity pipeline stages used in the Opportunities page and Scorecard. Click the colour dot to change the stage colour.
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
          <h2 className="section-title">Eminence types</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Activity types for the Eminence tab (e.g. speaking, publication, panel).
          </p>
          <EditableValueList items={eminenceTypes ?? []} onChange={setEminenceTypes} />
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

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Stakeholder groups</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Groups for categorising people in the Influence Map (e.g. Practice leadership, Client).
          </p>
          <EditableValueList items={stakeholderGroups ?? []} onChange={setStakeholderGroups} />
        </div>
      </section>

      <ReadinessWeightsSection weights={readinessWeights} onChange={setReadinessWeights} />

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Deck template</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Upload a .pptx template to customise the look of promotion decks.
            If none is uploaded, the built-in default is used.
          </p>
          <DeckTemplateSection
            templateFilename={deckTemplateFilename}
            hasTemplate={!!deckTemplate}
            onUpload={setDeckTemplate}
            onRemove={() => setDeckTemplate('', '')}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Deck content instructions</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Plain English instructions Claude uses when filling decks (e.g. tone, which criteria
            to emphasise, how to handle thin data). If empty, built-in defaults are used.
          </p>
          <TextSection value={deckContentInstructions} onSave={setDeckContentInstructions}
            placeholder="e.g. Emphasise net-new logo wins. Use confident, executive tone. Prioritise client relationship and commercial criteria..." rows={5} />
        </div>
      </section>
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
          Adjust how each dimension contributes to the overall readiness score.
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

// ── Platform tab ────────────────────────────────────────────────────────────

function FirmConfigSection() {
  const { firmConfig, setFirmConfig } = useAdminData();
  const [draft, setDraft] = useState(firmConfig);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(firmConfig), [firmConfig]);

  function updateDraft(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }
  function updateMetricLabel(key, value) {
    setDraft(prev => ({ ...prev, metricLabels: { ...prev.metricLabels, [key]: value } }));
  }
  function updateThreshold(key, value) {
    const num = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    setDraft(prev => ({ ...prev, thresholds: { ...prev.thresholds, [key]: num } }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      await setFirmConfig(draft);
      setMsg('Firm configuration saved.');
    } catch {
      setMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Firm configuration</h2>
      </div>
      <div className="card admin-card">
        <p className="admin-description">
          Configure labels for your firm. These replace hardcoded references throughout the app and AI prompts.
        </p>
        {msg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{msg}</p>}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label>
            Company name
            <input className="form-input" value={draft.companyName} onChange={e => updateDraft('companyName', e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label>
              Current role label
              <input className="form-input" value={draft.currentRoleLabel} onChange={e => updateDraft('currentRoleLabel', e.target.value)} />
            </label>
            <label>
              Target role label
              <input className="form-input" value={draft.targetRoleLabel} onChange={e => updateDraft('targetRoleLabel', e.target.value)} />
            </label>
          </div>
          <label>
            Market / practice description
            <input className="form-input" value={draft.marketDescription} onChange={e => updateDraft('marketDescription', e.target.value)} />
          </label>
          <label>
            Criteria label
            <input className="form-input" value={draft.criteriaLabel} onChange={e => updateDraft('criteriaLabel', e.target.value)}
              placeholder="e.g. Promotion criteria, IBM criteria" />
          </label>
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
            <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.25rem' }}>Scorecard metric labels</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Signings
                <input className="form-input" value={draft.metricLabels?.signings ?? ''} onChange={e => updateMetricLabel('signings', e.target.value)} />
              </label>
              <label>
                Revenue
                <input className="form-input" value={draft.metricLabels?.revenue ?? ''} onChange={e => updateMetricLabel('revenue', e.target.value)} />
              </label>
              <label>
                Gross profit
                <input className="form-input" value={draft.metricLabels?.grossProfit ?? ''} onChange={e => updateMetricLabel('grossProfit', e.target.value)} />
              </label>
              <label>
                Utilization
                <input className="form-input" value={draft.metricLabels?.utilization ?? ''} onChange={e => updateMetricLabel('utilization', e.target.value)} />
              </label>
            </div>
          </fieldset>
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
            <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.25rem' }}>Compliance thresholds <span className="form-unit">%</span></legend>
            <p className="admin-description" style={{ margin: '0 0 0.5rem' }}>
              Minimum percentage of target required to be considered on track.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                {draft.metricLabels?.signings || 'Signings'}
                <input className="form-input" type="number" min="0" max="100" value={draft.thresholds?.signings ?? 85} onChange={e => updateThreshold('signings', e.target.value)} />
              </label>
              <label>
                {draft.metricLabels?.revenue || 'Revenue'}
                <input className="form-input" type="number" min="0" max="100" value={draft.thresholds?.revenue ?? 85} onChange={e => updateThreshold('revenue', e.target.value)} />
              </label>
              <label>
                {draft.metricLabels?.grossProfit || 'Gross profit'}
                <input className="form-input" type="number" min="0" max="100" value={draft.thresholds?.grossProfit ?? 80} onChange={e => updateThreshold('grossProfit', e.target.value)} />
              </label>
              <label>
                {draft.metricLabels?.utilization || 'Utilization'}
                <input className="form-input" type="number" min="0" max="100" value={draft.thresholds?.utilization ?? 70} onChange={e => updateThreshold('utilization', e.target.value)} />
              </label>
            </div>
          </fieldset>
          <div>
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save firm configuration'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function PlatformTab() {
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [ghLoading, setGhLoading] = useState(true);
  const [ghMsg, setGhMsg] = useState('');
  const [ghSaving, setGhSaving] = useState(false);
  const [emailFrom, setEmailFrom] = useState('');
  const [resendConfigured, setResendConfigured] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1.5);
  const [exchangeRateDraft, setExchangeRateDraft] = useState('1.5');
  const [erMsg, setErMsg] = useState('');
  const [erSaving, setErSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/platform-settings`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setGithubConfigured(d.githubConfigured);
        setGithubRepo(d.githubRepo || '');
        setEmailFrom(d.emailFrom || '');
        setResendConfigured(d.resendConfigured || false);
      })
      .catch(() => {})
      .finally(() => setGhLoading(false));

    fetch(`${API_BASE}/api/platform`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.exchangeRate && d.exchangeRate > 0) {
          setExchangeRate(d.exchangeRate);
          setExchangeRateDraft(String(d.exchangeRate));
        }
      })
      .catch(() => {});
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

  async function saveExchangeRate(e) {
    e.preventDefault();
    const parsed = parseFloat(exchangeRateDraft);
    if (isNaN(parsed) || parsed <= 0) {
      setErMsg('Rate must be a positive number.');
      return;
    }
    setErMsg('');
    setErSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/platform/exchange-rate`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ exchangeRate: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExchangeRate(parsed);
      setErMsg('Exchange rate saved.');
    } catch (err) {
      setErMsg(err.message);
    } finally {
      setErSaving(false);
    }
  }

  return (
    <div className="tab-content">
      <FirmConfigSection />

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Currency</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            All values are stored in CAD. When users display in USD, this rate is used for conversion.
          </p>
          {erMsg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{erMsg}</p>}
          <form onSubmit={saveExchangeRate} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label>
              CAD &rarr; USD exchange rate<span className="form-unit">CAD per 1 USD</span>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                style={{ maxWidth: '200px' }}
                value={exchangeRateDraft}
                onChange={e => setExchangeRateDraft(e.target.value)}
              />
            </label>
            <button className="btn-primary" disabled={erSaving || parseFloat(exchangeRateDraft) === exchangeRate}>
              {erSaving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Platform</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description"><strong>App:</strong> Career Command Center</p>
          <p className="admin-description" style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
            Resend API key: <strong>{resendConfigured ? 'Configured (env var)' : 'Not configured'}</strong>
            {!resendConfigured && <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.25rem' }}>Set RESEND_API_KEY in your server environment to enable email notifications.</span>}
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

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Email notifications</h2>
        </div>
        <div className="card admin-card">
          <p className="admin-description">
            Configure the sender address for notification emails. Requires a verified domain on Resend.
          </p>
          <p className="admin-description" style={{ marginBottom: '1rem' }}>
            Status: <strong>{resendConfigured ? 'Resend API key set' : 'Resend API key not set'}</strong>
          </p>

          {emailMsg && <p className="muted" style={{ marginBottom: '0.75rem' }}>{emailMsg}</p>}

          <form onSubmit={async (e) => {
            e.preventDefault();
            setEmailMsg('');
            setEmailSaving(true);
            try {
              const res = await fetch(`${API_BASE}/api/admin/platform-settings`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ emailFrom: emailFrom }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              setEmailMsg('From address saved.');
            } catch (err) {
              setEmailMsg(err.message);
            } finally {
              setEmailSaving(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label>
              From address
              <input
                className="form-input"
                type="text"
                value={emailFrom}
                onChange={e => setEmailFrom(e.target.value)}
                placeholder="Promotion Tracker <notifications@partner.jordandf.com>"
              />
            </label>
            <div>
              <button className="btn-primary" disabled={emailSaving}>
                {emailSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
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

// ── Editable colour list (relationship types, win tags, pipeline stages) ────

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

// ── Large text / deck template sections ─────────────────────────────────────

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

function DeckTemplateSection({ templateFilename, hasTemplate, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.name.endsWith('.pptx')) { setError('Only .pptx files are accepted.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File exceeds 5MB limit.'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // strip data:...;base64, prefix
      onUpload(base64, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-uploaded
  }

  return (
    <div>
      {hasTemplate ? (
        <div className="admin-save-row" style={{ marginBottom: '0.75rem' }}>
          <span className="muted">Current: {templateFilename || 'Custom template'}</span>
          <button className="btn-secondary btn-sm" onClick={onRemove}>Remove</button>
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: '0.75rem' }}>No custom template — using built-in default.</p>
      )}
      <input ref={fileRef} type="file" accept=".pptx" style={{ display: 'none' }} onChange={handleFile} />
      <button className="btn-primary" onClick={() => fileRef.current?.click()}>Upload .pptx template</button>
      <span className="muted" style={{ marginLeft: '0.75rem' }}>Max 5MB</span>
      {error && <p className="form-error" style={{ marginTop: '0.5rem' }}>{error}</p>}

      <details style={{ marginTop: '1rem' }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>Template requirements</summary>
        <pre className="admin-textarea" style={{ marginTop: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>{`Your template must contain these exact placeholder strings \u2014 the app replaces them with your live data when you generate a deck.

Slide 1 (scorecard + wins + pipeline):
  [Candidate Name]
  [Associate Partner \u2013 Band 10]     \u2190 your current role
  [Client Partner \u2013 Band D]         \u2190 your target role
  [Public Sector / Canadian Federal] \u2190 your practice/market
  [2025]                            \u2190 qualifying year
  $XXM  (\u00d74 \u2014 signings, revenue, opportunity A/B/C values)
  vs $XXM target  (\u00d72 \u2014 signings and revenue targets)
  XX%   (\u00d72 \u2014 gross profit and utilization values)
  vs XX% target  (\u00d72 \u2014 gross profit and utilization targets)
  [Win 1 \u2013 one sentence describing the win, client, and value]
  [Win 2 \u2013 ...]  [Win 3 \u2013 ...]  [Win 4 \u2013 ...]
  [Opportunity A \u2013 brief description]
  [Opportunity B \u2013 ...]  [Opportunity C \u2013 ...]
  [e.g., Proposal Submitted]  (\u00d73 \u2014 one per opportunity)

Slide 2 (criteria + the ask):
  [e.g., Client Relationship & Trust]  (\u00d76)
  \u2605\u2605\u2605\u2605\u2605 or \u2605\u2605\u2605\u2605\u2606  (\u00d76 \u2014 strength ratings)
  [Jordan is the trusted advisor...]   (\u00d76 \u2014 one-line assessments)
  [Bullet 1 \u2013 e.g., Own and grow...]
  [Bullet 2 \u2013 ...]  [Bullet 3 \u2013 ...]`}</pre>
      </details>
    </div>
  );
}
