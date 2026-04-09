// MyStory.jsx — AI-powered promotion narrative with three subtabs (AI Generated, DIY Prompts, Manual Input)
// 2. DIY Prompts (preview context + system prompt, copy to clipboard)
// 3. Manual Input (structured criterion evidence + free-text narrative)

import { useState } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';
import { useAdminData } from '../hooks/useAdminData.js';
import { useStoryData } from '../hooks/useStoryData.js';
import { useReadinessScore } from '../hooks/useReadinessScore.js';
import ReadinessStrip from '../components/readiness/ReadinessStrip.jsx';

const MODES = [
  { id: 'polished_narrative', label: 'Narrative' },
  { id: 'gap_analysis',       label: 'Gap analysis' },
];

const SUBTABS = [
  { id: 'ai',     label: 'AI Generated' },
  { id: 'diy',    label: 'DIY Prompts' },
  { id: 'manual', label: 'Manual Input' },
];

export default function MyStory() {
  const { ibmCriteria, anthropicKey } = useAdminData();
  const { story, saveStorySection, updateManualEntries, setActiveSource } = useStoryData();
  const readiness = useReadinessScore();
  const [subtab, setSubtab] = useState('ai');
  const [loading, setLoading] = useState({});
  const [errors,  setErrors]  = useState({});
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckError,   setDeckError]   = useState(null);
  const [deckUsage,   setDeckUsage]   = useState(null);

  const configured = !!(anthropicKey && ibmCriteria);

  async function generateMode(mode) {
    setLoading(prev => ({ ...prev, [mode]: true }));
    setErrors(prev  => ({ ...prev, [mode]: null }));
    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-story`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({ narrative_mode: mode }),
      });
      const data = await res.json();
      if (!data.ok) {
        const err = new Error(data.error);
        err.code = data.code;
        throw err;
      }
      saveStorySection(mode, data.data, data.generated_at, data.usage);
    } catch (err) {
      setErrors(prev => ({ ...prev, [mode]: mapAiError(err.code, err.message) }));
    } finally {
      setLoading(prev => ({ ...prev, [mode]: false }));
    }
  }

  function generateAll() {
    MODES.forEach(m => generateMode(m.id));
  }

  const anyLoading = Object.values(loading).some(Boolean);
  const hasAny = story && (story.gap_analysis || story.polished_narrative);

  function exportText() {
    if (!story) return;
    const lines = [];
    lines.push('MY PROMOTION STORY');
    lines.push(`Exported: ${new Date().toLocaleString()}`);

    if (story.polished_narrative) {
      lines.push('', '=== NARRATIVE ===', '');
      lines.push(story.polished_narrative.data);
    }

    if (story.gap_analysis) {
      lines.push('', '=== GAP ANALYSIS ===', '');
      story.gap_analysis.data.forEach(g => {
        lines.push(`[${g.strength}] ${g.criterion}`);
        g.evidence.forEach(e => lines.push(`  - ${e}`));
        if (g.recommendation) lines.push(`  -> ${g.recommendation}`);
        lines.push('');
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'promotion-story.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  async function generateDeck() {
    setDeckLoading(true);
    setDeckError(null);
    setDeckUsage(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/deck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      if (!res.ok) {
        const ct = res.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
          const errData = await res.json();
          const err = new Error(errData.error);
          err.code = errData.code;
          throw err;
        }
        throw new Error(`Server returned ${res.status}`);
      }
      const usageHeader = res.headers.get('X-Token-Usage');
      if (usageHeader) setDeckUsage(JSON.parse(usageHeader));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'PromotionCase.pptx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDeckError(mapAiError(err.code, err.message));
    } finally {
      setDeckLoading(false);
    }
  }

  // ── Setup required ──
  if (!configured) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Promotion Narrative + Gaps</h1></div>
        <div className="card story-setup-card">
          <div className="story-setup-icon">✦</div>
          <h2 className="story-setup-title">Setup required</h2>
          <p>Configure two things in <strong>Admin &gt; GenAI</strong> to get started:</p>
          <ul className="story-setup-list">
            <li><strong>IBM Partner criteria</strong> — paste from the Partner framework document</li>
            <li><strong>Anthropic API key</strong> — your personal key for AI features</li>
          </ul>
          <p className="story-setup-hint">Career history is optional but makes the narrative significantly stronger.</p>
          <a className="btn-primary story-setup-btn" href="/admin">Go to Admin</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Promotion Narrative + Gaps</h1>
        <div className="page-header-actions">
          {subtab === 'ai' && hasAny && <button className="btn-secondary" onClick={exportText}>Export text</button>}
          {subtab === 'ai' && (
            <button className="btn-primary btn-ai" onClick={generateAll} disabled={anyLoading}>
              {anyLoading ? 'Generating...' : hasAny ? 'Regenerate all' : 'Generate my story'}
            </button>
          )}
        </div>
      </div>

      <ReadinessStrip readiness={readiness} />

      {/* Desktop: tab bar */}
      <div className="sc-tabs sc-tabs--desktop">
        {SUBTABS.map(t => (
          <button
            key={t.id}
            className={`sc-tab ${subtab === t.id ? 'sc-tab--active' : ''}`}
            onClick={() => setSubtab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile: dropdown */}
      <div className="sc-tabs--mobile">
        <select
          className="form-input sc-tab-select"
          value={subtab}
          onChange={e => setSubtab(e.target.value)}
        >
          {SUBTABS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {subtab === 'ai' && (
        <AIGeneratedTab
          story={story}
          loading={loading}
          errors={errors}
          generateMode={generateMode}
          deckLoading={deckLoading}
          deckError={deckError}
          deckUsage={deckUsage}
          generateDeck={generateDeck}
        />
      )}

      {subtab === 'diy' && <DIYPromptsTab />}

      {subtab === 'manual' && (
        <ManualInputTab
          ibmCriteria={ibmCriteria}
          story={story}
          updateManualEntries={updateManualEntries}
          setActiveSource={setActiveSource}
        />
      )}
    </div>
  );
}

// ── Subtab 1: AI Generated ──────────────────────────────────────────────────

function AIGeneratedTab({ story, loading, errors, generateMode, deckLoading, deckError, deckUsage, generateDeck }) {
  return (
    <>
      {/* Narrative */}
      <StorySection
        mode="polished_narrative"
        title="Narrative"
        subtitle="First-person promotion case for the IBM committee"
        loading={loading.polished_narrative}
        error={errors.polished_narrative}
        data={story?.polished_narrative}
        onRegenerate={() => generateMode('polished_narrative')}
      >
        {story?.polished_narrative && (
          <div className="story-narrative-card">
            {story.polished_narrative.data.split('\n').filter(Boolean).map((line, i) => (
              <p key={i} className="story-narrative-line">{line}</p>
            ))}
          </div>
        )}
      </StorySection>

      {/* Gap Analysis */}
      <StorySection
        mode="gap_analysis"
        title="Gap analysis"
        subtitle="Each IBM criterion mapped to your evidence with strength ratings"
        loading={loading.gap_analysis}
        error={errors.gap_analysis}
        data={story?.gap_analysis}
        onRegenerate={() => generateMode('gap_analysis')}
      >
        {story?.gap_analysis && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>Evidence</th>
                  <th>Strength</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {story.gap_analysis.data.map((g, i) => (
                  <tr key={i}>
                    <td className="td-primary">{g.criterion}</td>
                    <td>{g.evidence.map((e, j) => <div key={j}>- {e}</div>)}</td>
                    <td>
                      <span className={`story-strength story-strength--${g.strength.toLowerCase()}`}>
                        {g.strength}
                      </span>
                    </td>
                    <td>{g.recommendation || <span className="muted">--</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StorySection>

      {/* Export Deck */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Export deck <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(testing only)</span></h2>
            <span className="section-sub">Download a populated .pptx promotion case deck</span>
          </div>
        </div>
        <div className="card">
          <button className="btn-primary btn-ai" onClick={generateDeck} disabled={deckLoading}>
            {deckLoading ? 'Generating deck...' : 'Generate deck (.pptx)'}
          </button>
          {deckLoading && (
            <div className="story-loading-card" style={{ marginTop: '1rem' }}>
              <div className="story-spinner">✦</div>
              <p>Generating deck...</p>
            </div>
          )}
          {deckError && !deckLoading && (
            <div className="story-error" style={{ marginTop: '0.75rem' }}>{deckError}</div>
          )}
          {deckUsage && !deckLoading && (
            <p className="story-token-usage">
              {deckUsage.input_tokens} input tokens · {deckUsage.output_tokens} output tokens
            </p>
          )}
        </div>
      </section>
    </>
  );
}

// ── Subtab 2: DIY Prompts ────────────────────────────────────────────────────

function DIYPromptsTab() {
  const [mode, setMode]         = useState('gap_analysis');
  const [contextData, setContextData] = useState(null);
  const [promptData, setPromptData]   = useState(null);
  const [diyLoading, setDiyLoading]   = useState(false);
  const [diyError, setDiyError]       = useState(null);
  const [copied, setCopied]           = useState({});

  async function fetchContext() {
    setDiyLoading(true);
    setDiyError(null);
    setContextData(null);
    setPromptData(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/preview-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load context');
      setContextData(JSON.stringify(data.context, null, 2));
      setPromptData(data.systemPrompt);
    } catch (err) {
      setDiyError(err.message);
    } finally {
      setDiyLoading(false);
    }
  }

  function copyToClipboard(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    });
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">DIY Prompts</h2>
          <span className="section-sub">View the data and prompts that would be sent to the AI, then use them in your own tool</span>
        </div>
      </div>

      <div className="card">
        <div className="diy-controls">
          <label className="form-label">Mode</label>
          <div className="diy-controls-row">
            <select
              className="form-input"
              value={mode}
              onChange={e => setMode(e.target.value)}
              style={{ maxWidth: '220px' }}
            >
              <option value="gap_analysis">Gap analysis</option>
              <option value="polished_narrative">Narrative</option>
            </select>
            <button className="btn-primary" onClick={fetchContext} disabled={diyLoading}>
              {diyLoading ? 'Loading...' : 'Show AI context'}
            </button>
          </div>
        </div>

        {diyError && <div className="story-error" style={{ marginTop: '0.75rem' }}>{diyError}</div>}

        {contextData && (
          <div className="diy-section">
            <div className="diy-section-header">
              <h3 className="diy-section-title">Your data context</h3>
              <button
                className="btn-secondary btn-sm"
                onClick={() => copyToClipboard('context', contextData)}
              >
                {copied.context ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="diy-code-block">{contextData}</pre>
          </div>
        )}

        {promptData && (
          <div className="diy-section">
            <div className="diy-section-header">
              <h3 className="diy-section-title">System prompt</h3>
              <button
                className="btn-secondary btn-sm"
                onClick={() => copyToClipboard('prompt', promptData)}
              >
                {copied.prompt ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="diy-code-block">{promptData}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Subtab 3: Manual Input ───────────────────────────────────────────────────

function ManualInputTab({ ibmCriteria, story, updateManualEntries, setActiveSource }) {
  const activeSource = story?.activeSource ?? 'ai';
  const manualEntries = story?.manual_entries ?? {};
  const manualNarrative = manualEntries.narrative ?? '';

  // Parse IBM criteria into lines
  const criteriaLines = (ibmCriteria || '')
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 0);

  // Build criteria array from saved data or from criteria lines
  const savedCriteria = manualEntries.criteria ?? [];
  const criteria = criteriaLines.map(line => {
    const existing = savedCriteria.find(c => c.criterion === line);
    return existing || { criterion: line, evidence: '', strength: 'Weak' };
  });

  function updateCriterion(index, field, value) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    updateManualEntries({ criteria: updated });
  }

  function updateNarrative(text) {
    updateManualEntries({ narrative: text });
  }

  function handleSourceChange(source) {
    setActiveSource(source);
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Manual Input</h2>
          <span className="section-sub">Enter evidence for each IBM criterion manually</span>
        </div>
      </div>

      {/* Active source toggle */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Active source for readiness score</label>
        <div className="manual-source-toggle">
          <label className="manual-source-option">
            <input
              type="radio"
              name="activeSource"
              value="ai"
              checked={activeSource === 'ai'}
              onChange={() => handleSourceChange('ai')}
            />
            <span>AI Generated</span>
          </label>
          <label className="manual-source-option">
            <input
              type="radio"
              name="activeSource"
              value="manual"
              checked={activeSource === 'manual'}
              onChange={() => handleSourceChange('manual')}
            />
            <span>Manual Input</span>
          </label>
        </div>
        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
          This controls which evidence source feeds the "Evidence strength" dimension of your readiness score.
        </p>
      </div>

      {/* Criteria evidence form */}
      {criteriaLines.length === 0 ? (
        <div className="card">
          <p className="muted">No IBM criteria found. Paste your criteria in Admin &gt; GenAI to populate this form.</p>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Criterion evidence ({criteria.length} criteria)</h3>

          {/* Desktop table */}
          <div className="data-table-wrap manual-criteria-desktop">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>Evidence</th>
                  <th style={{ width: '130px' }}>Strength</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, i) => (
                  <tr key={i}>
                    <td className="td-primary">{c.criterion}</td>
                    <td>
                      <textarea
                        className="form-input manual-evidence-input"
                        value={c.evidence}
                        onChange={e => updateCriterion(i, 'evidence', e.target.value)}
                        rows={2}
                        placeholder="Describe your evidence..."
                      />
                    </td>
                    <td>
                      <select
                        className="form-input"
                        value={c.strength}
                        onChange={e => updateCriterion(i, 'strength', e.target.value)}
                      >
                        <option value="Strong">Strong</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Weak">Weak</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="manual-criteria-mobile">
            {criteria.map((c, i) => (
              <div key={i} className="manual-criterion-card card">
                <div className="manual-criterion-name">{c.criterion}</div>
                <label className="form-label">Evidence</label>
                <textarea
                  className="form-input manual-evidence-input"
                  value={c.evidence}
                  onChange={e => updateCriterion(i, 'evidence', e.target.value)}
                  rows={3}
                  placeholder="Describe your evidence..."
                />
                <label className="form-label" style={{ marginTop: '0.5rem' }}>Strength</label>
                <select
                  className="form-input"
                  value={c.strength}
                  onChange={e => updateCriterion(i, 'strength', e.target.value)}
                >
                  <option value="Strong">Strong</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Weak">Weak</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free-text narrative */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <label className="form-label">Narrative (free text)</label>
        <span className="section-sub" style={{ display: 'block', marginBottom: '0.75rem' }}>Paste or write a complete promotion narrative here</span>
        <textarea
          className="form-input"
          value={manualNarrative}
          onChange={e => updateNarrative(e.target.value)}
          rows={8}
          placeholder="Paste your promotion narrative here..."
        />
      </div>
    </section>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function StorySection({ title, subtitle, loading, error, data, onRegenerate, children }) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <span className="section-sub">{subtitle}</span>}
        </div>
        {!loading && (
          <div className="story-section-actions">
            {data && (
              <span className="story-generated-at">
                {new Date(data.generated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-secondary btn-sm" onClick={onRegenerate}>
              {data ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="card story-loading-card">
          <div className="story-spinner">✦</div>
          <p>Generating {title.toLowerCase()}...</p>
        </div>
      )}

      {error && !loading && (
        <div className="story-error">{error}</div>
      )}

      {!loading && data && (
        <div className="card">
          {children}
          {data.usage && (
            <p className="story-token-usage">
              {data.usage.input_tokens} input tokens · {data.usage.output_tokens} output tokens
            </p>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div className="card story-empty-section">
          <p className="muted">Not yet generated. Click "Generate my story" above or regenerate this section.</p>
        </div>
      )}
    </section>
  );
}
