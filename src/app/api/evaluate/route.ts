import { NextRequest, NextResponse } from "next/server";
import { evaluateArticle } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

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

    // Get the articles to evaluate
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, abstract")
      .in("id", articleIds)
      .eq("session_id", sessionId);

    if (articlesError || !articles) {
      return NextResponse.json(
        { error: "Failed to retrieve articles" },
        { status: 500 }
      );
    }

    // Get AI instructions from settings
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from("ai_settings")
      .select("instructions, temperature, max_tokens, seed, model")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (aiSettingsError) {
      console.error("Error retrieving AI settings:", aiSettingsError);
      // We'll continue with default settings
    }

    let evaluatedCount = 0;

    // Evaluate each article
    for (const article of articles) {
      try {
        // Evaluate with OpenAI
        const result = await evaluateArticle(
          article.title,
          article.abstract,
          session.criteria,
          aiSettings || undefined
        );

        // Update the article with AI evaluation
        const { error: updateError } = await supabase
          .from("articles")
          .update({
            ai_decision: result.decision,
            ai_explanation: result.explanation,
          })
          .eq("id", article.id);

        if (!updateError) {
          evaluatedCount++;
        } else {
          console.error("Error updating article:", updateError);
        }
      } catch (error) {
        console.error(`Failed to evaluate article ${article.id}:`, error);
        // Continue with the next article even if one fails
      }
    }

    return NextResponse.json({
      message: "Articles evaluated successfully",
      count: evaluatedCount,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to process evaluation request" },
      { status: 500 }
    );
  }
} 