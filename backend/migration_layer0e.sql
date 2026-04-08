-- migration_layer0e.sql
-- Layer 0E: Role/permissions rework
-- Creates user_relationships table, migrates viewer_access data, adds review_tokens table.
-- Run in Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

-- 1. Create user_relationships table
CREATE TABLE IF NOT EXISTS user_relationships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('sponsor', 'peer')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, related_user_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_user_relationships_user ON user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_related ON user_relationships(related_user_id);

-- 2. Migrate existing viewer_access rows as 'peer' relationships
-- user_id = owner_id (the person whose data is being shared)
-- related_user_id = viewer_id (the person who can view)
INSERT INTO user_relationships (user_id, related_user_id, relationship_type, granted_at)
SELECT owner_id, viewer_id, 'peer', granted_at
FROM viewer_access
ON CONFLICT (user_id, related_user_id, relationship_type) DO NOTHING;

-- 3. Create review_tokens table for token-based reviewer access (no account needed)
CREATE TABLE IF NOT EXISTS review_tokens (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  reviewer_name TEXT,
  reviewer_email TEXT,
  purpose TEXT DEFAULT 'feedback',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token);
CREATE INDEX IF NOT EXISTS idx_review_tokens_owner ON review_tokens(owner_id);

-- Note: viewer_access table is kept for backward compatibility during transition.
-- It can be dropped in a future migration once all code uses user_relationships.
