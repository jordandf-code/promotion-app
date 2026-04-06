-- migration_phase18.sql
-- Run in Supabase SQL editor after migration_phase12.sql.
-- Phase 18: Roles, invite codes, security questions, peer access.

-- 1. Backfill role column: set all existing users to 'user', promote lowest-ID to 'superuser'
UPDATE users SET role = 'user' WHERE role IS NULL OR role NOT IN ('superuser', 'user', 'viewer');
UPDATE users SET role = 'superuser' WHERE id = (SELECT MIN(id) FROM users);

-- 2. Make role non-nullable with default and add check constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superuser', 'user', 'viewer'));

-- 3. Security question columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT;

-- 4. Must-change-password flag (for admin password resets)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Platform-level settings (invite code hash, future settings)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 6. Peer access grants (who can view whose data)
CREATE TABLE IF NOT EXISTS viewer_access (
  id         SERIAL PRIMARY KEY,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (owner_id, viewer_id)
);
