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