// utils/api.js
// Shared helpers for authenticated backend API calls.

export const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

export function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

// Returns the stored data value, or null if the domain has never been saved.
export async function apiGet(domain) {
  const res = await fetch(`${API_BASE}/api/data/${domain}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${domain} failed: ${res.status}`);
  const { data } = await res.json();
  return data;
}

// PUT with one retry — warns user on persistent failure.
export async function apiPut(domain, data) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/data/${domain}`, {
        method:  'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body:    JSON.stringify({ data }),
      });
      if (res.ok) return;
    } catch {
      // network error — retry once
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
  }
  showSyncWarning();
}

let syncWarningVisible = false;
function showSyncWarning() {
  if (syncWarningVisible) return;
  syncWarningVisible = true;
  const el = document.createElement('div');
  el.className = 'sync-warning';
  el.textContent = 'Some changes could not be saved — check your connection and refresh.';
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); syncWarningVisible = false; }, 6000);
}
