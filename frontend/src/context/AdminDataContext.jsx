// context/AdminDataContext.jsx
// Single shared instance of admin data — shared across Layout, Admin, and all feature hooks.
// Replaces the per-component hook instances so changes in Admin reflect in the sidebar instantly.
//
// Data is split into two sources:
//   - Per-user admin data: navOrder, bottomBarTabs, promotionCriteria, careerHistory, anthropicKey
//   - Platform data (site-wide): winTags, relationshipTypes, dealTypes, logoTypes, originTypes,
//     eminenceTypes, pipelineStages, readinessWeights, deckTemplate, deckTemplateFilename,
//     deckContentInstructions
//
// The exported context merges both, so all consumers keep working unchanged.
// Only superusers can update platform fields (PUT /api/platform).

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean, API_BASE, authHeaders } from '../utils/api.js';
import { useAuth } from '../context/AuthContext';

export const COLOR_PALETTE = [
  '#1d4ed8', '#15803d', '#b45309', '#b91c1c',
  '#7c3aed', '#0f766e', '#c2410c', '#64748b',
];

export const DEFAULT_NAV_ORDER = [
  '/', '/scorecard', '/opportunities', '/goals', '/people', '/wins', '/eminence',
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

// Keys that belong to per-user admin data
const USER_DEFAULTS = {
  promotionCriteria: '',
  careerHistory:     '',
  anthropicKey:      '',
  navOrder:          DEFAULT_NAV_ORDER,
  bottomBarTabs:     null,
};

export const DEFAULT_FIRM_CONFIG = {
  companyName:       'IBM Canada',
  currentRoleLabel:  'Associate Partner',
  targetRoleLabel:   'Partner',
  marketDescription: 'Canadian public sector',
  criteriaLabel:     'Promotion criteria',
  metricLabels: {
    signings:    'Signings',
    revenue:     'Revenue',
    grossProfit: 'Gross profit',
    utilization: 'Chargeable utilization',
  },
  thresholds: {
    signings:    85,
    revenue:     85,
    grossProfit: 80,
    utilization: 70,
  },
};

// Keys that belong to platform-wide data
const PLATFORM_DEFAULTS = {
  relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
  winTags:           DEFAULT_WIN_TAGS,
  dealTypes:         DEFAULT_DEAL_TYPES,
  logoTypes:         DEFAULT_LOGO_TYPES,
  originTypes:       DEFAULT_ORIGIN_TYPES,
  eminenceTypes:     DEFAULT_EMINENCE_TYPES,
  pipelineStages:    DEFAULT_PIPELINE_STAGES,
  readinessWeights:  null,
  deckTemplate:           '',
  deckTemplateFilename:   '',
  deckContentInstructions: '',
};

// Combined defaults (for backward compat with old merged admin data)
const DEFAULTS = { ...USER_DEFAULTS, ...PLATFORM_DEFAULTS };

const PLATFORM_KEYS = new Set(Object.keys(PLATFORM_DEFAULTS));

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

// Split a merged data object into user-only and platform-only parts
function splitData(merged) {
  const user = {};
  const platform = {};
  for (const [k, v] of Object.entries(merged)) {
    if (PLATFORM_KEYS.has(k)) platform[k] = v;
    else user[k] = v;
  }
  return { user, platform };
}

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const [adminData, setAdminData]       = useState(DEFAULTS);
  const [firmConfig, setFirmConfigState] = useState(DEFAULT_FIRM_CONFIG);
  const [questionBank, setQuestionBank] = useState(null);
  const [initialized, setInitialized]   = useState(false);
  const skipSync                        = useRef(false);
  const serverLoaded                    = useRef(false);
  const platformLoaded                  = useRef(false);
  const skipPlatformSync                = useRef(false);
  const { token, user } = useAuth();
  const isSuperuser = user?.role === 'superuser';

  // ── Fetch platform data ──────────────────────────────────────────────────
  async function fetchPlatform() {
    try {
      const res = await fetch(`${API_BASE}/api/platform`, { headers: authHeaders() });
      if (!res.ok) return { data: null, firmConfig: null, questionBank: null };
      const json = await res.json();
      return { data: json.data ?? null, firmConfig: json.firmConfig ?? null, questionBank: json.questionBank ?? null };
    } catch {
      return { data: null, firmConfig: null, questionBank: null };
    }
  }

  const pendingPlatformSave = useRef(null);

  async function savePlatform(data, rollback) {
    try {
      const res = await fetch(`${API_BASE}/api/platform`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        console.error(`Platform save failed: ${res.status}`);
        if (rollback) setAdminData(rollback);
      } else {
        // Re-fetch platform data after successful save to ensure UI matches DB
        await refetchPlatform();
      }
    } catch (err) {
      console.error('Failed to save platform data:', err.message);
      if (rollback) setAdminData(rollback);
    }
  }

  // Re-fetch platform data from server and merge into state
  async function refetchPlatform() {
    try {
      const { data: serverPlatform, firmConfig: serverFirmConfig, questionBank: serverQB } = await fetchPlatform();
      if (serverQB) setQuestionBank(serverQB);
      if (serverPlatform) {
        skipSync.current = true;
        skipPlatformSync.current = true;
        setAdminData(prev => {
          const updated = { ...prev };
          for (const k of PLATFORM_KEYS) {
            if (serverPlatform[k] !== undefined) updated[k] = serverPlatform[k];
          }
          return updated;
        });
      }
      if (serverFirmConfig) {
        setFirmConfigState({
          ...DEFAULT_FIRM_CONFIG,
          ...serverFirmConfig,
          metricLabels: { ...DEFAULT_FIRM_CONFIG.metricLabels, ...(serverFirmConfig.metricLabels || {}) },
          thresholds: { ...DEFAULT_FIRM_CONFIG.thresholds, ...(serverFirmConfig.thresholds || {}) },
        });
      }
    } catch (err) {
      console.error('Failed to refetch platform data:', err.message);
    }
  }

  // ── Initial load: fetch both admin + platform data ───────────────────────
  useEffect(() => {
    if (!token) { setInitialized(true); return; }
    const local = loadLocal() ?? DEFAULTS;

    Promise.all([
      apiGet('admin').catch(() => null),
      fetchPlatform(),
    ]).then(([serverAdmin, platformResult]) => {
      serverLoaded.current = true;
      platformLoaded.current = true;

      const serverPlatform = platformResult.data;
      const serverFirmConfig = platformResult.firmConfig;
      if (platformResult.questionBank) setQuestionBank(platformResult.questionBank);

      // Apply firm config if available (deep merge metricLabels to avoid losing defaults)
      if (serverFirmConfig) {
        setFirmConfigState({
          ...DEFAULT_FIRM_CONFIG,
          ...serverFirmConfig,
          metricLabels: { ...DEFAULT_FIRM_CONFIG.metricLabels, ...(serverFirmConfig.metricLabels || {}) },
          thresholds: { ...DEFAULT_FIRM_CONFIG.thresholds, ...(serverFirmConfig.thresholds || {}) },
        });
      }

      let merged = { ...DEFAULTS };

      // Handle per-user admin data
      if (serverAdmin !== null) {
        // Backward compat: migrate ibmCriteria → promotionCriteria
        if (serverAdmin.ibmCriteria && !serverAdmin.promotionCriteria) {
          serverAdmin.promotionCriteria = serverAdmin.ibmCriteria;
        }
        // Migrate: if server admin data contains platform keys (old format),
        // those become fallbacks but platform data takes precedence
        merged = { ...merged, ...serverAdmin };
      } else {
        // Backward compat: migrate ibmCriteria → promotionCriteria
        if (local.ibmCriteria && !local.promotionCriteria) {
          local.promotionCriteria = local.ibmCriteria;
        }
        // No server data — use local
        merged = { ...merged, ...local };
      }

      // Overlay platform data on top (takes precedence for platform keys)
      if (serverPlatform !== null) {
        for (const k of PLATFORM_KEYS) {
          if (serverPlatform[k] !== undefined) merged[k] = serverPlatform[k];
        }
      } else if (isSuperuser) {
        // No platform data exists yet — superuser should seed it from current merged values
        const platformSeed = {};
        for (const k of PLATFORM_KEYS) {
          platformSeed[k] = merged[k] !== undefined ? merged[k] : PLATFORM_DEFAULTS[k];
        }
        skipPlatformSync.current = true;
        savePlatform(platformSeed);
      }

      // Migrate /pursuits → /opportunities in saved nav preferences
      if (merged.navOrder) {
        merged.navOrder = merged.navOrder.map(r => r === '/pursuits' ? '/opportunities' : r);
      }
      if (merged.bottomBarTabs) {
        merged.bottomBarTabs = merged.bottomBarTabs.map(r => r === '/pursuits' ? '/opportunities' : r);
      }

      skipSync.current = true;
      skipPlatformSync.current = true;

      // Clean the per-user admin data: strip platform keys from it
      const userOnly = {};
      for (const [k, v] of Object.entries(serverAdmin ?? local)) {
        if (!PLATFORM_KEYS.has(k)) userOnly[k] = v;
      }
      apiPutMarkClean('admin', userOnly);

      setAdminData(merged);
      localStorage.removeItem('adminData_v2');
      localStorage.removeItem('adminData_v1');
    }).catch(() => {
      // Server unreachable — use local/defaults for display
      setAdminData(local);
    }).finally(() => setInitialized(true));
  }, [token, isSuperuser]);

  // ── Sync per-user admin data on change ───────────────────────────────────
  const prevUserData = useRef(null);
  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    if (!serverLoaded.current) return;
    // Only save user-scoped keys, and only if they actually changed
    const { user: userOnly } = splitData(adminData);
    const serialized = JSON.stringify(userOnly);
    if (prevUserData.current === serialized) return;
    prevUserData.current = serialized;
    apiPut('admin', userOnly);
  }, [adminData, initialized]);

  // ── Per-user admin setters ───────────────────────────────────────────────
  function setPromotionCriteria(text)         { setAdminData(d => ({ ...d, promotionCriteria: text })); }
  function setCareerHistory(text)       { setAdminData(d => ({ ...d, careerHistory: text })); }
  function setAnthropicKey(key)         { setAdminData(d => ({ ...d, anthropicKey: key })); }
  function setNavOrder(order)           { setAdminData(d => ({ ...d, navOrder: order })); }
  function setBottomBarTabs(tabs)       { setAdminData(d => ({ ...d, bottomBarTabs: tabs })); }

  // ── Platform setters (write to /api/platform instead of /api/data/admin) ──
  function savePlatformFromState(prevState, updates) {
    if (!isSuperuser) return; // non-superusers cannot modify platform data
    const platformData = {};
    for (const k of PLATFORM_KEYS) {
      platformData[k] = updates[k] !== undefined ? updates[k] : prevState[k];
    }
    savePlatform(platformData, prevState);
  }

  function makePlatformSetter(key) {
    return (value) => {
      setAdminData(prev => {
        // Schedule platform save outside the state updater
        setTimeout(() => savePlatformFromState(prev, { [key]: value }), 0);
        return { ...prev, [key]: value };
      });
    };
  }

  function makePlatformDeckSetter() {
    return (base64, filename) => {
      setAdminData(prev => {
        setTimeout(() => savePlatformFromState(prev, { deckTemplate: base64, deckTemplateFilename: filename }), 0);
        return { ...prev, deckTemplate: base64, deckTemplateFilename: filename };
      });
    };
  }

  // ── Firm config setter (writes to /api/platform/firm-config) ──────────────
  async function setFirmConfig(newConfig) {
    if (!isSuperuser) return;
    const merged = {
      ...firmConfig,
      ...newConfig,
      metricLabels: { ...(firmConfig.metricLabels || {}), ...(newConfig.metricLabels || {}) },
      thresholds: { ...(firmConfig.thresholds || {}), ...(newConfig.thresholds || {}) },
    };
    setFirmConfigState(merged);
    try {
      const res = await fetch(`${API_BASE}/api/platform/firm-config`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ firmConfig: merged }),
      });
      if (!res.ok) {
        console.error(`Firm config save failed: ${res.status}`);
        setFirmConfigState(firmConfig); // rollback
      } else {
        // Re-fetch to ensure UI matches DB
        await refetchPlatform();
      }
    } catch (err) {
      console.error('Failed to save firm config:', err.message);
      setFirmConfigState(firmConfig); // rollback
    }
  }

  const setRelationshipTypes  = makePlatformSetter('relationshipTypes');
  const setWinTags            = makePlatformSetter('winTags');
  const setDealTypes          = makePlatformSetter('dealTypes');
  const setLogoTypes          = makePlatformSetter('logoTypes');
  const setOriginTypes        = makePlatformSetter('originTypes');
  const setEminenceTypes      = makePlatformSetter('eminenceTypes');
  const setPipelineStages     = makePlatformSetter('pipelineStages');
  const setReadinessWeights   = makePlatformSetter('readinessWeights');
  const setDeckContentInstructions = makePlatformSetter('deckContentInstructions');
  const setDeckTemplate       = makePlatformDeckSetter();

  return (
    <AdminDataContext.Provider value={{
      ...adminData,
      firmConfig, setFirmConfig,
      questionBank,
      setRelationshipTypes, setWinTags, setDealTypes, setLogoTypes, setOriginTypes, setEminenceTypes, setPipelineStages,
      setPromotionCriteria, setCareerHistory, setAnthropicKey, setNavOrder, setBottomBarTabs, setReadinessWeights,
      setDeckTemplate, setDeckContentInstructions, refetchPlatform,
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  return useContext(AdminDataContext);
}
