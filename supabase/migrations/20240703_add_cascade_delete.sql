-- This migration adds ON DELETE CASCADE to article references to ensure articles are deleted when their session is deleted

-- First drop existing foreign key constraint if it exists
ALTER TABLE articles
DROP CONSTRAINT IF EXISTS articles_session_id_fkey;

-- Add foreign key constraint with ON DELETE CASCADE
ALTER TABLE articles
ADD CONSTRAINT articles_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES review_sessions(id)
ON DELETE CASCADE; 