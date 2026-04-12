// notifications/scheduler.js
// Lightweight in-process cron scheduler using node-cron.
// Runs hourly, checks each user's preferred digest day/hour against current UTC time.

const cron = require('node-cron');
const db = require('../db');
const { buildDigest } = require('./digest');
const { sendNotification } = require('./send');
const { runAllTriggers } = require('./triggers');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Track last successful run timestamps for health check visibility
let lastRuns = { digest: null, triggers: null };

/**
 * Return last successful run timestamps for each scheduled job.
 */
function getSchedulerStatus() {
  return { ...lastRuns };
}

/**
 * Initialize the notification scheduler. Call once on server startup.
 */
function initScheduler() {
  // Run every hour at :00 — digest check
  cron.schedule('0 * * * *', async () => {
    console.log(`[Scheduler] Digest check starting at ${new Date().toISOString()}`);
    try {
      await runDigestCheck();
      lastRuns.digest = new Date().toISOString();
      console.log(`[Scheduler] Digest check completed at ${lastRuns.digest}`);
    } catch (err) {
      console.error('Scheduler digest check error:', err.message);
    }
  });

  // Run daily at 08:00 UTC — proactive notification triggers
  cron.schedule('0 8 * * *', async () => {
    console.log(`[Scheduler] Daily triggers starting at ${new Date().toISOString()}`);
    try {
      await runAllTriggers();
      lastRuns.triggers = new Date().toISOString();
      console.log(`[Scheduler] Daily triggers completed at ${lastRuns.triggers}`);
    } catch (err) {
      console.error('Scheduler trigger check error:', err.message);
    }
  });

  console.log(`[Scheduler] Initialized at ${new Date().toISOString()} — hourly digest (0 * * * *) + daily triggers (0 8 * * *)`);
}

/**
 * Check all users and send digests to those whose configured day+hour matches now.
 */
async function runDigestCheck() {
  const now = new Date();
  const currentDay = DAYS[now.getUTCDay()];
  const currentHour = now.getUTCHours();

  // Load all non-viewer users with their prefs
  const result = await db.query(
    "SELECT id, notification_prefs FROM users WHERE role != 'viewer'"
  );

  for (const user of result.rows) {
    const prefs = user.notification_prefs || {};

    // Skip if globally paused or digest explicitly disabled
    if (prefs.paused) continue;
    if (prefs.weeklyDigest === false) continue;

    // Check day + hour (defaults: monday, 12)
    const userDay = (prefs.digestDay || 'monday').toLowerCase();
    const userHour = prefs.digestHour != null ? Number(prefs.digestHour) : 12;

    if (currentDay !== userDay || currentHour !== userHour) continue;

    // Build and send
    try {
      const { subject, html } = await buildDigest(user.id);
      await sendNotification({
        userId: user.id,
        type: 'weekly_digest',
        subject,
        html,
        payload: { week: now.toISOString().split('T')[0] },
      });
    } catch (err) {
      console.error(`Digest send error for user ${user.id}:`, err.message);
    }
  }
}

module.exports = { initScheduler, runDigestCheck, getSchedulerStatus };
