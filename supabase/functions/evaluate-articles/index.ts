// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:/@kitsonk/xhr";
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const supabase = createClient(
  Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!,
  Deno.env.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")!
);

// Type definitions based on the application
type DecisionType = "Include" | "Exclude" | "Unsure";

// Type for the article update
interface ArticleUpdate {
  ai_decision: DecisionType;
  ai_explanation: string;
  needs_ai_evaluation: boolean;
}

Deno.serve(async () => {
  // Fetch articles that need evaluation (limit to reasonable batch size)
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, abstract, file_id')
    .eq('needs_ai_evaluation', true)
    .limit(10); // Process in batches of 10

  if (articlesError) {
    console.error("Error fetching articles:", articlesError);
    return new Response(
      JSON.stringify({ error: articlesError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!articles || articles.length === 0) {
    return new Response(
      JSON.stringify({ message: "No articles to evaluate" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const results = [];
    
    // Group articles by file_id to minimize database queries
    const articlesByFile = articles.reduce((acc, article) => {
      if (!acc[article.file_id]) {
        acc[article.file_id] = [];
      }
      acc[article.file_id].push(article);
      return acc;
    }, {});
    
    // Process each file group
    for (const [fileId, fileArticles] of Object.entries(articlesByFile)) {
      // First, get the file to find its session_id
      const { data: file, error: fileError } = await supabase
        .from("files")
        .select("session_id")
        .eq("id", fileId)
        .single();
        
      if (fileError || !file) {
        console.error(`Error fetching file ${fileId}:`, fileError);
        continue;
      }
      
      // Now get the review session with the criterias
      const { data: session, error: sessionError } = await supabase
        .from("review_sessions")
        .select("criterias")
        .eq("id", file.session_id)
        .single();
        
      if (sessionError || !session) {
        console.error(`Error fetching review session for file ${fileId}:`, sessionError);
        continue;
      }
      
      const criterias = JSON.stringify(session.criterias || []);
      
      // Process each article in this file
      for (const article of fileArticles) {
        const prompt = `
Evaluate the following research article based on these criteria:
${criterias}

Title: ${article.title}
Abstract: ${article.abstract}

Provide your evaluation in JSON format with:
1. decision: One of ["Include", "Exclude", "Unsure"]
2. explanation: Detailed reasoning for your decision (200-300 words)
`;

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an expert academic reviewer evaluating research articles for relevance and quality." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.5,
          response_format: { type: "json_object" }
        });

        const responseContent = response.choices[0].message.content;
        const evaluation = JSON.parse(responseContent);

        // Update article with evaluation result
        const updateData: ArticleUpdate = {
          ai_decision: evaluation.decision as DecisionType,
          ai_explanation: evaluation.explanation,
          needs_ai_evaluation: false,
        };

        const { error: updateError } = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', article.id);

        if (updateError) {
          console.error(`Error updating article ${article.id}:`, updateError);
        } else {
          results.push({
            articleId: article.id,
            fileId: article.file_id,
            decision: evaluation.decision,
            status: "success"
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Evaluated ${results.length} articles successfully`,
        results 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/evaluate-articles' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{}'

*/
