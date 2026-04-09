// components/dashboard/ReflectionsWidget.jsx
// Dashboard widget showing reflection streak, confidence trend, and CTA.

import { Link } from 'react-router-dom';

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function computeStreak(checkins) {
  if (!checkins.length) return 0;
  const weeks = new Set(checkins.map(c => c.week_start));
  let streak = 0;
  const d = new Date();
  // Check current week
  let monday = getMonday(d);
  if (weeks.has(monday)) streak++;
  // Walk backwards
  while (true) {
    d.setDate(d.getDate() - 7);
    monday = getMonday(d);
    if (weeks.has(monday)) {
      streak++;
    } else {
      // If we haven't counted current week yet and first backward week has it, count it
      break;
    }
  }
  return streak;
}

function confidenceTrend(checkins) {
  const recent = checkins.slice(-3);
  if (recent.length < 2) return null;
  const first = recent[0].confidence;
  const last = recent[recent.length - 1].confidence;
  if (last > first) return '↑';
  if (last < first) return '↓';
  return '→';
}

export default function ReflectionsWidget({ checkins }) {
  const currentWeek = getMonday();
  const hasThisWeek = (checkins ?? []).some(c => c.week_start === currentWeek);
  const streak = computeStreak(checkins ?? []);
  const trend = confidenceTrend(checkins ?? []);

  const lastCheckin = checkins?.length ? checkins[checkins.length - 1] : null;
  const daysSinceLast = lastCheckin
    ? Math.floor((Date.now() - new Date(lastCheckin.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Weekly reflections</h2>
        <Link to="/reflections" className="section-link">
          {hasThisWeek ? 'View all →' : 'Check in →'}
        </Link>
      </div>
      <div className="card card--list" style={{ padding: '1rem' }}>
        {!checkins?.length ? (
          <p className="muted">Start your first weekly reflection to build your streak.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.75rem' }}>Streak</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{streak} week{streak !== 1 ? 's' : ''}</div>
            </div>
            {daysSinceLast != null && (
              <div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>Last check-in</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{daysSinceLast === 0 ? 'Today' : `${daysSinceLast}d ago`}</div>
              </div>
            )}
            {trend && (
              <div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>Confidence</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{trend}</div>
              </div>
            )}
          </div>
        )}
        {!hasThisWeek && checkins?.length > 0 && (
          <Link to="/reflections" className="btn-primary" style={{ marginTop: '0.75rem', display: 'inline-block', textDecoration: 'none', fontSize: '0.85rem' }}>
            Do your weekly check-in
          </Link>
        )}
      </div>
    </section>
  );
}
