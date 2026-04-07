// hooks/useScorecardData.js
// State manager for all scorecard data: targets, opportunities, projects, utilization.
// Persisted to PostgreSQL via /api/data/scorecard; migrates from scorecardData_v2 automatically.
//
// Stat computation is delegated to hooks/scorecard/statsHelpers.js (pure, tested).
// Constants and seed data live in hooks/scorecard/.

import { useState, useEffect, useRef } from 'react';
import { uid, emptyMonths, emptyQuarters } from './scorecard/constants.js';
import { SEED_TARGETS, SEED_OPPORTUNITIES, SEED_PROJECTS, SEED_UTILIZATION } from './scorecard/seedData.js';
import { getSalesStats, getRevenueStats, getGPStats, getUtilStats } from './scorecard/statsHelpers.js';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

// Re-export constants so existing imports from 'useScorecardData' keep working.
export { METRIC_KEYS, METRIC_LABELS, MONTH_KEYS, MONTH_LABELS, QUARTER_KEYS, QUARTER_LABELS,
  OPP_STATUSES, PROJECT_STATUSES, qSum, emptyQuarters } from './scorecard/constants.js';

const DEFAULT_DATA = {
  targets:       SEED_TARGETS,
  opportunities: SEED_OPPORTUNITIES,
  projects:      SEED_PROJECTS,
  utilization:   SEED_UTILIZATION,
};

const EMPTY_DATA = {
  targets:       {},
  opportunities: [],
  projects:      [],
  utilization:   {},
};

function loadLocal() {
  try {
    const stored = localStorage.getItem('scorecardData_v2');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useScorecardData() {
  const [data, setData]               = useState(EMPTY_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? DEFAULT_DATA;
    apiGet('scorecard')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('scorecard', serverData);
          setData(serverData);
        } else {
          setData(local);
          apiPut('scorecard', local);
        }
        localStorage.removeItem('scorecardData_v2');
      })
      .catch(() => setData(local))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('scorecard', data);
  }, [data, initialized]);

  // ── Targets ──────────────────────────────────────────────────────────────

  function getTarget(year, metric) {
    return data.targets[year]?.[metric] ?? null;
  }

  function setTarget(year, metric, value) {
    setData(d => ({
      ...d,
      targets: {
        ...d.targets,
        [year]: {
          ...(d.targets[year] ?? {}),
          [metric]: value === '' || value == null ? null : Number(value),
        },
      },
    }));
  }

  // ── Stats (delegates to pure helpers) ────────────────────────────────────

  function getSalesStatsForYear(year)  { return getSalesStats(data.opportunities, data.targets, year); }
  function getRevenueStatsForYear(year){ return getRevenueStats(data.projects, data.targets, year); }
  function getGPStatsForYear(year)     { return getGPStats(data.projects, data.targets, year); }
  function getUtilStatsForYear(year)   { return getUtilStats(data.utilization, data.targets, year); }

  // ── Opportunities ─────────────────────────────────────────────────────────

  function addOpportunity(fields) {
    setData(d => ({ ...d, opportunities: [...d.opportunities, { id: uid(), ...fields }] }));
  }

  function updateOpportunity(id, updates) {
    setData(d => ({
      ...d,
      opportunities: d.opportunities.map(o => o.id === id ? { ...o, ...updates } : o),
    }));
  }

  function removeOpportunity(id) {
    setData(d => ({
      ...d,
      opportunities: d.opportunities.filter(o => o.id !== id),
      projects: d.projects.map(p => p.opportunityId === id ? { ...p, opportunityId: null } : p),
    }));
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  function addProject(fields) {
    setData(d => ({ ...d, projects: [...d.projects, { id: uid(), ...fields }] }));
  }

  function updateProject(id, updates) {
    setData(d => ({
      ...d,
      projects: d.projects.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }

  function removeProject(id) {
    setData(d => ({ ...d, projects: d.projects.filter(p => p.id !== id) }));
  }

  // ── Utilization ───────────────────────────────────────────────────────────

  function setMonthField(year, monthKey, field, value) {
    setData(d => {
      const prev = d.utilization[year] ?? { months: emptyMonths() };
      const prevMonths = prev.months ?? emptyMonths();
      return {
        ...d,
        utilization: {
          ...d.utilization,
          [year]: {
            ...prev,
            months: {
              ...prevMonths,
              [monthKey]: {
                ...(prevMonths[monthKey] ?? {}),
                [field]: value === '' ? '' : Number(value),
              },
            },
          },
        },
      };
    });
  }

  return {
    getTarget,
    setTarget,
    getSalesStats:    getSalesStatsForYear,
    getRevenueStats:  getRevenueStatsForYear,
    getGPStats:       getGPStatsForYear,
    getUtilStats:     getUtilStatsForYear,
    opportunities:    data.opportunities,
    addOpportunity,
    updateOpportunity,
    removeOpportunity,
    projects:         data.projects,
    addProject,
    updateProject,
    removeProject,
    utilization:      data.utilization,
    setMonthField,
    emptyQuarters,
  };
}
