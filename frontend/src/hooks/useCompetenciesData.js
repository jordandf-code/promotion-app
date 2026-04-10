// hooks/useCompetenciesData.js
// Competency self-assessment: assessments array + competency goals + AI analysis cache.
// Persisted to PostgreSQL via /api/data/competencies.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = {
  framework_version: 'v1',
  assessments: [],
  competency_goals: [],
  ai_analysis: {},
};

export function useCompetenciesData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('competencies')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('competencies', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('competencies', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('competencies', data);
  }, [data, initialized]);

  function addAssessment(fields) {
    const id = uid();
    const assessment = {
      id,
      date: new Date().toISOString().slice(0, 10),
      type: 'self',
      ratings: {},
      overall_notes: '',
      ...fields,
    };
    setData(d => ({ ...d, assessments: [...d.assessments, assessment] }));
    return id;
  }

  function updateAssessment(id, updates) {
    setData(d => ({
      ...d,
      assessments: d.assessments.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }

  function removeAssessment(id) {
    setData(d => ({
      ...d,
      assessments: d.assessments.filter(a => a.id !== id),
    }));
  }

  function addCompetencyGoal(fields) {
    const id = uid();
    const goal = {
      id,
      competency_id: '',
      target_level: 2,
      target_date: '',
      actions: [],
      linked_action_ids: [],
      ...fields,
    };
    setData(d => ({ ...d, competency_goals: [...d.competency_goals, goal] }));
    return id;
  }

  function updateCompetencyGoal(id, updates) {
    setData(d => ({
      ...d,
      competency_goals: d.competency_goals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }

  function removeCompetencyGoal(id) {
    setData(d => ({
      ...d,
      competency_goals: d.competency_goals.filter(g => g.id !== id),
    }));
  }

  function updateAiAnalysis(analysis) {
    setData(d => ({ ...d, ai_analysis: analysis }));
  }

  function updateEvidenceIds(assessmentId, competencyId, evidenceIds) {
    setData(d => ({
      ...d,
      assessments: d.assessments.map(a => {
        if (a.id !== assessmentId) return a;
        return {
          ...a,
          ratings: {
            ...a.ratings,
            [competencyId]: { ...a.ratings[competencyId], evidence_ids: evidenceIds },
          },
        };
      }),
    }));
  }

  return {
    data,
    initialized,
    addAssessment,
    updateAssessment,
    removeAssessment,
    addCompetencyGoal,
    updateCompetencyGoal,
    removeCompetencyGoal,
    updateAiAnalysis,
    updateEvidenceIds,
  };
}
