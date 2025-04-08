-- Add the awaiting_ai_evaluation column to the review_sessions table
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS awaiting_ai_evaluation BOOLEAN DEFAULT false;

-- Set existing sessions to not awaiting evaluation
UPDATE review_sessions SET awaiting_ai_evaluation = false; 