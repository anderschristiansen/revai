-- Add batch_size column to ai_settings table
ALTER TABLE ai_settings 
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 10;

-- Update existing records to have the default batch size
UPDATE ai_settings
SET batch_size = 10
WHERE batch_size IS NULL; 