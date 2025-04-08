import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { AISettings, Article, File, ReviewSession } from "./types.ts";

/**
 * Structured logger with timestamp and consistent format
 */
const logger = {
  info: (context: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ 
      timestamp, 
      level: 'INFO', 
      context, 
      message,
      ...(data ? { data } : {})
    }));
  },
  warning: (context: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({
      timestamp,
      level: 'WARNING',
      context,
      message,
      ...(data ? { data } : {})
    }));
  },
  error: (context: string, message: string, error?: unknown, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(JSON.stringify({
      timestamp,
      level: 'ERROR',
      context,
      message,
      error: errorMessage,
      ...(errorStack ? { stack: errorStack } : {}),
      ...(data ? { data } : {})
    }));
  }
};

export class SupabaseUtils {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase', 'Supabase client initialized');
  }

  /**
   * Gets file IDs for a specific session
   */
  private async getFileIdsForSession(sessionId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('files')
        .select('id')
        .eq('session_id', sessionId);

      if (error) {
        logger.error('Supabase', `Failed to fetch file IDs for session ${sessionId}`, error);
        throw new Error(`Failed to fetch file IDs: ${error.message}`);
      }

      const fileIds = (data || []).map(file => file.id);
      return fileIds;
    } catch (error) {
      logger.error('Supabase', `Error in getFileIdsForSession for ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Fetches the latest AI settings from the database
   */
  async getLatestAISettings(): Promise<AISettings> {
    try {
      const { data: aiSettings, error } = await this.supabase
        .from('ai_settings')
        .select('instructions, temperature, max_tokens, seed, model, batch_size')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !aiSettings) {
        logger.error('Supabase', 'Failed to fetch AI settings', error);
        throw new Error(`Failed to fetch AI settings: ${error?.message || 'No settings found'}`);
      }

      return aiSettings as AISettings;
    } catch (error) {
      logger.error('Supabase', 'Error in getLatestAISettings', error);
      throw error;
    }
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
    try {
      const { data: file, error } = await this.supabase
        .from('files')
        .select('session_id')
        .eq('id', fileId)
        .single();
      
      if (error || !file) {
        logger.error('Supabase', `Failed to fetch file ${fileId}`, error);
        throw new Error(`Failed to fetch file: ${error?.message || 'File not found'}`);
      }

      return file as File;
    } catch (error) {
      logger.error('Supabase', `Error fetching file ${fileId}`, error);
      throw error;
    }
  }

  /**
   * Fetches a review session by its ID
   */
  async getReviewSession(sessionId: string): Promise<ReviewSession> {
    try {
      const { data: session, error } = await this.supabase
        .from('review_sessions')
        .select('criterias')
        .eq('id', sessionId)
        .single();
      
      if (error || !session) {
        logger.error('Supabase', `Failed to fetch review session ${sessionId}`, error);
        throw new Error(`Failed to fetch review session: ${error?.message || 'Session not found'}`);
      }

      return session as ReviewSession;
    } catch (error) {
      logger.error('Supabase', `Error fetching review session ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Updates an article with AI evaluation results
   */
  async updateArticleEvaluation(
    articleId: string,
    decision: string,
    explanation: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('articles')
        .update({
          ai_decision: decision,
          ai_explanation: explanation,
          needs_ai_evaluation: false,
        })
        .eq('id', articleId);
      
      if (error) {
        logger.error('Supabase', `Failed to update article ${articleId}`, error);
        throw new Error(`Failed to update article: ${error.message}`);
      }
    } catch (error) {
      logger.error('Supabase', `Error updating article ${articleId}`, error);
      throw error;
    }
  }

  /**
   * Gets sessions that are awaiting AI evaluation
   */
  async getSessionsAwaitingEvaluation(limit = 1): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('review_sessions')
        .select('id')
        .eq('awaiting_ai_evaluation', true)
        .limit(limit);
      
      if (error) {
        logger.error('Supabase', 'Failed to fetch sessions awaiting evaluation', error);
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      return (data || []).map(session => session.id);
    } catch (error) {
      logger.error('Supabase', 'Error in getSessionsAwaitingEvaluation', error);
      throw error;
    }
  }

  /**
   * Mark a session as evaluation running
   */
  async markSessionEvaluationRunning(sessionId: string, running: boolean): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('review_sessions')
        .update({
          ai_evaluation_running: running,
          // Keep awaiting_ai_evaluation true while processing
          last_evaluated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as ${running ? 'running' : 'not running'}`, error);
        throw new Error(`Failed to update session status: ${error.message}`);
      }
    } catch (error) {
      logger.error('Supabase', `Error marking session ${sessionId} as ${running ? 'running' : 'not running'}`, error);
      throw error;
    }
  }

  /**
   * Mark a session as evaluation completed
   */
  async markSessionEvaluationCompleted(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('review_sessions')
        .update({
          awaiting_ai_evaluation: false,
          ai_evaluated: true,
        })
        .eq('id', sessionId);
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as completed`, error);
        throw new Error(`Failed to update session status: ${error.message}`);
      }
    } catch (error) {
      logger.error('Supabase', `Error marking session ${sessionId} as completed`, error);
      throw error;
    }
  }

  /**
   * Mark a session as evaluation failed (error occurred)
   */
  async markSessionEvaluationFailed(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('review_sessions')
        .update({
          ai_evaluation_running: false,
          // Keep awaiting_ai_evaluation true so it will be retried
        })
        .eq('id', sessionId);
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as failed`, error);
        throw new Error(`Failed to update session status: ${error.message}`);
      }
    } catch (error) {
      logger.error('Supabase', `Error marking session ${sessionId} as failed`, error);
      throw error;
    }
  }

  /**
   * Checks if a session has articles that need evaluation
   */
  async sessionHasArticlesForEvaluation(sessionId: string): Promise<boolean> {
    try {
      // First get all file IDs for this session
      const fileIds = await this.getFileIdsForSession(sessionId);
      
      if (fileIds.length === 0) {
        return false;
      }

      const { count, error } = await this.supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('needs_ai_evaluation', true)
        .in('file_id', fileIds);
      
      if (error) {
        logger.error('Supabase', `Failed to check articles for session ${sessionId}`, error);
        throw new Error(`Failed to check articles: ${error.message}`);
      }

      return count !== null && count > 0;
    } catch (error) {
      logger.error('Supabase', `Error checking articles for session ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Fetches articles that need AI evaluation for a specific session
   */
  async getArticlesForEvaluationBySession(sessionId: string, batchSize: number): Promise<Article[]> {
    try {
      // First get all file IDs for this session
      const fileIds = await this.getFileIdsForSession(sessionId);
      
      if (fileIds.length === 0) {
        return [];
      }

      const { data: articles, error } = await this.supabase
        .from('articles')
        .select('id, title, abstract, file_id')
        .eq('needs_ai_evaluation', true)
        .in('file_id', fileIds)
        .limit(batchSize);
      
      if (error) {
        logger.error('Supabase', `Failed to fetch articles for session ${sessionId}`, error);
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      return articles as Article[];
    } catch (error) {
      logger.error('Supabase', `Error fetching articles for session ${sessionId}`, error);
      throw error;
    }
  }
} 