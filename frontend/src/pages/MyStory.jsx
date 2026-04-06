// pages/MyStory.jsx
// AI-powered promotion narrative. Reads IBM criteria, career history, and API key
// from Admin settings. Generates evidence map, gap analysis, narrative, and 2027 plan.

import { useState } from 'react';
import { API_BASE } from '../utils/api.js';
import { useAdminData }    from '../hooks/useAdminData.js';
import { useStoryData }    from '../hooks/useStoryData.js';
import { useWinsData }     from '../hooks/useWinsData.js';
import { useGoalsData }    from '../hooks/useGoalsData.js';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useSettings }     from '../context/SettingsContext.jsx';

export default function MyStory() {
  const { ibmCriteria, careerHistory, anthropicKey } = useAdminData();
  const { story, saveStory }  = useStoryData();
  const { wins }              = useWinsData();
  const { goals }             = useGoalsData();
  const scorecard             = useScorecardData();
  const { qualifyingYear, fmtCurrency } = useSettings();

  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);

  const configured = !!(anthropicKey && ibmCriteria);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const s = scorecard.getSalesStats(qualifyingYear);
      const r = scorecard.getRevenueStats(qualifyingYear);
      const g = scorecard.getGPStats(qualifyingYear);
      const u = scorecard.getUtilStats(qualifyingYear);

      const res = await fetch(`${API_BASE}/api/ai/generate-story`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey:       anthropicKey,
          ibmCriteria,
          careerHistory,
          wins:  wins.map(w => ({ title: w.title, impact: w.impact, tags: w.tags })),
          goals: goals.map(g => ({ title: g.title, status: g.status, isGate: g.isGate })),
          scorecardSummary: { year: qualifyingYear, sales: s, revenue: r, gp: g, util: u },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      saveStory({ ...data, generatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function exportText() {
    if (!story) return;
    const lines = [
      'MY PROMOTION STORY',
      `Generated: ${new Date(story.generatedAt).toLocaleString()}`,
      '',
      '═══ NARRATIVE ═══',
      story.narrative,
      '',
      '═══ 2027 PLAN ═══',
      story.plan,
      '',
      '═══ EVIDENCE MAP ═══',
      ...story.evidenceMap.map(e => `\n${e.criterion}\n${e.evidence.map(ev => `  • ${ev}`).join('\n')}`),
      '',
      '═══ GAPS TO ADDRESS ═══',
      ...story.gaps.map(g => `  △ ${g}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'promotion-story.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  if (!configured) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">My story</h1></div>
        <div className="card story-setup-card">
          <div className="story-setup-icon">✦</div>
          <h2 className="story-setup-title">Setup required</h2>
          <p>Configure two things in <strong>Admin</strong> to get started:</p>
          <ul className="story-setup-list">
            <li><strong>IBM Partner criteria</strong> — paste from the Partner framework document</li>
            <li><strong>AI settings</strong> — add your Anthropic API key</li>
          </ul>
          <p className="story-setup-hint">Career history is optional but makes the narrative significantly stronger.</p>
          <a className="btn-primary story-setup-btn" href="/admin">Go to Admin →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My story</h1>
        <div className="page-header-actions">
          {story && <button className="btn-secondary" onClick={exportText}>Export text</button>}
          <button className="btn-primary btn-ai" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : story ? '↺ Regenerate' : '✦ Generate my story'}
          </button>
        </div>
      </div>

      {story && !generating && (
        <p className="story-generated-at">Last generated: {new Date(story.generatedAt).toLocaleString()}</p>
      )}
      {error && <div className="story-error">{error}</div>}

      {generating && (
        <div className="story-generating">
          <div className="story-spinner">✦</div>
          <p>Analysing your wins, scorecard, and goals against the IBM Partner criteria…</p>
          <p className="story-generating-hint">This takes about 15–30 seconds.</p>
        </div>
      )}

      {!story && !generating && (
        <div className="card story-empty-card">
          <p>Click <strong>✦ Generate my story</strong> to map your evidence against IBM Partner criteria and produce a polished promotion narrative.</p>
          <p className="story-setup-hint">Uses your {wins.length} win{wins.length !== 1 ? 's' : ''}, {goals.length} goal{goals.length !== 1 ? 's' : ''}, and qualifying year scorecard.</p>
        </div>
      )}

      {story && !generating && (
        <>
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Narrative</h2>
            </div>
            <div className="card story-narrative-card">
              {story.narrative.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} className="story-narrative-para">{para}</p>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">2027 plan</h2>
              <span className="section-sub">Prioritised actions to close gaps and make the strongest possible case</span>
            </div>
            <div className="card story-plan-card">
              <div className="story-plan-text">{story.plan}</div>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Evidence map</h2>
              <span className="section-sub">IBM criteria mapped to your supporting wins, goals, and scorecard</span>
            </div>
            <div className="card">
              {story.evidenceMap.map((e, i) => (
                <div key={i} className="story-criterion-row">
                  <div className="story-criterion-text">{e.criterion}</div>
                  <ul className="story-evidence-list">
                    {e.evidence.map((ev, j) => <li key={j}>{ev}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Gaps</h2>
              <span className="section-sub">Criteria with thin or missing evidence — focus areas for 2026</span>
            </div>
            <div className="card">
              {story.gaps.length === 0
                ? <p className="list-empty" style={{ padding: '1rem 1.25rem' }}>No significant gaps — strong coverage across all criteria.</p>
                : <ul className="story-gap-list">
                    {story.gaps.map((g, i) => <li key={i} className="story-gap-item">{g}</li>)}
                  </ul>
              }
            </div>
          </section>
        </>
      )}
    </div>
  );
}
