// hooks/useReflectionsData.js
// Weekly reflections: check-ins array + AI synthesis cache.
// Persisted to PostgreSQL via /api/data/reflections.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = { checkins: [], ai_synthesis: {} };

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function useReflectionsData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('reflections')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('reflections', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('reflections', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('reflections', data);
  }, [data, initialized]);

  function addCheckin(fields) {
    const id = uid();
    const checkin = {
      id,
      week_start: getMonday(),
      submitted_at: new Date().toISOString(),
      biggest_win_logged: false,
      next_week_action_id: null,
      ...fields,
    };
    setData(d => ({ ...d, checkins: [...d.checkins, checkin] }));
    return id;
  }

  function updateCheckin(id, updates) {
    setData(d => ({
      ...d,
      checkins: d.checkins.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }

  function removeCheckin(id) {
    setData(d => ({
      ...d,
      checkins: d.checkins.filter(c => c.id !== id),
    }));
  }

  function updateSynthesis(synthesis) {
    setData(d => ({ ...d, ai_synthesis: synthesis }));
  }

  return { data, initialized, addCheckin, updateCheckin, removeCheckin, updateSynthesis };
}

export { getMonday };
