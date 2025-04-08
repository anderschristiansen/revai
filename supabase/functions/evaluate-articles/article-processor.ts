import type { Article, ArticlesByFile, DecisionType, AISettings } from "./types.ts";
import { SupabaseUtils } from "./supabase-utils.ts";
import { OpenAIUtils } from "./openai-utils.ts";

export class ArticleProcessor {
  private supabaseUtils: SupabaseUtils;
  private openaiUtils: OpenAIUtils;

  constructor(supabaseUtils: SupabaseUtils, openaiUtils: OpenAIUtils) {
    this.supabaseUtils = supabaseUtils;
    this.openaiUtils = openaiUtils;
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
    try {
      console.log(`Processing article ${article.id}...`);
      
      const evaluation = await this.openaiUtils.evaluateArticle(
        article.title,
        article.abstract,
        criterias,
        settings
      );

      console.log(`Received evaluation for article ${article.id}:`, evaluation);

      await this.supabaseUtils.updateArticleEvaluation(
        article.id,
        evaluation.decision,
        evaluation.explanation
      );

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`Error processing article ${article.id}:`, errorMessage);
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
    console.log(`Starting evaluation for session ${sessionId}`);
    
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

      // Get session details for criteria
      const session = await this.supabaseUtils.getReviewSession(sessionId);
      const criterias = JSON.stringify(session.criterias || []);

      // Process articles in batches until max batch size is reached
      // (Note: We're processing only one batch per run of the Edge Function)
      const articles = await this.supabaseUtils.getArticlesForEvaluationBySession(sessionId, batchSize);
      
      if (!articles || articles.length === 0) {
        // No articles to process means we're done with this session
        await this.supabaseUtils.markSessionEvaluationCompleted(sessionId);
        console.log(`Completed evaluation for session ${sessionId}, no articles found`);
        return { sessionId, processedCount: 0, results: [], isCompleted: true };
      }
      
      // Group articles by file
      const articlesByFile = this.groupArticlesByFile(articles);
      
      // Process each file group
      for (const [fileId, fileArticles] of Object.entries(articlesByFile)) {
        console.log(`Processing file group ${fileId} with ${fileArticles.length} articles...`);
        
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
      }
      
      // Check if there are still more articles to process after this batch
      const hasMoreArticles = await this.supabaseUtils.sessionHasArticlesForEvaluation(sessionId);
      isCompleted = !hasMoreArticles;
      
      // Only mark the session as completed if all articles have been processed
      if (isCompleted) {
        await this.supabaseUtils.markSessionEvaluationCompleted(sessionId);
        console.log(`Completed evaluation for session ${sessionId}, all articles processed`);
      } else {
        console.log(`Batch completed for session ${sessionId}, more articles remain for processing`);
        // Keep the session marked as running, but don't update awaiting_ai_evaluation
      }
      
    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
      // Even if there's an error, try to mark the session as not running
      try {
        // We don't mark as completed, just reset the running state
        await this.supabaseUtils.markSessionEvaluationFailed(sessionId);
      } catch (markError) {
        console.error(`Failed to mark session ${sessionId} as failed:`, markError);
      }
    }

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
        return { sessionCount: 0, totalProcessedCount: 0, sessionResults: [] };
      }
      
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
      console.error("Error in session processing:", error);
      throw error;
    }

    return {
      sessionCount: sessionResults.length,
      totalProcessedCount,
      sessionResults,
    };
  }
} 