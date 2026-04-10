// components/radar/RadarChart.jsx
// SVG radar chart for competency self-assessment visualization.
// Props: { ratings, previousRatings, competencies, size }

const DEFAULT_SIZE = 300;
const CENTER = DEFAULT_SIZE / 2;   // 150
const MAX_RADIUS = 120;
const LEVELS = 4;                  // 1-4 scale

function polarToCart(angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function buildPolygonPoints(competencies, ratings) {
  return competencies.map((comp, i) => {
    const angle = (360 / competencies.length) * i;
    const level = ratings?.[comp.id] ?? 0;
    const radius = (level / LEVELS) * MAX_RADIUS;
    const { x, y } = polarToCart(angle, radius);
    return `${x},${y}`;
  }).join(' ');
}

function buildGridPolygon(competencies, level) {
  const radius = (level / LEVELS) * MAX_RADIUS;
  return competencies.map((_, i) => {
    const angle = (360 / competencies.length) * i;
    const { x, y } = polarToCart(angle, radius);
    return `${x},${y}`;
  }).join(' ');
}

// Abbreviate labels for tight spaces (> 15 chars)
function abbreviate(label) {
  if (label.length <= 12) return label;
  return label.split(/[\s&]+/).map(w => w[0]).join('').toUpperCase();
}

export default function RadarChart({ ratings = {}, previousRatings, othersRatings, competencies = [], size = DEFAULT_SIZE }) {
  if (!competencies.length) return null;

  const n = competencies.length;

  // Label positions: slightly outside max radius
  const labelRadius = MAX_RADIUS + 22;

  return (
    <svg
      viewBox={`0 0 ${DEFAULT_SIZE} ${DEFAULT_SIZE}`}
      style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block', margin: '0 auto' }}
      aria-label="Competency radar chart"
    >
      {/* Grid: concentric polygons at levels 1-4 */}
      {[1, 2, 3, 4].map(level => (
        <polygon
          key={level}
          points={buildGridPolygon(competencies, level)}
          fill="none"
          stroke="var(--border-color, #e2e8f0)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines from center to tip */}
      {competencies.map((comp, i) => {
        const angle = (360 / n) * i;
        const tip = polarToCart(angle, MAX_RADIUS);
        return (
          <line
            key={comp.id}
            x1={CENTER}
            y1={CENTER}
            x2={tip.x}
            y2={tip.y}
            stroke="var(--border-color, #e2e8f0)"
            strokeWidth="1"
          />
        );
      })}

      {/* Others (360) overlay polygon */}
      {othersRatings && (
        <polygon
          points={buildPolygonPoints(competencies, othersRatings)}
          fill="rgba(21, 128, 61, 0.1)"
          stroke="#15803d"
          strokeWidth="1.5"
          strokeDasharray="6,3"
          opacity="0.7"
        />
      )}

      {/* Previous assessment polygon (if provided) */}
      {previousRatings && (
        <polygon
          points={buildPolygonPoints(competencies, previousRatings)}
          fill="none"
          stroke="var(--text-muted, #94a3b8)"
          strokeWidth="1.5"
          strokeDasharray="5,3"
          opacity="0.7"
        />
      )}

      {/* Current assessment polygon */}
      <polygon
        points={buildPolygonPoints(competencies, ratings)}
        fill="var(--blue-light, rgba(59, 130, 246, 0.25))"
        stroke="var(--blue, #3b82f6)"
        strokeWidth="2"
      />

      {/* Axis labels */}
      {competencies.map((comp, i) => {
        const angle = (360 / n) * i;
        const pos = polarToCart(angle, labelRadius);

        // Determine text anchor based on horizontal position
        let anchor = 'middle';
        const dx = pos.x - CENTER;
        if (dx > 15) anchor = 'start';
        else if (dx < -15) anchor = 'end';

        // Adjust y for very top/bottom labels
        const dy = pos.y - CENTER;
        let dominantBaseline = 'middle';
        if (dy < -10) dominantBaseline = 'auto';
        else if (dy > 10) dominantBaseline = 'hanging';

        const label = abbreviate(comp.label);
        const isAbbrev = label !== comp.label;

        return (
          <text
            key={comp.id}
            x={pos.x}
            y={pos.y}
            textAnchor={anchor}
            dominantBaseline={dominantBaseline}
            fontSize="10"
            fill="var(--text-secondary, #64748b)"
            fontFamily="inherit"
          >
            {isAbbrev ? (
              <title>{comp.label}</title>
            ) : null}
            {label}
          </text>
        );
      })}

      {/* Level indicators along first axis (right side) */}
      {[1, 2, 3, 4].map(level => {
        const pos = polarToCart(0, (level / LEVELS) * MAX_RADIUS);
        return (
          <text
            key={level}
            x={pos.x + 4}
            y={pos.y}
            fontSize="8"
            fill="var(--text-muted, #94a3b8)"
            dominantBaseline="middle"
            fontFamily="inherit"
          >
            {level}
          </text>
        );
      })}
    </svg>
  );
}
