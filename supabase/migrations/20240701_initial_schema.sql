-- Initial schema for Systematic Review Assistant

-- Create review_sessions table
CREATE TABLE IF NOT EXISTS review_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    criteria TEXT DEFAULT '',
    articles_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    abstract TEXT,
    full_text TEXT,
    ai_decision TEXT CHECK (ai_decision IN ('Yes', 'No') OR ai_decision IS NULL),
    ai_explanation TEXT,
    user_decision TEXT CHECK (user_decision IN ('Yes', 'No') OR user_decision IS NULL),
    needs_review BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_review_sessions_created_at ON review_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_session_id ON articles(session_id);

-- Row Level Security (RLS) policies
-- Uncomment these if you want to implement RLS for multi-user application

-- Enable row level security
-- ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies that use the auth.uid() to match the auth.users.id column
-- CREATE POLICY "Users can view their own review sessions" ON review_sessions FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own review sessions" ON review_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own review sessions" ON review_sessions FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own review sessions" ON review_sessions FOR DELETE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can view their own articles" ON articles FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own articles" ON articles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own articles" ON articles FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own articles" ON articles FOR DELETE USING (auth.uid() = user_id); 