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

// Fire-and-forget PUT — silently ignores network errors.
export async function apiPut(domain, data) {
  try {
    await fetch(`${API_BASE}/api/data/${domain}`, {
      method:  'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ data }),
    });
  } catch {
    // backend unavailable — will sync on next successful call
  }
}
