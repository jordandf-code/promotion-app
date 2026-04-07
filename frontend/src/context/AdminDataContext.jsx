// context/AdminDataContext.jsx
// Single shared instance of admin data — shared across Layout, Admin, and all feature hooks.
// Replaces the per-component hook instances so changes in Admin reflect in the sidebar instantly.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

export const COLOR_PALETTE = [
  '#1d4ed8', '#15803d', '#b45309', '#b91c1c',
  '#7c3aed', '#0f766e', '#c2410c', '#64748b',
];

export const DEFAULT_NAV_ORDER = [
  '/', '/scorecard', '/pursuits', '/goals', '/people', '/wins', '/eminence',
  '/actions', '/learning', '/story', '/calendar', '/sharing', '/admin',
];

const DEFAULT_RELATIONSHIP_TYPES = [
  { label: 'Champion', color: '#7c3aed' },
  { label: 'Supporter', color: '#0040a0' },
  { label: 'Peer',      color: '#64748b' },
  { label: 'Client',    color: '#0f766e' },
];

const DEFAULT_WIN_TAGS = [
  { label: 'Revenue',             color: '#15803d' },
  { label: 'Client relationship', color: '#1d4ed8' },
  { label: 'Delivery',            color: '#7c3aed' },
  { label: 'Team leadership',     color: '#c2410c' },
  { label: 'Internal eminence',   color: '#0040a0' },
  { label: 'External eminence',   color: '#0f766e' },
];

export const DEFAULT_DEAL_TYPES = [
  { value: 'one-time',   label: 'One-time engagement' },
  { value: 'multi-year', label: 'Multi-year / renewal potential' },
];

export const DEFAULT_LOGO_TYPES = [
  { value: 'net-new',   label: 'Net new logo' },
  { value: 'expansion', label: 'Expansion / renewal' },
];

export const DEFAULT_ORIGIN_TYPES = [
  { value: 'cold-outreach',   label: 'Cold outreach' },
  { value: 'referral',        label: 'Referral' },
  { value: 'eminence',        label: 'Eminence / thought leadership' },
  { value: 'existing-client', label: 'Existing client' },
];

export const DEFAULT_EMINENCE_TYPES = [
  { value: 'speaking',     label: 'Speaking' },
  { value: 'publication',  label: 'Publication' },
  { value: 'media',        label: 'Media' },
  { value: 'panel',        label: 'Panel' },
  { value: 'award',        label: 'Award' },
  { value: 'internal-ibm', label: 'Internal IBM' },
  { value: 'community',    label: 'Community' },
  { value: 'other',        label: 'Other' },
];

export const DEFAULT_PIPELINE_STAGES = [
  { label: 'Identified', color: '#64748b' },
  { label: 'Qualified',  color: '#2563eb' },
  { label: 'Proposed',   color: '#7c3aed' },
  { label: 'Verbal',     color: '#d97706' },
  { label: 'Closed',     color: '#15803d' },
];

const DEFAULTS = {
  relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
  winTags:           DEFAULT_WIN_TAGS,
  dealTypes:         DEFAULT_DEAL_TYPES,
  logoTypes:         DEFAULT_LOGO_TYPES,
  originTypes:       DEFAULT_ORIGIN_TYPES,
  eminenceTypes:     DEFAULT_EMINENCE_TYPES,
  pipelineStages:    DEFAULT_PIPELINE_STAGES,
  ibmCriteria:       '',
  careerHistory:     '',
  anthropicKey:      '',
  navOrder:          DEFAULT_NAV_ORDER,
  bottomBarTabs:     null,
  readinessWeights:  null,
};

function migrateFromV1(v1data) {
  const defaultColorMap = Object.fromEntries(DEFAULT_RELATIONSHIP_TYPES.map(t => [t.label, t.color]));
  return {
    ...DEFAULTS,
    relationshipTypes: (v1data.relationshipTypes ?? []).map(r =>
      typeof r === 'string' ? { label: r, color: defaultColorMap[r] ?? '#64748b' } : r
    ),
  };
}

function loadLocal() {
  try {
    const v2 = localStorage.getItem('adminData_v2');
    if (v2) return { ...DEFAULTS, ...JSON.parse(v2) };
    const v1 = localStorage.getItem('adminData_v1');
    if (v1) return migrateFromV1(JSON.parse(v1));
  } catch {}
  return null;
}

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const [adminData, setAdminData]     = useState(DEFAULTS);
  const [initialized, setInitialized] = useState(false);
  const skipSync                      = useRef(false);
  const serverLoaded                  = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? DEFAULTS;
    apiGet('admin')
      .then(serverData => {
        serverLoaded.current = true;
        if (serverData !== null) {
          skipSync.current = true;
          const merged = { ...DEFAULTS, ...serverData };
          apiPutMarkClean('admin', merged);
          setAdminData(merged);
        } else {
          setAdminData(local);
          apiPut('admin', local);
        }
        localStorage.removeItem('adminData_v2');
        localStorage.removeItem('adminData_v1');
      })
      .catch(() => {
        // Server unreachable — use local/defaults for display but do NOT sync
        // back to the server, as that would overwrite real data with empty defaults.
        setAdminData(local);
      })
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    if (!serverLoaded.current) return; // never write defaults from a failed load
    apiPut('admin', adminData);
  }, [adminData, initialized]);

  function setRelationshipTypes(types)  { setAdminData(d => ({ ...d, relationshipTypes: types })); }
  function setWinTags(tags)             { setAdminData(d => ({ ...d, winTags: tags })); }
  function setDealTypes(types)          { setAdminData(d => ({ ...d, dealTypes: types })); }
  function setLogoTypes(types)          { setAdminData(d => ({ ...d, logoTypes: types })); }
  function setOriginTypes(types)        { setAdminData(d => ({ ...d, originTypes: types })); }
  function setEminenceTypes(types)      { setAdminData(d => ({ ...d, eminenceTypes: types })); }
  function setPipelineStages(stages)    { setAdminData(d => ({ ...d, pipelineStages: stages })); }
  function setIbmCriteria(text)         { setAdminData(d => ({ ...d, ibmCriteria: text })); }
  function setCareerHistory(text)       { setAdminData(d => ({ ...d, careerHistory: text })); }
  function setAnthropicKey(key)         { setAdminData(d => ({ ...d, anthropicKey: key })); }
  function setNavOrder(order)           { setAdminData(d => ({ ...d, navOrder: order })); }
  function setBottomBarTabs(tabs)       { setAdminData(d => ({ ...d, bottomBarTabs: tabs })); }
  function setReadinessWeights(weights) { setAdminData(d => ({ ...d, readinessWeights: weights })); }

  return (
    <AdminDataContext.Provider value={{
      ...adminData,
      setRelationshipTypes, setWinTags, setDealTypes, setLogoTypes, setOriginTypes, setEminenceTypes, setPipelineStages,
      setIbmCriteria, setCareerHistory, setAnthropicKey, setNavOrder, setBottomBarTabs, setReadinessWeights,
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  return useContext(AdminDataContext);
}
