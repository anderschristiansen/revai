-- Migration to update criteria with types

-- First, get all sessions with criteria
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id, criterias FROM review_sessions WHERE criterias IS NOT NULL) LOOP
        -- Update each criterion to add type if it doesn't have one
        IF (jsonb_typeof(r.criterias) = 'array') THEN
            UPDATE review_sessions
            SET criterias = (
                SELECT jsonb_agg(
                    CASE
                        WHEN jsonb_typeof(elem -> 'type') = 'null' THEN 
                            jsonb_set(elem, '{type}', '"inclusion"')
                        ELSE elem
                    END
                )
                FROM jsonb_array_elements(r.criterias) elem
            )
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$; 