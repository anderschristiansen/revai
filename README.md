# RevAI Monorepo

This repository contains both the web application and Supabase functions for the RevAI project - a systematic review assistant.

## Project Structure

- `web/` - Next.js web application
- `supabase/` - Supabase Edge Functions

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI

### Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the web application:
```bash
npm run dev
```

3. Deploy Supabase functions:
```bash
cd supabase
supabase functions deploy
```

## Environment Variables

Create a `.env.local` file in the `web` directory with:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

- The web application is deployed to Vercel
- Supabase functions are deployed using the Supabase CLI

# Systematic Review Assistant

A web-based tool that helps researchers screen large numbers of articles for systematic reviews using AI to assist with inclusion/exclusion decisions.

## Features

- Upload articles and inclusion criteria as text files
- Parse article entries from formatted text files
- AI evaluation using OpenAI GPT-3.5
- User review interface to accept or override AI suggestions
- Store results in Supabase database

## Tech Stack

- **Frontend**: Next.js (App Router)
- **Styling & Components**: ShadCN + Tailwind CSS
- **AI**: OpenAI GPT-3.5
- **Database**: Supabase
- **Hosting**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js (LTS version)
- OpenAI API key
- Supabase account and project

### Environment Setup

1. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Supabase Setup

1. Create a new Supabase project
2. Create the following tables:

**review_sessions**
```sql
create table review_sessions (
  id uuid primary key,
  criteria text not null,
  articles_count integer not null,
  created_at timestamp with time zone default now()
);
```

**articles**
```sql
create table articles (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references review_sessions(id),
  title text not null,
  abstract text,
  full_text text,
  ai_decision text check (ai_decision in ('Include', 'Exclude', 'Unsure')),
  ai_explanation text,
  user_decision text check (user_decision in ('Yes', 'No')),
  needs_review boolean default true,
  needs_ai_evaluation boolean default true,
  created_at timestamp with time zone default now()
);
```

## Criteria Types

The system supports two types of criteria:

1. **Inclusion Criteria**: Positive criteria that articles must match to be included (e.g., "Studies must include human subjects").
2. **Exclusion Criteria**: Negative criteria that articles must NOT match to be included (e.g., "Studies with patients with head issues").

When evaluating articles, the AI will:
- Include articles that meet all inclusion criteria AND don't match any exclusion criteria
- Exclude articles that either fail to meet any inclusion criteria OR match any exclusion criteria
- Mark as "Unsure" when there isn't enough information to decide

### Migration

To migrate existing criteria, run the SQL migration script:

```sql
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
```