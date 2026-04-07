// context/SettingsContext.jsx
// Stores user-configurable settings.
// Persisted to PostgreSQL via /api/data/settings; migrates from localStorage automatically.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPutMarkClean } from '../utils/api.js';

const SettingsContext = createContext(null);

const CAD_TO_USD_RATE = 1.5; // 1 USD = 1.50 CAD (IBM standard rate)

const DEFAULTS = {
  promotionYear: 2027,
  currency: 'CAD',
};

function formatAmount(cadAmount, currency) {
  const amount = currency === 'USD' ? cadAmount / CAD_TO_USD_RATE : cadAmount;
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
  const skipSync                      = useRef(false);

  useEffect(() => {
    const local = loadLocal() ?? DEFAULTS;
    apiGet('settings')
      .then(serverData => {
        if (serverData !== null) {
          skipSync.current = true;
          const merged = { ...DEFAULTS, ...serverData };
          apiPutMarkClean('settings', merged);
          setSettings(merged);
        } else {
          setSettings(local);
          apiPut('settings', local);
        }
        localStorage.removeItem('setting_promotionYear');
        localStorage.removeItem('setting_currency');
      })
      .catch(() => setSettings(local))
      .finally(() => setInitialized(true));
  }, []);

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

  function fmtCurrency(cadAmount) {
    return formatAmount(cadAmount, settings.currency);
  }

  // Convert a stored CAD value to the user's display currency for form inputs.
  function toInputValue(cadAmount) {
    if (cadAmount == null || cadAmount === '') return '';
    const n = Number(cadAmount);
    return settings.currency === 'USD'
      ? String(Math.round((n / CAD_TO_USD_RATE) * 100) / 100)
      : String(n);
  }

  // Convert a user-entered value (in their currency) back to CAD for storage.
  function fromInputValue(inputValue) {
    if (inputValue === '' || inputValue == null) return null;
    const n = Number(inputValue);
    return settings.currency === 'USD'
      ? Math.round(n * CAD_TO_USD_RATE)
      : Math.round(n);
  }

  const { promotionYear, currency } = settings;
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
      value={{ promotionYear, setPromotionYear, qualifyingYear, scorecardYears, currency, setCurrency, fmtCurrency, currencySymbol, toInputValue, fromInputValue }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
