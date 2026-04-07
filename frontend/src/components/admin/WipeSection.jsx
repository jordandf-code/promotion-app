// components/admin/WipeSection.jsx
// Wipes all transactional data (wins, goals, actions, people, scorecard, eminence, learning, story).
// Admin settings (categories, relationship types, IBM criteria, API key) are preserved.
// A backup is saved before wiping and can be restored with one click.

import { useState, useEffect } from 'react';
import { API_BASE, authHeaders, apiGet } from '../../utils/api.js';

const EMPTY_SCORECARD = { targets: {}, opportunities: [], projects: [], utilization: {} };
const EMPTY_LEARNING  = { certifications: [], courses: [] };
const EMPTY_EMINENCE  = { activities: [] };

const WIPE_DOMAINS = ['wins', 'goals', 'actions', 'people', 'scorecard', 'eminence', 'learning'];

// Direct PUT that bypasses debounce — needed before reload
async function directPut(domain, data) {
  const res = await fetch(`${API_BASE}/api/data/${domain}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PUT ${domain} failed`);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function WipeSection() {
  const [backup,    setBackup]    = useState(undefined); // undefined = loading, null = no backup
  const [wiping,    setWiping]    = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    apiGet('backup')
      .then(data => setBackup(data))
      .catch(() => setBackup(null));
  }, []);

  async function wipeData() {
    if (!window.confirm(
      'This will clear all your goals, wins, action items, people, scorecard, eminence, learning, and AI-generated content.\n\n' +
      'Your admin settings (categories, API key, IBM criteria) are kept.\n\n' +
      'A backup will be saved and can be restored. Continue?'
    )) return;

    setWiping(true);
    setError('');
    try {
      const results = await Promise.all(WIPE_DOMAINS.map(d => apiGet(d)));

      const backupPayload = {
        createdAt: new Date().toISOString(),
        wins:      results[0] ?? [],
        goals:     results[1] ?? [],
        actions:   results[2] ?? [],
        people:    results[3] ?? [],
        scorecard: results[4] ?? EMPTY_SCORECARD,
        eminence:  results[5] ?? EMPTY_EMINENCE,
        learning:  results[6] ?? EMPTY_LEARNING,
      };
      await directPut('backup', backupPayload);

      // Verify the backup was actually saved before wiping
      const saved = await apiGet('backup');
      if (!saved?.createdAt) {
        setError('Could not save backup — wipe aborted. Make sure the backend is running and restart it if needed.');
        setWiping(false);
        return;
      }

      await Promise.all([
        directPut('wins',      []),
        directPut('goals',     []),
        directPut('actions',   []),
        directPut('people',    []),
        directPut('scorecard', EMPTY_SCORECARD),
        directPut('eminence',  EMPTY_EMINENCE),
        directPut('learning',  EMPTY_LEARNING),
        directPut('story',     null),
      ]);

      window.location.reload();
    } catch {
      setError('Something went wrong — please try again.');
      setWiping(false);
    }
  }

  async function restoreBackup() {
    if (!window.confirm(
      'This will restore your data from the backup, overwriting your current data. Continue?'
    )) return;

    setRestoring(true);
    setError('');
    try {
      const b = await apiGet('backup');
      if (!b) { setError('No backup found.'); setRestoring(false); return; }

      await Promise.all([
        directPut('wins',      b.wins      ?? []),
        directPut('goals',     b.goals     ?? []),
        directPut('actions',   b.actions   ?? []),
        directPut('people',    b.people    ?? []),
        directPut('scorecard', b.scorecard ?? EMPTY_SCORECARD),
        directPut('eminence',  b.eminence  ?? EMPTY_EMINENCE),
        directPut('learning',  b.learning  ?? EMPTY_LEARNING),
      ]);

      window.location.reload();
    } catch {
      setError('Restore failed — please try again.');
      setRestoring(false);
    }
  }

  if (backup === undefined) return null; // still loading

  return (
    <div className="wipe-section">
      {backup && (
        <div className="wipe-backup-row">
          <span className="wipe-backup-label">Backup saved {fmtDate(backup.createdAt)}</span>
          <button className="btn-secondary" onClick={restoreBackup} disabled={restoring}>
            {restoring ? 'Restoring…' : 'Restore backup'}
          </button>
        </div>
      )}
      <div className="wipe-action-row">
        <button className="btn-danger-ghost" onClick={wipeData} disabled={wiping}>
          {wiping ? 'Clearing…' : 'Clear all account data'}
        </button>
        <span className="wipe-hint">
          Clears wins, goals, actions, people, scorecard, eminence, learning, and AI content. Admin settings are kept. A backup is saved automatically.
        </span>
      </div>
      {error && <p className="wipe-error">{error}</p>}
    </div>
  );
}
