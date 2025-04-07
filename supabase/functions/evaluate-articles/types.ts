// Type definitions for the evaluate-articles Edge Function

export type DecisionType = "Include" | "Exclude" | "Unsure";

export interface Article {
  id: string;
  title: string;
  abstract: string;
  file_id: string;
}

export interface File {
  session_id: string;
}

export interface ReviewSession {
  criterias: string[];
}

export interface ArticlesByFile {
  [key: string]: Article[];
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface Evaluation {
  decision: DecisionType;
  explanation: string;
}

export interface AISettings {
  instructions: string;
  temperature: number;
  max_tokens: number;
  seed: number;
  model: string;
  batch_size?: number;
}

export interface ArticleUpdate {
  ai_decision: DecisionType;
  ai_explanation: string;
  needs_ai_evaluation: boolean;
} 