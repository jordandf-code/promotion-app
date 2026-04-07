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

// ── Debounced, deduplicated PUT ────────────────────────────────────────────
//
// Problems this solves:
//   1. Every data hook fires a redundant PUT when `initialized` flips to true,
//      even though the data hasn't actually changed from what the server sent.
//   2. On page load, 7+ hooks all PUT simultaneously, creating a burst that
//      can overwhelm the connection to Supabase.
//   3. Rapid edits (typing, toggling) can fire many PUTs per second.
//
// How it works:
//   - Per-domain deduplication: skips the PUT if serialized data matches the
//     last successful save (or last server load via apiPutMarkClean).
//   - Per-domain debounce (300ms): coalesces rapid writes into one PUT.
//   - One retry with 1.5s backoff on failure, then shows the sync warning.

const lastSaved = new Map();   // domain → JSON string of last saved/loaded data
const timers    = new Map();   // domain → debounce timeout ID

// Called by hooks after loading server data to mark the current state as "clean"
// so the sync effect doesn't fire a redundant PUT for the same data.
export function apiPutMarkClean(domain, data) {
  lastSaved.set(domain, JSON.stringify(data));
}

export function apiPut(domain, data) {
  const json = JSON.stringify(data);

  // Deduplicate: skip if nothing changed since last save or server load
  if (json === lastSaved.get(domain)) return;

  // Cancel any pending debounce for this domain
  if (timers.has(domain)) clearTimeout(timers.get(domain));

  timers.set(domain, setTimeout(async () => {
    timers.delete(domain);

    // Re-check dedup after debounce (another write may have superseded this one)
    const currentJson = JSON.stringify(data);
    if (currentJson === lastSaved.get(domain)) return;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/api/data/${domain}`, {
          method:  'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body:    JSON.stringify({ data }),
        });
        if (res.ok) {
          lastSaved.set(domain, currentJson);
          return;
        }
      } catch {
        // network error — retry once
      }
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
    }
    showSyncWarning();
  }, 300));
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
