import { NextRequest, NextResponse } from "next/server";
import { evaluateArticle } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { AiSettings } from "@/lib/types";

// Define a simplified version of Article just for this API route
interface ApiArticle {
  id: string;
  title: string;
  abstract: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const { sessionId, articleIds } = await request.json();

    if (!sessionId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: "Session ID and article IDs are required" },
        { status: 400 }
      );
    }

    // Get the session criteria
    const { data: session, error: sessionError } = await supabase
      .from("review_sessions")
      .select("criteria")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to retrieve session criteria" },
        { status: 404 }
      );
    }

    if (!session.criteria) {
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
      .single();

    if (aiSettingsError) {
      console.error("Error retrieving AI settings:", aiSettingsError);
      // We'll continue with default settings
    }

    const batchSize = aiSettings?.batch_size || 10;
    
    // Process articles in batches asynchronously
    // Trigger batch processing without waiting for completion
    processBatchesAsync(
      sessionId, 
      articleIds, 
      session.criteria, 
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
  criteria: string, 
  aiSettings: AiSettings, 
  batchSize: number
) {
  try {
    // Get the articles to evaluate
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, abstract")
      .in("id", articleIds)
      .eq("session_id", sessionId);

    if (articlesError || !articles) {
      console.error("Failed to retrieve articles:", articlesError);
      return;
    }

    // Process in batches
    const batches = [];
    for (let i = 0; i < articles.length; i += batchSize) {
      batches.push(articles.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        // Process each batch
        await processBatch(batch, criteria, aiSettings);
        
        // Optional: Update session with progress
        await supabase
          .from("review_sessions")
          .update({
            last_evaluated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      } catch (batchError) {
        console.error("Error processing batch:", batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Completed evaluation of all ${articles.length} articles for session ${sessionId}`);
  } catch (error) {
    console.error("Error in batch processing:", error);
  }
}

// Function to process a single batch of articles
async function processBatch(articles: ApiArticle[], criteria: string, aiSettings: AiSettings) {
  for (const article of articles) {
    try {
      // Evaluate with OpenAI
      const result = await evaluateArticle(
        article.title,
        article.abstract,
        criteria,
        aiSettings
      );

      // Update the article with AI evaluation
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          ai_decision: result.decision,
          ai_explanation: result.explanation,
        })
        .eq("id", article.id);

      if (updateError) {
        console.error("Error updating article:", updateError);
      }
    } catch (error) {
      console.error(`Failed to evaluate article ${article.id}:`, error);
      // Continue with the next article even if one fails
    }
  }
} 