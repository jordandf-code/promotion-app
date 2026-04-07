// hooks/useEminenceData.js
// Eminence: speaking engagements, publications, panels, awards, etc.
// Single domain 'eminence' stores { activities: [] }.
// Persisted to PostgreSQL via /api/data/eminence.

import { useState, useEffect, useRef, useMemo } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_EMINENCE = {
  activities: [
    {
      id: 'em-1', title: 'Keynote: AI Readiness in Canadian Public Sector',
      type: 'speaking', date: '2026-03-15', venue: 'Canadian Government Executive Forum',
      audience: 'Federal and provincial executives', reach: '300+',
      description: '25-minute keynote on AI adoption strategies for government digital transformation.',
      tags: ['AI', 'Public Sector'], year: 2026,
    },
    {
      id: 'em-2', title: 'Panel: Digital Modernization in Federal Government',
      type: 'panel', date: '2025-11-20', venue: 'Ottawa Tech Summit',
      audience: 'CIOs and IT directors', reach: '150',
      description: 'Panelist discussing challenges and opportunities in federal IT modernization.',
      tags: ['Digital Transformation'], year: 2025,
    },
    {
      id: 'em-3', title: 'Article: Cloud Strategy for Provincial Governments',
      type: 'publication', date: '2025-09-10', venue: 'IT World Canada',
      audience: 'Public sector IT leaders', reach: '5000+ readers',
      description: 'Authored article on hybrid cloud strategies for Canadian provincial government workloads.',
      tags: ['Cloud', 'Public Sector'], year: 2025,
    },
    {
      id: 'em-4', title: 'IBM Think Canada — Internal Presentation',
      type: 'internal-ibm', date: '2026-02-05', venue: 'IBM Think Canada',
      audience: 'IBM Canada leadership', reach: '80',
      description: 'Presented public sector wins and pipeline strategy to IBM Canada executive team.',
      tags: ['Internal'], year: 2026,
    },
  ],
};

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
          setData(SEED_EMINENCE);
          apiPut('eminence', SEED_EMINENCE);
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
