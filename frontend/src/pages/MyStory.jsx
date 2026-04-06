// pages/MyStory.jsx
// AI-powered promotion narrative — three independent modes:
// gap_analysis, polished_narrative, plan_2027.
// Each fires in parallel, renders independently, and can be regenerated individually.

import { useState } from 'react';
import { API_BASE, authHeaders } from '../utils/api.js';
import { mapAiError } from '../utils/aiErrors.js';
import { useAdminData } from '../hooks/useAdminData.js';
import { useStoryData } from '../hooks/useStoryData.js';

const MODES = [
  { id: 'polished_narrative', label: 'Narrative' },
  { id: 'gap_analysis',       label: 'Gap analysis' },
];

export default function MyStory() {
  const { ibmCriteria, anthropicKey } = useAdminData();
  const { story, saveStorySection, clearStory } = useStoryData();
  const [loading, setLoading] = useState({});
  const [errors,  setErrors]  = useState({});

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
      lines.push('', '═══ NARRATIVE ═══', '');
      lines.push(story.polished_narrative.data);
    }

    if (story.gap_analysis) {
      lines.push('', '═══ GAP ANALYSIS ═══', '');
      story.gap_analysis.data.forEach(g => {
        lines.push(`[${g.strength}] ${g.criterion}`);
        g.evidence.forEach(e => lines.push(`  • ${e}`));
        if (g.recommendation) lines.push(`  → ${g.recommendation}`);
        lines.push('');
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'promotion-story.txt'; a.click();
    URL.revokeObjectURL(url);
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
          {hasAny && <button className="btn-secondary" onClick={exportText}>Export text</button>}
          <button className="btn-primary btn-ai" onClick={generateAll} disabled={anyLoading}>
            {anyLoading ? 'Generating…' : hasAny ? '↺ Regenerate all' : '✦ Generate my story'}
          </button>
        </div>
      </div>

      {/* ── Narrative ── */}
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

      {/* ── Gap Analysis ── */}
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
                    <td>{g.evidence.map((e, j) => <div key={j}>• {e}</div>)}</td>
                    <td>
                      <span className={`story-strength story-strength--${g.strength.toLowerCase()}`}>
                        {g.strength}
                      </span>
                    </td>
                    <td>{g.recommendation || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StorySection>

    </div>
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
              {data ? '↺ Regenerate' : '✦ Generate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="card story-loading-card">
          <div className="story-spinner">✦</div>
          <p>Generating {title.toLowerCase()}…</p>
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
