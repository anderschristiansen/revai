import { NextRequest, NextResponse } from "next/server";
import { evaluateArticle } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { 
  AISettings, 
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
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

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

    // Get AI instructions from settings
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from("ai_settings")
      .select("instructions, temperature, max_tokens, seed, model, batch_size")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<AISettings>();

    if (aiSettingsError) {
      console.error("Error retrieving AI settings:", aiSettingsError);
      // We'll continue with default settings
    }

    const batchSize = aiSettings?.batch_size || 10;
    
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
      aiSettings ? {
        instructions: aiSettings.instructions,
        temperature: aiSettings.temperature,
        max_tokens: aiSettings.max_tokens,
        seed: aiSettings.seed,
        model: aiSettings.model,
        batch_size: aiSettings.batch_size || 10
      } : {
        instructions: '',
        temperature: 0.1,
        max_tokens: 500,
        seed: 12345,
        model: 'gpt-3.5-turbo',
        batch_size: 10
      }, 
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
  aiSettings: AISettings, 
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
        await processBatch(batch, criteria, aiSettings);
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
  aiSettings: AISettings
): ProcessBatchResult {
  for (const article of articles) {
    try {
      console.log(`Evaluating article: ${article.id}`);
      // Format criteria for OpenAI evaluation
      const formattedCriteria = criteria.map(c => c.text).join('\n');

      // Evaluate with OpenAI
      const result = await evaluateArticle(
        article.title,
        article.abstract,
        formattedCriteria,
        aiSettings
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