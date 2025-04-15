-- Add prompt_template column to ai_settings table
ALTER TABLE public.ai_settings ADD COLUMN IF NOT EXISTS prompt_template TEXT;
COMMENT ON COLUMN public.ai_settings.prompt_template IS 'Custom prompt template for article evaluation';

-- Set a default value for existing records
UPDATE public.ai_settings SET prompt_template = 
'You are a scientific reviewer evaluating research articles for a systematic review.

Given:
- A list of inclusion criteria (positive criteria) if provided.
- A list of exclusion criteria (negative criteria) if provided.
- An article''s title and abstract (if available).

Task:
1. If inclusion criteria are provided, check if the article meets them.
2. If exclusion criteria are provided, check if the article matches any exclusion criteria.
3. The decision rules are:
   - INCLUDE: If the article meets all inclusion criteria (or none were provided) AND doesn''t match any exclusion criteria (or none were provided).
   - EXCLUDE: If the article fails to meet any inclusion criteria OR matches any exclusion criteria.
   - UNSURE: If there isn''t enough information to determine whether the article meets the criteria.

Respond ONLY with a valid JSON object in this exact format:

{
  "decision": "Include" | "Exclude" | "Unsure",
  "explanation": "A concise explanation (2–5 sentences) justifying the decision. Be specific."
}

Important Rules:
- Do not explain the criteria again; only assess the article.
- If no abstract is provided, base your judgment only on the title.
- Always use double quotes for JSON keys and values.
- Do NOT add any text outside the JSON object.

---

${criterias}

ARTICLE TITLE:
${title}

ARTICLE ABSTRACT:
${abstract}'
WHERE prompt_template IS NULL; 