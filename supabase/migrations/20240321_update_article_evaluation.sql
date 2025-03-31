-- First, create a temporary column to store the combined evaluation result
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS evaluation_result JSONB;

-- Update the evaluation_result column with combined data from existing columns
UPDATE articles
SET evaluation_result = jsonb_build_object(
    'decision', ai_decision,
    'explanation', ai_explanation
)
WHERE ai_decision IS NOT NULL OR ai_explanation IS NOT NULL;

-- Drop the old columns
ALTER TABLE articles
DROP COLUMN IF EXISTS ai_decision,
DROP COLUMN IF EXISTS ai_explanation; 