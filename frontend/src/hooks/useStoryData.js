// hooks/useStoryData.js
// Stores the last AI-generated promotion story output.
// Settings (ibmCriteria, careerHistory, anthropicKey) live in useAdminData.
// Persisted to PostgreSQL via /api/data/story.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut } from '../utils/api.js';

function loadLocal() {
  try {
    const stored = localStorage.getItem('storyData_v1');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useStoryData() {
  const [story, setStory]           = useState(null);
  const [initialized, setInitialized] = useState(false);
  const skipSync                    = useRef(false);

  useEffect(() => {
    const local = loadLocal();
    apiGet('story')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          setStory(serverData);
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

  function saveStory(data) { setStory(data); }
  function clearStory()    { setStory(null); }

  return { story, saveStory, clearStory };
}
