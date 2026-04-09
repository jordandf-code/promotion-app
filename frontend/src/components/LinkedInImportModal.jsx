// LinkedInImportModal.jsx — Paste LinkedIn text → AI parse → preview → import contacts

import { useState } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';

export default function LinkedInImportModal({ onImport, onClose }) {
  const [step, setStep]           = useState(1); // 1 = paste, 2 = preview
  const [text, setText]           = useState('');
  const [contacts, setContacts]   = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // ── Step 1: parse ─────────────────────────────────────────────────────────

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/parse-linkedin`, {
        method:  'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body:    JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(mapAiError(data.code, data.error));
        setLoading(false);
        return;
      }
      const parsed = data.data?.contacts ?? [];
      setContacts(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setStep(2);
    } catch (err) {
      setError('Failed to contact the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: selection helpers ─────────────────────────────────────────────

  function toggleOne(i) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function selectAll()   { setSelected(new Set(contacts.map((_, i) => i))); }
  function deselectAll() { setSelected(new Set()); }

  // ── Step 2: import ────────────────────────────────────────────────────────

  function handleImport() {
    const toImport = contacts.filter((_, i) => selected.has(i));
    onImport(toImport);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import from LinkedIn</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div className="modal-form">
            <p className="admin-description" style={{ margin: '0 0 0.75rem' }}>
              Paste a LinkedIn profile, connection list, or contact details. You can paste profile pages, CSV exports, or free-form contact lists.
            </p>
            <label>
              Contact text<span className="form-required">*</span>
              <textarea
                className="form-input form-textarea"
                rows={10}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste LinkedIn profiles, connections, or contact details here…"
                autoFocus
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!text.trim() || loading}
                onClick={handleParse}
              >
                {loading ? 'Parsing contacts…' : 'Parse with AI'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="modal-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} parsed, {selected.size} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={selectAll}>Select all</button>
                <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={deselectAll}>Deselect all</button>
              </div>
            </div>

            {contacts.length === 0 ? (
              <p className="list-empty" style={{ margin: '1rem 0' }}>No contacts were found in the pasted text.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ width: '2.5rem', padding: '0.5rem 0.25rem', textAlign: 'center' }}></th>
                      <th style={{ padding: '0.5rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '0.5rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Title</th>
                      <th style={{ padding: '0.5rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--border-subtle, #f0f0f0)', cursor: 'pointer' }}
                        onClick={() => toggleOne(i)}
                      >
                        <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleOne(i)}
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td style={{ padding: '0.5rem 0.5rem' }}>{c.name}</td>
                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--text-muted, #666)' }}>{c.title || '—'}</td>
                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--text-muted, #666)' }}>{c.org || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setStep(1); setError(''); }}>Back</button>
              <button
                type="button"
                className="btn-primary"
                disabled={selected.size === 0}
                onClick={handleImport}
              >
                Import {selected.size > 0 ? `${selected.size} ` : ''}selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
