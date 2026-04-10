// components/scorecard/OpportunitiesTab.jsx
// Sales opportunities table with summary strip, filters, and CRUD.
// When an opportunity's status changes to "won", prompts to log a win.

import { useState } from 'react';
import { fmtDate } from '../../data/sampleData.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useWinsData } from '../../hooks/useWinsData.js';
import { useAdminData, DEFAULT_PIPELINE_STAGES } from '../../hooks/useAdminData.js';
import OppModal from './OppModal.jsx';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'won',  label: 'Won' },
  { value: 'lost', label: 'Lost' },
];
import WinFormModal from '../wins/WinFormModal.jsx';

const STATUS_LABELS = { open: 'Open', won: 'Won', lost: 'Lost' };
const STATUSES = ['open', 'won', 'lost'];

const EMPTY_FORM = {
  name: '', client: '', year: new Date().getFullYear(),
  status: 'open', winDate: '', totalValue: '', signingsValue: '',
  stage: 'Qualified', probability: '',
  dealType: 'one-time', logoType: 'net-new',
  strategicNote: '', relationshipOrigin: '', iscId: '',
};

export default function OpportunitiesTab({ scorecard, scorecardYears }) {
  const { fmtCurrency } = useSettings();
  const { wins, addWin, removeWin, hasWinForSource } = useWinsData();
  const { pipelineStages } = useAdminData();
  const stageList = pipelineStages ?? DEFAULT_PIPELINE_STAGES;
  const [yearFilter,   setYearFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal,        setModal]        = useState(null);
  const [winPrompt,    setWinPrompt]    = useState(null);

  const opps = scorecard.opportunities
    .filter(o => yearFilter   === 'all' || o.year   === Number(yearFilter))
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

  const summaryOpps = yearFilter === 'all'
    ? scorecard.opportunities
    : scorecard.opportunities.filter(o => o.year === Number(yearFilter));
  const totalWon  = summaryOpps.filter(o => o.status === 'won') .reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const totalOpen = summaryOpps.filter(o => o.status === 'open').reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);

  function openAdd() {
    setModal({ mode: 'add', data: { ...EMPTY_FORM, year: scorecardYears[Math.floor(scorecardYears.length / 2)] } });
  }
  function openEdit(opp) { setModal({ mode: 'edit', data: { ...opp } }); }
  function closeModal()   { setModal(null); }

  function handleSave(form) {
    const payload = {
      ...form,
      year:          Number(form.year),
      totalValue:    Number(form.totalValue)    || 0,
      signingsValue: Number(form.signingsValue) || 0,
      winDate:       form.winDate || null,
    };

    const isBecomingWon = payload.status === 'won' && modal.data.status !== 'won';

    if (modal.mode === 'add') scorecard.addOpportunity(payload);
    else scorecard.updateOpportunity(modal.data.id, payload);
    closeModal();

    // If changing away from 'won', offer to remove linked win
    const isLeavingWon = modal.data.status === 'won' && payload.status !== 'won' && modal.mode === 'edit';
    if (isLeavingWon) {
      const linkedWin = wins.find(w => w.sourceId === modal.data.id);
      if (linkedWin && confirm('This opportunity has a linked win. Remove it?')) {
        removeWin(linkedWin.id);
      }
    }

    if (isBecomingWon && !hasWinForSource(modal.mode === 'add' ? null : modal.data.id)) {
      const oppId = modal.mode === 'edit' ? modal.data.id : null;
      if (oppId) {
        setWinPrompt({
          sourceType:  'opportunity',
          sourceId:    oppId,
          sourceName:  payload.name,
          title:       `${payload.name} — ${payload.client}`,
          date:        payload.winDate || new Date().toISOString().slice(0, 10),
          impact:      `Signed ${fmtCurrency(payload.totalValue)} deal`,
          description: '',
          tags:        ['Revenue', 'Client relationship'],
        });
      }
    }
  }

  function handleWinSave(form) {
    addWin({ ...winPrompt, ...form });
    setWinPrompt(null);
  }

  function handleInlineStage(opp, newStage) {
    scorecard.updateOpportunity(opp.id, { stage: newStage });
  }

  function handleInlineStatus(opp, newStatus) {
    const oldStatus = opp.status;
    scorecard.updateOpportunity(opp.id, { status: newStatus });

    // If leaving "won", offer to remove linked win
    if (oldStatus === 'won' && newStatus !== 'won') {
      const linkedWin = wins.find(w => w.sourceId === opp.id);
      if (linkedWin && confirm('This opportunity has a linked win. Remove it?')) {
        removeWin(linkedWin.id);
      }
    }

    // If becoming "won", prompt to log a win
    if (newStatus === 'won' && oldStatus !== 'won' && !hasWinForSource(opp.id)) {
      setWinPrompt({
        sourceType:  'opportunity',
        sourceId:    opp.id,
        sourceName:  opp.name,
        title:       `${opp.name} — ${opp.client}`,
        date:        opp.winDate || new Date().toISOString().slice(0, 10),
        impact:      `Signed ${fmtCurrency(Number(opp.totalValue) || 0)} deal`,
        description: '',
        tags:        ['Revenue', 'Client relationship'],
      });
    }
  }

  function handleDelete(id) {
    if (confirm('Remove this opportunity?')) scorecard.removeOpportunity(id);
  }

  return (
    <div className="tab-content">
      <div className="opp-summary">
        <div className="opp-summary-stat">
          <div className="opp-summary-value won-color">{fmtCurrency(totalWon)}</div>
          <div className="opp-summary-label">Realized signings</div>
        </div>
        <div className="opp-summary-stat">
          <div className="opp-summary-value forecast-color">{fmtCurrency(totalOpen)}</div>
          <div className="opp-summary-label">Forecast signings</div>
        </div>
        <div className="opp-summary-stat">
          <div className="opp-summary-value">{fmtCurrency(totalWon + totalOpen)}</div>
          <div className="opp-summary-label">Total pipeline</div>
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
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add opportunity</button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Opportunity</th><th>Client</th><th>Year</th><th>Stage</th><th>Status</th>
              <th>Win date</th><th>Type</th>
              <th className="num-col">Total value</th>
              <th className="num-col">Signings</th><th className="action-col" />
            </tr>
          </thead>
          <tbody>
            {opps.length === 0
              ? <tr><td colSpan={10} className="table-empty">No opportunities match the current filters.</td></tr>
              : opps.map(opp => (
                <tr key={opp.id} className="clickable-row" onClick={() => openEdit(opp)}>
                  <td className="td-primary">
                    <span className="td-primary-link" onClick={(e) => { e.stopPropagation(); openEdit(opp); }}>{opp.name}</span>
                  </td>
                  <td data-label="Client">{opp.client}</td>
                  <td data-label="Year">{opp.year}</td>
                  <td data-label="Stage" onClick={e => e.stopPropagation()}>
                    <select
                      className="inline-select"
                      value={opp.stage || ''}
                      onChange={e => handleInlineStage(opp, e.target.value)}
                    >
                      {stageList.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                    </select>
                  </td>
                  <td data-label="Status" onClick={e => e.stopPropagation()}>
                    <select
                      className="inline-select"
                      value={opp.status}
                      onChange={e => handleInlineStatus(opp, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {opp.status !== 'lost' && wins.some(w => w.sourceId === opp.id) && (
                      <span className="opp-win-linked" title="Win logged">W</span>
                    )}
                  </td>
                  <td data-label="Win date">{opp.winDate ? fmtDate(opp.winDate) : <span className="muted">—</span>}</td>
                  <td data-label="Type"><LogoTypePip logoType={opp.logoType} /></td>
                  <td className="num-col" data-label="Total value">{fmtCurrency(Number(opp.totalValue) || 0)}</td>
                  <td className="num-col font-bold" data-label="Signings">{fmtCurrency(Number(opp.signingsValue) || 0)}</td>
                  <td className="action-col" onClick={e => e.stopPropagation()}>
                    <button className="row-btn" onClick={() => openEdit(opp)} title="Edit">✎</button>
                    <button className="row-btn row-btn--danger" onClick={() => handleDelete(opp.id)}>✕</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
          {opps.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} className="tfoot-label">{opps.length} opportunit{opps.length === 1 ? 'y' : 'ies'}</td>
                <td className="num-col tfoot-total">{fmtCurrency(opps.reduce((s, o) => s + (Number(o.totalValue) || 0), 0))}</td>
                <td className="num-col tfoot-total font-bold">{fmtCurrency(opps.reduce((s, o) => s + (Number(o.signingsValue) || 0), 0))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <OppModal
          mode={modal.mode}
          initial={modal.data}
          scorecardYears={scorecardYears}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {winPrompt && (
        <WinFormModal
          mode="prompt"
          initial={winPrompt}
          promptContext={`"${winPrompt.sourceName}" was just marked as won. Want to log this as a win?`}
          onSave={handleWinSave}
          onClose={() => setWinPrompt(null)}
        />
      )}
    </div>
  );
}

export function stageColorMap(pipelineStages) {
  return Object.fromEntries((pipelineStages ?? DEFAULT_PIPELINE_STAGES).map(s => [s.label, s.color]));
}

export function StagePip({ stage }) {
  const { pipelineStages } = useAdminData();
  if (!stage) return <span className="muted">—</span>;
  const colors = stageColorMap(pipelineStages);
  const color = colors[stage] ?? '#64748b';
  return (
    <span className="stage-pip" style={{ background: color + '18', color, borderColor: color + '60' }}>
      {stage}
    </span>
  );
}

export function LogoTypePip({ logoType }) {
  if (!logoType) return <span className="muted">—</span>;
  const isNew = logoType === 'net-new';
  return (
    <span className={`logo-type-pip ${isNew ? 'logo-type-pip--new' : 'logo-type-pip--exp'}`}>
      {isNew ? 'Net new' : 'Expansion'}
    </span>
  );
}
