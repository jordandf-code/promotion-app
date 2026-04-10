// hooks/usePackageData.js
// Promotion package workspace: assembled + polished promotion case packages.
// Persisted to PostgreSQL via /api/data/promotion_package.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = { packages: [] };

export function usePackageData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('promotion_package')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('promotion_package', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('promotion_package', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('promotion_package', data);
  }, [data, initialized]);

  function addPackage(pkg) {
    const id = uid();
    const newPkg = { id, created_at: new Date().toISOString(), status: 'draft', ...pkg };
    setData(d => ({ ...d, packages: [newPkg, ...d.packages] }));
    return id;
  }

  function updatePackage(id, updates) {
    setData(d => ({
      ...d,
      packages: d.packages.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }

  function getPackage(id) {
    return data.packages.find(p => p.id === id) ?? null;
  }

  return {
    data,
    initialized,
    addPackage,
    updatePackage,
    getPackage,
  };
}
