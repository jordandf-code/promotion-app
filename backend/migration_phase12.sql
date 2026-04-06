-- migration_phase12.sql
-- Run in Supabase SQL editor after migration.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS share_token    TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS feedback_token TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS feedback (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer     TEXT NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments     TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
