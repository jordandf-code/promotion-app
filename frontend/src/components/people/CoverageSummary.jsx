// components/people/CoverageSummary.jsx
// Collapsible coverage analysis: stakeholder groups × influence tiers.
// Highlights gaps where a group has no decision-maker or influencer.

import { useState } from 'react';
import { INFLUENCE_TIERS, INFLUENCE_TIER_LABELS, INFLUENCE_TIER_COLORS } from '../../hooks/usePeopleData.js';

export default function CoverageSummary({ people }) {
  const [open, setOpen] = useState(false);

  // Collect all stakeholder groups that have at least one person
  const groups = [...new Set(people.map(p => p.stakeholderGroup).filter(Boolean))].sort();

  if (groups.length === 0) return null;

  // Build matrix: group → tier → count
  const matrix = {};
  for (const g of groups) {
    matrix[g] = {};
    for (const t of INFLUENCE_TIERS) matrix[g][t] = 0;
  }
  for (const p of people) {
    if (p.stakeholderGroup && p.influenceTier && matrix[p.stakeholderGroup]) {
      matrix[p.stakeholderGroup][p.influenceTier]++;
    }
  }

  // Gap detection: group has no decision-maker AND no influencer
  function groupStatus(group) {
    const dm = matrix[group]['decision-maker'] || 0;
    const inf = matrix[group]['influencer'] || 0;
    if (dm > 0 && inf > 0) return 'covered';
    if (dm > 0 || inf > 0) return 'thin';
    return 'gap';
  }

  const statusColors = {
    covered: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Covered' },
    thin:    { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Thin' },
    gap:     { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Gap' },
  };

  const gapCount = groups.filter(g => groupStatus(g) === 'gap').length;
  const thinCount = groups.filter(g => groupStatus(g) === 'thin').length;

  return (
    <div className="coverage-summary">
      <button className="coverage-summary-toggle" onClick={() => setOpen(o => !o)}>
        <span>{open ? '▾' : '▸'} Stakeholder coverage</span>
        <span className="coverage-summary-stats">
          {gapCount > 0 && <span className="coverage-stat coverage-stat--gap">{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>}
          {thinCount > 0 && <span className="coverage-stat coverage-stat--thin">{thinCount} thin</span>}
          {gapCount === 0 && thinCount === 0 && <span className="coverage-stat coverage-stat--good">All covered</span>}
        </span>
      </button>

      {open && (
        <div className="coverage-grid">
          {groups.map(group => {
            const status = groupStatus(group);
            const sc = statusColors[status];
            return (
              <div key={group} className="coverage-card" style={{ borderLeft: `3px solid ${sc.border}` }}>
                <div className="coverage-card-header">
                  <span className="coverage-card-group">{group}</span>
                  <span className="coverage-card-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                <div className="coverage-card-tiers">
                  {INFLUENCE_TIERS.map(tier => {
                    const count = matrix[group][tier];
                    return (
                      <span key={tier} className="coverage-tier" style={{
                        color: count > 0 ? INFLUENCE_TIER_COLORS[tier] : '#cbd5e1',
                      }}>
                        {INFLUENCE_TIER_LABELS[tier]}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
