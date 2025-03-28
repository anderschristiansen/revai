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
  ai_decision?: "Yes" | "No";
  ai_explanation?: string;
  user_decision?: "Yes" | "No";
  needs_review: boolean;
};

export type SessionData = {
  id: string;
  title: string;
  articles_count: number;
  criteria: string;
  created_at: string;
  updated_at?: string;
}; 