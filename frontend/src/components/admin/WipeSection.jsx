// components/admin/WipeSection.jsx
// Wipes all transactional data (wins, goals, actions, people, scorecard targets/opps/projects).
// Admin settings (categories, relationship types, IBM criteria, API key) are preserved.
// A backup is saved before wiping and can be restored with one click.

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../utils/api.js';

const EMPTY_SCORECARD = { targets: {}, opportunities: [], projects: [], utilization: {} };
const WIPE_DOMAINS    = ['wins', 'goals', 'actions', 'people', 'scorecard'];

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
      'This will clear all your goals, wins, action items, people, and scorecard data.\n\n' +
      'Your admin settings (categories, API key, IBM criteria) are kept.\n\n' +
      'A backup will be saved and can be restored. Continue?'
    )) return;

    setWiping(true);
    setError('');
    try {
      const [wins, goals, actions, people, scorecard] = await Promise.all(
        WIPE_DOMAINS.map(d => apiGet(d))
      );

      const backupPayload = {
        createdAt: new Date().toISOString(),
        wins:      wins      ?? [],
        goals:     goals     ?? [],
        actions:   actions   ?? [],
        people:    people    ?? [],
        scorecard: scorecard ?? EMPTY_SCORECARD,
      };
      await apiPut('backup', backupPayload);

      // Verify the backup was actually saved before wiping
      const saved = await apiGet('backup');
      if (!saved?.createdAt) {
        setError('Could not save backup — wipe aborted. Make sure the backend is running and restart it if needed.');
        setWiping(false);
        return;
      }

      await Promise.all([
        apiPut('wins',      []),
        apiPut('goals',     []),
        apiPut('actions',   []),
        apiPut('people',    []),
        apiPut('scorecard', EMPTY_SCORECARD),
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
        apiPut('wins',      b.wins      ?? []),
        apiPut('goals',     b.goals     ?? []),
        apiPut('actions',   b.actions   ?? []),
        apiPut('people',    b.people    ?? []),
        apiPut('scorecard', b.scorecard ?? EMPTY_SCORECARD),
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
          Clears wins, goals, actions, people, and scorecard. Admin settings are kept. A backup is saved automatically.
        </span>
      </div>
      {error && <p className="wipe-error">{error}</p>}
    </div>
  );
}
