// pages/Wins.jsx

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWinsData } from '../hooks/useWinsData.js';
import { useAdminData, DEFAULT_LOGO_TYPES, DEFAULT_ORIGIN_TYPES } from '../hooks/useAdminData.js';
import { fmtDate } from '../data/sampleData.js';
import WinFormModal from '../components/wins/WinFormModal.jsx';

const SOURCE_LABEL = {
  opportunity: 'Opportunity',
  goal:        'Goal',
};

export default function Wins() {
  const { wins, addWin, updateWin, removeWin } = useWinsData();
  const { winTags, logoTypes, originTypes } = useAdminData();
  const LOGO_TYPE_OPTIONS = logoTypes ?? DEFAULT_LOGO_TYPES;
  const ORIGIN_OPTIONS    = originTypes ?? DEFAULT_ORIGIN_TYPES;
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
              highlight={isHighlit}
              innerRef={isHighlit ? highlightRef : null}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="list-empty">
            {tagFilter === 'all'
              ? 'No wins logged yet. Add one above or mark an opportunity as won.'
              : `No wins tagged "${tagFilter}".`}
          </div>
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

function WinCard({ win, winTags, logoTypeOptions, originOptions, onEdit, onDelete, highlight, innerRef }) {
  function tagColor(label) {
    return winTags.find(t => t.label === label)?.color ?? '#64748b';
  }

  return (
    <div ref={innerRef} className={`win-card ${highlight ? 'win-card--highlight' : ''}`}>
      <div className="win-card-header">
        <div className="win-card-title-row">
          <h3 className="win-title">{win.title}</h3>
          <div className="win-card-actions">
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
    </div>
  );
}
