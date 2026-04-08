// components/dashboard/ActionsWidget.jsx
// Dashboard widget: overdue + upcoming actions list.

import { Link, useNavigate } from 'react-router-dom';
import { fmtDate } from '../../data/sampleData.js';

export default function ActionsWidget({ overdueActions, upcomingActions, toggleDone }) {
  const navigate = useNavigate();

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Upcoming actions</h2>
        <Link to="/actions" className="section-link">All →</Link>
      </div>
      <div className="card card--list">
        {overdueActions.map(a => (
          <div key={a.id} className="list-item list-item--overdue list-item--link" onClick={() => navigate(`/actions?id=${a.id}`)}>
            <button className="list-item-check list-item-check--open" onClick={e => { e.stopPropagation(); toggleDone(a.id); }} title="Mark done" />
            <div>
              <div className="list-item-title">{a.title}</div>
              <div className="list-item-meta overdue-label">Overdue · {fmtDate(a.dueDate)}</div>
            </div>
          </div>
        ))}
        {upcomingActions.map(a => (
          <div key={a.id} className="list-item list-item--link" onClick={() => navigate(`/actions?id=${a.id}`)}>
            <button className="list-item-check list-item-check--open" onClick={e => { e.stopPropagation(); toggleDone(a.id); }} title="Mark done" />
            <div>
              <div className="list-item-title">{a.title}</div>
              <div className="list-item-meta">Due {fmtDate(a.dueDate)}</div>
            </div>
          </div>
        ))}
        {overdueActions.length === 0 && upcomingActions.length === 0 && (
          <div className="list-empty">No upcoming actions</div>
        )}
      </div>
    </section>
  );
}
