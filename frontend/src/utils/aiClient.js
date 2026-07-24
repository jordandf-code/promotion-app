// utils/aiClient.js
// Thin shared wrapper for all user-billed AI generation calls. Enforces a
// pre-send cost estimate + confirmation modal in ONE place so every AI trigger
// site goes: estimate → confirm → real POST.
//
// Usage from a component:
//   const data = await callAI('enhance-win', { winId });
//   if (data.cancelled) return;            // user declined — do nothing
//   if (!data.ok) { setErr(mapAiError(data.code, data.error)); return; }
//   ...use data...
//
// For binary (blob) endpoints (deck, package/export-deck), pass { raw: true } and
// callAI returns the raw fetch Response (or { cancelled: true } if declined).

import { API_BASE, authHeaders } from './api.js';

// ── Confirm-modal pub/sub ───────────────────────────────────────────────────
// A single <AICostModal> mounts in the app shell and registers a listener here.
// callAI() calls requestConfirm(), which resolves when the user picks an action.

let confirmListener = null;
let skipThisSession = false;

// Registers the modal's handler. Returns an unsubscribe fn (for useEffect cleanup).
export function registerAIConfirm(fn) {
  confirmListener = fn;
  return () => { if (confirmListener === fn) confirmListener = null; };
}

function requestConfirm(estimate) {
  // "Don't ask again this session" opt-out.
  if (skipThisSession) return Promise.resolve({ proceed: true });
  // Fail open if no modal is mounted (e.g. a public route) — never block the call.
  if (!confirmListener) return Promise.resolve({ proceed: true });
  return new Promise(resolve => {
    confirmListener({ estimate, resolve });
  });
}

// ── callAI ──────────────────────────────────────────────────────────────────
export async function callAI(endpoint, body = {}, opts = {}) {
  // 1. Estimate (best-effort — a failure never blocks the confirm/real call).
  let estimate = null;
  try {
    const eres = await fetch(`${API_BASE}/api/ai/estimate`, {
      method:  'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify({
        endpoint,
        narrative_mode: body?.narrative_mode,
        text: typeof body?.text === 'string' ? body.text : undefined,
      }),
    });
    const edata = await eres.json();
    if (edata?.ok) estimate = edata;
  } catch {
    /* estimate is best-effort */
  }

  // 2. Confirm.
  const decision = await requestConfirm(estimate);
  if (decision?.dontAsk) skipThisSession = true;
  if (!decision?.proceed) return { cancelled: true };

  // 3. Real call.
  const res = await fetch(`${API_BASE}/api/ai/${endpoint}`, {
    method:  'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify(body),
  });
  if (opts.raw) return res;
  return res.json();
}
