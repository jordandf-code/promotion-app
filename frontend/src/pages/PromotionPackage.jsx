// PromotionPackage.jsx — Assemble, polish, and export a promotion case package

import { useState, useCallback } from 'react';
import { usePackageData } from '../hooks/usePackageData.js';
import { authHeaders, API_BASE } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';

const SECTION_DEFS = [
  { key: 'executive_summary',     label: 'Executive Summary' },
  { key: 'scorecard_performance', label: 'Scorecard Performance' },
  { key: 'pipeline_outlook',      label: 'Pipeline Outlook' },
  { key: 'key_wins',              label: 'Key Wins' },
  { key: 'competency_assessment', label: 'Competency Assessment' },
  { key: 'brand_positioning',     label: 'Brand Positioning' },
  { key: 'readiness_assessment',  label: 'Readiness Assessment' },
  { key: 'eminence_leadership',   label: 'Eminence & Leadership' },
  { key: 'learning_development',  label: 'Learning & Development' },
  { key: 'people_network',        label: 'People Network' },
  { key: 'the_ask',              label: 'The Ask' },
];

export default function PromotionPackage() {
  const { data, initialized, updatePackage } = usePackageData();

  // Phase state: 'configure' | 'raw' | 'polished'
  const [phase, setPhase]             = useState('configure');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [polishLevel, setPolishLevel] = useState('standard');

  // Section toggles (configure phase)
  const [sectionsEnabled, setSectionsEnabled] = useState(() => {
    const obj = {};
    SECTION_DEFS.forEach(s => { obj[s.key] = true; });
    return obj;
  });

  // Current package being worked on
  const [currentPkgId, setCurrentPkgId]   = useState(null);
  const [sections, setSections]           = useState(null);
  const [excludedFromPolish, setExcludedFromPolish] = useState(new Set());
  const [editingSections, setEditingSections]       = useState({});

  // ── All useCallback hooks must be above any early return ──

  const handleAssemble = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/package/assemble`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sections_enabled: sectionsEnabled }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(mapAiError(json.code, json.error));
        return;
      }
      setCurrentPkgId(json.package_id);
      setSections(json.sections);
      setExcludedFromPolish(new Set());
      setPhase('raw');
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  }, [sectionsEnabled]);

  const handlePolish = useCallback(async () => {
    if (!currentPkgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/package/polish`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ package_id: currentPkgId, polish_level: polishLevel }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(mapAiError(json.code, json.error));
        return;
      }
      setSections(json.sections);
      setPhase('polished');
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  }, [currentPkgId, polishLevel]);

  const handleExportDeck = useCallback(async () => {
    if (!currentPkgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/package/export-deck`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ package_id: currentPkgId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'promotion-package.pptx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  }, [currentPkgId]);

  const handleCopyAll = useCallback(() => {
    if (!sections) return;
    const text = SECTION_DEFS
      .filter(s => sections[s.key])
      .map(s => {
        const sec = sections[s.key];
        return `## ${s.label}\n\n${sec.polished || sec.raw}`;
      })
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [sections]);

  // ── Early return after all hooks ──

  if (!initialized) {
    return <div className="page"><p>Loading...</p></div>;
  }

  // ── Helpers ──

  function toggleSection(key) {
    setSectionsEnabled(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExclude(key) {
    setExcludedFromPolish(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleEdit(key) {
    setEditingSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function updateSectionText(key, text) {
    setSections(prev => ({
      ...prev,
      [key]: { ...prev[key], polished: text },
    }));
  }

  function handleViewPrevious(pkg) {
    setCurrentPkgId(pkg.id);
    setSections(pkg.sections);
    if (pkg.status === 'generated') {
      setPhase('polished');
    } else {
      setPhase('raw');
    }
  }

  function handleStartNew() {
    setPhase('configure');
    setCurrentPkgId(null);
    setSections(null);
    setError(null);
    setExcludedFromPolish(new Set());
    setEditingSections({});
  }

  // ── Count warnings in raw sections ──
  const warningKeys = sections
    ? Object.entries(sections).filter(([, v]) => (v.raw || '').includes('(No data available')).map(([k]) => k)
    : [];

  const enabledCount = Object.values(sectionsEnabled).filter(Boolean).length;

  // ── Render ──

  return (
    <div className="page">
      <div className="section">
        <h1>Promotion Package</h1>
      </div>

      {error && (
        <div className="section" style={{ background: 'var(--danger-subtle, #fef2f2)', border: '1px solid var(--danger, #dc2626)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ color: 'var(--danger, #dc2626)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ─── Phase 1: Configure ─── */}
      {phase === 'configure' && (
        <>
          <div className="section">
            <h2>Sections to include</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {SECTION_DEFS.map(s => (
                <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sectionsEnabled[s.key]}
                    onChange={() => toggleSection(s.key)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Polish level</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              {['light', 'standard', 'full'].map(level => (
                <label key={level} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="polish_level"
                    value={level}
                    checked={polishLevel === level}
                    onChange={() => setPolishLevel(level)}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{level}</span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              {polishLevel === 'light' && 'Fix grammar and improve flow. Minimal rewriting.'}
              {polishLevel === 'standard' && 'Rewrite for clarity and impact with consistent tone.'}
              {polishLevel === 'full' && 'Complete rewrite into polished executive narrative.'}
            </p>
          </div>

          <div className="section">
            <button
              className="btn btn--primary"
              onClick={handleAssemble}
              disabled={loading || enabledCount === 0}
              style={{ minWidth: 180 }}
            >
              {loading ? 'Assembling...' : `Assemble Package (${enabledCount} sections)`}
            </button>
          </div>

          {/* Previous packages */}
          {data.packages.length > 0 && (
            <div className="section">
              <h2>Previous packages</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {data.packages.map(pkg => (
                  <div
                    key={pkg.id}
                    className="card"
                    style={{ padding: '12px 16px', cursor: 'pointer' }}
                    onClick={() => handleViewPrevious(pkg)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>
                        {new Date(pkg.created_at).toLocaleDateString('en-CA')}
                        {' '}
                        {new Date(pkg.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: pkg.status === 'generated' ? 'var(--success-subtle, #f0fdf4)' : 'var(--warning-subtle, #fffbeb)',
                        color: pkg.status === 'generated' ? 'var(--success, #16a34a)' : 'var(--warning, #d97706)',
                      }}>
                        {pkg.status === 'generated' ? 'Polished' : 'Raw'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {pkg.section_count ?? Object.keys(pkg.sections ?? {}).length} sections
                      {pkg.polish_level ? ` | ${pkg.polish_level} polish` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Phase 2: Raw Preview ─── */}
      {phase === 'raw' && sections && (
        <>
          <div className="section" style={{ background: 'var(--info-subtle, #eff6ff)', border: '1px solid var(--info, #2563eb)', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ margin: 0, color: 'var(--info, #2563eb)' }}>
              Review your assembled content, then polish with AI.
            </p>
          </div>

          {warningKeys.length > 0 && (
            <div className="section" style={{ background: 'var(--warning-subtle, #fffbeb)', border: '1px solid var(--warning, #d97706)', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ margin: 0, color: 'var(--warning, #d97706)', fontWeight: 500 }}>
                {warningKeys.length} section{warningKeys.length > 1 ? 's have' : ' has'} missing data:
              </p>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, color: 'var(--warning, #d97706)', fontSize: 13 }}>
                {warningKeys.map(k => {
                  const label = SECTION_DEFS.find(s => s.key === k)?.label ?? k;
                  return <li key={k}>{label}</li>;
                })}
              </ul>
            </div>
          )}

          {SECTION_DEFS.filter(s => sections[s.key]).map(s => {
            const excluded = excludedFromPolish.has(s.key);
            return (
              <div key={s.key} className="section" style={{ opacity: excluded ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{s.label}</h3>
                  <button
                    className="btn"
                    onClick={() => toggleExclude(s.key)}
                    style={{ fontSize: 12, padding: '2px 10px' }}
                    title={excluded ? 'Include in polish' : 'Exclude from polish'}
                  >
                    {excluded ? 'Include' : '\u00d7 Exclude'}
                  </button>
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)', background: 'var(--bg-secondary, #f9fafb)', padding: 12, borderRadius: 6, maxWidth: '100%', overflowWrap: 'break-word' }}>
                  {sections[s.key].raw}
                </div>
              </div>
            );
          })}

          <div className="section" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              className="btn btn--primary"
              onClick={handlePolish}
              disabled={loading}
              style={{ minWidth: 160 }}
            >
              {loading ? 'Polishing...' : 'Polish with AI'}
            </button>
            <button className="btn" onClick={() => setPhase('configure')}>
              Back to Configuration
            </button>
          </div>
          {!loading && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Polish level: {polishLevel}. Estimated cost: ~$0.03-0.08 per run.
            </p>
          )}
        </>
      )}

      {/* ─── Phase 3: Polished Preview + Export ─── */}
      {phase === 'polished' && sections && (
        <>
          {SECTION_DEFS.filter(s => sections[s.key]).map(s => {
            const sec = sections[s.key];
            const isEditing = editingSections[s.key];
            const displayText = sec.polished || sec.raw;
            return (
              <div key={s.key} className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{s.label}</h3>
                  <button
                    className="btn"
                    onClick={() => toggleEdit(s.key)}
                    style={{ fontSize: 12, padding: '2px 10px' }}
                  >
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                </div>
                {isEditing ? (
                  <textarea
                    value={displayText}
                    onChange={e => updateSectionText(s.key, e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 150,
                      padding: 12,
                      borderRadius: 6,
                      border: '1px solid var(--border, #e5e7eb)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ whiteSpace: 'pre-line', fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)', background: 'var(--bg-secondary, #f9fafb)', padding: 12, borderRadius: 6, maxWidth: '100%', overflowWrap: 'break-word' }}>
                    {displayText}
                  </div>
                )}
              </div>
            );
          })}

          <div className="section" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              className="btn btn--primary"
              onClick={handleExportDeck}
              disabled={loading}
              style={{ minWidth: 180 }}
            >
              {loading ? 'Generating...' : 'Export as PowerPoint'}
            </button>
            <button className="btn" onClick={handleCopyAll}>
              Copy All as Text
            </button>
          </div>

          <div className="section" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <button className="btn" onClick={() => setPhase('raw')}>
              Back to Raw Preview
            </button>
            <button
              className="btn"
              onClick={handleStartNew}
              style={{ background: 'none', border: 'none', color: 'var(--primary, #2563eb)', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: 14 }}
            >
              Start New Package
            </button>
          </div>
        </>
      )}
    </div>
  );
}
