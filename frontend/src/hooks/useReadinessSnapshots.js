// hooks/useReadinessSnapshots.js
// Persists daily readiness-score snapshots to /api/data/readiness.
// Auto-captures one snapshot per day; exposes takeSnapshot() for manual saves.

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const DOMAIN = 'readiness';
const MAX_SNAPSHOTS = 365;
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeSnapshot(readiness) {
  const dims = {};
  for (const [key, dim] of Object.entries(readiness.dimensions)) {
    dims[key] = dim.score;
  }
  return {
    id: uid(),
    date: todayISO(),
    overall: readiness.overall,
    dimensions: dims,
  };
}

const EMPTY = { snapshots: [], lastAutoDate: null };

export function useReadinessSnapshots(readiness) {
  const [data, setData]               = useState(EMPTY);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);
  const autoFired                     = useRef(false);

  // ── Load from server ──
  useEffect(() => {
    apiGet(DOMAIN)
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean(DOMAIN, serverData);
          setData(serverData);
        }
      })
      .catch(e => console.warn('Failed to load readiness snapshots:', e.message))
      .finally(() => setInitialized(true));
  }, []);

  // ── Persist on change ──
  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut(DOMAIN, data);
  }, [data, initialized]);

  // ── Auto-snapshot (once per day, after init + readiness available) ──
  useEffect(() => {
    if (!initialized || autoFired.current) return;
    if (readiness == null || readiness.overall == null) return;
    const today = todayISO();
    if (data.lastAutoDate === today) return;
    autoFired.current = true;
    setData(prev => {
      const snap = makeSnapshot(readiness);
      const filtered = prev.snapshots.filter(s => s.date !== today);
      const updated = [...filtered, snap]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-MAX_SNAPSHOTS);
      return { snapshots: updated, lastAutoDate: today };
    });
  }, [initialized, readiness, data.lastAutoDate]);

  // ── Manual snapshot ──
  const takeSnapshot = useCallback(() => {
    if (readiness == null || readiness.overall == null) return;
    const today = todayISO();
    setData(prev => {
      const snap = makeSnapshot(readiness);
      const filtered = prev.snapshots.filter(s => s.date !== today);
      const updated = [...filtered, snap]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-MAX_SNAPSHOTS);
      return { ...prev, snapshots: updated, lastAutoDate: today };
    });
  }, [readiness]);

  // ── Delete snapshot ──
  const deleteSnapshot = useCallback((id) => {
    setData(prev => ({
      ...prev,
      snapshots: prev.snapshots.filter(s => s.id !== id),
    }));
  }, []);

  return {
    snapshots: data.snapshots,
    takeSnapshot,
    deleteSnapshot,
  };
}
