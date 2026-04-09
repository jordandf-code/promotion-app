// hooks/useBrandData.js
// Brand workspace: positioning, key messages, proof points, perception log, visibility goals.
// Persisted to PostgreSQL via /api/data/brand.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = {
  tagline: '',
  positioning: '',
  key_messages: [],
  proof_points: [],
  perception_log: [],
  visibility_goals: [],
};

export function useBrandData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('brand')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('brand', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('brand', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('brand', data);
  }, [data, initialized]);

  function updateBrand(updates) {
    setData(d => ({ ...d, ...updates }));
  }

  function addMessage(fields) {
    const id = uid();
    const message = { id, message: '', category: 'expertise', ...fields };
    setData(d => ({ ...d, key_messages: [...d.key_messages, message] }));
    return id;
  }

  function removeMessage(id) {
    setData(d => ({ ...d, key_messages: d.key_messages.filter(m => m.id !== id) }));
  }

  function addProofPoint(fields) {
    const id = uid();
    const point = { id, claim: '', evidence_type: 'win', evidence_id: null, evidence_summary: '', ...fields };
    setData(d => ({ ...d, proof_points: [...d.proof_points, point] }));
    return id;
  }

  function removeProofPoint(id) {
    setData(d => ({ ...d, proof_points: d.proof_points.filter(p => p.id !== id) }));
  }

  function addPerception(fields) {
    const id = uid();
    const entry = { id, date: new Date().toISOString().slice(0, 10), source: '', perception: '', context: '', ...fields };
    setData(d => ({ ...d, perception_log: [entry, ...d.perception_log] }));
    return id;
  }

  function removePerception(id) {
    setData(d => ({ ...d, perception_log: d.perception_log.filter(e => e.id !== id) }));
  }

  function addVisibilityGoal(fields) {
    const id = uid();
    const goal = { id, goal: '', platform: 'linkedin', target_date: '', status: 'planned', ...fields };
    setData(d => ({ ...d, visibility_goals: [...d.visibility_goals, goal] }));
    return id;
  }

  function updateVisibilityGoal(id, updates) {
    setData(d => ({
      ...d,
      visibility_goals: d.visibility_goals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }

  function removeVisibilityGoal(id) {
    setData(d => ({ ...d, visibility_goals: d.visibility_goals.filter(g => g.id !== id) }));
  }

  return {
    data,
    initialized,
    updateBrand,
    addMessage,
    removeMessage,
    addProofPoint,
    removeProofPoint,
    addPerception,
    removePerception,
    addVisibilityGoal,
    updateVisibilityGoal,
    removeVisibilityGoal,
  };
}
