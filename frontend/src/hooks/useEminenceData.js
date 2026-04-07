// hooks/useEminenceData.js
// Eminence: speaking engagements, publications, panels, awards, etc.
// Single domain 'eminence' stores { activities: [] }.
// Persisted to PostgreSQL via /api/data/eminence.

import { useState, useEffect, useRef, useMemo } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const EMPTY = { activities: [] };

export function useEminenceData() {
  const [data, setData]                = useState(EMPTY);
  const [initialized, setInitialized]  = useState(false);
  const skipSync                       = useRef(false);

  useEffect(() => {
    apiGet('eminence')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          const merged = { ...EMPTY, ...serverData };
          apiPutMarkClean('eminence', merged);
          setData(merged);
        } else {
          apiPutMarkClean('eminence', EMPTY);
        }
      })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const hasSynced = useRef(false);
  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; hasSynced.current = true; return; }
    if (!hasSynced.current && data.activities.length === 0) {
      hasSynced.current = true;
      return;
    }
    hasSynced.current = true;
    apiPut('eminence', data);
  }, [data, initialized]);

  const activities = useMemo(
    () => [...data.activities].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [data.activities],
  );

  function addActivity(fields) {
    const year = fields.date ? new Date(fields.date).getFullYear() : null;
    setData(d => ({ ...d, activities: [...d.activities, { id: uid(), year, ...fields }] }));
  }

  function updateActivity(id, updates) {
    setData(d => ({
      ...d,
      activities: d.activities.map(a => {
        if (a.id !== id) return a;
        const merged = { ...a, ...updates };
        if (updates.date) merged.year = new Date(updates.date).getFullYear();
        return merged;
      }),
    }));
  }

  function removeActivity(id) {
    setData(d => ({ ...d, activities: d.activities.filter(a => a.id !== id) }));
  }

  return { activities, addActivity, updateActivity, removeActivity };
}
