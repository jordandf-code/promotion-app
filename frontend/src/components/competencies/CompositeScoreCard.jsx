// CompositeScoreCard.jsx — Displays the 3-source weighted composite score breakdown.

export function computeCompositeScores(selfAssessment, otherAssessments, competencyIds) {
  const result = {};
  for (const id of competencyIds) {
    const selfRating = selfAssessment?.ratings?.[id];
    const selfScore = selfRating?.composite_score ?? selfRating?.level ?? null;
    if (selfScore == null) continue;

    // Evidence score: based on evidence_ids count (3+ = full marks)
    const evidenceCount = (selfRating?.evidence_ids ?? []).length;
    const evidenceScore = Math.min(evidenceCount / 3, 1) * 4;

    // 360 score: average of other assessments
    const otherScores = (otherAssessments ?? [])
      .map(a => {
        const r = a.ratings?.[id];
        return r?.composite_score ?? r?.level ?? null;
      })
      .filter(v => v != null);
    const rater360 = otherScores.length
      ? otherScores.reduce((s, v) => s + v, 0) / otherScores.length
      : null;

    // Weighted overall: self 40% + evidence 30% + 360 30%
    let overall;
    if (rater360 != null) {
      overall = selfScore * 0.4 + evidenceScore * 0.3 + rater360 * 0.3;
    } else {
      // No 360 data: self 60% + evidence 40%
      overall = selfScore * 0.6 + evidenceScore * 0.4;
    }

    result[id] = {
      self: Number(selfScore.toFixed(2)),
      evidence: Number(evidenceScore.toFixed(2)),
      rater_360: rater360 != null ? Number(rater360.toFixed(2)) : null,
      overall: Number(overall.toFixed(2)),
    };
  }
  return result;
}

function Bar({ label, value, weight, max = 4 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: '0.3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
        <span>{label} <span className="muted">({weight})</span></span>
        <span style={{ fontWeight: 600 }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary, #e2e8f0)' }}>
        <div style={{
          height: '100%', borderRadius: '3px',
          background: 'var(--blue, #3b82f6)',
          width: `${pct}%`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

export default function CompositeScoreCard({ compositeScores, competencies }) {
  if (!compositeScores || Object.keys(compositeScores).length === 0) return null;

  return (
    <div>
      {competencies.map(comp => {
        const scores = compositeScores[comp.id];
        if (!scores) return null;
        const has360 = scores.rater_360 != null;
        return (
          <div key={comp.id} className="card" style={{
            padding: '0.75rem', marginBottom: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>{comp.label}</strong>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue, #3b82f6)' }}>
                {scores.overall.toFixed(2)}
              </span>
            </div>
            <Bar label="Self" value={scores.self} weight={has360 ? '40%' : '60%'} />
            <Bar label="Evidence" value={scores.evidence} weight={has360 ? '30%' : '40%'} />
            {has360 && <Bar label="360 Raters" value={scores.rater_360} weight="30%" />}
          </div>
        );
      })}
    </div>
  );
}
