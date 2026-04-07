// hooks/usePeopleData.js
// People: name, title, org, type, email, phone, need, touchpoints[], plannedTouchpoints[].
// lastContact is derived from the most recent touchpoint — never stored directly.
// Persisted to PostgreSQL via /api/data/people.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function lastContactDate(person) {
  if (!person.touchpoints?.length) return null;
  return [...person.touchpoints].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}

export function daysSinceContact(person) {
  const date = lastContactDate(person);
  if (!date) return Infinity;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const SEED_PEOPLE = [
  {
    id: 'per-1', name: 'Lisa Chen', title: 'VP, Public Sector', org: 'IBM Canada',
    type: 'Champion', email: '', phone: '',
    need: 'Champion my Partner nomination with the senior leadership team',
    touchpoints: [
      { id: 'tp-1a', date: '2026-03-18', note: 'Q1 check-in — discussed nomination timeline and what she needs from me this year' },
    ],
    plannedTouchpoints: [],
  },
  {
    id: 'per-2', name: 'Ahmed Malik', title: 'Director General, Digital Services', org: 'Treasury Board Secretariat',
    type: 'Supporter', email: '', phone: '',
    need: 'Decision authority on $4M contract renewal discussion',
    touchpoints: [
      { id: 'tp-2a', date: '2026-02-28', note: 'Intro meeting following TBS Digital Modernization close — discussed renewal scope' },
    ],
    plannedTouchpoints: [],
  },
  {
    id: 'per-3', name: 'Sarah Park', title: 'Director, Technology Enablement', org: 'City of Toronto',
    type: 'Client', email: '', phone: '',
    need: 'Expand engagement into Phase 2 of ITSM modernization',
    touchpoints: [
      { id: 'tp-3a', date: '2026-03-30', note: 'Project close-out review — strong satisfaction, opened door to Phase 2 conversation' },
    ],
    plannedTouchpoints: [],
  },
  {
    id: 'per-4', name: 'Marcus Thompson', title: 'Partner, Public Sector', org: 'IBM Canada',
    type: 'Peer', email: '', phone: '',
    need: 'Mentorship and nomination support from an existing Partner',
    touchpoints: [
      { id: 'tp-4a', date: '2026-03-22', note: 'Lunch — reviewed IBM Partner criteria and gaps in my current profile' },
    ],
    plannedTouchpoints: [],
  },
  {
    id: 'per-5', name: 'Diane Lefebvre', title: 'ADM, Shared Services Canada', org: 'Government of Canada',
    type: 'Supporter', email: '', phone: '',
    need: 'Long-term relationship for future SSC opportunities',
    touchpoints: [
      { id: 'tp-5a', date: '2026-01-15', note: 'Industry event — brief introduction, agreed to follow up in Q2' },
    ],
    plannedTouchpoints: [],
  },
];

function loadLocal() {
  try {
    const stored = localStorage.getItem('peopleData_v1');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function usePeopleData() {
  const [people, setPeople]           = useState([]);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? [];
    apiGet('people')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('people', serverData);
          setPeople(serverData);
        } else {
          setPeople(local);
          apiPut('people', local);
        }
        localStorage.removeItem('peopleData_v1');
      })
      .catch(() => setPeople(local))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('people', people);
  }, [people, initialized]);

  function addPerson(fields) {
    setPeople(p => [...p, { id: uid(), touchpoints: [], plannedTouchpoints: [], ...fields }]);
  }

  function updatePerson(id, updates) {
    setPeople(p => p.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  function removePerson(id) {
    setPeople(p => p.filter(x => x.id !== id));
  }

  function addTouchpoint(personId, fields) {
    setPeople(p => p.map(x =>
      x.id === personId
        ? { ...x, touchpoints: [{ id: uid(), ...fields }, ...x.touchpoints] }
        : x
    ));
  }

  function removeTouchpoint(personId, touchpointId) {
    setPeople(p => p.map(x =>
      x.id === personId
        ? { ...x, touchpoints: x.touchpoints.filter(t => t.id !== touchpointId) }
        : x
    ));
  }

  function addPlannedTouchpoint(personId, fields) {
    setPeople(p => p.map(x =>
      x.id === personId
        ? { ...x, plannedTouchpoints: [...(x.plannedTouchpoints || []), { id: uid(), ...fields }] }
        : x
    ));
  }

  function removePlannedTouchpoint(personId, plannedId) {
    setPeople(p => p.map(x =>
      x.id === personId
        ? { ...x, plannedTouchpoints: (x.plannedTouchpoints || []).filter(t => t.id !== plannedId) }
        : x
    ));
  }

  // Converts a planned touchpoint into a real one.
  // date/note override the planned values (from the confirmation form).
  function logPlannedTouchpoint(personId, plannedId, { date, note } = {}) {
    setPeople(p => p.map(x => {
      if (x.id !== personId) return x;
      const pt = (x.plannedTouchpoints || []).find(t => t.id === plannedId);
      if (!pt) return x;
      return {
        ...x,
        plannedTouchpoints: (x.plannedTouchpoints || []).filter(t => t.id !== plannedId),
        touchpoints: [{ id: uid(), date: date || pt.date, note: note || pt.note || '' }, ...x.touchpoints],
      };
    }));
  }

  return {
    people,
    addPerson, updatePerson, removePerson,
    addTouchpoint, removeTouchpoint,
    addPlannedTouchpoint, removePlannedTouchpoint, logPlannedTouchpoint,
  };
}
