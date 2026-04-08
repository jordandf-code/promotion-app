// components/dashboard/ScorecardWidget.jsx
// Dashboard widget: scorecard highlights table.

import { Link } from 'react-router-dom';
import ScorecardTable from './ScorecardTable.jsx';

export default function ScorecardWidget({ scorecard, qualifyingYear, scorecardYears }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Scorecard highlights</h2>
        <Link to="/scorecard" className="section-link">Full scorecard →</Link>
      </div>
      <div className="card card--flush">
        <ScorecardTable scorecard={scorecard} qualifyingYear={qualifyingYear} scorecardYears={scorecardYears} />
      </div>
    </section>
  );
}
