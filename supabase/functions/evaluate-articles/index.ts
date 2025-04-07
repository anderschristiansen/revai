// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:/@kitsonk/xhr";
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { SupabaseUtils } from "./supabase-utils";
import { OpenAIUtils } from "./openai-utils";
import { ArticleProcessor } from "./article-processor";

const supabaseUtils = new SupabaseUtils(
  Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!,
  Deno.env.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")!
);

const openaiUtils = new OpenAIUtils(Deno.env.get("OPENAI_API_KEY")!);

const articleProcessor = new ArticleProcessor(supabaseUtils, openaiUtils);

Deno.serve(async () => {
  try {
    console.log("Starting article evaluation process...");
    
    const { processedCount, results } = await articleProcessor.processArticles();

    console.log(`Completed processing ${processedCount} articles`);
    return new Response(
      JSON.stringify({ 
        message: `Evaluated ${processedCount} articles successfully`,
        results 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in main function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
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
