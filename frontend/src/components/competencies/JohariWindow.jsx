// JohariWindow.jsx — 2x2 grid showing self vs others perception quadrants.

const QUADRANT_STYLES = {
  open:       { bg: 'rgba(21, 128, 61, 0.08)', border: '#15803d', label: 'Open', desc: 'Known to self & others' },
  blind_spot: { bg: 'rgba(234, 179, 8, 0.08)',  border: '#eab308', label: 'Blind spot', desc: 'Others see, you don\'t' },
  hidden:     { bg: 'rgba(234, 88, 12, 0.08)',  border: '#ea580c', label: 'Hidden', desc: 'You see, others don\'t' },
  unknown:    { bg: 'rgba(100, 116, 139, 0.08)',border: '#64748b', label: 'Unknown', desc: 'Neither sees clearly' },
};

export function computeJohariWindow(selfAssessment, otherAssessments, competencies, threshold = 0.5) {
  if (!selfAssessment || !otherAssessments?.length) return null;

  const result = {};
  for (const comp of competencies) {
    const selfRating = selfAssessment.ratings?.[comp.id];
    const selfScore = selfRating?.composite_score ?? selfRating?.level ?? null;
    if (selfScore == null) continue;

    // Average others' ratings
    const otherScores = otherAssessments
      .map(a => {
        const r = a.ratings?.[comp.id];
        return r?.composite_score ?? r?.level ?? null;
      })
      .filter(v => v != null);

    if (!otherScores.length) {
      result[comp.id] = { quadrant: 'unknown', self_score: selfScore, others_score: null, delta: null };
      continue;
    }

    const othersScore = otherScores.reduce((s, v) => s + v, 0) / otherScores.length;
    const delta = selfScore - othersScore;

    let quadrant;
    if (Math.abs(delta) < threshold) {
      quadrant = (selfScore >= 2.5 || othersScore >= 2.5) ? 'open' : 'unknown';
    } else if (delta > 0) {
      quadrant = 'hidden'; // self sees more than others
    } else {
      quadrant = 'blind_spot'; // others see more than self
    }

    result[comp.id] = {
      quadrant,
      self_score: Number(selfScore.toFixed(2)),
      others_score: Number(othersScore.toFixed(2)),
      delta: Number(delta.toFixed(2)),
    };
  }
  return result;
}

export default function JohariWindow({ johariData, competencies }) {
  if (!johariData) return null;

  const quadrants = { open: [], blind_spot: [], hidden: [], unknown: [] };
  for (const comp of competencies) {
    const entry = johariData[comp.id];
    if (!entry) continue;
    quadrants[entry.quadrant].push({ ...comp, ...entry });
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.5rem',
    }}>
      {['open', 'blind_spot', 'hidden', 'unknown'].map(q => {
        const style = QUADRANT_STYLES[q];
        const items = quadrants[q];
        return (
          <div key={q} className="card" style={{
            padding: '0.75rem',
            background: style.bg,
            borderLeft: `3px solid ${style.border}`,
            minHeight: '80px',
          }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{style.label}</p>
            <p className="muted" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>{style.desc}</p>
            {items.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>None</p>
            ) : (
              items.map(item => (
                <div key={item.id} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <strong>{item.label}</strong>
                  {item.self_score != null && item.others_score != null && (
                    <span className="muted" style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                      Self: {item.self_score} / Others: {item.others_score}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
