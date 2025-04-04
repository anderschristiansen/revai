import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { EvaluateRequest, EvaluateResponse, ErrorResponse } from "@/lib/types";

const supabase = getSupabase();

export async function POST(request: NextRequest): Promise<NextResponse<EvaluateResponse | ErrorResponse>> {
  try {
    const { sessionId, articleIds } = await request.json() as EvaluateRequest;

    if (!sessionId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "Session ID and article IDs are required" }, { status: 400 });
    }

    // Mark articles as needing AI evaluation
    const { error: articlesError } = await supabase
      .from("articles")
      .update({ needs_ai_evaluation: true })
      .in("id", articleIds);

    if (articlesError) {
      console.error("Failed to update articles:", articlesError);
      return NextResponse.json({ error: "Failed to mark articles for evaluation" }, { status: 500 });
    }

    // Mark session as running evaluation
    const { error: sessionError } = await supabase
      .from("review_sessions")
      .update({
        ai_evaluation_running: true,
        last_evaluated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("Failed to update session:", sessionError);
      // Not critical
    }

    return NextResponse.json({
      message: "Marked articles for evaluation",
      count: articleIds.length,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to process evaluation request" }, { status: 500 });
  }
}
