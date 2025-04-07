import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { AISettings, Article, File, ReviewSession } from "./types.ts";

export class SupabaseUtils {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Fetches the latest AI settings from the database
   */
  async getLatestAISettings(): Promise<AISettings> {
    const { data: aiSettings, error } = await this.supabase
      .from('ai_settings')
      .select('instructions, temperature, max_tokens, seed, model, batch_size')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !aiSettings) {
      throw new Error(`Failed to fetch AI settings: ${error?.message || 'No settings found'}`);
    }

    return aiSettings as AISettings;
  }

  /**
   * Fetches articles that need AI evaluation
   */
  async getArticlesForEvaluation(batchSize: number): Promise<Article[]> {
    const { data: articles, error } = await this.supabase
      .from('articles')
      .select('id, title, abstract, file_id')
      .eq('needs_ai_evaluation', true)
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    return articles as Article[];
  }

  /**
   * Fetches a file by its ID
   */
  async getFile(fileId: string): Promise<File> {
    const { data: file, error } = await this.supabase
      .from('files')
      .select('session_id')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      throw new Error(`Failed to fetch file: ${error?.message || 'File not found'}`);
    }

    return file as File;
  }

  /**
   * Fetches a review session by its ID
   */
  async getReviewSession(sessionId: string): Promise<ReviewSession> {
    const { data: session, error } = await this.supabase
      .from('review_sessions')
      .select('criterias')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      throw new Error(`Failed to fetch review session: ${error?.message || 'Session not found'}`);
    }

    return session as ReviewSession;
  }

  /**
   * Updates an article with AI evaluation results
   */
  async updateArticleEvaluation(
    articleId: string,
    decision: string,
    explanation: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('articles')
      .update({
        ai_decision: decision,
        ai_explanation: explanation,
        needs_ai_evaluation: false,
      })
      .eq('id', articleId);

    if (error) {
      throw new Error(`Failed to update article: ${error.message}`);
    }
  }
} 