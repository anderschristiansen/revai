import type { Article, ArticlesByFile, DecisionType, AISettings } from "./types.ts";
import { SupabaseUtils } from "./supabase-utils.ts";
import { OpenAIUtils } from "./openai-utils.ts";
import { logger } from "./logger.ts";

export interface ArticleEvaluationResult {
  fileId: string;
  title: string;
  decision: string;
  reasoning: string;
  processingTime: number;
}

export class ArticleProcessor {
  private supabaseUtils: SupabaseUtils;
  private openaiUtils: OpenAIUtils;

  constructor(supabaseUtils: SupabaseUtils, openaiUtils: OpenAIUtils) {
    this.supabaseUtils = supabaseUtils;
    this.openaiUtils = openaiUtils;
    logger.info("ArticleProcessor", "Article processor initialized");
  }

  /**
   * Groups articles by file for efficient processing
   */
  private groupArticlesByFile(articles: Article[]): ArticlesByFile {
    return articles.reduce((acc: ArticlesByFile, article) => {
      if (!acc[article.file_id]) {
        acc[article.file_id] = [];
      }
      acc[article.file_id].push(article);
      return acc;
    }, {});
  }

  /**
   * Processes a single article
   */
  private async processArticle(
    article: Article,
    criterias: string,
    settings: AISettings
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    try {
      logger.info('ArticleEval', `Processing article ${article.id}`, { 
        articleId: article.id,
        fileId: article.file_id
      });
      
      const evaluation = await this.openaiUtils.evaluateArticle(
        article.title,
        article.abstract,
        criterias,
        settings
      );

      const processingTime = Date.now() - startTime;
      logger.info('ArticleEval', `Completed evaluation for article ${article.id}`, {
        articleId: article.id,
        fileId: article.file_id,
        decision: evaluation.decision,
        processingTimeMs: processingTime
      });

      await this.supabaseUtils.updateArticleEvaluation(
        article.id,
        evaluation.decision,
        evaluation.explanation
      );

      return { success: true };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      logger.error('ArticleEval', `Failed to evaluate article ${article.id}`, error, {
        articleId: article.id,
        fileId: article.file_id,
        processingTimeMs: processingTime
      });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Processes a single review session that's awaiting evaluation
   */
  async processSession(sessionId: string): Promise<{
    sessionId: string;
    processedCount: number;
    results: Array<{
      articleId: string;
      fileId: string;
      status: "success" | "error";
      error?: string;
    }>;
    isCompleted: boolean;
  }> {
    const sessionStartTime = Date.now();
    logger.info('SessionEval', `Starting evaluation for session ${sessionId}`);
    
    // First, mark the session as running
    await this.supabaseUtils.markSessionEvaluationRunning(sessionId);
    
    const results: Array<{
      articleId: string;
      fileId: string;
      status: "success" | "error";
      error?: string;
    }> = [];
    let processedCount = 0;
    let isCompleted = false;

    try {
      // Get AI settings
      const settings = await this.supabaseUtils.getLatestAISettings();
      const batchSize = settings.batch_size || 10;
      logger.info('SessionEval', `Using batch size ${batchSize}`, { sessionId, batchSize });

      // Get session details for criteria
      const session = await this.supabaseUtils.getReviewSession(sessionId);
      const criterias = JSON.stringify(session.criterias || []);

      // Process articles in batches until max batch size is reached
      // (Note: We're processing only one batch per run of the Edge Function)
      const articles = await this.supabaseUtils.getArticlesForEvaluationBySession(sessionId, batchSize);
      
      if (!articles || articles.length === 0) {
        // No articles to process means we're done with this session
        await this.supabaseUtils.markSessionEvaluationCompleted(sessionId);
        logger.info('SessionEval', `Session ${sessionId} has no articles to process, marking as completed`);
        return { sessionId, processedCount: 0, results: [], isCompleted: true };
      }
      
      logger.info('SessionEval', `Retrieved ${articles.length} articles for session ${sessionId}`, {
        sessionId,
        articleCount: articles.length
      });
      
      // Group articles by file
      const articlesByFile = this.groupArticlesByFile(articles);
      const fileGroups = Object.keys(articlesByFile).length;
      
      logger.info('SessionEval', `Grouped articles into ${fileGroups} file groups`, {
        sessionId,
        fileCount: fileGroups,
        filesWithCounts: Object.entries(articlesByFile).map(([fileId, articles]) => ({ 
          fileId, 
          count: articles.length 
        }))
      });
      
      // Process each file group
      for (const [fileId, fileArticles] of Object.entries(articlesByFile)) {
        const fileStartTime = Date.now();
        logger.info('SessionEval', `Processing file ${fileId} with ${fileArticles.length} articles`, {
          sessionId,
          fileId,
          articleCount: fileArticles.length
        });
        
        // Process each article in the file
        for (const article of fileArticles) {
          const result = await this.processArticle(article, criterias, settings);
          
          results.push({
            articleId: article.id,
            fileId: article.file_id,
            status: result.success ? "success" : "error",
            error: result.error,
          });

          if (result.success) {
            processedCount++;
          }
        }
        
        const fileProcessingTime = Date.now() - fileStartTime;
        logger.info('SessionEval', `Completed processing file ${fileId}`, {
          sessionId,
          fileId,
          processed: fileArticles.length,
          successful: fileArticles.filter((_, i) => results[results.length - fileArticles.length + i].status === "success").length,
          errors: fileArticles.filter((_, i) => results[results.length - fileArticles.length + i].status === "error").length,
          processingTimeMs: fileProcessingTime
        });
      }
      
      // Check if there are still more articles to process after this batch
      const hasMoreArticles = await this.supabaseUtils.sessionHasArticlesForEvaluation(sessionId);
      isCompleted = !hasMoreArticles;
      
      // Only mark the session as completed if all articles have been processed
      if (isCompleted) {
        await this.supabaseUtils.markSessionEvaluationCompleted(sessionId);
        logger.info('SessionEval', `All articles processed for session ${sessionId}, marking as completed`);
      } else {
        logger.info('SessionEval', `Batch completed for session ${sessionId}, more articles remain`, {
          sessionId,
          processedInBatch: processedCount,
          hasMoreArticles
        });
      }
      
    } catch (error) {
      logger.error('SessionEval', `Error processing session ${sessionId}`, error);
      
      // Even if there's an error, try to mark the session as not running
      try {
        // We don't mark as completed, just reset the running state
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        await this.supabaseUtils.markSessionEvaluationFailed(sessionId, errorMessage);
        logger.info('SessionEval', `Marked session ${sessionId} as failed after error`);
      } catch (markError) {
        logger.error('SessionEval', `Failed to mark session ${sessionId} as failed`, markError);
      }
    }

    const sessionProcessingTime = Date.now() - sessionStartTime;
    logger.info('SessionEval', `Session processing summary for ${sessionId}`, {
      sessionId,
      processedCount,
      successCount: results.filter(r => r.status === "success").length,
      errorCount: results.filter(r => r.status === "error").length,
      isCompleted,
      processingTimeMs: sessionProcessingTime
    });

    return { sessionId, processedCount, results, isCompleted };
  }

  /**
   * Finds and processes sessions awaiting evaluation
   * Note: This method is kept for backward compatibility but is not used in the current approach
   * where we process one session at a time
   */
  async processSessions(): Promise<{
    sessionCount: number;
    totalProcessedCount: number;
    sessionResults: Array<{
      sessionId: string;
      processedCount: number;
      isCompleted: boolean;
    }>;
  }> {
    const startTime = Date.now();
    logger.info('BatchEval', `Starting batch processing of sessions`);
    
    const sessionResults: Array<{
      sessionId: string;
      processedCount: number;
      isCompleted: boolean;
    }> = [];
    let totalProcessedCount = 0;

    try {
      // Get sessions awaiting evaluation
      const sessionIds = await this.supabaseUtils.getSessionsAwaitingEvaluation();
      
      if (!sessionIds || sessionIds.length === 0) {
        logger.info('BatchEval', `No sessions awaiting evaluation found`);
        return { sessionCount: 0, totalProcessedCount: 0, sessionResults: [] };
      }
      
      logger.info('BatchEval', `Found ${sessionIds.length} sessions to process`, {
        count: sessionIds.length,
        sessionIds
      });
      
      // Process each session
      for (const sessionId of sessionIds) {
        const result = await this.processSession(sessionId);
        sessionResults.push({
          sessionId: result.sessionId,
          processedCount: result.processedCount,
          isCompleted: result.isCompleted
        });
        totalProcessedCount += result.processedCount;
      }
    } catch (error) {
      logger.error('BatchEval', `Error in batch processing`, error);
      throw error;
    }

    const processingTime = Date.now() - startTime;
    logger.info('BatchEval', `Batch processing completed`, {
      sessionCount: sessionResults.length,
      totalProcessedCount,
      processingTimeMs: processingTime,
      sessionResults
    });

    return {
      sessionCount: sessionResults.length,
      totalProcessedCount,
      sessionResults,
    };
  }
} 