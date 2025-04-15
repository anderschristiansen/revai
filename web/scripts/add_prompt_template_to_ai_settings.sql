-- Add prompt_template column to ai_settings table
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS prompt_template TEXT;

-- Update the insert default settings script to include a default value for prompt_template
UPDATE web_scripts 
SET script_content = replace(
    script_content,
    'INSERT INTO ai_settings (',
    'INSERT INTO ai_settings (\n    prompt_template,'
)
WHERE script_name = 'insert_default_ai_settings';

UPDATE web_scripts 
SET script_content = replace(
    script_content,
    ') VALUES (',
    ') VALUES (\n    NULL,'
)
WHERE script_name = 'insert_default_ai_settings';

COMMENT ON COLUMN ai_settings.prompt_template IS 'Custom prompt template for article evaluation'; 