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

Deno.serve(async () => {
  const invocationId = `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  try {
    logger.info('EdgeFunction', `Starting article evaluation process [${invocationId}]`);
    
    // First check for and recover any stuck sessions
    const recoveredSessions = await supabaseUtils.recoverStuckSessions();
    if (recoveredSessions > 0) {
      logger.warning('EdgeFunction', `Recovered ${recoveredSessions} stuck sessions [${invocationId}]`);
    }
    
    // Find sessions awaiting evaluation
    const sessionIds = await supabaseUtils.getSessionsAwaitingEvaluation();
    logger.info('EdgeFunction', `Found ${sessionIds.length} sessions awaiting evaluation`, { 
      invocationId, 
      count: sessionIds.length,
      sessionIds
    });

    if (sessionIds.length === 0) {
      logger.info('EdgeFunction', `No sessions to process, exiting [${invocationId}]`);
      return new Response(
        JSON.stringify({ 
          invocationId,
          message: "No sessions awaiting evaluation found",
          recoveredSessions,
          sessionCount: 0,
          totalProcessedCount: 0
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Process just the first session in the queue
    const sessionId = sessionIds[0];
    logger.info('EdgeFunction', `Processing session ${sessionId} [${invocationId}]`);
    
    const startTime = Date.now();
    const result = await articleProcessor.processSession(sessionId);
    const processingTime = Date.now() - startTime;
    
    logger.info('EdgeFunction', `Completed processing for session ${sessionId} [${invocationId}]`, {
      invocationId,
      sessionId,
      processedCount: result.processedCount,
      isCompleted: result.isCompleted,
      processingTimeMs: processingTime,
      remainingSessions: sessionIds.length - 1
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
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logger.error('EdgeFunction', `Error in evaluation process [${invocationId}]`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        invocationId,
        error: errorMessage 
      }),
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
