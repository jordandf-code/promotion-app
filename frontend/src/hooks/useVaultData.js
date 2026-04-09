// hooks/useVaultData.js
// Document vault: file uploads linked to wins and eminence activities.
// Persisted to PostgreSQL via /api/data/vault.

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SEED_DATA = { documents: [] };

export function useVaultData() {
  const [data, setData]               = useState(SEED_DATA);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);

  useEffect(() => {
    apiGet('vault')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          apiPutMarkClean('vault', serverData);
          setData(serverData);
        } else {
          setData(SEED_DATA);
          apiPut('vault', SEED_DATA);
        }
      })
      .catch(() => setData(SEED_DATA))
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('vault', data);
  }, [data, initialized]);

  function addDocument(fields) {
    const id = uid();
    const document = {
      id,
      uploadedAt: new Date().toISOString(),
      linkedType: 'general',
      linkedId: null,
      description: '',
      tags: [],
      ...fields,
    };
    setData(d => ({ ...d, documents: [...d.documents, document] }));
    return id;
  }

  function updateDocument(id, updates) {
    setData(d => ({
      ...d,
      documents: d.documents.map(doc => doc.id === id ? { ...doc, ...updates } : doc),
    }));
  }

  function removeDocument(id) {
    setData(d => ({
      ...d,
      documents: d.documents.filter(doc => doc.id !== id),
    }));
  }

  return { data, initialized, addDocument, updateDocument, removeDocument };
}
