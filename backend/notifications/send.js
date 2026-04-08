// notifications/send.js
// Core notification sender. Checks user prefs, dedup, then sends via Resend.

const { Resend } = require('resend');
const db = require('../db');

const DEFAULT_FROM = 'Career Command Center <notifications@partner.jordandf.com>';

// Minimum intervals between sends of the same type (prevents duplicates)
const MIN_INTERVALS = {
  weekly_digest:     6 * 24 * 60 * 60 * 1000, // 6 days
  feedback_received: 60 * 60 * 1000,           // 1 hour
  overdue_action:    24 * 60 * 60 * 1000,      // 1 day
  stale_contact:     7 * 24 * 60 * 60 * 1000,  // 7 days
  goal_deadline:     24 * 60 * 60 * 1000,      // 1 day
  scorecard_at_risk: 7 * 24 * 60 * 60 * 1000,  // 7 days
  access_granted:    0,                         // no dedup — transactional
  feedback_request:  0,                         // no dedup — transactional
};

/**
 * Send a notification email if the user has it enabled and dedup passes.
 * @param {Object} opts
 * @param {number} opts.userId
 * @param {string} opts.type - notification type key
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {Object} [opts.payload] - metadata logged to notifications table
 * @param {boolean} [opts.force] - skip prefs/dedup checks (for test sends)
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendNotification({ userId, type, subject, html, payload, force }) {
  try {
    // Load user
    const userResult = await db.query(
      'SELECT email, notification_prefs FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return { sent: false, reason: 'user_not_found' };

    const prefs = user.notification_prefs || {};

    if (!force) {
      // Check global pause
      if (prefs.paused) return { sent: false, reason: 'paused' };

      // Check per-type toggle (default to enabled)
      const TYPE_TO_PREF_KEY = {
        weekly_digest: 'weeklyDigest',
        feedback_received: 'feedbackReceived',
        overdue_action: 'overdueAction',
        stale_contact: 'staleContact',
        goal_deadline: 'goalDeadline',
        scorecard_at_risk: 'scorecardAtRisk',
        access_granted: 'accessGranted',
        feedback_request: 'feedbackRequest',
      };
      const typeKey = TYPE_TO_PREF_KEY[type] || type;
      if (prefs[typeKey] === false) return { sent: false, reason: 'type_disabled' };

      // Dedup check
      const minInterval = MIN_INTERVALS[type] || 60 * 60 * 1000;
      const since = new Date(Date.now() - minInterval).toISOString();
      const recentResult = await db.query(
        'SELECT 1 FROM notifications WHERE user_id = $1 AND type = $2 AND sent_at > $3 LIMIT 1',
        [userId, type, since]
      );
      if (recentResult.rows.length > 0) return { sent: false, reason: 'too_recent' };
    }

    // Check Resend API key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set — skipping notification send');
      return { sent: false, reason: 'no_api_key' };
    }

    // Load from-address from app_settings
    const fromResult = await db.query(
      "SELECT value FROM app_settings WHERE key = 'email_from'"
    );
    const fromAddress = fromResult.rows[0]?.value || DEFAULT_FROM;

    // Send via Resend
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error(`Notification send error (${type} to user ${userId}):`, error);
      return { sent: false, reason: 'resend_error' };
    }

    // Log to notifications table
    await db.query(
      'INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)',
      [userId, type, JSON.stringify(payload || { subject })]
    );

    return { sent: true };
  } catch (err) {
    console.error(`Notification error (${type} to user ${userId}):`, err.message);
    return { sent: false, reason: 'exception' };
  }
}

module.exports = { sendNotification };
