-- Remove updated_at column from files table
ALTER TABLE files
DROP COLUMN IF EXISTS updated_at; 