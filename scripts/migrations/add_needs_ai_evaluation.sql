-- Add the needs_ai_evaluation column to the articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS needs_ai_evaluation BOOLEAN DEFAULT true;

-- Update existing articles to set needs_ai_evaluation to false if they already have an AI decision
UPDATE articles SET needs_ai_evaluation = false WHERE ai_decision IS NOT NULL;

-- Update existing articles to set needs_ai_evaluation to true if they don't have an AI decision
UPDATE articles SET needs_ai_evaluation = true WHERE ai_decision IS NULL; 