// components/scorecard/ProjectsTab.jsx
// Revenue and Gross Profit projects table with summary strip, filters, and CRUD.

import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { qSum, QUARTER_LABELS } from '../../hooks/useScorecardData.js';
import ProjectModal from './ProjectModal.jsx';

const STATUS_LABELS = { forecast: 'Forecast', realized: 'Realized' };

const EMPTY_FORM = {
  name: '', client: '', year: new Date().getFullYear(), endYear: '',
  status: 'forecast', opportunityId: '',
  revenue:     { q1: '', q2: '', q3: '', q4: '' },
  grossProfit: { q1: '', q2: '', q3: '', q4: '' },
};

export default function ProjectsTab({ scorecard, scorecardYears }) {
  const { fmtCurrency } = useSettings();
  const [yearFilter,   setYearFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);

  const projects = scorecard.projects
    .filter(p => {
      if (yearFilter === 'all') return true;
      const filterYr = Number(yearFilter);
      const start = p.year;
      const end = p.endYear && p.endYear !== p.year ? p.endYear : p.year;
      return filterYr >= start && filterYr <= end;
    })
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

  const summaryProjects = yearFilter === 'all'
    ? scorecard.projects
    : scorecard.projects.filter(p => {
        const filterYr = Number(yearFilter);
        const start = p.year;
        const end = p.endYear && p.endYear !== p.year ? p.endYear : p.year;
        return filterYr >= start && filterYr <= end;
      });
  const realizedRev = summaryProjects.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.revenue), 0);
  const forecastRev = summaryProjects.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.revenue), 0);
  const realizedGP  = summaryProjects.filter(p => p.status === 'realized').reduce((s, p) => s + qSum(p.grossProfit), 0);
  const forecastGP  = summaryProjects.filter(p => p.status === 'forecast').reduce((s, p) => s + qSum(p.grossProfit), 0);

  function openAdd() {
    setModal({ mode: 'add', data: { ...EMPTY_FORM, year: scorecardYears[Math.floor(scorecardYears.length / 2)] } });
  }
  function openEdit(proj) { setModal({ mode: 'edit', data: JSON.parse(JSON.stringify(proj)) }); }
  function closeModal()    { setModal(null); }

  function handleSave(form) {
    const payload = {
      ...form,
      year:          Number(form.year),
      endYear:       form.endYear ? Number(form.endYear) : null,
      opportunityId: form.opportunityId || null,
    };
    if (modal.mode === 'add') scorecard.addProject(payload);
    else scorecard.updateProject(modal.data.id, payload);
    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Remove this project?')) scorecard.removeProject(id);
  }

  function getOpportunityName(oppId) {
    if (!oppId) return null;
    return scorecard.opportunities.find(o => o.id === oppId)?.name ?? null;
  }

  return (
    <div className="tab-content">
      <div className="opp-summary">
        <div className="opp-summary-stat">
          <div className="opp-summary-value won-color">{fmtCurrency(realizedRev)}</div>
          <div className="opp-summary-label">Realized revenue</div>
        </div>
        <div className="opp-summary-stat">
          <div className="opp-summary-value forecast-color">{fmtCurrency(forecastRev)}</div>
          <div className="opp-summary-label">Forecast revenue</div>
        </div>
        <div className="opp-summary-stat">
          <div className="opp-summary-value won-color">{fmtCurrency(realizedGP)}</div>
          <div className="opp-summary-label">Realized GP</div>
        </div>
        <div className="opp-summary-stat">
          <div className="opp-summary-value forecast-color">{fmtCurrency(forecastGP)}</div>
          <div className="opp-summary-label">Forecast GP</div>
        </div>
      </div>

      <div className="tab-toolbar">
        <div className="tab-filters">
          <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="all">All years</option>
            {scorecardYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="forecast">Forecast</option>
            <option value="realized">Realized</option>
          </select>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add project</button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Year</th><th>Status</th>
              <th>Linked opportunity</th>
              <th className="num-col">Revenue</th><th className="num-col">Gross profit</th>
              <th className="action-col" />
            </tr>
          </thead>
          <tbody>
            {projects.length === 0
              ? <tr><td colSpan={8} className="table-empty">No projects match the current filters.</td></tr>
              : projects.map(proj => {
                const rev = qSum(proj.revenue);
                const gp  = qSum(proj.grossProfit);
                const gpm = rev > 0 ? Math.round((gp / rev) * 100) : null;
                const oppName = getOpportunityName(proj.opportunityId);
                return (
                  <tr key={proj.id}>
                    <td className="td-primary">{proj.name}</td>
                    <td>{proj.client}</td>
                    <td>{proj.endYear && proj.endYear !== proj.year ? `${proj.year}\u2013${proj.endYear}` : proj.year}</td>
                    <td><span className={`status-pip status-pip--${proj.status}`}>{STATUS_LABELS[proj.status]}</span></td>
                    <td>{oppName ? <span className="opp-link">{oppName}</span> : <span className="muted">—</span>}</td>
                    <td className="num-col"><QuarterBreakdown values={proj.revenue} total={rev} /></td>
                    <td className="num-col"><QuarterBreakdown values={proj.grossProfit} total={gp} gpm={gpm} /></td>
                    <td className="action-col">
                      <button className="row-btn" onClick={() => openEdit(proj)}>Edit</button>
                      <button className="row-btn row-btn--danger" onClick={() => handleDelete(proj.id)}>✕</button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
          {projects.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="tfoot-label">{projects.length} project{projects.length === 1 ? '' : 's'}</td>
                <td className="num-col tfoot-total font-bold">{fmtCurrency(projects.reduce((s, p) => s + qSum(p.revenue), 0))}</td>
                <td className="num-col tfoot-total font-bold">{fmtCurrency(projects.reduce((s, p) => s + qSum(p.grossProfit), 0))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <ProjectModal
          mode={modal.mode}
          initial={modal.data}
          scorecardYears={scorecardYears}
          opportunities={scorecard.opportunities}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// Shows a total with non-zero quarters listed as chips below.
function QuarterBreakdown({ values, total, gpm }) {
  const { fmtCurrency } = useSettings();
  const quarters = QUARTER_LABELS
    .map((q, i) => ({ q, val: Number(values?.[`q${i + 1}`]) || 0 }))
    .filter(({ val }) => val > 0);

  return (
    <div className="quarter-cell">
      <span className="quarter-total">{fmtCurrency(total)}</span>
      {gpm != null && <span className="quarter-gpm"> ({gpm}% GP)</span>}
      {quarters.length > 0 && (
        <div className="quarter-breakdown">
          {quarters.map(({ q, val }) => (
            <span key={q} className="quarter-chip">{q}: {fmtCurrency(val)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
