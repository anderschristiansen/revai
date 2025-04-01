import { NextRequest, NextResponse } from "next/server";
import { evaluateArticle } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { DecisionType } from "@/lib/types";

type SingleEvaluateRequest = {
  articleId: string;
  title: string;
  abstract: string;
  criteria: string;
};

type SingleEvaluateResponse = {
  articleId: string;
  decision: DecisionType;
  explanation: string;
};

type ErrorResponse = {
  error: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<SingleEvaluateResponse | ErrorResponse>> {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing in production environment");
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please check your environment variables." },
        { status: 500 }
      );
    }

    // Get the OpenAI API key validation logic from the evaluateArticle function
    // instead of duplicating it here

    const { articleId, title, abstract, criteria } = await request.json() as SingleEvaluateRequest;

    if (!articleId || !title || !abstract || !criteria) {
      return NextResponse.json(
        { error: "Article ID, title, abstract, and criteria are required" },
        { status: 400 }
      );
    }

    // Evaluate the article with OpenAI using the evaluateArticle function that already
    // fetches AI settings from Supabase (temperature, model, instructions, etc.)
    const result = await evaluateArticle(title, abstract, criteria);

    // Update the article in the database
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        ai_decision: result.decision,
        ai_explanation: result.explanation,
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
      { error: "Failed to process single evaluation request" },
      { status: 500 }
    );
  }
} 