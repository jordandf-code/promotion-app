// hooks/useAdminData.js
// Re-exports from AdminDataContext so all existing import paths keep working.
// The actual state lives in AdminDataContext — one shared instance for the whole app.

export {
  useAdminData, AdminDataProvider, COLOR_PALETTE, DEFAULT_NAV_ORDER,
  DEFAULT_DEAL_TYPES, DEFAULT_LOGO_TYPES, DEFAULT_ORIGIN_TYPES, DEFAULT_EMINENCE_TYPES, DEFAULT_PIPELINE_STAGES,
} from '../context/AdminDataContext.jsx';
