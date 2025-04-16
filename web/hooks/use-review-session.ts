"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/sonner";
import { useSupabaseRealtime, useSessionStatusRealtime } from "@/hooks/use-supabase-realtime";
import { getSession, getFiles, getArticles } from "@/lib/utils/supabase-utils";
import type { ReviewSession, Article, CriteriaList, File as SessionFile } from "@/lib/types";

export function useReviewSession(sessionId: string) {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
  const [criteria, setCriteria] = useState<CriteriaList>([]);
  const [loading, setLoading] = useState(true);
  const [batchRunning, setBatchRunning] = useState(false);
  const [awaitingEvaluation, setAwaitingEvaluation] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const sessionData = await getSession(sessionId);
      const filesData = await getFiles(sessionId);
      const articlesData = await getArticles(filesData.map(f => f.id));

      setSession(sessionData);
      setSessionFiles(filesData);
      
      // Make sure all articles are loaded
      if (articlesData.length < sessionData.articles_count) {
        console.log(`Articles count mismatch: loaded ${articlesData.length} but session reports ${sessionData.articles_count}`);
        // Try loading articles again after a short delay
        setTimeout(async () => {
          const refreshedArticlesData = await getArticles(filesData.map(f => f.id));
          if (refreshedArticlesData.length > articlesData.length) {
            console.log(`Refreshed articles data: ${refreshedArticlesData.length} articles loaded`);
            setArticles(refreshedArticlesData);
          }
        }, 1000);
      } 
      
      setArticles(articlesData);
      setCriteria(sessionData.criterias || []);
      setBatchRunning(sessionData.ai_evaluation_running || false);
      setAwaitingEvaluation(sessionData.awaiting_ai_evaluation || false);
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Setup realtime subscriptions
  useSupabaseRealtime(["INSERT", "UPDATE", "DELETE"], "articles", (payload) => {
    if (!payload.new && !payload.old) return;

    if (payload.eventType === "INSERT") {
      setArticles(prev => [...prev, payload.new]);
    } else if (payload.eventType === "UPDATE") {
      setArticles(prev =>
        prev.map(article => article.id === payload.new.id ? { ...article, ...payload.new } : article)
      );
    } else if (payload.eventType === "DELETE") {
      setArticles(prev => prev.filter(article => article.id !== payload.old.id));
    }
  });

  useSupabaseRealtime(["UPDATE"], "review_sessions", (payload) => {
    if (payload.new?.id === sessionId) {
      // Update entire session object
      setSession(prev => prev ? { ...prev, ...payload.new } : null);
      
      // Update criteria if they've changed
      if (payload.new.criterias) {
        setCriteria(payload.new.criterias);
      }
      
      // If files_processed state changed to true, refresh articles data
      const newData = payload.new as Partial<ReviewSession>;
      const oldData = payload.old as Partial<ReviewSession>;
      
      if (newData.files_processed && (!oldData?.files_processed || newData.articles_count !== oldData.articles_count)) {
        const fetchUpdatedArticles = async () => {
          try {
            const filesData = await getFiles(sessionId);
            const articlesData = await getArticles(filesData.map(f => f.id));
            setArticles(articlesData);
          } catch (error) {
            console.error('Error refreshing articles:', error);
          }
        };
        fetchUpdatedArticles();
      }
    }
  });
  
  // Add status monitoring
  const handleStatusChange = useCallback((running: boolean, awaiting: boolean) => {
    setBatchRunning(running);
    setAwaitingEvaluation(awaiting);
    
    // Update the session object atomically
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ai_evaluation_running: running,
        awaiting_ai_evaluation: awaiting
      };
    });
  }, []);
  
  useSessionStatusRealtime(sessionId, handleStatusChange);

  // Start AI evaluation
  const startEvaluation = async () => {
    if (evaluating || batchRunning) return;
    setEvaluating(true);

    try {
      // Immediately update UI to show "In Queue" state
      setAwaitingEvaluation(true);
      
      const response = await fetch("/api/evaluates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, articleIds: articles.map(a => a.id) }),
      });

      const result = await response.json();
      if (!response.ok) {
        setAwaitingEvaluation(false); // Reset if there was an error
        throw new Error(result.error || "Failed to start evaluation");
      }
      toast.success(`Started evaluation of ${result.count} articles`);
    } catch (error) {
      console.error("Error starting evaluation:", error);
      toast.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setEvaluating(false);
    }
  };

  // Calculate stats
  const stats = {
    reviewed: articles.filter(a => a.user_decision).length,
    included: articles.filter(a => a.user_decision === "Include").length,
    excluded: articles.filter(a => a.user_decision === "Exclude").length,
    unsure: articles.filter(a => a.user_decision === "Unsure").length,
    
    aiReviewed: articles.filter(a => a.ai_decision).length,
    aiIncluded: articles.filter(a => a.ai_decision === "Include").length,
    aiExcluded: articles.filter(a => a.ai_decision === "Exclude").length,
    aiUnsure: articles.filter(a => a.ai_decision === "Unsure").length,
    
    disagreements: articles.filter(a => a.user_decision && a.ai_decision && a.user_decision !== a.ai_decision).length
  };

  return {
    session,
    articles,
    sessionFiles,
    criteria,
    loading,
    batchRunning,
    awaitingEvaluation,
    evaluating,
    stats,
    setArticles,
    setCriteria,
    startEvaluation
  };
} 