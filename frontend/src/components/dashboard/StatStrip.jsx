// components/dashboard/StatStrip.jsx
// Dashboard stat cards: countdown, overdue actions, stale contacts.

import { useNavigate } from 'react-router-dom';

export default function StatStrip({ daysLeft, qualifyingYear, overdueCount, staleCount }) {
  const navigate = useNavigate();

  return (
    <div className="stat-strip">
      <div className="stat-card stat-card--qual stat-card--link" onClick={() => navigate('/calendar')}>
        <div className="stat-value">{daysLeft}</div>
        <div className="stat-label">days to Dec 31, {qualifyingYear}</div>
      </div>
      <div className={`stat-card stat-card--link ${overdueCount > 0 ? 'stat-card--red' : 'stat-card--green'}`}
        onClick={() => navigate('/actions?filter=overdue')}>
        <div className="stat-value">{overdueCount}</div>
        <div className="stat-label">overdue action{overdueCount !== 1 ? 's' : ''}</div>
      </div>
      <div className={`stat-card stat-card--link ${staleCount > 0 ? 'stat-card--amber' : 'stat-card--green'}`}
        onClick={() => navigate('/people?filter=stale')}>
        <div className="stat-value">{staleCount}</div>
        <div className="stat-label">contact{staleCount !== 1 ? 's' : ''} to follow up</div>
      </div>
    </div>
  );
}
