-- Add evaluation result columns to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS ai_decision decision_type,
ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
ADD COLUMN IF NOT EXISTS user_decision decision_type,
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT TRUE; 