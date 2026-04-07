-- migration_phase23.sql
-- Run in Supabase SQL editor after migration_phase18.sql.
-- Phase 23: Email notifications — user prefs and send log.

-- 1. Per-user notification preferences (JSONB on users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}';

-- 2. Notification send log (prevents duplicates, provides history)
CREATE TABLE IF NOT EXISTS notifications (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  payload   JSONB,
  sent_at   TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent ON notifications(user_id, sent_at DESC);
