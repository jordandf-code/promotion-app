// pages/Dashboard.jsx
// Qualifying-year snapshot: live scorecard progress, countdown, overdue items,
// recent wins, and a quick-add button.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useActionsData } from '../hooks/useActionsData.js';
import { useWinsData } from '../hooks/useWinsData.js';
import { useGoalsData } from '../hooks/useGoalsData.js';
import { daysUntil, fmtDate } from '../data/sampleData.js';
import { usePeopleData, daysSinceContact } from '../hooks/usePeopleData.js';
import ScorecardTable from '../components/dashboard/ScorecardTable.jsx';
import QuickAddModal  from '../components/dashboard/QuickAddModal.jsx';

const TODAY = new Date();

export default function Dashboard() {
  const { qualifyingYear } = useSettings();
  const scorecard = useScorecardData();
  const { actions, toggleDone, addAction } = useActionsData();
  const { wins, addWin } = useWinsData();
  const { addGoal } = useGoalsData();
  const { people, addPerson } = usePeopleData();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const deadline = `${qualifyingYear}-12-31`;
  const daysLeft = daysUntil(deadline);

  const overdueActions = actions.filter(a => !a.done && new Date(a.dueDate) < TODAY);
  const staleContacts  = people.filter(p => daysSinceContact(p) > 30);

  const upcomingActions = actions
    .filter(a => !a.done && new Date(a.dueDate) >= TODAY)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  const recentWins = [...wins]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);


  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="page-header-actions">
          <span className="qual-badge">{qualifyingYear} qualifying year</span>
          <button className="btn-primary" onClick={() => setShowQuickAdd(true)}>+ Quick add</button>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-card stat-card--qual stat-card--link" onClick={() => navigate('/calendar')}>
          <div className="stat-value">{daysLeft}</div>
          <div className="stat-label">days to Dec 31, {qualifyingYear}</div>
        </div>
        <div className={`stat-card stat-card--link ${overdueActions.length > 0 ? 'stat-card--red' : 'stat-card--green'}`}
          onClick={() => navigate('/actions?filter=overdue')}>
          <div className="stat-value">{overdueActions.length}</div>
          <div className="stat-label">overdue action{overdueActions.length !== 1 ? 's' : ''}</div>
        </div>
        <div className={`stat-card stat-card--link ${staleContacts.length > 0 ? 'stat-card--amber' : 'stat-card--green'}`}
          onClick={() => navigate('/people?filter=stale')}>
          <div className="stat-value">{staleContacts.length}</div>
          <div className="stat-label">contact{staleContacts.length !== 1 ? 's' : ''} to follow up</div>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Scorecard highlights</h2>
          <Link to="/scorecard" className="section-link">Full scorecard →</Link>
        </div>
        <div className="card card--flush">
          <ScorecardTable scorecard={scorecard} qualifyingYear={qualifyingYear} />
        </div>
      </section>

      <div className="two-col">
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
      </div>

      {showQuickAdd && (
        <QuickAddModal
          onAddWin={addWin}
          onAddAction={addAction}
          onAddGoal={addGoal}
          onAddPerson={addPerson}
          onAddOpportunity={scorecard.addOpportunity}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
