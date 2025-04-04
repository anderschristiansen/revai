import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openaiService } from "@/lib/openai";

/**
 * Cron job to evaluate a batch of articles marked as needs_ai_evaluation = true
 */
export async function GET() {
  try {
    // Get 10 articles that need evaluation
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, abstract, file_id')
      .eq('needs_ai_evaluation', true)
      .limit(10); // Batch size

    if (error || !articles || articles.length === 0) {
      return NextResponse.json({ message: "No articles to process." }, { status: 200 });
    }

    console.log(`Processing ${articles.length} articles...`);

    for (const article of articles) {
      try {
        // Fetch session criterias
        const { data: session, error: sessionError } = await supabase
          .from('review_sessions')
          .select('criterias')
          .eq('id', article.file_id)
          .single();

        if (sessionError || !session?.criterias) {
          console.error(`Failed to get criterias for article ${article.id}`);
          continue;
        }

        // Prepare criterias
        const criterias = JSON.stringify(session.criterias);

        // Evaluate article
        const result = await openaiService.evaluateArticle(article.title, article.abstract, criterias);

        // Update article with result
        await supabase
          .from('articles')
          .update({
            ai_decision: result.decision,
            ai_explanation: result.explanation,
            needs_ai_evaluation: false,
          })
          .eq('id', article.id);
      } catch (innerError) {
        console.error(`Error processing article ${article.id}:`, innerError);
        continue;
      }
    }

    return NextResponse.json({ message: "Batch processed successfully." }, { status: 200 });
  } catch (error) {
    console.error("Batch evaluation error:", error);
    return NextResponse.json({ error: "Failed to process batch." }, { status: 500 });
  }
}
