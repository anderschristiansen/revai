-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE decision_type AS ENUM ('Include', 'Exclude', 'Unsure');

-- Create review_sessions table
CREATE TABLE review_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    articles_count INTEGER NOT NULL DEFAULT 0,
    files_count INTEGER NOT NULL DEFAULT 0,
    criterias JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    last_evaluated_at TIMESTAMPTZ,
    ai_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
    ai_evaluation_running BOOLEAN NOT NULL DEFAULT FALSE,
    files_processed BOOLEAN NOT NULL DEFAULT FALSE,
    files_upload_running BOOLEAN NOT NULL DEFAULT FALSE,
    needs_setup BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_session
        FOREIGN KEY(session_id)
        REFERENCES review_sessions(id)
        ON DELETE CASCADE
);

-- Create articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    full_text TEXT NOT NULL,
    ai_decision decision_type,
    ai_explanation TEXT,
    user_decision decision_type,
    needs_review BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_file
        FOREIGN KEY(file_id)
        REFERENCES files(id)
        ON DELETE CASCADE
);

-- Create ai_settings table
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL,
    temperature FLOAT NOT NULL,
    max_tokens INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    model TEXT NOT NULL,
    batch_size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_session
        FOREIGN KEY(session_id)
        REFERENCES review_sessions(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_review_sessions_created_at ON review_sessions(created_at);
CREATE INDEX idx_files_session_id ON files(session_id);
CREATE INDEX idx_articles_file_id ON articles(file_id);
CREATE INDEX idx_articles_user_decision ON articles(user_decision);
CREATE INDEX idx_articles_ai_decision ON articles(ai_decision);
CREATE INDEX idx_articles_needs_review ON articles(needs_review);
CREATE INDEX idx_ai_settings_session_id ON ai_settings(session_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_review_sessions_updated_at
    BEFORE UPDATE ON review_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at
    BEFORE UPDATE ON ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update article counts
CREATE OR REPLACE FUNCTION update_article_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE review_sessions
        SET articles_count = articles_count + 1
        WHERE id = (SELECT session_id FROM files WHERE id = NEW.file_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE review_sessions
        SET articles_count = articles_count - 1
        WHERE id = (SELECT session_id FROM files WHERE id = OLD.file_id);
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for article counts
CREATE TRIGGER update_article_counts_trigger
    AFTER INSERT OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_counts();

-- Create function to update file counts
CREATE OR REPLACE FUNCTION update_file_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE review_sessions
        SET files_count = files_count + 1
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE review_sessions
        SET files_count = files_count - 1
        WHERE id = OLD.session_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for file counts
CREATE TRIGGER update_file_counts_trigger
    AFTER INSERT OR DELETE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_file_counts(); 