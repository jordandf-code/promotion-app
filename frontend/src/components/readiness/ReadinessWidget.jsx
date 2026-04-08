// components/readiness/ReadinessWidget.jsx
// Dashboard card: circular SVG progress arc + five dimension bars.

import { useNavigate } from 'react-router-dom';
import { ACTION_PROMPTS } from '../../hooks/useReadinessScore.js';

const DIMENSION_ORDER = ['scorecard', 'pipeline', 'gates', 'evidence', 'wins'];

function scoreColor(score) {
  if (score >= 80) return '#15803d';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

export default function ReadinessWidget({ readiness, daysLeft, qualifyingYear }) {
  const navigate = useNavigate();
  const { overall, dimensions, weakest, warnings } = readiness;

  // SVG arc geometry
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - overall / 100);
  const color = scoreColor(overall);

  return (
    <section className="readiness-widget card">
      <div className="readiness-layout">
        {/* Circular arc */}
        <div className="readiness-arc-container">
          <svg className="readiness-arc-svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="#e5e7eb" strokeWidth={stroke}
            />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={color} strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div className="readiness-arc-text">
            <span className="readiness-arc-pct">{overall}%</span>
          </div>
          <div className="readiness-arc-label">Promotion readiness</div>
          <div className="readiness-arc-sub">{daysLeft} days to Dec 31, {qualifyingYear}</div>
        </div>

        {/* Dimension bars */}
        <div className="readiness-bars">
          {DIMENSION_ORDER.map(key => {
            const dim = dimensions[key];
            return (
              <div
                key={key}
                className="readiness-bar"
                onClick={() => navigate(dim.route)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(dim.route)}
                title={dim.details}
              >
                <span className="readiness-bar-label">{dim.label}</span>
                <div className="readiness-bar-track">
                  <div
                    className="readiness-bar-fill"
                    style={{ width: `${dim.score}%`, backgroundColor: scoreColor(dim.score) }}
                  />
                </div>
                <span className="readiness-bar-pct">{dim.score}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action prompt for weakest dimension */}
      {weakest && (
        <div className="readiness-action">
          <strong>Focus area:</strong> {dimensions[weakest].label} ({dimensions[weakest].score}%) — {ACTION_PROMPTS[weakest]}
        </div>
      )}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} className="readiness-warning">{w}</div>
      ))}
    </section>
  );
}
