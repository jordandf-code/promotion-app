// components/dashboard/ReadinessTrendWidget.jsx
// SVG line chart showing readiness score over time with togglable dimension lines.

import { useState, useRef, useCallback } from 'react';

const DIMENSION_KEYS = ['scorecard', 'pipeline', 'gates', 'evidence', 'wins'];
const DIMENSION_COLORS = {
  scorecard: '#2563eb',
  pipeline:  '#7c3aed',
  gates:     '#0891b2',
  evidence:  '#ca8a04',
  wins:      '#16a34a',
};
const DIMENSION_LABELS = {
  scorecard: 'Scorecard',
  pipeline:  'Pipeline',
  gates:     'Gates',
  evidence:  'Evidence',
  wins:      'Wins',
};

function overallColor(score) {
  if (score >= 80) return '#15803d';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Chart geometry constants
const PADDING = { top: 16, right: 16, bottom: 32, left: 36 };

export default function ReadinessTrendWidget({ snapshots }) {
  const [visibleDims, setVisibleDims] = useState(new Set());
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const toggleDim = useCallback((key) => {
    setVisibleDims(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!snapshots || snapshots.length === 0) {
    return (
      <section className="readiness-trend card">
        <h3 className="card-title">Readiness trend</h3>
        <div className="readiness-trend-empty">
          Snapshots will appear as your readiness score is tracked over time.
        </div>
      </section>
    );
  }

  // Sort by date
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

  // Chart dimensions — responsive via viewBox
  const chartWidth = 600;
  const chartHeight = 220;
  const plotW = chartWidth - PADDING.left - PADDING.right;
  const plotH = chartHeight - PADDING.top - PADDING.bottom;

  // Scale helpers
  const xScale = (i) => PADDING.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW);
  const yScale = (v) => PADDING.top + plotH - (v / 100) * plotH;

  // Build polyline points
  function buildPoints(accessor) {
    return sorted.map((s, i) => `${xScale(i)},${yScale(accessor(s))}`).join(' ');
  }

  const overallPoints = buildPoints(s => s.overall);

  // Y-axis gridlines
  const yTicks = [0, 25, 50, 75, 100];

  // X-axis labels — show at most 8 evenly spaced
  const maxXLabels = Math.min(sorted.length, 8);
  const xLabelIndices = [];
  if (sorted.length <= maxXLabels) {
    sorted.forEach((_, i) => xLabelIndices.push(i));
  } else {
    for (let i = 0; i < maxXLabels; i++) {
      xLabelIndices.push(Math.round((i / (maxXLabels - 1)) * (sorted.length - 1)));
    }
  }

  function handleMouseMove(e) {
    const svg = svgRef.current;
    if (!svg || sorted.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    // Find closest point
    let closest = 0;
    let closestDist = Infinity;
    sorted.forEach((_, i) => {
      const dist = Math.abs(xScale(i) - relX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    const snap = sorted[closest];
    setTooltip({
      index: closest,
      x: xScale(closest),
      y: yScale(snap.overall),
      snap,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  const lastScore = sorted[sorted.length - 1].overall;

  return (
    <section className="readiness-trend card">
      <h3 className="card-title">Readiness trend</h3>

      <div className="readiness-trend-chart-wrap">
        <svg
          ref={svgRef}
          className="readiness-trend-svg"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Y gridlines + labels */}
          {yTicks.map(v => (
            <g key={v}>
              <line
                x1={PADDING.left} y1={yScale(v)}
                x2={chartWidth - PADDING.right} y2={yScale(v)}
                stroke="#e5e7eb" strokeWidth="1"
              />
              <text
                x={PADDING.left - 6} y={yScale(v) + 4}
                textAnchor="end" fontSize="10" fill="#9ca3af"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabelIndices.map(i => (
            <text
              key={i}
              x={xScale(i)} y={chartHeight - 6}
              textAnchor="middle" fontSize="10" fill="#9ca3af"
            >
              {formatDate(sorted[i].date)}
            </text>
          ))}

          {/* Dimension lines (behind overall) */}
          {DIMENSION_KEYS.filter(k => visibleDims.has(k)).map(key => (
            <polyline
              key={key}
              points={buildPoints(s => s.dimensions?.[key] ?? 0)}
              fill="none"
              stroke={DIMENSION_COLORS[key]}
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeLinejoin="round"
            />
          ))}

          {/* Overall line */}
          <polyline
            points={overallPoints}
            fill="none"
            stroke={overallColor(lastScore)}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Data dots for overall */}
          {sorted.map((s, i) => (
            <circle
              key={s.id}
              cx={xScale(i)} cy={yScale(s.overall)} r="3"
              fill={overallColor(s.overall)} stroke="#fff" strokeWidth="1.5"
            />
          ))}

          {/* Tooltip crosshair + dot */}
          {tooltip && (
            <>
              <line
                x1={tooltip.x} y1={PADDING.top}
                x2={tooltip.x} y2={PADDING.top + plotH}
                stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3"
              />
              <circle
                cx={tooltip.x} cy={tooltip.y} r="5"
                fill={overallColor(tooltip.snap.overall)} stroke="#fff" strokeWidth="2"
              />
            </>
          )}
        </svg>

        {/* Tooltip card */}
        {tooltip && (
          <div
            className="readiness-trend-tooltip"
            style={{
              left: `${(tooltip.x / chartWidth) * 100}%`,
            }}
          >
            <div className="readiness-trend-tooltip-date">{formatDate(tooltip.snap.date)}</div>
            <div className="readiness-trend-tooltip-score">
              Overall: <strong>{tooltip.snap.overall}%</strong>
            </div>
            {DIMENSION_KEYS.map(key => (
              <div key={key} className="readiness-trend-tooltip-dim">
                <span
                  className="readiness-trend-tooltip-dot"
                  style={{ background: DIMENSION_COLORS[key] }}
                />
                {DIMENSION_LABELS[key]}: {tooltip.snap.dimensions?.[key] ?? 0}%
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="readiness-trend-legend">
        <span className="readiness-trend-legend-item readiness-trend-legend-overall">
          <span className="readiness-trend-legend-line" style={{ background: overallColor(lastScore) }} />
          Overall
        </span>
        {DIMENSION_KEYS.map(key => (
          <button
            key={key}
            className={`readiness-trend-legend-item ${visibleDims.has(key) ? 'active' : ''}`}
            onClick={() => toggleDim(key)}
            type="button"
          >
            <span
              className="readiness-trend-legend-line"
              style={{ background: DIMENSION_COLORS[key], opacity: visibleDims.has(key) ? 1 : 0.3 }}
            />
            {DIMENSION_LABELS[key]}
          </button>
        ))}
      </div>
    </section>
  );
}
