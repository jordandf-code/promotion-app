// Dashboard.jsx — Career Command Center dashboard with stat strip, readiness widget, and pluggable widget slots

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useActionsData } from '../hooks/useActionsData.js';
import { useWinsData } from '../hooks/useWinsData.js';
import { useGoalsData } from '../hooks/useGoalsData.js';
import { daysUntil } from '../data/sampleData.js';
import { usePeopleData, daysSinceContact } from '../hooks/usePeopleData.js';
import { useReadinessScore } from '../hooks/useReadinessScore.js';

import StatStrip from '../components/dashboard/StatStrip.jsx';
import ReadinessWidget from '../components/readiness/ReadinessWidget.jsx';
import ReadinessTrendWidget from '../components/dashboard/ReadinessTrendWidget.jsx';
import { useReadinessSnapshots } from '../hooks/useReadinessSnapshots.js';
import ScorecardWidget from '../components/dashboard/ScorecardWidget.jsx';
import ActionsWidget from '../components/dashboard/ActionsWidget.jsx';
import RecentWinsWidget from '../components/dashboard/RecentWinsWidget.jsx';
import QuickAddModal from '../components/dashboard/QuickAddModal.jsx';

// ── Widget slot registry ────────────────────────────────────────────────────
// To add a new dashboard widget:
//   1. Create a component in components/dashboard/
//   2. Import it above
//   3. Add it to PRIMARY_WIDGETS or SECONDARY_WIDGETS below
//   4. It receives the full dashboardContext object as props
//
// PRIMARY_WIDGETS render full-width above the two-column layout.
// SECONDARY_WIDGETS render as cards in the two-column layout.
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = new Date();

export default function Dashboard() {
  const { qualifyingYear, scorecardYears, demoMode } = useSettings();
  const scorecard = useScorecardData();
  const { actions, toggleDone, addAction } = useActionsData();
  const { wins, addWin } = useWinsData();
  const { addGoal } = useGoalsData();
  const { people, addPerson } = usePeopleData();
  const readiness = useReadinessScore();
  const { snapshots, takeSnapshot } = useReadinessSnapshots(readiness);
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

      {demoMode && (
        <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: '#1e40af' }}>
            You're viewing sample data. To use your real data, go to{' '}
            <Link to="/admin" style={{ fontWeight: 600, color: '#1e40af', textDecoration: 'underline' }}>Admin</Link>{' '}
            and start your promotion journey.
          </p>
        </div>
      )}

      {/* ── Stat strip ── */}
      <StatStrip
        daysLeft={daysLeft}
        qualifyingYear={qualifyingYear}
        overdueCount={overdueActions.length}
        staleCount={staleContacts.length}
      />

      {/* ── Primary widgets (full-width) ── */}
      <ReadinessWidget readiness={readiness} daysLeft={daysLeft} qualifyingYear={qualifyingYear} onSnapshot={takeSnapshot} />

      <ReadinessTrendWidget snapshots={snapshots} />

      <ScorecardWidget scorecard={scorecard} qualifyingYear={qualifyingYear} scorecardYears={scorecardYears} />

      {/* ── Secondary widgets (two-column) ── */}
      <div className="two-col">
        <ActionsWidget overdueActions={overdueActions} upcomingActions={upcomingActions} toggleDone={toggleDone} />
        <RecentWinsWidget recentWins={recentWins} />
      </div>

      {/* ── FAB for mobile ── */}
      <button className="fab-quick-add" onClick={() => setShowQuickAdd(true)} aria-label="Quick add">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

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
