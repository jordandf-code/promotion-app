// TrendSparkline.jsx — Tiny inline SVG sparkline for competency trends.

export default function TrendSparkline({ data = [], width = 60, height = 20 }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  // Trend color: compare last to first
  const trend = data[data.length - 1] - data[0];
  const color = trend > 0.1 ? '#15803d' : trend < -0.1 ? '#dc2626' : '#64748b';

  return (
    <svg width={width} height={height} style={{ verticalAlign: 'middle' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
