// Pursuits.jsx — CRM-style pipeline view of live sales opportunities
// UI label: "Opportunities" (route: /opportunities)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { fmtDate } from '../data/sampleData.js';
import { useAdminData, DEFAULT_ORIGIN_TYPES, DEFAULT_PIPELINE_STAGES } from '../hooks/useAdminData.js';
import OppModal from '../components/scorecard/OppModal.jsx';
import { LogoTypePip, stageColorMap } from '../components/scorecard/OpportunitiesTab.jsx';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'won',  label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const EMPTY_FORM = {
  name: '', client: '', year: new Date().getFullYear(),
  status: 'open', winDate: '', totalValue: '', signingsValue: '',
  stage: 'Qualified', probability: '',
  dealType: 'one-time', logoType: 'net-new',
  strategicNote: '', relationshipOrigin: '', iscId: '',
};

export default function Pursuits() {
  const scorecard  = useScorecardData();
  const { fmtCurrency, scorecardYears } = useSettings();
  const { originTypes, pipelineStages } = useAdminData();
  const ORIGIN_OPTIONS = originTypes ?? DEFAULT_ORIGIN_TYPES;
  const stageList      = pipelineStages ?? DEFAULT_PIPELINE_STAGES;
  const STAGES         = stageList.map(s => s.label);
  const STAGE_COLORS   = stageColorMap(stageList);
  const [stageFilter, setStageFilter] = useState('all');
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  // Active + lost pursuits (not won)
  const pursuits = scorecard.opportunities
    .filter(o => o.status === 'open' || o.status === 'lost')
    .filter(o => stageFilter === 'all' || o.stage === stageFilter)
    .sort((a, b) => {
      // Open first, lost at the bottom
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      const si = STAGES.indexOf(b.stage ?? '') - STAGES.indexOf(a.stage ?? '');
      return si !== 0 ? si : (Number(b.signingsValue) || 0) - (Number(a.signingsValue) || 0);
    });

  // Summary stats
  const allOpen = scorecard.opportunities.filter(o => o.status === 'open');
  const totalPipeline   = allOpen.reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const weightedPipeline = allOpen.reduce((s, o) => {
    const prob = o.probability != null ? Number(o.probability) : 50;
    return s + (Number(o.signingsValue) || 0) * (prob / 100);
  }, 0);

  // Per-stage counts
  const stageCounts = STAGES.map(stage => ({
    stage,
    count: allOpen.filter(o => o.stage === stage).length,
    value: allOpen.filter(o => o.stage === stage).reduce((s, o) => s + (Number(o.signingsValue) || 0), 0),
  }));

  function openAdd()       { setModal({ mode: 'add',  data: { ...EMPTY_FORM, year: new Date().getFullYear() } }); }
  function openEdit(opp)   { setModal({ mode: 'edit', data: { ...opp } }); }
  function closeModal()    { setModal(null); }

  function handleInlineStage(opp, newStage) {
    scorecard.updateOpportunity(opp.id, { stage: newStage });
  }

  function handleInlineStatus(opp, newStatus) {
    scorecard.updateOpportunity(opp.id, { status: newStatus });
  }

  function handleSave(form) {
    const payload = {
      ...form,
      year:          Number(form.year),
      totalValue:    Number(form.totalValue)    || 0,
      signingsValue: Number(form.signingsValue) || 0,
      winDate:       form.winDate || null,
      probability:   form.probability !== '' && form.probability != null ? Number(form.probability) : null,
    };
    if (modal.mode === 'add') scorecard.addOpportunity(payload);
    else scorecard.updateOpportunity(modal.data.id, payload);
    closeModal();
  }

  function originLabel(val) {
    return ORIGIN_OPTIONS.find(o => o.value === val)?.label ?? val;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Opportunities</h1>
        <div className="page-header-actions">
          <span className="page-count">{allOpen.length} active</span>
          <button className="btn-ghost" onClick={() => navigate('/import-export')}>Import / Export</button>
          <button className="btn-primary" onClick={openAdd}>+ Add opportunity</button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="opportunities-summary">
        <div className="opportunities-stat">
          <div className="opportunities-stat-value">{fmtCurrency(totalPipeline)}</div>
          <div className="opportunities-stat-label">Total pipeline</div>
        </div>
        <div className="opportunities-stat">
          <div className="opportunities-stat-value">{fmtCurrency(weightedPipeline)}</div>
          <div className="opportunities-stat-label">Weighted pipeline</div>
        </div>
        <div className="opportunities-stat">
          <div className="opportunities-stat-value">{allOpen.filter(o => o.logoType === 'net-new').length}</div>
          <div className="opportunities-stat-label">Net new logos</div>
        </div>
        <div className="opportunities-stat">
          <div className="opportunities-stat-value">{allOpen.filter(o => o.logoType === 'expansion').length}</div>
          <div className="opportunities-stat-label">Expansions</div>
        </div>
      </div>

      {/* ── Stage funnel ── */}
      <div className="opportunities-funnel">
        {stageCounts.map(({ stage, count, value }) => (
          <div
            key={stage}
            className={`opportunities-funnel-stage ${stageFilter === stage ? 'opportunities-funnel-stage--active' : ''}`}
            onClick={() => setStageFilter(s => s === stage ? 'all' : stage)}
            style={{ '--stage-color': STAGE_COLORS[stage] }}
          >
            <div className="opportunities-funnel-count">{count}</div>
            <div className="opportunities-funnel-name">{stage}</div>
            {value > 0 && <div className="opportunities-funnel-value">{fmtCurrency(value)}</div>}
          </div>
        ))}
        {stageFilter !== 'all' && (
          <button className="opportunities-funnel-clear" onClick={() => setStageFilter('all')}>
            Clear filter
          </button>
        )}
      </div>

      {/* ── Pipeline table ── */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Opportunity</th>
              <th>Client</th>
              <th>Stage</th>
              <th className="num-col">Prob.</th>
              <th className="num-col">Signings credit</th>
              <th>Type</th>
              <th>Origin</th>
              <th>ISC Link</th>
              <th>Strategic rationale</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pursuits.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty">
                  {allOpen.length === 0
                    ? 'No active opportunities. Add one above or open an opportunity in the Scorecard.'
                    : 'No opportunities match the current filter.'}
                </td>
              </tr>
            ) : pursuits.map(opp => (
              <tr key={opp.id} className={opp.status === 'lost' ? 'tr--lost' : ''}>
                <td className="td-primary">
                  <span className="td-primary-link" onClick={() => openEdit(opp)}>
                    {opp.status === 'lost' ? <s>{opp.name}</s> : opp.name}
                  </span>
                </td>
                <td>{opp.client}</td>
                <td>
                  <select
                    className="inline-select"
                    value={opp.stage || ''}
                    onChange={e => handleInlineStage(opp, e.target.value)}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="num-col">
                  {opp.probability != null ? `${opp.probability}%` : <span className="muted">—</span>}
                </td>
                <td className="num-col font-bold">{fmtCurrency(Number(opp.signingsValue) || 0)}</td>
                <td><LogoTypePip logoType={opp.logoType} /></td>
                <td>
                  {opp.relationshipOrigin
                    ? <span className="opportunities-origin">{originLabel(opp.relationshipOrigin)}</span>
                    : <span className="muted">—</span>}
                </td>
                <td>
                  {opp.iscId
                    ? <a href={opp.iscId} target="_blank" rel="noopener noreferrer" className="opportunities-isc-link">ISC</a>
                    : <span className="muted">—</span>}
                </td>
                <td className="opportunities-rationale">
                  {opp.strategicNote || <span className="muted">—</span>}
                </td>
                <td>
                  <select
                    className="inline-select"
                    value={opp.status}
                    onChange={e => handleInlineStatus(opp, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
          {pursuits.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="tfoot-label">
                  {pursuits.length} opportunit{pursuits.length !== 1 ? 'ies' : 'y'}
                </td>
                <td className="num-col tfoot-total font-bold">
                  {fmtCurrency(pursuits.reduce((s, o) => s + (Number(o.signingsValue) || 0), 0))}
                </td>
                <td colSpan={5} />
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
    </div>
  );
}
