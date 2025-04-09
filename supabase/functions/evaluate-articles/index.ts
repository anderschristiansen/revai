// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:/@kitsonk/xhr";
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { SupabaseUtils } from "./supabase-utils.ts";
import { OpenAIUtils } from "./openai-utils.ts";
import { ArticleProcessor } from "./article-processor.ts";
import { logger } from "./logger.ts";

const supabaseUtils = new SupabaseUtils(
  Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!,
  Deno.env.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")!
);

const openaiUtils = new OpenAIUtils(Deno.env.get("OPENAI_API_KEY")!);

const articleProcessor = new ArticleProcessor(supabaseUtils, openaiUtils);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const invocationId = `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  try {
    // Parse the request body
    const body = await req.json();
    
    // If this is a manual evaluation request
    if (body.articleId && body.title && body.abstract && body.criteria) {
      logger.info('EdgeFunction', `Processing manual evaluation for article ${body.articleId}`);
      
      // Get AI settings
      const settings = await supabaseUtils.getLatestAISettings();
      
      // Evaluate the article
      const evaluation = await openaiUtils.evaluateArticle(
        body.title,
        body.abstract,
        body.criteria,
        settings
      );
      
      // Update the article in the database
      await supabaseUtils.updateArticleEvaluation(
        body.articleId,
        evaluation.decision,
        evaluation.explanation
      );
      
      return new Response(
        JSON.stringify({
          invocationId,
          decision: evaluation.decision,
          explanation: evaluation.explanation
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    // Otherwise, process the session queue as before
    logger.info('EdgeFunction', `Starting evaluation process`);
    
    // Find sessions awaiting evaluation
    const sessionIds = await supabaseUtils.getSessionsAwaitingEvaluation();
    
    if (sessionIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          invocationId,
          message: "No sessions awaiting evaluation",
          sessionCount: 0,
          totalProcessedCount: 0
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Process just the first session in the queue
    const sessionId = sessionIds[0];
    logger.info('EdgeFunction', `Processing session ${sessionId}`);
    
    const startTime = Date.now();
    const result = await articleProcessor.processSession(sessionId);
    const processingTime = Date.now() - startTime;
    
    logger.info('EdgeFunction', `Completed processing session ${sessionId}`, {
      processedCount: result.processedCount,
      isCompleted: result.isCompleted
    });
    
    // Return information about the processing
    return new Response(
      JSON.stringify({ 
        invocationId,
        message: `Processed ${result.processedCount} articles for session ${sessionId}`,
        sessionId,
        processedCount: result.processedCount,
        isSessionCompleted: result.isCompleted,
        moreSessionsQueued: sessionIds.length > 1,
        processingTimeMs: processingTime,
        results: result.results
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    logger.error('EdgeFunction', `Error in evaluation process`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        invocationId,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
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
