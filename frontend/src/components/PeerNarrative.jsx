// components/PeerNarrative.jsx
// Read-only display of a peer's AI-generated narrative and gap analysis.

export default function PeerNarrative({ data }) {
  const story = data?.story;
  const narrative   = story?.polished_narrative;
  const gapAnalysis = story?.gap_analysis;

  if (!narrative && !gapAnalysis) {
    return (
      <div className="tab-content">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">This user has not generated a narrative or gap analysis yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      {narrative && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Promotion narrative</h2>
          </div>
          <div className="card">
            <div className="story-text" style={{ whiteSpace: 'pre-wrap' }}>{narrative}</div>
          </div>
        </section>
      )}

      {gapAnalysis && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Gap analysis</h2>
          </div>
          <div className="card">
            <div className="story-text" style={{ whiteSpace: 'pre-wrap' }}>
              {typeof gapAnalysis === 'string' ? gapAnalysis : JSON.stringify(gapAnalysis, null, 2)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
