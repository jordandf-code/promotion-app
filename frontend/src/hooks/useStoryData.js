// hooks/useStoryData.js
// Stores AI-generated story output: gap_analysis, polished_narrative, plan_2027.
// Each section is cached independently with its own generated_at timestamp.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

function loadLocal() {
  try {
    const stored = localStorage.getItem('storyData_v1');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function migrateOldFormat(data) {
  if (!data) return null;
  // Old format had { evidenceMap, gaps, narrative, plan, generatedAt }
  // New format has { gap_analysis: { data, generated_at }, ... }
  if (data.evidenceMap || data.narrative) return null; // discard old format
  return data;
}

export function useStoryData() {
  const [story, setStory]           = useState(null);
  const [initialized, setInitialized] = useState(false);
  const skipSync                    = useRef(false);

  useEffect(() => {
    const local = migrateOldFormat(loadLocal());
    apiGet('story')
      .then(serverData => {
        const migrated = migrateOldFormat(serverData);
        if (migrated !== null) {
          skipSync.current = true;
          apiPutMarkClean('story', migrated);
          setStory(migrated);
        } else if (local !== null) {
          setStory(local);
          apiPut('story', local);
        }
        localStorage.removeItem('storyData_v1');
      })
      .catch(() => {
        if (local !== null) setStory(local);
      })
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('story', story);
  }, [story, initialized]);

  function saveStorySection(mode, data, generatedAt, usage) {
    setStory(prev => ({
      ...prev,
      [mode]: { data, generated_at: generatedAt, usage: usage ?? null },
    }));
  }

  function clearStory() { setStory(null); }

  return { story, saveStorySection, clearStory };
}
