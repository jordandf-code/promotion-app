-- Migration 1C: Structured 360 feedback
-- Run in Supabase SQL editor AFTER migration_layer0e.sql

-- Add structured dimensions column to existing feedback table
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS dimensions JSONB,
  ADD COLUMN IF NOT EXISTS review_token_id INTEGER REFERENCES review_tokens(id);

-- Index for looking up feedback by review token
CREATE INDEX IF NOT EXISTS idx_feedback_review_token ON feedback(review_token_id);

-- Ensure submitted_at column exists (some environments may have created_at instead)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE feedback ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
