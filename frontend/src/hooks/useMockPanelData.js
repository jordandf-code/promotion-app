// hooks/useMockPanelData.js
// Mock panel sessions: AI-driven promotion panel practice.
// Persisted to PostgreSQL via /api/data/mock_panel.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = {
  sessions: [],
};

export function useMockPanelData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('mock_panel')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('mock_panel', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('mock_panel', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('mock_panel', data);
  }, [data, initialized]);

  function addSession(session) {
    const id = uid();
    const newSession = { id, ...session };
    setData(d => ({ ...d, sessions: [newSession, ...d.sessions] }));
    return id;
  }

  function updateSession(id, updates) {
    setData(d => ({
      ...d,
      sessions: d.sessions.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }

  function getSession(id) {
    return data.sessions.find(s => s.id === id) ?? null;
  }

  return {
    data,
    initialized,
    addSession,
    updateSession,
    getSession,
  };
}
