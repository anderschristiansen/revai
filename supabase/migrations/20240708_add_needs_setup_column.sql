-- Add needs_setup column to review_sessions table
ALTER TABLE review_sessions
ADD COLUMN IF NOT EXISTS needs_setup BOOLEAN DEFAULT TRUE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_review_sessions_needs_setup ON review_sessions(needs_setup);

-- Update existing records to set needs_setup to false if they have articles or files
UPDATE review_sessions
SET needs_setup = FALSE
WHERE articles_count > 0 OR files_count > 0; 