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
   * Groups articles by their file_id
   */
  private groupArticlesByFile(articles: Article[]): ArticlesByFile {
    return articles.reduce((acc, article) => {
      if (!acc[article.file_id]) {
        acc[article.file_id] = [];
      }
      acc[article.file_id].push(article);
      return acc;
    }, {} as ArticlesByFile);
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
   * Processes all articles that need evaluation
   */
  async processArticles(): Promise<{
    processedCount: number;
    results: Array<{
      articleId: string;
      fileId: string;
      decision?: DecisionType;
      status: "success" | "error";
      error?: string;
    }>;
  }> {
    const results: Array<{
      articleId: string;
      fileId: string;
      decision?: DecisionType;
      status: "success" | "error";
      error?: string;
    }> = [];
    let processedCount = 0;

    try {
      // Get AI settings
      const settings = await this.supabaseUtils.getLatestAISettings();

      // Get articles that need evaluation
      const articles = await this.supabaseUtils.getArticlesForEvaluation(settings.batch_size || 10);

      if (!articles || articles.length === 0) {
        return { processedCount: 0, results: [] };
      }

      // Group articles by file
      const articlesByFile = this.groupArticlesByFile(articles);

      // Process each file group
      for (const [fileId, fileArticles] of Object.entries(articlesByFile)) {
        console.log(`Processing file group ${fileId} with ${fileArticles.length} articles...`);

        // Get file and session information
        const file = await this.supabaseUtils.getFile(fileId);
        const session = await this.supabaseUtils.getReviewSession(file.session_id);
        const criterias = JSON.stringify(session.criterias || []);

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
    } catch (error) {
      console.error("Error in article processing:", error);
      throw error;
    }

    return { processedCount, results };
  }
} 