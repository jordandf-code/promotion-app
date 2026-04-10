// context/SettingsContext.jsx
// Stores user-configurable settings.
// Persisted to PostgreSQL via /api/data/settings; migrates from localStorage automatically.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean, API_BASE, authHeaders } from '../utils/api.js';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const DEFAULT_CAD_TO_USD_RATE = 1.5; // fallback if platform config not loaded

const DEFAULTS = {
  promotionYear: 2027,
  currency: 'CAD',
  demoMode: false,
  onboardingComplete: false,
};

function formatAmount(cadAmount, currency, rate) {
  const amount = currency === 'USD' ? cadAmount / rate : cadAmount;
  const prefix = currency === 'USD' ? 'USD$' : 'CDN$';
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (amount >= 1_000)     return `${prefix}${Math.round(amount / 1_000)}K`;
  return `${prefix}${Math.round(amount)}`;
}

function loadLocal() {
  try {
    const year     = localStorage.getItem('setting_promotionYear');
    const currency = localStorage.getItem('setting_currency');
    if (year || currency) {
      return {
        promotionYear: year ? parseInt(year, 10) : DEFAULTS.promotionYear,
        currency:      currency ?? DEFAULTS.currency,
      };
    }
  } catch {}
  return null;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings]       = useState(DEFAULTS);
  const [initialized, setInitialized] = useState(false);
  const [cadToUsdRate, setCadToUsdRate] = useState(DEFAULT_CAD_TO_USD_RATE);
  const skipSync                      = useRef(false);
  const { token } = useAuth();

  // Fetch platform exchange rate on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/platform`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.exchangeRate && json.exchangeRate > 0) {
          setCadToUsdRate(json.exchangeRate);
        }
      })
      .catch(() => {}); // silently fall back to default
  }, [token]);

  useEffect(() => {
    if (!token) { setInitialized(true); return; }
    const local = loadLocal() ?? DEFAULTS;
    apiGet('settings')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          const merged = { ...DEFAULTS, ...serverData };
          apiPutMarkClean('settings', merged);
          setSettings(merged);
        } else {
          // New user — enable demo mode so they see sample data
          const initial = { ...local, demoMode: true };
          setSettings(initial);
          apiPut('settings', initial);
        }
        localStorage.removeItem('setting_promotionYear');
        localStorage.removeItem('setting_currency');
      })
      .catch(() => setSettings(local))
      .finally(() => setInitialized(true));
  }, [token]);

  useEffect(() => {
    if (!initialized) return;
    if (skipSync.current) { skipSync.current = false; return; }
    apiPut('settings', settings);
  }, [settings, initialized]);

  function setPromotionYear(year) {
    setSettings(s => ({ ...s, promotionYear: year }));
  }

  function setCurrency(value) {
    setSettings(s => ({ ...s, currency: value }));
  }

  function setDemoMode(value) {
    setSettings(s => ({ ...s, demoMode: value }));
  }

  function setOnboardingComplete(value) {
    setSettings(s => ({ ...s, onboardingComplete: value }));
  }

  function fmtCurrency(cadAmount) {
    return formatAmount(cadAmount, settings.currency, cadToUsdRate);
  }

  // Convert a stored CAD value to the user's display currency for form inputs.
  function toInputValue(cadAmount) {
    if (cadAmount == null || cadAmount === '') return '';
    const n = Number(cadAmount);
    return settings.currency === 'USD'
      ? String(Math.round((n / cadToUsdRate) * 100) / 100)
      : String(n);
  }

  // Convert a user-entered value (in their currency) back to CAD for storage.
  function fromInputValue(inputValue) {
    if (inputValue === '' || inputValue == null) return null;
    const n = Number(inputValue);
    return settings.currency === 'USD'
      ? Math.round(n * cadToUsdRate)
      : Math.round(n);
  }

  const { promotionYear, currency, demoMode, onboardingComplete } = settings;
  const currencySymbol = currency === 'USD' ? 'USD$' : 'CA$';
  const qualifyingYear = promotionYear - 1;
  const scorecardYears = [
    promotionYear - 4,
    promotionYear - 3,
    promotionYear - 2,
    promotionYear - 1,
    promotionYear,
    promotionYear + 1,
    promotionYear + 2,
  ];

  return (
    <SettingsContext.Provider
      value={{ promotionYear, setPromotionYear, qualifyingYear, scorecardYears, currency, setCurrency, fmtCurrency, currencySymbol, toInputValue, fromInputValue, demoMode, setDemoMode, onboardingComplete, setOnboardingComplete }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
