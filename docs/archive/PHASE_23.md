# Phase 23 — Notifications and reminders

**Goal**: Add a lightweight email notification system so the app surfaces important
reminders without requiring the user to check it daily. The app currently has no push
mechanism — overdue actions and stale contacts are only visible if you open the dashboard.
For a promotion case that spans a qualifying year, passive reminders are essential.

Requires adding an email service. Resend (resend.com) is the recommended provider —
free tier covers 3,000 emails/month, simple REST API, excellent deliverability, no SMTP
configuration. API key stored as a backend environment variable (`RESEND_API_KEY`), not
per-user — one platform key covers all users.

---

## 23a — Database migration

- [ ] `backend/migration_phase23.sql`:
  - Add `notification_prefs` JSONB column to `users` table (default `'{}'`) — stores
    per-user notification preferences
  - Add `notifications` table:
    ```sql
    CREATE TABLE notifications (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type         TEXT NOT NULL,
      payload      JSONB,
      sent_at      TIMESTAMPTZ DEFAULT NOW(),
      opened_at    TIMESTAMPTZ
    );
    CREATE INDEX ON notifications(user_id, sent_at DESC);
    ```
  - The `notifications` table is a send log — used to prevent duplicate sends and to
    show the user their notification history in Admin

## 23b — Notification types

Six notification types, each independently toggleable per user:

| Type | Trigger | Default |
|---|---|---|
| `weekly_digest` | Every Monday 8am (user's inferred timezone) | On |
| `overdue_action` | Daily at 8am if any action items are overdue | On |
| `stale_contact` | Weekly if any contacts not reached in 30+ days | On |
| `goal_deadline` | 7 days before a goal's targetDate | On |
| `scorecard_at_risk` | Weekly if any qualifying-year metric is below 70% of target | On |
| `feedback_received` | Immediately when a reviewer submits feedback | On |

All types default to On. Users can toggle each independently in Admin → User settings.
A global "Pause all notifications" toggle is also available.

## 23c — Backend implementation

**`backend/notifications/send.js`**
Core send function. Takes `{ userId, type, subject, html }`. Loads the user's email from
the DB, checks `notification_prefs` to confirm the type is enabled and not paused, checks
the `notifications` table to avoid sending the same type twice within its minimum interval
(daily types: 20 hours, weekly types: 6 days), calls the Resend API, logs the send to the
`notifications` table.

**`backend/notifications/digest.js`**
Builds the weekly digest email. Loads the user's data: overdue actions count, stale
contacts count, qualifying-year scorecard status for each metric, upcoming goal deadlines
in the next 14 days, wins added in the past 7 days, readiness score (computed server-side
using the same logic as the frontend hook). Renders as a clean HTML email — IBM blue
header, plain content sections, a single CTA button linking to the app.

**`backend/notifications/scheduler.js`**
A lightweight in-process scheduler using `node-cron`. Runs on the backend server.
- `0 8 * * 1` (Mondays 8am UTC) — triggers weekly digest for all users with it enabled
- `0 8 * * *` (daily 8am UTC) — triggers overdue action and stale contact checks
- `0 9 * * 1` (Mondays 9am UTC) — triggers scorecard at-risk check
- Goal deadline notifications checked daily against the goals table
- Feedback received triggered immediately from the existing feedback submission route
  (Phase 12) — no scheduler needed, called inline in `POST /api/feedback/:token`

Scheduler starts when the backend server starts. On Render's free tier the server sleeps
after 15 minutes of inactivity — document this limitation in `DEPLOY.md`. Upgrade to a
paid Render instance or use a free cron ping service (e.g. cron-job.org) to keep it awake
if reliable delivery is needed.

## 23d — User preferences UI

- [ ] Admin → User settings: new "Notifications" section
- [ ] Global toggle: "Email notifications" — on/off; when off, all types are suppressed
- [ ] Per-type toggles: one row per notification type, label + description + on/off switch
- [ ] "Send me a test digest" button — fires the weekly digest immediately to the user's
  email regardless of schedule; useful for verifying setup
- [ ] Notification history: last 10 sent notifications shown as a simple list (type, sent
  date, opened indicator if available) — read from the `notifications` table via a new
  `GET /api/notifications/history` endpoint
- [ ] Preferences saved to `users.notification_prefs` via a new
  `PUT /api/notifications/prefs` endpoint

## 23e — Feedback notification (Phase 12 integration)

- [ ] `POST /api/feedback/:token` (Phase 12 route) — after saving feedback to DB, call
  `send.js` with type `feedback_received`; include reviewer name, star rating, and a
  truncated preview of their comment in the email body
- [ ] This is the only real-time notification — all others are scheduled

---

**Implementation note**: Phase 23 requires `node-cron` and the Resend SDK
(`npm install node-cron resend`) in the backend. `RESEND_API_KEY` added to
`backend/.env.example`. Email delivery depends on the Render server staying awake —
document the sleep limitation in `DEPLOY.md` and provide the cron-job.org workaround.
Timezone handling is simplified to UTC throughout — document this for users outside UTC.

---

