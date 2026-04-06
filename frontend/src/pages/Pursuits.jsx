// pages/Pursuits.jsx
// CRM-style pipeline view of live opportunities — stage, probability, strategic context.
// Uses the same opportunity data as the Scorecard > Opportunities tab.

import { useState } from 'react';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { fmtDate } from '../data/sampleData.js';
import { useAdminData, DEFAULT_ORIGIN_TYPES } from '../hooks/useAdminData.js';
import OppModal, { STAGES } from '../components/scorecard/OppModal.jsx';
import { StagePip, LogoTypePip, STAGE_COLORS } from '../components/scorecard/OpportunitiesTab.jsx';

const EMPTY_FORM = {
  name: '', client: '', year: new Date().getFullYear(),
  status: 'open', winDate: '', totalValue: '', signingsValue: '',
  stage: 'Qualified', probability: '', expectedClose: '',
  dealType: 'one-time', logoType: 'net-new',
  strategicNote: '', relationshipOrigin: '',
};

export default function Pursuits() {
  const scorecard  = useScorecardData();
  const { fmtCurrency, scorecardYears } = useSettings();
  const { originTypes } = useAdminData();
  const ORIGIN_OPTIONS = originTypes ?? DEFAULT_ORIGIN_TYPES;
  const [stageFilter, setStageFilter] = useState('all');
  const [modal, setModal] = useState(null);

  // Active pursuits = open opportunities (not won/lost)
  const pursuits = scorecard.opportunities
    .filter(o => o.status === 'open')
    .filter(o => stageFilter === 'all' || o.stage === stageFilter)
    .sort((a, b) => {
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
        <h1 className="page-title">Pursuits</h1>
        <div className="page-header-actions">
          <span className="page-count">{allOpen.length} active</span>
          <button className="btn-primary" onClick={openAdd}>+ Add pursuit</button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="pursuits-summary">
        <div className="pursuits-stat">
          <div className="pursuits-stat-value">{fmtCurrency(totalPipeline)}</div>
          <div className="pursuits-stat-label">Total pipeline</div>
        </div>
        <div className="pursuits-stat">
          <div className="pursuits-stat-value">{fmtCurrency(weightedPipeline)}</div>
          <div className="pursuits-stat-label">Weighted pipeline</div>
        </div>
        <div className="pursuits-stat">
          <div className="pursuits-stat-value">{allOpen.filter(o => o.logoType === 'net-new').length}</div>
          <div className="pursuits-stat-label">Net new logos</div>
        </div>
        <div className="pursuits-stat">
          <div className="pursuits-stat-value">{allOpen.filter(o => o.logoType === 'expansion').length}</div>
          <div className="pursuits-stat-label">Expansions</div>
        </div>
      </div>

      {/* ── Stage funnel ── */}
      <div className="pursuits-funnel">
        {stageCounts.map(({ stage, count, value }) => (
          <div
            key={stage}
            className={`pursuits-funnel-stage ${stageFilter === stage ? 'pursuits-funnel-stage--active' : ''}`}
            onClick={() => setStageFilter(s => s === stage ? 'all' : stage)}
            style={{ '--stage-color': STAGE_COLORS[stage] }}
          >
            <div className="pursuits-funnel-count">{count}</div>
            <div className="pursuits-funnel-name">{stage}</div>
            {value > 0 && <div className="pursuits-funnel-value">{fmtCurrency(value)}</div>}
          </div>
        ))}
        {stageFilter !== 'all' && (
          <button className="pursuits-funnel-clear" onClick={() => setStageFilter('all')}>
            Clear filter
          </button>
        )}
      </div>

      {/* ── Pipeline table ── */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pursuit</th>
              <th>Client</th>
              <th>Stage</th>
              <th className="num-col">Prob.</th>
              <th className="num-col">Signings</th>
              <th>Expected close</th>
              <th>Type</th>
              <th>Origin</th>
              <th>Strategic rationale</th>
              <th className="action-col" />
            </tr>
          </thead>
          <tbody>
            {pursuits.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty">
                  {allOpen.length === 0
                    ? 'No active pursuits. Add one above or open an opportunity in the Scorecard.'
                    : 'No pursuits match the current filter.'}
                </td>
              </tr>
            ) : pursuits.map(opp => (
              <tr key={opp.id}>
                <td className="td-primary">{opp.name}</td>
                <td>{opp.client}</td>
                <td><StagePip stage={opp.stage} /></td>
                <td className="num-col">
                  {opp.probability != null ? `${opp.probability}%` : <span className="muted">—</span>}
                </td>
                <td className="num-col font-bold">{fmtCurrency(Number(opp.signingsValue) || 0)}</td>
                <td>{opp.expectedClose ? fmtDate(opp.expectedClose) : <span className="muted">—</span>}</td>
                <td><LogoTypePip logoType={opp.logoType} /></td>
                <td>
                  {opp.relationshipOrigin
                    ? <span className="pursuits-origin">{originLabel(opp.relationshipOrigin)}</span>
                    : <span className="muted">—</span>}
                </td>
                <td className="pursuits-rationale">
                  {opp.strategicNote || <span className="muted">—</span>}
                </td>
                <td className="action-col">
                  <button className="row-btn" onClick={() => openEdit(opp)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
          {pursuits.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="tfoot-label">
                  {pursuits.length} pursuit{pursuits.length !== 1 ? 's' : ''}
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
