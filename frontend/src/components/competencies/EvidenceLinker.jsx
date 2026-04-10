// EvidenceLinker.jsx — Link wins to competencies as evidence. Supports AI auto-linking + manual selection.

import { useState } from 'react';
import { API_BASE, authHeaders } from '../../utils/api.js';
import { mapAiError } from '../../utils/aiErrors.js';

export default function EvidenceLinker({ competencyId, competencyLabel, evidenceIds = [], wins = [], onUpdate }) {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [showManual, setShowManual] = useState(false);

  const linkedWins = wins.filter(w => evidenceIds.includes(w.id));
  const unlinkedWins = wins.filter(w => !evidenceIds.includes(w.id));

  function addEvidence(winId) {
    onUpdate([...new Set([...evidenceIds, winId])]);
  }

  function removeEvidence(winId) {
    onUpdate(evidenceIds.filter(id => id !== winId));
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {linkedWins.length} win{linkedWins.length !== 1 ? 's' : ''} linked
        </span>
        <button
          type="button"
          className="row-btn"
          style={{ fontSize: '0.75rem' }}
          onClick={() => setShowManual(!showManual)}
        >
          {showManual ? 'Hide' : 'Link wins'}
        </button>
      </div>

      {/* Linked wins chips */}
      {linkedWins.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
          {linkedWins.map(w => (
            <span key={w.id} className="badge" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              {w.title}
              <button
                type="button"
                onClick={() => removeEvidence(w.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1, color: 'var(--text-secondary)' }}
                title="Remove"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Manual linking dropdown */}
      {showManual && unlinkedWins.length > 0 && (
        <div style={{ marginTop: '0.4rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '4px' }}>
          {unlinkedWins.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => addEvidence(w.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.4rem 0.6rem', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border-color, #e2e8f0)',
                cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              {w.title} <span className="muted">({w.date})</span>
            </button>
          ))}
        </div>
      )}

      {showManual && unlinkedWins.length === 0 && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>No unlinked wins available</p>
      )}

      {error && <p className="form-field-error" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>{error}</p>}
    </div>
  );
}
