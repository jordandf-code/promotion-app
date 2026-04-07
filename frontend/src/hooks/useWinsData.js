// hooks/useWinsData.js
// Wins: title, date, description, impact, tags[], sourceType, sourceId, sourceName.
// sourceType: 'manual' | 'opportunity' | 'goal'
// sourceName: human-readable label saved at creation time (survives source deletion)
// Persisted to PostgreSQL via /api/data/wins; migrates from winsData_v2/v1 automatically.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_WINS = [
  {
    id: 'w1', sourceType: 'opportunity', sourceId: 'opp-1', sourceName: 'Ontario Digital Services renewal',
    title: 'Secured Ontario Digital Services contract renewal',
    date: '2026-03-20',
    description: 'Led the renewal of a $2.1M contract with Ontario Digital Services, retaining a key client through a competitive rebid process.',
    impact: '$2.1M revenue secured; relationship strengthened for Phase 2 expansion',
    tags: ['Revenue', 'Client relationship'],
  },
  {
    id: 'w2', sourceType: 'manual', sourceId: null, sourceName: null,
    title: 'Delivered federal ITSM modernization for City of Toronto',
    date: '2026-02-14',
    description: 'Successfully completed a 6-month engagement modernizing ITSM processes. Delivered on time and 4% under budget.',
    impact: 'Delivery excellence recognized by client DM; led to Phase 2 conversation worth $1.5M',
    tags: ['Delivery', 'Client relationship'],
  },
  {
    id: 'w3', sourceType: 'manual', sourceId: null, sourceName: null,
    title: 'Keynote speaker at Canadian Government Executive forum',
    date: '2026-03-15',
    description: 'Delivered a 25-minute keynote on AI readiness in the Canadian public sector to an audience of 300+ federal and provincial executives.',
    impact: 'IBM brand visibility; 3 follow-up meetings with new federal contacts',
    tags: ['External eminence'],
  },
  {
    id: 'w4', sourceType: 'goal', sourceId: 'goal-3', sourceName: 'Mentor two analysts to promotion',
    title: 'Mentored 2 analysts through promotion to consultant',
    date: '2026-01-30',
    description: 'Two direct reports successfully promoted in the Q1 cycle, both citing mentorship and stretch assignments as key factors.',
    impact: 'Team leadership demonstrated; strengthens case for executive readiness',
    tags: ['Team leadership'],
  },
  {
    id: 'w5', sourceType: 'opportunity', sourceId: 'opp-5', sourceName: 'TBS Digital Modernization',
    title: 'Led winning response to $4M TBS opportunity',
    date: '2025-11-08',
    description: 'Directed proposal strategy and orals preparation for a $4M Treasury Board Secretariat opportunity. Won against 3 competitors.',
    impact: '$4M in new sales; new senior federal relationship established at TBS',
    tags: ['Revenue', 'Client relationship'],
  },
];

function migrateWin(w) {
  return { sourceType: 'manual', sourceId: null, sourceName: null, ...w };
}

function loadLocal() {
  try {
    const v2 = localStorage.getItem('winsData_v2');
    if (v2) return JSON.parse(v2);
    const v1 = localStorage.getItem('winsData_v1');
    if (v1) return JSON.parse(v1).map(migrateWin);
  } catch {}
  return null;
}

export function useWinsData() {
  const [wins, setWins]               = useState([]);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? [];
    apiGet('wins')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('wins', serverData);
          setWins(serverData);
        } else {
          setWins(local);
          apiPut('wins', local);
        }
        localStorage.removeItem('winsData_v2');
        localStorage.removeItem('winsData_v1');
      })
      .catch(() => setWins(local))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('wins', wins);
  }, [wins, initialized]);

  function addWin(fields) {
    const id = uid();
    setWins(w => [{ sourceType: 'manual', sourceId: null, sourceName: null, tags: [], ...fields, id }, ...w]);
    return id;
  }

  function updateWin(id, updates) {
    setWins(w => w.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  function removeWin(id) {
    setWins(w => w.filter(x => x.id !== id));
  }

  function hasWinForSource(sourceId) {
    return wins.some(w => w.sourceId === sourceId);
  }

  return { wins, addWin, updateWin, removeWin, hasWinForSource };
}
