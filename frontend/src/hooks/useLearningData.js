// hooks/useLearningData.js
// Learning: certifications (with expiry tracking) and courses (training log).
// Single domain 'learning' stores { certifications: [], courses: [] }.
// Persisted to PostgreSQL via /api/data/learning.

import { useState, useEffect, useRef, useMemo } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ── Status constants ── */

export const CERT_STATUSES = ['planned', 'in_progress', 'earned', 'expired'];
export const CERT_STATUS_LABELS = {
  planned:     'Planned',
  in_progress: 'In progress',
  earned:      'Earned',
  expired:     'Expired',
};

export const COURSE_STATUSES = ['planned', 'in_progress', 'completed'];
export const COURSE_STATUS_LABELS = {
  planned:     'Planned',
  in_progress: 'In progress',
  completed:   'Completed',
};

/* ── Expiry helpers ── */

const DAY_MS = 86400000;

export function isExpired(cert) {
  if (!cert.expiryDate) return false;
  return new Date(cert.expiryDate) < new Date(new Date().toISOString().slice(0, 10));
}

export function isExpiringSoon(cert) {
  if (!cert.expiryDate || isExpired(cert)) return false;
  const diff = new Date(cert.expiryDate) - new Date(new Date().toISOString().slice(0, 10));
  return diff <= 90 * DAY_MS;
}

export function effectiveStatus(cert) {
  if (cert.status === 'earned' && isExpired(cert)) return 'expired';
  return cert.status;
}

/* ── Sort helpers ── */

const CERT_STATUS_ORDER = { earned: 0, in_progress: 1, planned: 2, expired: 3 };

export function sortCerts(certs) {
  return [...certs].sort((a, b) => {
    const sa = CERT_STATUS_ORDER[effectiveStatus(a)] ?? 9;
    const sb = CERT_STATUS_ORDER[effectiveStatus(b)] ?? 9;
    if (sa !== sb) return sa - sb;
    // Within same status, sort by dateEarned descending (nulls last)
    const da = a.dateEarned || '';
    const db = b.dateEarned || '';
    return db.localeCompare(da);
  });
}

const COURSE_STATUS_ORDER = { completed: 0, in_progress: 1, planned: 2 };

export function sortCourses(courses) {
  return [...courses].sort((a, b) => {
    const sa = COURSE_STATUS_ORDER[a.status] ?? 9;
    const sb = COURSE_STATUS_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = a.dateCompleted || '';
    const db = b.dateCompleted || '';
    return db.localeCompare(da);
  });
}

/* ── Default shape ── */

const EMPTY = { certifications: [], courses: [] };

/* ── Hook ── */

export function useLearningData() {
  const [data, setData]                = useState(EMPTY);
  const [initialized, setInitialized]  = useState(false);
  const skipSync                       = useRef(false);

  useEffect(() => {
    apiGet('learning')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          const merged = { ...EMPTY, ...serverData };
          apiPutMarkClean('learning', merged);
          setData(merged);
        } else {
          apiPutMarkClean('learning', EMPTY);
        }
      })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const hasSynced = useRef(false);
  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; hasSynced.current = true; return; }
    // Don't PUT the empty default on first init — only sync after user changes
    if (!hasSynced.current && data.certifications.length === 0 && data.courses.length === 0) {
      hasSynced.current = true;
      return;
    }
    hasSynced.current = true;
    apiPut('learning', data);
  }, [data, initialized]);

  /* ── Derived sorted arrays ── */

  const certifications = useMemo(() => sortCerts(data.certifications), [data.certifications]);
  const courses        = useMemo(() => sortCourses(data.courses), [data.courses]);

  /* ── Certification CRUD ── */

  function addCert(fields) {
    setData(d => ({ ...d, certifications: [...d.certifications, { id: uid(), ...fields }] }));
  }

  function updateCert(id, updates) {
    setData(d => ({
      ...d,
      certifications: d.certifications.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }

  function removeCert(id) {
    setData(d => ({ ...d, certifications: d.certifications.filter(c => c.id !== id) }));
  }

  /* ── Course CRUD ── */

  function addCourse(fields) {
    setData(d => ({ ...d, courses: [...d.courses, { id: uid(), ...fields }] }));
  }

  function updateCourse(id, updates) {
    setData(d => ({
      ...d,
      courses: d.courses.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }

  function removeCourse(id) {
    setData(d => ({ ...d, courses: d.courses.filter(c => c.id !== id) }));
  }

  return {
    certifications, courses,
    addCert, updateCert, removeCert,
    addCourse, updateCourse, removeCourse,
  };
}
