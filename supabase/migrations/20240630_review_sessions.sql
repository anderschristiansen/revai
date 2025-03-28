-- This is a SQL migration file for Supabase

-- Update review_sessions table to include title and updated_at
ALTER TABLE review_sessions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_review_sessions_created_at ON review_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_criteria_session_id ON criteria(session_id);
CREATE INDEX IF NOT EXISTS idx_articles_session_id ON articles(session_id); 