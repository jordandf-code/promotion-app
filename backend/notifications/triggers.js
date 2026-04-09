// notifications/triggers.js
// Checks user data for conditions that should fire proactive notifications.
// Called daily via setInterval or POST /api/notifications/run-triggers.

const db = require('../db');
const { sendNotification } = require('./send');
const { overdueActionEmail, staleContactEmail, goalDeadlineEmail, scorecardAtRiskEmail } = require('./templates');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS  =  7 * 24 * 60 * 60 * 1000;

async function runTriggersForUser(userId) {
  const results = [];

  // Load relevant domains
  const dataResult = await db.query(
    `SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)`,
    [userId, ['actions', 'goals', 'scorecard', 'people', 'settings']]
  );
  const byDomain = Object.fromEntries(dataResult.rows.map(r => [r.domain, r.data]));

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // 1. Overdue actions
  const actions = byDomain.actions ?? [];
  const overdue = actions.filter(a => !a.done && a.dueDate && a.dueDate < today);
  if (overdue.length > 0) {
    const { subject, html } = overdueActionEmail(overdue);
    const r = await sendNotification({ userId, type: 'overdue_action', subject, html, payload: { count: overdue.length } });
    results.push({ type: 'overdue_action', ...r });
  }

  // 2. Stale key contacts (champion/key influence tier, no touchpoint in 30+ days)
  const people = byDomain.people ?? [];
  const stale = people.filter(p => {
    if (!['champion', 'key'].includes(p.influenceTier)) return false;
    const last = p.touchpoints?.length
      ? new Date(p.touchpoints[p.touchpoints.length - 1].date)
      : null;
    return !last || (now - last) > THIRTY_DAYS_MS;
  }).map(p => ({
    name: p.name,
    org: p.org,
    lastTouchpoint: p.touchpoints?.length
      ? p.touchpoints[p.touchpoints.length - 1].date
      : null,
  }));

  if (stale.length > 0) {
    const { subject, html } = staleContactEmail(stale);
    const r = await sendNotification({ userId, type: 'stale_contact', subject, html, payload: { count: stale.length } });
    results.push({ type: 'stale_contact', ...r });
  }

  // 3. Goal deadline approaching (within 7 days, not done)
  const goals = byDomain.goals ?? [];
  const sevenDaysOut = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString().slice(0, 10);
  const approaching = goals.filter(g =>
    g.status !== 'done' && g.targetDate && g.targetDate >= today && g.targetDate <= sevenDaysOut
  );
  if (approaching.length > 0) {
    const { subject, html } = goalDeadlineEmail(approaching);
    const r = await sendNotification({ userId, type: 'goal_deadline', subject, html, payload: { count: approaching.length } });
    results.push({ type: 'goal_deadline', ...r });
  }

  // 4. Scorecard at risk (metric < 50% of target, month >= July)
  const month = now.getMonth(); // 0-indexed, so July = 6
  if (month >= 6) {
    const scorecard = byDomain.scorecard ?? {};
    const targets = scorecard.targets ?? {};
    const overview = scorecard.overview ?? {};
    const monthsRemaining = 12 - month;

    const atRisk = [];
    const checks = [
      { label: 'Signings',     actual: overview.signingsRealized, target: targets.signings },
      { label: 'Revenue',      actual: overview.revenueRealized,  target: targets.revenue },
      { label: 'Gross profit', actual: overview.gpRealized,       target: targets.gp },
    ];
    for (const c of checks) {
      if (c.target && c.target > 0) {
        const pct = Math.round(((c.actual || 0) / c.target) * 100);
        if (pct < 50) {
          atRisk.push({ label: c.label, pct, monthsRemaining });
        }
      }
    }

    if (atRisk.length > 0) {
      const { subject, html } = scorecardAtRiskEmail(atRisk);
      const r = await sendNotification({ userId, type: 'scorecard_at_risk', subject, html, payload: { count: atRisk.length } });
      results.push({ type: 'scorecard_at_risk', ...r });
    }
  }

  return results;
}

async function runAllTriggers() {
  console.log('[Triggers] Running notification triggers for all users...');
  try {
    const usersResult = await db.query('SELECT id FROM users WHERE role != $1', ['viewer']);
    const results = [];
    for (const row of usersResult.rows) {
      try {
        const userResults = await runTriggersForUser(row.id);
        results.push({ userId: row.id, triggers: userResults });
      } catch (err) {
        console.error(`[Triggers] Error for user ${row.id}:`, err.message);
      }
    }
    console.log(`[Triggers] Done. Processed ${usersResult.rows.length} users.`);
    return results;
  } catch (err) {
    console.error('[Triggers] Fatal error:', err.message);
    return [];
  }
}

module.exports = { runTriggersForUser, runAllTriggers };
