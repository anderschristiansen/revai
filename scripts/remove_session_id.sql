-- Remove session_id column from ai_settings table
ALTER TABLE ai_settings DROP COLUMN IF EXISTS session_id; 