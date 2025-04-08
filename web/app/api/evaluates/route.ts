import { NextRequest, NextResponse } from "next/server";
import { EvaluateRequest, EvaluateResponse, ErrorResponse } from "@/lib/types";
import { markArticlesForEvaluation, markSessionAwaitingEvaluation } from "@/lib/utils/supabase-utils";

export async function POST(request: NextRequest): Promise<NextResponse<EvaluateResponse | ErrorResponse>> {
  try {
    const { sessionId, articleIds } = await request.json() as EvaluateRequest;

    if (!sessionId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "Session ID and article IDs are required" }, { status: 400 });
    }

    // 1. Mark articles as needing evaluation
    await markArticlesForEvaluation(articleIds);

    // 2. Mark session as awaiting evaluation (instead of running)
    await markSessionAwaitingEvaluation(sessionId);

    return NextResponse.json({
      message: "Marked articles for evaluation",
      count: articleIds.length,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to process evaluation request" }, { status: 500 });
  }
}
