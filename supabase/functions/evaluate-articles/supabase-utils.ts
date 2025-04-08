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
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Fetching file IDs for session ${sessionId}`);
      
      const { data, error } = await this.supabase
        .from('files')
        .select('id')
        .eq('session_id', sessionId);

      if (error) {
        const queryTime = Date.now() - startTime;
        logger.error('Supabase', `Failed to fetch file IDs for session ${sessionId}`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch file IDs: ${error.message}`);
      }

      const queryTime = Date.now() - startTime;
      const fileIds = (data || []).map(file => file.id);
      logger.info('Supabase', `Retrieved ${fileIds.length} file IDs for session ${sessionId}`, {
        sessionId,
        fileCount: fileIds.length,
        queryTimeMs: queryTime
      });

      return fileIds;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error in getFileIdsForSession for ${sessionId}`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Fetches the latest AI settings from the database
   */
  async getLatestAISettings(): Promise<AISettings> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', 'Fetching latest AI settings');
      
      const { data: aiSettings, error } = await this.supabase
        .from('ai_settings')
        .select('instructions, temperature, max_tokens, seed, model, batch_size')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const queryTime = Date.now() - startTime;
      
      if (error || !aiSettings) {
        logger.error('Supabase', 'Failed to fetch AI settings', error, {
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch AI settings: ${error?.message || 'No settings found'}`);
      }

      logger.info('Supabase', 'Successfully retrieved AI settings', {
        model: aiSettings.model,
        batchSize: aiSettings.batch_size,
        queryTimeMs: queryTime
      });

      return aiSettings as AISettings;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', 'Error in getLatestAISettings', error, {
        queryTimeMs: queryTime
      });
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
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Fetching file with ID ${fileId}`);
      
      const { data: file, error } = await this.supabase
        .from('files')
        .select('session_id')
        .eq('id', fileId)
        .single();

      const queryTime = Date.now() - startTime;
      
      if (error || !file) {
        logger.error('Supabase', `Failed to fetch file ${fileId}`, error, {
          fileId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch file: ${error?.message || 'File not found'}`);
      }

      logger.info('Supabase', `Successfully retrieved file ${fileId}`, {
        fileId,
        sessionId: file.session_id,
        queryTimeMs: queryTime
      });

      return file as File;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error fetching file ${fileId}`, error, {
        fileId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Fetches a review session by its ID
   */
  async getReviewSession(sessionId: string): Promise<ReviewSession> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Fetching review session ${sessionId}`);
      
      const { data: session, error } = await this.supabase
        .from('review_sessions')
        .select('criterias')
        .eq('id', sessionId)
        .single();

      const queryTime = Date.now() - startTime;
      
      if (error || !session) {
        logger.error('Supabase', `Failed to fetch review session ${sessionId}`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch review session: ${error?.message || 'Session not found'}`);
      }

      logger.info('Supabase', `Successfully retrieved session ${sessionId}`, {
        sessionId,
        hasCriterias: !!session.criterias && session.criterias.length > 0,
        criteriaCount: session.criterias?.length || 0,
        queryTimeMs: queryTime
      });

      return session as ReviewSession;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error fetching review session ${sessionId}`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
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
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Updating evaluation for article ${articleId}`, {
        articleId,
        decision
      });
      
      const { error } = await this.supabase
        .from('articles')
        .update({
          ai_decision: decision,
          ai_explanation: explanation,
          needs_ai_evaluation: false,
        })
        .eq('id', articleId);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to update article ${articleId}`, error, {
          articleId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to update article: ${error.message}`);
      }

      logger.info('Supabase', `Successfully updated article ${articleId}`, {
        articleId,
        decision,
        explanationLength: explanation.length,
        queryTimeMs: queryTime
      });
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error updating article ${articleId}`, error, {
        articleId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Gets sessions that are awaiting AI evaluation
   */
  async getSessionsAwaitingEvaluation(limit = 1): Promise<string[]> {
    const startTime = Date.now();
    try {
      // First recover any sessions that might be stuck
      await this.recoverStuckSessions();
      
      logger.info('Supabase', `Looking for sessions awaiting evaluation (limit: ${limit})`);
      
      const { data, error } = await this.supabase
        .from('review_sessions')
        .select('id')
        .eq('awaiting_ai_evaluation', true)
        .eq('ai_evaluation_running', false)
        .limit(limit);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', 'Failed to fetch sessions awaiting evaluation', error, {
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      const sessions = (data || []).map(session => session.id);
      logger.info('Supabase', `Found ${sessions.length} sessions awaiting evaluation`, {
        sessions,
        queryTimeMs: queryTime
      });

      return sessions;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', 'Error in getSessionsAwaitingEvaluation', error, {
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Mark a session as evaluation running
   */
  async markSessionEvaluationRunning(sessionId: string): Promise<void> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Marking session ${sessionId} as running`);
      
      const { error } = await this.supabase
        .from('review_sessions')
        .update({
          ai_evaluation_running: true,
          // Keep awaiting_ai_evaluation true while processing
          last_evaluated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as running`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to update session status: ${error.message}`);
      }

      logger.info('Supabase', `Successfully marked session ${sessionId} as running`, {
        sessionId,
        queryTimeMs: queryTime
      });
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error marking session ${sessionId} as running`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Mark a session as evaluation completed
   */
  async markSessionEvaluationCompleted(sessionId: string): Promise<void> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Marking session ${sessionId} as completed`);
      
      const { error } = await this.supabase
        .from('review_sessions')
        .update({
          ai_evaluation_running: false,
          awaiting_ai_evaluation: false,
          ai_evaluated: true,
        })
        .eq('id', sessionId);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as completed`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to update session status: ${error.message}`);
      }

      logger.info('Supabase', `Successfully marked session ${sessionId} as completed`, {
        sessionId,
        queryTimeMs: queryTime
      });
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error marking session ${sessionId} as completed`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Mark a session as evaluation failed (error occurred)
   */
  async markSessionEvaluationFailed(sessionId: string, errorMessage?: string): Promise<void> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Marking session ${sessionId} as failed`);
      
      const updateData: Record<string, any> = {
        ai_evaluation_running: false,
        // Keep awaiting_ai_evaluation true so it will be retried
      };
      
      // Add error message if provided
      if (errorMessage) {
        updateData.last_error = errorMessage;
      }
      
      const { error } = await this.supabase
        .from('review_sessions')
        .update(updateData)
        .eq('id', sessionId);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to mark session ${sessionId} as failed`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to update session status: ${error.message}`);
      }

      logger.info('Supabase', `Successfully marked session ${sessionId} as failed (will retry)`, {
        sessionId,
        hasErrorMessage: !!errorMessage,
        queryTimeMs: queryTime
      });
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error marking session ${sessionId} as failed`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Checks if a session has articles that need evaluation
   */
  async sessionHasArticlesForEvaluation(sessionId: string): Promise<boolean> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Checking if session ${sessionId} has articles for evaluation`);
      
      // First get all file IDs for this session
      const fileIds = await this.getFileIdsForSession(sessionId);
      
      if (fileIds.length === 0) {
        logger.info('Supabase', `No files found for session ${sessionId}, no articles to evaluate`);
        return false;
      }

      const { count, error } = await this.supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('needs_ai_evaluation', true)
        .in('file_id', fileIds);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to check articles for session ${sessionId}`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to check articles: ${error.message}`);
      }

      const hasMoreArticles = count !== null && count > 0;
      logger.info('Supabase', `Session ${sessionId} has ${count || 0} articles needing evaluation`, {
        sessionId,
        articleCount: count,
        hasMoreArticles,
        queryTimeMs: queryTime
      });

      return hasMoreArticles;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error checking articles for session ${sessionId}`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Fetches articles that need AI evaluation for a specific session
   */
  async getArticlesForEvaluationBySession(sessionId: string, batchSize: number): Promise<Article[]> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Fetching articles for evaluation in session ${sessionId}`, {
        sessionId,
        batchSize
      });
      
      // First get all file IDs for this session
      const fileIds = await this.getFileIdsForSession(sessionId);
      
      if (fileIds.length === 0) {
        logger.info('Supabase', `No files found for session ${sessionId}, returning empty articles array`);
        return [];
      }

      const { data: articles, error } = await this.supabase
        .from('articles')
        .select('id, title, abstract, file_id')
        .eq('needs_ai_evaluation', true)
        .in('file_id', fileIds)
        .limit(batchSize);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', `Failed to fetch articles for session ${sessionId}`, error, {
          sessionId,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      logger.info('Supabase', `Retrieved ${articles?.length || 0} articles for session ${sessionId}`, {
        sessionId,
        articleCount: articles?.length || 0,
        queryTimeMs: queryTime
      });

      return articles as Article[];
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', `Error fetching articles for session ${sessionId}`, error, {
        sessionId,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }

  /**
   * Recovers sessions that are stuck in a running state for too long
   * This helps prevent sessions from getting permanently stuck if an edge function crashes
   */
  async recoverStuckSessions(timeoutMinutes = 30): Promise<number> {
    const startTime = Date.now();
    try {
      logger.info('Supabase', `Looking for stuck sessions (timeout: ${timeoutMinutes} minutes)`);
      
      // Find sessions that have been in the running state for more than the timeout period
      const timeoutThreshold = new Date();
      timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - timeoutMinutes);
      
      const { data, error } = await this.supabase
        .from('review_sessions')
        .update({
          ai_evaluation_running: false,
          // Keep awaiting_ai_evaluation true so it will be processed again
          last_error: `Recovered from stuck state after ${timeoutMinutes} minutes timeout`
        })
        .eq('ai_evaluation_running', true)
        .lt('last_evaluated_at', timeoutThreshold.toISOString())
        .select('id');

      const queryTime = Date.now() - startTime;
      
      if (error) {
        logger.error('Supabase', 'Failed to recover stuck sessions', error, {
          timeoutMinutes,
          queryTimeMs: queryTime
        });
        throw new Error(`Failed to recover stuck sessions: ${error.message}`);
      }

      const recoveredCount = data?.length || 0;
      if (recoveredCount > 0) {
        logger.warning('Supabase', `Recovered ${recoveredCount} stuck sessions`, {
          timeoutMinutes,
          sessionIds: data?.map(s => s.id),
          queryTimeMs: queryTime
        });
      } else {
        logger.info('Supabase', 'No stuck sessions found', {
          timeoutMinutes,
          queryTimeMs: queryTime
        });
      }

      return recoveredCount;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error('Supabase', 'Error in recoverStuckSessions', error, {
        timeoutMinutes,
        queryTimeMs: queryTime
      });
      throw error;
    }
  }
} 