// hooks/useActionsData.js
// Action items: title, dueDate, done, linkedGoalIds (many-to-many with goals).
// Persisted to PostgreSQL via /api/data/actions.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_ACTIONS = [
  { id: 'a1', title: 'Schedule Q2 check-in with Lisa Chen (VP sponsor)', dueDate: '2026-03-31', done: false, linkedGoalIds: [] },
  { id: 'a2', title: 'Submit Q1 utilization hours in the system',          dueDate: '2026-04-01', done: false, linkedGoalIds: ['gate-1'] },
  { id: 'a3', title: 'Follow up with Ahmed Malik on TBS contract discussion', dueDate: '2026-04-10', done: false, linkedGoalIds: [] },
  { id: 'a4', title: 'Review IBM Partner criteria with Marcus Thompson',    dueDate: '2026-04-15', done: false, linkedGoalIds: ['gate-2'] },
  { id: 'a5', title: 'Draft eminence article: AI in public sector procurement', dueDate: '2026-04-30', done: false, linkedGoalIds: ['goal-6'] },
  { id: 'a6', title: 'Register for IBM Leadership Academy (Q3 cohort)',    dueDate: '2026-05-01', done: false, linkedGoalIds: ['gate-2'] },
  { id: 'a7', title: 'Update wins log after Ontario contract close',        dueDate: '2026-03-25', done: true,  linkedGoalIds: ['gate-1'] },
];

function loadLocal() {
  try {
    const stored = localStorage.getItem('actionsData_v2');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useActionsData() {
  const [actions, setActions]         = useState([]);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? [];
    apiGet('actions')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          setActions(serverData);
        } else {
          setActions(local);
          apiPut('actions', local);
        }
        localStorage.removeItem('actionsData_v2');
      })
      .catch(() => setActions(local))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('actions', actions);
  }, [actions, initialized]);

  function addAction(fields) {
    const id = uid();
    setActions(a => [...a, { done: false, linkedGoalIds: [], ...fields, id }]);
    return id;
  }

  function updateAction(id, updates) {
    setActions(a => a.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  function removeAction(id) {
    setActions(a => a.filter(x => x.id !== id));
  }

  function toggleDone(id) {
    setActions(a => a.map(x => x.id === id ? { ...x, done: !x.done } : x));
  }

  function linkToGoal(actionId, goalId) {
    setActions(a => a.map(x =>
      x.id === actionId && !x.linkedGoalIds.includes(goalId)
        ? { ...x, linkedGoalIds: [...x.linkedGoalIds, goalId] }
        : x
    ));
  }

  function unlinkFromGoal(actionId, goalId) {
    setActions(a => a.map(x =>
      x.id === actionId
        ? { ...x, linkedGoalIds: x.linkedGoalIds.filter(id => id !== goalId) }
        : x
    ));
  }

  return { actions, addAction, updateAction, removeAction, toggleDone, linkToGoal, unlinkFromGoal };
}
