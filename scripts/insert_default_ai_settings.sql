-- Insert default AI settings
INSERT INTO ai_settings (
    instructions,
    temperature,
    max_tokens,
    seed,
    model,
    batch_size,
    created_at,
    updated_at
) VALUES (
    'Please evaluate the following article against the inclusion criteria. Provide a clear decision (include/exclude) and explain your reasoning.',
    0.1,
    500,
    12345,
    'gpt-3.5-turbo',
    10,
    NOW(),
    NOW()
); 