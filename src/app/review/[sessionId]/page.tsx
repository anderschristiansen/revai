"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { notFound, useParams } from "next/navigation";
import { ArticlesTable } from "@/components/articles-table";
import { UploadForm } from "@/components/upload-form";
import { toast } from "@/components/ui/sonner";
import { SessionData } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { PencilIcon, CheckIcon, XIcon, ListChecks } from "lucide-react";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LottieCoffeeLoader } from "@/components/ui/lottie-coffee-loader";
import { supabase } from "@/lib/supabase";
import { Tooltip } from "@/components/ui/tooltip";

// Import the Lottie animation data
// Note: You need to place your Lottie JSON file in the public/lottie directory
// and update the path/filename below
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";

type Article = {
  id: string;
  session_id: string;
  title: string;
  abstract: string;
  full_text: string;
  ai_decision?: "Yes" | "No";
  ai_explanation?: string;
  user_decision?: "Yes" | "No";
  needs_review: boolean;
};

export default function ReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [criteriaLines, setCriteriaLines] = useState<string[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [loaderVariant, setLoaderVariant] = useState(0);

  const loadSessionData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from("review_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      setSession(sessionData);
      setNewTitle(sessionData.title || "");
      
      if (sessionData.criteria) {
        setCriteriaLines(sessionData.criteria.split('\n').filter((line: string) => line.trim()));
      }
      
    } catch (error) {
      console.error("Error loading session data:", error);
      toast.error("Could not load session data");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const loadArticles = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("session_id", sessionId)
        .order("id");

      if (error) {
        throw error;
      }

      setArticles(data || []);
    } catch (error) {
      console.error("Error loading articles:", error);
      toast.error("Could not load articles");
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData();
    loadArticles();
    
    const articlesSubscription = supabase
      .channel('articles_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'articles',
        filter: `session_id=eq.${sessionId}` 
      }, () => {
        loadArticles();
      })
      .subscribe();
    
    const sessionSubscription = supabase
      .channel('session_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'review_sessions',
        filter: `id=eq.${sessionId}` 
      }, () => {
        loadSessionData();
      })
      .subscribe();
    
    return () => {
      articlesSubscription.unsubscribe();
      sessionSubscription.unsubscribe();
    };
  }, [sessionId, loadSessionData, loadArticles]);

  async function updateSessionTitle() {
    if (!newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("review_sessions")
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) {
        throw error;
      }

      // Update local state
      setSession(prev => prev ? {...prev, title: newTitle} : null);
      setIsEditingTitle(false);
      toast.success("Title updated");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Could not update title");
    }
  }

  function cancelTitleEdit() {
    setNewTitle(session?.title || "");
    setIsEditingTitle(false);
  }

  const updateUserDecision = React.useCallback(async (articleId: string, decision: "Yes" | "No") => {
    try {
      // Update local state immediately for instant feedback
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article.id === articleId 
            ? { ...article, user_decision: decision, needs_review: false } 
            : article
        )
      );
      
      // Update database
      const { error } = await supabase
        .from("articles")
        .update({
          user_decision: decision,
          needs_review: false,
        })
        .eq("id", articleId);
        
      if (error) throw error;
      
      toast.success("Decision saved");
    } catch (error) {
      console.error("Error saving decision:", error);
      toast.error("Could not save decision");
      // Reload articles to ensure consistency
      loadArticles();
    }
  }, [loadArticles]);

  async function evaluateArticles() {
    if (evaluating) return;
    
    // Check if all articles have already been evaluated
    if (articles.every(article => article.ai_decision !== undefined)) {
      return;
    }
    
    setEvaluating(true);
    // Randomly select a loader variant
    setLoaderVariant(Math.floor(Math.random() * 3));
    
    try {
      // Get articles that need AI evaluation
      const articlesToEvaluate = articles.filter(
        article => !article.ai_decision
      );
      
      if (articlesToEvaluate.length === 0) {
        setEvaluating(false);
        return;
      }
      
      toast.info(`Evaluating ${articlesToEvaluate.length} articles...`);
      
      // Call the API to evaluate articles
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          articleIds: articlesToEvaluate.map(article => article.id),
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to evaluate articles");
      }
      
      // Refresh articles
      await loadArticles();
      toast.success(`${result.count} articles were successfully evaluated`);
    } catch (error: unknown) {
      console.error("Error evaluating articles:", error);
      
      // Show a more specific error message
      if (error instanceof Error && error.message?.includes("API key")) {
        toast.error("OpenAI API key is missing or invalid. Please check your environment variables.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Could not evaluate articles";
        toast.error(errorMessage);
      }
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Loading session data...</p>
      </div>
    );
  }

  if (!session) {
    return notFound();
  }

  const mainContent = (
    <div 
      className="container mx-auto py-8 space-y-6" 
      onSubmit={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <header className="flex justify-between items-start">
        <div>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xl font-bold w-auto min-w-[300px]"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={updateSessionTitle}
                title="Save"
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={cancelTitleEdit}
                title="Cancel"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{session.title || "Systematic Review"}</h1>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsEditingTitle(true)}
                title="Edit title"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground">
            Session ID: {sessionId}
          </p>
          <p>
            <span className="font-medium">Articles:</span> {session.articles_count} | 
            <span className="font-medium"> Criteria:</span> {criteriaLines.length}
          </p>
        </div>
        <Link href="/sessions">
          <Button variant="outline">Back to sessions</Button>
        </Link>
      </header>

      {session.articles_count > 0 ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Articles ({articles.length})</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCriteria(true)}
                className="flex items-center gap-2"
              >
                <ListChecks className="h-4 w-4" />
                Show inclusion criteria
              </Button>
            </div>
            <Tooltip content={
              articles.every(article => article.ai_decision !== undefined)
                ? "All articles have already been evaluated by AI"
                : "Evaluate all articles using AI"
            }>
              <span>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    evaluateArticles();
                  }} 
                  disabled={evaluating || articles.every(article => article.ai_decision !== undefined)}
                >
                  {evaluating ? "Evaluating..." : "Evaluate all"}
                </Button>
              </span>
            </Tooltip>
          </div>

          <ArticlesTable 
            articles={articles}
            onReviewArticle={updateUserDecision}
          />

          <Dialog open={showCriteria} onOpenChange={setShowCriteria}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inclusion Criteria</DialogTitle>
                <DialogDescription>
                  Criteria used to evaluate articles in this review
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {criteriaLines.map((criterion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <p>{criterion}</p>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <UploadForm 
            sessionId={sessionId} 
            onUploadComplete={loadSessionData} 
            onArticlesRefresh={loadArticles}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Main content */}
      {mainContent}
      
      {/* Coffee loader overlay */}
      {evaluating && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Dimming backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
          
          <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md relative z-10">
            <LottieCoffeeLoader 
              animationData={coffeeAnimation} 
              message={
                loaderVariant === 0 
                  ? "Brewing your evaluations..." 
                  : loaderVariant === 1 
                    ? "Taking a coffee break while we work..." 
                    : "Grinding these articles..."
              }
            />
          </div>
        </div>
      )}
    </div>
  );
} 