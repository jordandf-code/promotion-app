// components/readiness/ReadinessStrip.jsx
// Compact horizontal strip for the Narrative + Gaps page — five colored dots with percentages.

import { useNavigate } from 'react-router-dom';

const DIMENSION_ORDER = ['scorecard', 'pipeline', 'gates', 'evidence', 'wins'];

function scoreColor(score) {
  if (score >= 80) return '#15803d';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

export default function ReadinessStrip({ readiness }) {
  const navigate = useNavigate();
  const { overall, dimensions } = readiness;

  return (
    <div className="readiness-strip card">
      <div className="readiness-strip-overall">
        <span className="readiness-strip-overall-pct" style={{ color: scoreColor(overall) }}>{overall}%</span>
        <span className="readiness-strip-overall-label">Readiness</span>
      </div>
      <div className="readiness-strip-dims">
        {DIMENSION_ORDER.map(key => {
          const dim = dimensions[key];
          return (
            <div
              key={key}
              className="readiness-strip-item"
              onClick={() => navigate(dim.route)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(dim.route)}
            >
              <span className="readiness-strip-dot" style={{ backgroundColor: scoreColor(dim.score) }} />
              <span className="readiness-strip-label">{dim.label}</span>
              <span className="readiness-strip-pct">{dim.score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
