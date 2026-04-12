// Wins.jsx — Win tracking with tag filtering, source linking, and date logging

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWinsData } from '../hooks/useWinsData.js';
import { useAdminData, DEFAULT_LOGO_TYPES, DEFAULT_ORIGIN_TYPES } from '../hooks/useAdminData.js';
import { fmtDate } from '../data/sampleData.js';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';
import WinFormModal from '../components/wins/WinFormModal.jsx';
import EmptyState from '../components/EmptyState.jsx';

const SOURCE_LABEL = {
  opportunity: 'Opportunity',
  goal:        'Goal',
};

export default function Wins() {
  const { wins, addWin, updateWin, removeWin } = useWinsData();
  const { winTags, logoTypes, originTypes } = useAdminData();
  const LOGO_TYPE_OPTIONS = logoTypes ?? DEFAULT_LOGO_TYPES;
  const ORIGIN_OPTIONS    = originTypes ?? DEFAULT_ORIGIN_TYPES;
  const navigate = useNavigate();
  const [tagFilter, setTagFilter] = useState('all');
  const [modal,     setModal]     = useState(null);
  const [searchParams] = useSearchParams();
  const highlightId    = searchParams.get('id');
  const highlightRef   = useRef(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  const filtered = [...wins]
    .filter(w => tagFilter === 'all' || w.tags.includes(tagFilter))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  function openAdd()      { setModal({ mode: 'add',  win: null }); }
  function openEdit(win)  { setModal({ mode: 'edit', win }); }
  function closeModal()   { setModal(null); }

  function handleSave(form) {
    if (modal.mode === 'add') addWin(form);
    else updateWin(modal.win.id, form);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this win?')) removeWin(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Wins</h1>
        <div className="page-header-actions">
          <span className="page-count">{wins.length} win{wins.length !== 1 ? 's' : ''} logged</span>
          <button className="btn-ghost" onClick={() => navigate('/import-export')}>Import / Export</button>
          <button className="btn-primary" onClick={openAdd}>+ Add win</button>
        </div>
      </div>

      <div className="tab-toolbar">
        <div className="tab-filters">
          <select className="filter-select" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
            <option value="all">All tags</option>
            {winTags.map(({ label }) => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>
        {tagFilter !== 'all' && (
          <span className="filter-result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="win-list">
        {filtered.map(w => {
          const isHighlit = w.id === highlightId;
          return (
            <WinCard
              key={w.id}
              win={w}
              winTags={winTags}
              logoTypeOptions={LOGO_TYPE_OPTIONS}
              originOptions={ORIGIN_OPTIONS}
              onEdit={() => openEdit(w)}
              onDelete={() => handleDelete(w.id)}
              onUpdateWin={updateWin}
              highlight={isHighlit}
              innerRef={isHighlit ? highlightRef : null}
            />
          );
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            title={tagFilter === 'all' ? 'No wins logged yet' : `No wins tagged "${tagFilter}"`}
            description={tagFilter === 'all' ? 'Capture your achievements to build your promotion case. Add a win above or mark an opportunity as won.' : 'Try selecting a different tag filter.'}
          />
        )}
      </div>

      {modal && (
        <WinFormModal
          mode={modal.mode}
          initial={modal.win ?? {}}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function WinCard({ win, winTags, logoTypeOptions, originOptions, onEdit, onDelete, onUpdateWin, highlight, innerRef }) {
  const [enhancing, setEnhancing]     = useState(false);
  const [enhanceErr, setEnhanceErr]   = useState(null);
  const [enhanceUsage, setEnhanceUsage] = useState(null);
  const [viewMode, setViewMode]       = useState(win.enhanced?.mode ?? 'statement');
  const [showEnhanced, setShowEnhanced] = useState(!!win.enhanced);

  async function handleEnhance() {
    setEnhancing(true);
    setEnhanceErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/enhance-win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ winId: win.id }),
      });
      const data = await res.json();
      if (!data.ok) { setEnhanceErr(mapAiError(data.code, data.error)); return; }
      const enhanced = {
        statement: data.data.statement,
        bullets: data.data.bullets,
        one_liner: data.data.one_liner,
        generated_at: new Date().toISOString(),
        mode: viewMode,
        data_sources: data.data.data_sources ?? [],
      };
      onUpdateWin(win.id, { enhanced });
      setShowEnhanced(true);
      if (data.usage) setEnhanceUsage(data.usage);
    } catch {
      setEnhanceErr('Could not reach the AI service');
    } finally {
      setEnhancing(false);
    }
  }

  function tagColor(label) {
    return winTags.find(t => t.label === label)?.color ?? '#64748b';
  }

  return (
    <div ref={innerRef} className={`win-card ${highlight ? 'win-card--highlight' : ''}`}>
      <div className="win-card-header">
        <div className="win-card-title-row">
          <h3 className="win-title">{win.title}</h3>
          <div className="win-card-actions">
            <button type="button" className="btn-ai-inline" onClick={handleEnhance} disabled={enhancing}>
              {enhancing ? 'Enhancing…' : win.enhanced ? '✦ Re-enhance' : '✦ Enhance with AI'}
            </button>
            <button className="row-btn" onClick={onEdit}>Edit</button>
            <button className="row-btn row-btn--danger" onClick={onDelete}>Remove</button>
          </div>
        </div>
        <div className="win-card-meta">
          <span className="win-date">{fmtDate(win.date)}</span>
          {win.sourceType !== 'manual' && win.sourceName && (
            <span className={`win-source-badge win-source-badge--${win.sourceType}`}>
              {SOURCE_LABEL[win.sourceType]}: {win.sourceName}
            </span>
          )}
        </div>
      </div>

      {win.impact && (
        <div className="win-impact">
          <span className="win-impact-label">Impact</span>
          <span className="win-impact-text">{win.impact}</span>
        </div>
      )}

      {win.description && <p className="win-description">{win.description}</p>}

      {win.tags.length > 0 && (
        <div className="win-tags">
          {win.tags.map(t => {
            const color = tagColor(t);
            return (
              <span key={t} className="win-tag" style={{
                background:  color + '20',
                color,
                borderColor: color + '60',
              }}>{t}</span>
            );
          })}
        </div>
      )}

      {(win.logoType || win.relationshipOrigin || win.strategicNote) && (
        <div className="win-strategic">
          {win.logoType && (
            <span className={`win-strategic-pill ${win.logoType === 'net-new' ? 'win-strategic-pill--new' : 'win-strategic-pill--exp'}`}>
              {logoTypeOptions.find(o => o.value === win.logoType)?.label ?? win.logoType}
            </span>
          )}
          {win.relationshipOrigin && (
            <span className="win-strategic-pill win-strategic-pill--origin">
              {originOptions.find(o => o.value === win.relationshipOrigin)?.label ?? win.relationshipOrigin}
            </span>
          )}
          {win.strategicNote && (
            <p className="win-strategic-note">{win.strategicNote}</p>
          )}
        </div>
      )}

      {enhanceErr && <p className="form-field-error" style={{ margin: '0.5rem 0 0' }}>{enhanceErr}</p>}

      {win.enhanced && showEnhanced && (
        <div className="win-enhanced" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {['statement', 'bullets', 'one_liner'].map(m => (
                <button key={m} type="button"
                  className={`sc-tab ${viewMode === m ? 'sc-tab--active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => { setViewMode(m); onUpdateWin(win.id, { enhanced: { ...win.enhanced, mode: m } }); }}>
                  {m === 'statement' ? 'Statement' : m === 'bullets' ? 'Bullets' : 'One-liner'}
                </button>
              ))}
            </div>
            <button type="button" className="row-btn" onClick={() => setShowEnhanced(false)} style={{ fontSize: '0.7rem' }}>Hide</button>
          </div>

          {viewMode === 'statement' && (
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{win.enhanced.statement}</p>
          )}
          {viewMode === 'bullets' && (
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {(win.enhanced.bullets ?? []).map((b, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{b}</li>)}
            </ul>
          )}
          {viewMode === 'one_liner' && (
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{win.enhanced.one_liner}</p>
          )}

          {enhanceUsage && (
            <p className="story-token-usage" style={{ textAlign: 'left', padding: '0.5rem 0 0', margin: 0 }}>
              {enhanceUsage.input_tokens} input · {enhanceUsage.output_tokens} output tokens
            </p>
          )}
        </div>
      )}

      {win.enhanced && !showEnhanced && (
        <button type="button" className="row-btn" onClick={() => setShowEnhanced(true)}
          style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Show AI enhanced version
        </button>
      )}
    </div>
  );
}
