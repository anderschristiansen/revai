// Common types used throughout the application

export type Criterion = {
  id: string;
  text: string;
};

export type Article = {
  id: string;
  session_id: string;
  title: string;
  abstract: string;
  full_text: string;
  ai_decision?: "Include" | "Exclude" | "Unsure";
  ai_explanation?: string;
  user_decision?: "Yes" | "No";
  needs_review: boolean;
  created_at?: string;
};

export type ParsedArticle = {
  id: number;
  title: string;
  abstract: string;
  fullText: string;
};

export type SessionData = {
  id: string;
  title: string;
  articles_count: number;
  criteria: string;
  created_at: string;
  updated_at?: string;
  last_evaluated_at?: string;
};

export type Session = {
  id: string;
  created_at: string;
  articles_count: number;
  criteria: string;
  title?: string;
  updated_at?: string;
  last_evaluated_at?: string;
  reviewed_count?: number;
  excluded_count?: number;
  pending_count?: number;
  articles: Article[];
  ai_evaluated_count?: number;
};

export type AiSettings = {
  instructions: string;
  temperature: number;
  max_tokens: number;
  seed: number;
  model: string;
  batch_size?: number;
};

export type EvaluationResult = {
  decision: "Include" | "Exclude" | "Unsure";
  explanation: string;
}; 