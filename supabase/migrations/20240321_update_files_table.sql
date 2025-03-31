-- Add articles_count column to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS articles_count INTEGER NOT NULL DEFAULT 0;

-- Add created_at column to files table if it doesn't exist
ALTER TABLE files
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); 