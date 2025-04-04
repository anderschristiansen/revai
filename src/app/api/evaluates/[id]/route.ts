import { NextRequest, NextResponse } from "next/server";
import { openaiService } from "@/lib/openai";
import { getSupabase } from "@/lib/supabase";
import { DecisionType, Article } from "@/lib/types";

const supabase = getSupabase();

type EvaluateArticleRequest = {
  title: string;
  abstract: string;
  criteria: string;
};

type EvaluateArticleResponse = {
  articleId: string;
  decision: DecisionType;
  explanation: string;
};

type ErrorResponse = {
  error: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<EvaluateArticleResponse | ErrorResponse>> {
  try {
    const articleId = params.id;
    
    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }
    
    const { title, abstract, criteria } = await request.json() as EvaluateArticleRequest;

    if (!title || !abstract || !criteria) {
      return NextResponse.json(
        { error: "Title, abstract, and criteria are required" },
        { status: 400 }
      );
    }

    // Evaluate the article with OpenAI using our service
    const result = await openaiService.evaluateArticle(title, abstract, criteria);

    // Update the article in the database
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        ai_decision: result.decision,
        ai_explanation: result.explanation,
        needs_ai_evaluation: false,
      })
      .eq("id", articleId);

    if (updateError) {
      console.error(`Error updating article ${articleId}:`, updateError);
      return NextResponse.json(
        { error: "Failed to update article in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articleId,
      decision: result.decision,
      explanation: result.explanation,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to process evaluation request" },
      { status: 500 }
    );
  }
}

/**
 * Fetch an article's evaluation status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<Partial<Article> | ErrorResponse>> {
  try {
    const articleId = params.id;
    
    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }
    
    // Fetch the article from the database
    const { data: article, error } = await supabase
      .from("articles")
      .select("id, title, abstract, ai_decision, ai_explanation, user_decision")
      .eq("id", articleId)
      .single<Partial<Article>>();
      
    if (error) {
      console.error(`Error fetching article ${articleId}:`, error);
      return NextResponse.json(
        { error: "Failed to fetch article from database" },
        { status: 500 }
      );
    }
    
    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
} 