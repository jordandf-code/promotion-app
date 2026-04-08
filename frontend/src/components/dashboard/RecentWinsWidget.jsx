// components/dashboard/RecentWinsWidget.jsx
// Dashboard widget: recent wins list.

import { Link, useNavigate } from 'react-router-dom';
import { fmtDate } from '../../data/sampleData.js';

export default function RecentWinsWidget({ recentWins }) {
  const navigate = useNavigate();

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Recent wins</h2>
        <Link to="/wins" className="section-link">All →</Link>
      </div>
      <div className="card card--list">
        {recentWins.map(w => (
          <div key={w.id} className="list-item list-item--link" onClick={() => navigate(`/wins?id=${w.id}`)}>
            <span className="list-item-dot list-item-dot--green" />
            <div>
              <div className="list-item-title">{w.title}</div>
              <div className="list-item-meta">
                {fmtDate(w.date)}{w.tags.length > 0 && ` · ${w.tags.join(', ')}`}
              </div>
            </div>
          </div>
        ))}
        {recentWins.length === 0 && <div className="list-empty">No wins logged yet</div>}
      </div>
    </section>
  );
}
