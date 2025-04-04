import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "./auth-utils";
import { ReviewSession, ReviewSessionView } from "@/lib/types";

/**
 * Insert a new review session
 */
export async function insertReviewSession(sessionData: Partial<Omit<ReviewSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('review_sessions')
    .insert({
      ...sessionData,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create review session:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a single review session owned by the current user
 */
export async function deleteReviewSession(sessionId: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('review_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error("Failed to delete review session:", error);
    throw new Error(error.message);
  }
}

/**
 * Delete all review sessions owned by the current user
 */
export async function deleteAllReviewSessions() {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('review_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error("Failed to delete all review sessions:", error);
    throw new Error(error.message);
  }
}

/**
 * Fetch all review sessions with files and articles
 */
export async function getReviewSessionsWithFilesAndArticles(): Promise<ReviewSessionView[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('review_sessions')
    .select(`
      *,
      files!fk_session(
        id,
        articles!articles_file_id_fkey(
          id,
          file_id,
          title,
          abstract,
          full_text,
          user_decision,
          needs_review,
          ai_decision,
          ai_explanation
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Failed to fetch sessions:", error);
    throw new Error(error.message);
  }

  return (data as ReviewSessionView[]) || [];
}
