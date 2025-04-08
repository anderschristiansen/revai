import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "./auth-utils";
import type { ReviewSession, ReviewSessionView, File, Article, DecisionType, AISettings } from "@/lib/types";

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

export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as ReviewSession;
}

export async function getFiles(sessionId: string) {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as File[];
}

export async function getArticles(fileIds: string[]) {
  if (fileIds.length === 0) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .in("file_id", fileIds)
    .order("id");

  if (error) throw error;
  return data as Article[];
}

export async function updateSessionTitle(sessionId: string, newTitle: string) {
  const { error } = await supabase
    .from("review_sessions")
    .update({
      title: newTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw error;
}


/**
 * Insert a new file record.
 */
export async function insertFile(sessionId: string, filename: string, articlesCount: number) {
  const { data, error } = await supabase
    .from("files")
    .insert({
      session_id: sessionId,
      filename,
      articles_count: articlesCount,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create file entry:", error);
    throw new Error(error?.message || "Failed to create file.");
  }

  return data.id;
}

/**
 * Insert multiple articles at once.
 */
export async function insertArticles(fileId: string, articles: { title: string; abstract: string; fullText: string }[]) {
  const payload = articles.map(article => ({
    file_id: fileId,
    title: article.title,
    abstract: article.abstract,
    full_text: article.fullText,
    needs_review: true,
    needs_ai_evaluation: true,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("articles").insert(payload);

  if (error) {
    console.error("Failed to insert articles:", error);
    throw new Error(error.message);
  }

  return payload.length;
}

/**
 * Delete a file by ID.
 */
export async function deleteFile(fileId: string) {
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (error) {
    console.error("Failed to delete file:", error);
    throw new Error(error.message);
  }
}


// Mark articles as needing AI evaluation
export async function markArticlesForEvaluation(articleIds: string[]) {
  const { error } = await supabase
    .from("articles")
    .update({ needs_ai_evaluation: true })
    .in("id", articleIds);

  if (error) {
    console.error("Failed to update articles for evaluation:", error);
    throw new Error("Failed to mark articles for evaluation");
  }
}

// Mark a session as AI evaluation running
export async function markSessionEvaluationRunning(sessionId: string) {
  const { error } = await supabase
    .from("review_sessions")
    .update({
      ai_evaluation_running: true,
      last_evaluated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Failed to update session evaluation status:", error);
    // Not critical, but still throw if you want to make it strict:
    throw new Error("Failed to mark session evaluation running");
  }
}

// Update an article's AI evaluation
export async function updateArticleEvaluation(articleId: string, decision: DecisionType, explanation: string) {
  const { error } = await supabase
    .from("articles")
    .update({
      ai_decision: decision,
      ai_explanation: explanation,
      needs_ai_evaluation: false,
    })
    .eq("id", articleId);

  if (error) {
    console.error(`Failed to update article ${articleId}:`, error);
    throw new Error("Failed to update article in database");
  }
}

// Get a single article by ID
export async function getArticleById(articleId: string): Promise<Partial<Article> | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, abstract, ai_decision, ai_explanation, user_decision")
    .eq("id", articleId)
    .single<Partial<Article>>();

  if (error) {
    console.error(`Failed to fetch article ${articleId}:`, error);
    throw new Error("Failed to fetch article from database");
  }

  return data;
}

export async function updateArticleUserDecision(articleId: string, decision: DecisionType) {
  const { error } = await supabase
    .from("articles")
    .update({
      user_decision: decision,
      needs_review: false,
    })
    .eq("id", articleId);

  if (error) {
    console.error("Failed to update article decision:", error);
    throw new Error(error.message);
  }
}

/**
 * Fetches the latest AI settings from the database.
 * Throws an error if not found.
 */
export async function getAISettings(): Promise<AISettings> {
  const { data, error } = await supabase
    .from('ai_settings')
    .select('instructions, temperature, max_tokens, seed, model, batch_size')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Failed to fetch AI settings:", error.message);
    throw new Error(`Failed to fetch AI settings: ${error.message}`);
  }

  if (!data) {
    console.error("No AI settings found in database.");
    throw new Error("No AI settings found in database.");
  }

  return data as AISettings;
}

export async function updateAISettings(aiSettings: AISettings) {
  const { error } = await supabase
    .from('ai_settings')
    .update({
      ...aiSettings,
      updated_at: new Date().toISOString()
    })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
}

/**
 * Get session criterias by session ID
 */
export async function getSessionCriteriasBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from("review_sessions")
    .select("criterias")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.criterias) throw new Error("No criterias found for session.");
  return data.criterias;
}

/**
 * Get session ID from a file ID
 */
export async function getSessionIdByFileId(fileId: string) {
  const { data, error } = await supabase
    .from("files")
    .select("session_id")
    .eq("id", fileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.session_id) throw new Error("Session ID not found for file.");
  return data.session_id;
}

/**
 * Update an article with a user decision
 */
export async function updateArticleDecision(articleId: string, decision: DecisionType) {
  const { error } = await supabase
    .from("articles")
    .update({ user_decision: decision })
    .eq("id", articleId);

  if (error) throw new Error(error.message);
}