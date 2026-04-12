// InfluenceMap.jsx — Strategic People network visualization
// Groups contacts by stakeholder group, shows influence tier + strategic importance,
// and surfaces coverage gaps and stale contacts.

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePeopleData,
  daysSinceContact,
  INFLUENCE_TIERS,
  INFLUENCE_TIER_LABELS,
  INFLUENCE_TIER_COLORS,
  STRATEGIC_IMPORTANCE,
  STRATEGIC_IMPORTANCE_LABELS,
} from '../hooks/usePeopleData.js';
import { useAdminData } from '../hooks/useAdminData.js';

const IMPORTANCE_BORDER = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#2563eb',
  low:      '#6b7280',
};

// Tier badge background colors — lighter fill, colored text
const TIER_BG = {
  'decision-maker': '#fee2e2',
  'influencer':     '#ffedd5',
  'supporter':      '#dbeafe',
  'informer':       '#f1f5f9',
};

export default function InfluenceMap() {
  const { people } = usePeopleData();
  const { stakeholderGroups: platformGroups } = useAdminData();
  const navigate = useNavigate();

  const [tierFilter, setTierFilter]   = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  // Derive the ordered list of groups that appear in the data (plus platform config)
  const allGroups = useMemo(() => {
    const inData = [...new Set(people.map(p => p.stakeholderGroup).filter(Boolean))];
    const ordered = (platformGroups ?? []).map(g => g.label);
    inData.forEach(g => { if (!ordered.includes(g)) ordered.push(g); });
    return ordered;
  }, [people, platformGroups]);

  // Coverage summary: count per influence tier
  const tierCounts = useMemo(() => {
    const counts = {};
    INFLUENCE_TIERS.forEach(t => { counts[t] = 0; });
    people.forEach(p => { if (p.influenceTier && counts[p.influenceTier] !== undefined) counts[p.influenceTier]++; });
    return counts;
  }, [people]);

  // Filtered people
  const filtered = useMemo(() => {
    return people.filter(p => {
      if (tierFilter  && p.influenceTier    !== tierFilter)  return false;
      if (groupFilter && p.stakeholderGroup !== groupFilter) return false;
      return true;
    });
  }, [people, tierFilter, groupFilter]);

  // Group filtered people by stakeholder group
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.stakeholderGroup || 'Ungrouped';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    // Return in platform-configured order, then any extras
    const result = [];
    allGroups.forEach(g => { if (map[g]) result.push([g, map[g]]); });
    if (map['Ungrouped']) result.push(['Ungrouped', map['Ungrouped']]);
    return result;
  }, [filtered, allGroups]);

  const hasFilters = tierFilter || groupFilter;
  const totalCount = people.length;

  function clearFilters() {
    setTierFilter('');
    setGroupFilter('');
  }

  function handleCardClick(person) {
    navigate(`/people?id=${person.id}`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Influence Map</h1>
        <p className="muted" style={{ marginTop: '0.25rem' }}>
          Strategic view of your {totalCount} tracked relationship{totalCount !== 1 ? 's' : ''} by stakeholder group and influence tier.
        </p>
      </div>

      {/* Coverage summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {INFLUENCE_TIERS.map(tier => {
          const count  = tierCounts[tier];
          const isGap  = count === 0;
          const color  = INFLUENCE_TIER_COLORS[tier];
          return (
            <div
              key={tier}
              className="card"
              style={{
                padding: '1rem',
                borderLeft: `4px solid ${color}`,
                cursor: 'pointer',
                opacity: tierFilter && tierFilter !== tier ? 0.5 : 1,
                outline: tierFilter === tier ? `2px solid ${color}` : 'none',
              }}
              onClick={() => setTierFilter(prev => prev === tier ? '' : tier)}
              title={`Filter by ${INFLUENCE_TIER_LABELS[tier]}`}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: isGap ? '#ef4444' : 'var(--text)' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color }}>
                {INFLUENCE_TIER_LABELS[tier]}
              </div>
              {isGap && (
                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>
                  Coverage gap
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <select
          className="form-select"
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          style={{ minWidth: 0, flex: '1 1 160px', maxWidth: '220px' }}
        >
          <option value="">All influence tiers</option>
          {INFLUENCE_TIERS.map(t => (
            <option key={t} value={t}>{INFLUENCE_TIER_LABELS[t]}</option>
          ))}
        </select>

        <select
          className="form-select"
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          style={{ minWidth: 0, flex: '1 1 180px', maxWidth: '260px' }}
        >
          <option value="">All stakeholder groups</option>
          {allGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {hasFilters && (
          <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
            Clear filters
          </button>
        )}

        <span className="muted" style={{ fontSize: '0.85rem', marginLeft: 'auto' }}>
          {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {grouped.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {hasFilters ? 'No contacts match the selected filters.' : 'No contacts yet. Add people in the People tab to see your influence map.'}
        </div>
      ) : (
        grouped.map(([groupName, groupPeople]) => (
          <div key={groupName} className="section" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
              <h2 className="section-title">{groupName}</h2>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                {groupPeople.length} contact{groupPeople.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Grid: 3 columns desktop, 1 column mobile */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
              gap: '0.75rem',
              marginTop: '0.75rem',
            }}>
              {groupPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onClick={() => handleCardClick(person)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PersonCard({ person, onClick }) {
  const days      = daysSinceContact(person);
  const isStale   = days > 30;
  const isNever   = days === Infinity;
  const borderColor = IMPORTANCE_BORDER[person.strategicImportance] || '#e5e7eb';
  const tierColor   = INFLUENCE_TIER_COLORS[person.influenceTier]   || '#64748b';
  const tierBg      = TIER_BG[person.influenceTier]                  || '#f8fafc';

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        cursor: 'pointer',
        padding: '0.875rem 1rem',
        opacity: isStale ? 0.85 : 1,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      {/* Name + stale indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
          {person.name || <span className="muted">Unnamed</span>}
        </div>
        {isStale && (
          <span
            title={isNever ? 'No contact recorded' : `Last contact ${days} days ago`}
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#ef4444',
              background: '#fee2e2',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isNever ? 'No contact' : `${days}d ago`}
          </span>
        )}
      </div>

      {/* Title + Org */}
      {(person.title || person.org) && (
        <div className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
          {[person.title, person.org].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {person.influenceTier && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: tierColor,
            background: tierBg,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            border: `1px solid ${tierColor}30`,
          }}>
            {INFLUENCE_TIER_LABELS[person.influenceTier]}
          </span>
        )}
        {person.strategicImportance && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-muted)',
            background: 'var(--bg-subtle, #f8fafc)',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            border: '1px solid var(--border)',
          }}>
            {STRATEGIC_IMPORTANCE_LABELS[person.strategicImportance]}
          </span>
        )}
        {!isStale && days !== Infinity && (
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border)',
          }}>
            {days === 0 ? 'Today' : `${days}d ago`}
          </span>
        )}
      </div>
    </div>
  );
}
