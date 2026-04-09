// components/dashboard/NudgesWidget.jsx
// Dashboard widget: rules-based proactive nudges computed client-side from user data.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { daysSinceContact } from '../../hooks/usePeopleData.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Nudge computation ─────────────────────────────────────────────────────────

function computeNudges({ actions, wins, people, readiness, scorecard, reflections, goals, qualifyingYear }) {
  const nudges = [];
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-indexed

  // 1. Stale champion: decision-maker with no contact in > 30 days
  (people ?? [])
    .filter(p => p.influenceTier === 'decision-maker')
    .forEach(p => {
      const days = daysSinceContact(p);
      if (days > 30 && days !== Infinity) {
        nudges.push({
          id: `stale-${p.id}`,
          type: `stale_champion_${p.id}`,
          priority: 'high',
          title: `You haven't connected with ${p.name} in ${days} days`,
          action: { label: 'Go to People', link: '/people' },
        });
      }
    });

  // 2. Missing reflection: no check-in for current week
  const currentWeek = getMonday();
  const hasThisWeek = (reflections?.checkins ?? []).some(c => c.week_start === currentWeek);
  if (!hasThisWeek) {
    nudges.push({
      id: 'missing-reflection',
      type: 'missing_reflection',
      priority: 'medium',
      title: "You haven't done your weekly check-in yet",
      action: { label: 'Check in', link: '/reflections' },
    });
  }

  // 3. Overdue actions: more than 2 overdue
  const overdueCount = (actions ?? []).filter(a => !a.done && new Date(a.dueDate) < today).length;
  if (overdueCount > 2) {
    nudges.push({
      id: 'overdue-actions',
      type: 'overdue_actions',
      priority: 'high',
      title: `You have ${overdueCount} overdue action items`,
      action: { label: 'View actions', link: '/actions' },
    });
  }

  // 4. Goal deadline: goal due within 14 days and not done
  (goals ?? []).forEach(g => {
    if (!g.targetDate || g.status === 'done') return;
    const daysLeft = daysUntil(g.targetDate);
    if (daysLeft >= 0 && daysLeft <= 14) {
      nudges.push({
        id: `goal-deadline-${g.id}`,
        type: `goal_deadline_${g.id}`,
        priority: 'medium',
        title: `Goal "${g.title}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        action: { label: 'View goals', link: '/goals' },
      });
    }
  });

  // 5. Low readiness: overall < 50
  if (readiness?.overall != null && readiness.overall < 50) {
    nudges.push({
      id: 'low-readiness',
      type: 'low_readiness',
      priority: 'high',
      title: `Your readiness score is ${readiness.overall}% — review your gaps`,
      action: { label: 'View narrative', link: '/story' },
    });
  }

  // 6. Pipeline light: signings pct < 50 and month >= 4
  if (currentMonth >= 4 && qualifyingYear && scorecard?.getSalesStats) {
    const salesStats = scorecard.getSalesStats(qualifyingYear);
    if (salesStats?.target) {
      const pct = Math.round((salesStats.total / salesStats.target) * 100);
      if (pct < 50) {
        nudges.push({
          id: 'pipeline-light',
          type: 'pipeline_light',
          priority: 'medium',
          title: `Signings at ${pct}% of target — consider adding opportunities`,
          action: { label: 'View opportunities', link: '/opportunities' },
        });
      }
    }
  }

  // 7. No recent wins: no wins in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hasRecentWin = (wins ?? []).some(w => w.date && new Date(w.date) >= thirtyDaysAgo);
  if (!hasRecentWin) {
    nudges.push({
      id: 'no-recent-wins',
      type: 'no_recent_wins',
      priority: 'medium',
      title: 'No wins logged in the last 30 days',
      action: { label: 'Log a win', link: '/wins' },
    });
  }

  // Sort: high first, then medium; stable sort by type for consistency
  return nudges.sort((a, b) => {
    if (a.priority === b.priority) return a.type.localeCompare(b.type);
    return a.priority === 'high' ? -1 : 1;
  });
}

// ── NudgesWidget ──────────────────────────────────────────────────────────────

export default function NudgesWidget({ actions, wins, people, readiness, scorecard, reflections, goals, qualifyingYear }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem('nudges_dismissed');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const allNudges = useMemo(
    () => computeNudges({ actions, wins, people, readiness, scorecard, reflections, goals, qualifyingYear }),
    [actions, wins, people, readiness, scorecard, reflections, goals, qualifyingYear]
  );

  const visible = allNudges.filter(n => !dismissed[n.type]);
  const displayed = visible.slice(0, 5);

  function dismiss(type) {
    setDismissed(prev => {
      const next = { ...prev, [type]: true };
      try { localStorage.setItem('nudges_dismissed', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function dismissAll() {
    const next = {};
    allNudges.forEach(n => { next[n.type] = true; });
    setDismissed(prev => {
      const merged = { ...prev, ...next };
      try { localStorage.setItem('nudges_dismissed', JSON.stringify(merged)); } catch {}
      return merged;
    });
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Nudges</h2>
        {displayed.length > 0 && (
          <button
            className="section-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={dismissAll}
          >
            Dismiss all
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#16a34a', fontSize: '1.1rem' }}>✓</span>
          <span className="muted">You're on track — no nudges right now</span>
        </div>
      ) : (
        <div className="card card--list">
          {displayed.map(nudge => (
            <div
              key={nudge.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border, #e5e7eb)',
              }}
            >
              {/* Priority dot */}
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: nudge.priority === 'high' ? '#dc2626' : '#ca8a04',
                  flexShrink: 0,
                  marginTop: '0.35rem',
                }}
                title={nudge.priority === 'high' ? 'High priority' : 'Medium priority'}
              />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{nudge.title}</div>
                <Link
                  to={nudge.action.link}
                  style={{ fontSize: '0.8rem', color: 'var(--accent, #2563eb)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {nudge.action.label} →
                </Link>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => dismiss(nudge.type)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted, #9ca3af)',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '0.1rem 0.25rem',
                  flexShrink: 0,
                }}
                title="Dismiss"
                aria-label="Dismiss nudge"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
