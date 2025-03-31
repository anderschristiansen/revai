// Common types used throughout the application

export type DecisionType = "Include" | "Exclude" | "Unsure";

export type Criterion = {
  id: string;
  text: string;
};

export type CriteriaList = Criterion[];

export type File = {
  id: string;
  session_id: string;
  filename: string;
  articles_count: number;
  created_at: string;
};

export interface FileWithArticles extends File {
  id: string;
  articles: Article[];
}

export type Article = {
  id: string;
  file_id: string;
  title: string;
  abstract: string;
  full_text: string;
  ai_decision?: DecisionType;
  ai_explanation?: string;
  user_decision?: DecisionType;
  needs_review: boolean;
};

export type ParsedArticle = {
  id: number;
  title: string;
  abstract: string;
  fullText: string;
};

export type SessionRecord = {
  id: string;
  title: string;
  articles_count: number;
  files_count: number;
  criterias: CriteriaList;
  created_at: string;
  updated_at?: string;
  last_evaluated_at?: string;
  ai_evaluated: boolean;
  ai_evaluation_running?: boolean;
  files_processed: boolean;
  files_upload_running?: boolean;
};

export type SessionView = SessionRecord & {
  reviewed_count: number;
  excluded_count: number;
  pending_count: number;
  unsure_count: number;
  ai_evaluated_count: number;
  ai_included_count: number;
  ai_excluded_count: number;
  ai_unsure_count: number;
  articles: Article[];
  files: FileWithArticles[];
};

export type AISettings = {
  instructions: string;
  temperature: number;
  max_tokens: number;
  seed: number;
  model: string;
  batch_size?: number;
};

// API-specific types
export type ApiArticle = Pick<Article, 'id' | 'title' | 'abstract'> & {
  file_id: string;
};

export type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};

export type EvaluateRequest = {
  sessionId: string;
  articleIds: string[];
};

export type EvaluateResponse = {
  message: string;
  count: number;
};

export type ErrorResponse = {
  error: string;
};
