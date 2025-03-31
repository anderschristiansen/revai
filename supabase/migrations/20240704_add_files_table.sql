-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  articles_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add files_count column to review_sessions
ALTER TABLE review_sessions
ADD COLUMN IF NOT EXISTS files_count INTEGER DEFAULT 0;

-- Create index on files.session_id
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);

-- First create a backup of the articles table
CREATE TABLE IF NOT EXISTS articles_backup AS
SELECT * FROM articles;

-- Modify articles table to reference files instead of sessions
-- Add file_id column
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS file_id UUID;

-- Create a temporary connection between old and new schema
-- For each session, create one file entry and update all articles to point to that file
DO $$
DECLARE
  session_record RECORD;
  new_file_id UUID;
BEGIN
  FOR session_record IN SELECT DISTINCT session_id FROM articles LOOP
    -- Create a file record for this session
    INSERT INTO files (session_id, filename, articles_count)
    SELECT 
      session_record.session_id, 
      'legacy_import.txt', 
      COUNT(*) 
    FROM articles 
    WHERE session_id = session_record.session_id
    RETURNING id INTO new_file_id;
    
    -- Update all articles for this session to point to the new file
    UPDATE articles 
    SET file_id = new_file_id 
    WHERE session_id = session_record.session_id;
    
    -- Update the files_count in review_sessions
    UPDATE review_sessions 
    SET files_count = 1 
    WHERE id = session_record.session_id;
  END LOOP;
END $$;

-- Drop the old session_id foreign key constraint if it exists
ALTER TABLE articles
DROP CONSTRAINT IF EXISTS articles_session_id_fkey;

-- Add foreign key constraint from file_id to files.id with cascade delete
ALTER TABLE articles
ADD CONSTRAINT articles_file_id_fkey
FOREIGN KEY (file_id)
REFERENCES files(id)
ON DELETE CASCADE;

-- We're keeping session_id column for now for backward compatibility
-- but it will be removed in a future migration after all app code is updated 