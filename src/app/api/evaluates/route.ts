import { NextRequest, NextResponse } from "next/server";
import { openaiService } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { 
  CriteriaList, 
  ApiArticle, 
  EvaluateRequest, 
  EvaluateResponse, 
  ErrorResponse,
  SessionRecord 
} from "@/lib/types";

// Function return types
type ProcessBatchResult = Promise<void>;
type ProcessBatchesResult = Promise<void>;

export async function POST(request: NextRequest): Promise<NextResponse<EvaluateResponse | ErrorResponse>> {
  try {
    const { sessionId, articleIds } = await request.json() as EvaluateRequest;

    if (!sessionId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: "Session ID and article IDs are required" },
        { status: 400 }
      );
    }

    // Get the session criteria
    const { data: session, error: sessionError } = await supabase
      .from("review_sessions")
      .select("criterias")
      .eq("id", sessionId)
      .single<Pick<SessionRecord, 'id' | 'criterias'>>();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to retrieve session criteria" },
        { status: 404 }
      );
    }

    if (!session.criterias || session.criterias.length === 0) {
      return NextResponse.json(
        { error: "No criteria found for this session" },
        { status: 400 }
      );
    }

    // Get AI settings to determine batch size
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from("ai_settings")
      .select("batch_size")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (aiSettingsError) {
      console.error("Failed to fetch AI settings:", aiSettingsError);
      return NextResponse.json(
        { error: "Failed to retrieve AI settings" },
        { status: 500 }
      );
    }

    const batchSize = aiSettings?.batch_size || 10; // Default to 10 if not set

    // Ensure ai_evaluation_running is set to true in the database
    const { error: updateError } = await supabase
      .from("review_sessions")
      .update({
        ai_evaluation_running: true,
        last_evaluated_at: new Date().toISOString()
      })
      .eq("id", sessionId);
      
    if (updateError) {
      console.error("Error setting ai_evaluation_running flag:", updateError);
      // Continue anyway as it's not critical
    }
    
    // Process articles in batches asynchronously
    // Trigger batch processing without waiting for completion
    processBatchesAsync(
      sessionId, 
      articleIds, 
      session.criterias,
      batchSize
    );

    return NextResponse.json({
      message: "Article evaluation started",
      count: articleIds.length,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to process evaluation request" },
      { status: 500 }
    );
  }
}

// Function to process batches asynchronously
async function processBatchesAsync(
  sessionId: string, 
  articleIds: string[], 
  criteria: CriteriaList,
  batchSize: number
): ProcessBatchesResult {
  try {
    // Get the articles to evaluate
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, abstract, file_id")
      .in("id", articleIds);

    if (articlesError) {
      console.error("Failed to retrieve articles:", articlesError);
      return;
    }

    if (!articles || articles.length === 0) {
      console.error("No articles found to evaluate");
      return;
    }

    // Type assertion for articles
    const typedArticles = articles as ApiArticle[];
    console.log(`Found ${typedArticles.length} articles to evaluate`);

    // Process in batches
    const batches: ApiArticle[][] = [];
    for (let i = 0; i < typedArticles.length; i += batchSize) {
      batches.push(typedArticles.slice(i, i + batchSize));
    }

    console.log(`Created ${batches.length} batches of size ${batchSize}`);

    for (const batch of batches) {
      try {
        console.log(`Processing batch of ${batch.length} articles`);
        // Process each batch
        await processBatch(batch, criteria);
        console.log(`Completed batch of ${batch.length} articles`);
      } catch (batchError) {
        console.error("Error processing batch:", batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Completed evaluation of all ${typedArticles.length} articles for session ${sessionId}`);
    
    // Now that all batches have been processed, set ai_evaluation_running to false
    const { error: updateError } = await supabase
      .from("review_sessions")
      .update({
        ai_evaluation_running: false,
        last_evaluated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
      
    if (updateError) {
      console.error("Error updating session when completing batch:", updateError);
    }
  } catch (error) {
    console.error("Error in batch processing:", error);
    
    // If there was an error, still try to set ai_evaluation_running to false
    try {
      await supabase
        .from("review_sessions")
        .update({
          ai_evaluation_running: false
        })
        .eq("id", sessionId);
    } catch (updateError) {
      console.error("Error resetting batch status after error:", updateError);
    }
  }
}

// Function to process a single batch of articles
async function processBatch(
  articles: ApiArticle[], 
  criteria: CriteriaList, 
): ProcessBatchResult {
  for (const article of articles) {
    try {
      console.log(`Evaluating article: ${article.id}`);
      // Format criteria for OpenAI evaluation
      const formattedCriteria = criteria.map(c => c.text).join('\n');

      // Evaluate with OpenAI using our service
      const result = await openaiService.evaluateArticle(
        article.title,
        article.abstract,
        formattedCriteria
      );

      console.log(`Article ${article.id} evaluation result:`, result.decision);

      // Update the article with AI evaluation
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          ai_decision: result.decision,
          ai_explanation: result.explanation,
        })
        .eq("id", article.id);

      if (updateError) {
        console.error(`Error updating article ${article.id}:`, updateError);
      } else {
        console.log(`Successfully updated article ${article.id}`);
      }
    } catch (error) {
      console.error(`Failed to evaluate article ${article.id}:`, error);
      // Continue with the next article even if one fails
    }
  }
} 