// hooks/useGoalsData.js
// Goals: title, targetDate, status, notes, isGate.
// The three 2026 gate goals are seeded on first use.
// Persisted to PostgreSQL via /api/data/goals.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const STATUSES = ['not_started', 'in_progress', 'done'];
export const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done:        'Done',
};

export function nextStatus(current) {
  const idx = STATUSES.indexOf(current);
  return STATUSES[(idx + 1) % STATUSES.length];
}

const SEED_GOALS = [
  {
    id: 'gate-1', isGate: true, status: 'in_progress',
    title: 'Hit all 2026 performance targets',
    targetDate: '2026-12-31',
    notes: 'Sales, Revenue, GP, and Utilization all on track by year-end.',
  },
  {
    id: 'gate-2', isGate: true, status: 'not_started',
    title: 'Complete all IBM training requirements',
    targetDate: '2026-12-31',
    notes: 'Need to confirm which courses are required for Partner candidacy.',
  },
  {
    id: 'gate-3', isGate: true, status: 'not_started',
    title: 'Finish 2026 rated as a top performer',
    targetDate: '2026-12-31',
    notes: 'Performance rating determined in Q1 2027 review.',
  },
  {
    id: 'goal-4', isGate: false, status: 'in_progress',
    title: 'Build executive sponsor network in Ottawa',
    targetDate: '2026-09-30',
    notes: 'Targeting 3 senior sponsors at TBS, DND, and SSC.',
  },
  {
    id: 'goal-5', isGate: false, status: 'done',
    title: 'Deliver a keynote or panel at an industry event',
    targetDate: '2026-03-15',
    notes: 'Presented at Canadian Government Executive forum in March.',
  },
  {
    id: 'goal-6', isGate: false, status: 'in_progress',
    title: 'Publish 2 IBM thought leadership pieces',
    targetDate: '2026-10-31',
    notes: 'One draft in progress on cloud migration for public sector.',
  },
];

function loadLocal() {
  try {
    const stored = localStorage.getItem('goalsData_v1');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useGoalsData() {
  const [goals, setGoals]             = useState([]);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? [];
    apiGet('goals')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('goals', serverData);
          setGoals(serverData);
        } else {
          setGoals(local);
          apiPut('goals', local);
        }
        localStorage.removeItem('goalsData_v1');
      })
      .catch(() => setGoals(local))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('goals', goals);
  }, [goals, initialized]);

  function addGoal(fields) {
    setGoals(g => [...g, { id: uid(), isGate: false, ...fields }]);
  }

  function updateGoal(id, updates) {
    setGoals(g => g.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  function removeGoal(id) {
    setGoals(g => g.filter(x => x.id !== id));
  }

  function cycleStatus(id) {
    setGoals(g => g.map(x => x.id === id ? { ...x, status: nextStatus(x.status) } : x));
  }

  return { goals, addGoal, updateGoal, removeGoal, cycleStatus };
}
