import { NextRequest, NextResponse } from "next/server";
import { openaiService } from "@/lib/openai";
import { getArticleById, updateArticleEvaluation } from "@/lib/utils/supabase-utils";
import { DecisionType, Article } from "@/lib/types";

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
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<EvaluateArticleResponse | ErrorResponse>> {
  try {
    const articleId = (await context.params).id;
    if (!articleId) return NextResponse.json({ error: "Article ID not found" }, { status: 400 });

    const { title, abstract, criteria } = await request.json() as EvaluateArticleRequest;
    if (!title || !abstract || !criteria) {
      return NextResponse.json({ error: "Title, abstract, and criteria are required" }, { status: 400 });
    }

    // Evaluate the article with OpenAI
    const result = await openaiService.evaluateArticle(title, abstract, criteria);

    // Update the article in the database (via utils)
    await updateArticleEvaluation(articleId, result.decision, result.explanation);

    return NextResponse.json({
      articleId,
      decision: result.decision,
      explanation: result.explanation,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to process evaluation request" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<Partial<Article> | ErrorResponse>> {
  try {
    const articleId = params.id;
    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    const article = await getArticleById(articleId);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}
