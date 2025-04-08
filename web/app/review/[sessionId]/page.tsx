"use client";

import { useState, useEffect, useCallback } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArticlesTable } from "@/components/articles-table";
import { UploadForm } from "@/components/upload-form";
import { ReviewStats } from "@/components/review-stats";
import { AIStats } from "@/components/ai-stats";
import { toast } from "@/components/ui/sonner";
import { ArrowLeftIcon, PencilIcon, CheckIcon, XIcon, FileTextIcon, ListChecks, FolderIcon, BotIcon, Clock8Icon } from "lucide-react";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";

import { getSession, getFiles, getArticles, updateSessionTitle, updateArticleUserDecision } from "@/lib/utils/supabase-utils";
import type { ReviewSession, Article, CriteriaList } from "@/lib/types";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [criteria, setCriteria] = useState<CriteriaList>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("articles");
  const [awaitingEvaluation, setAwaitingEvaluation] = useState(false);

  // --- Load Session ---
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const sessionData = await getSession(sessionId);
      const filesData = await getFiles(sessionId);
      const articlesData = await getArticles(filesData.map(f => f.id));

      setSession(sessionData);
      setArticles(articlesData);
      setCriteria(sessionData.criterias || []);
      setNewTitle(sessionData.title || "");
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

  // --- Realtime Subscriptions ---
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
      setSession(prev => prev ? { ...prev, ...payload.new } : null);
      if (payload.new?.ai_evaluation_running !== undefined) {
        setBatchRunning(payload.new.ai_evaluation_running);
      }
      if (payload.new?.awaiting_ai_evaluation !== undefined) {
        setAwaitingEvaluation(payload.new.awaiting_ai_evaluation);
      }
    }
  });

  // --- UI Actions ---
  async function handleUpdateTitle() {
    if (!newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      await updateSessionTitle(sessionId, newTitle);
      toast.success("Title updated");
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Could not update title");
    }
  }

  function cancelTitleEdit() {
    setNewTitle(session?.title || "");
    setIsEditingTitle(false);
  }

  async function handleEvaluateArticles() {
    if (evaluating || batchRunning) return;
    setEvaluating(true);

    try {
      const response = await fetch("/api/evaluates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, articleIds: articles.filter(a => a.needs_ai_evaluation).map(a => a.id) }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to start evaluation");
      toast.success(`Started evaluation of ${result.count} articles`);
    } catch (error) {
      console.error("Error starting evaluation:", error);
      toast.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setEvaluating(false);
    }
  }

  // --- Stats ---
  const reviewed = articles.filter(a => a.user_decision).length;
  const included = articles.filter(a => a.user_decision === "Include").length;
  const excluded = articles.filter(a => a.user_decision === "Exclude").length;
  const unsure = articles.filter(a => a.user_decision === "Unsure").length;

  const aiReviewed = articles.filter(a => a.ai_decision).length;
  const aiIncluded = articles.filter(a => a.ai_decision === "Include").length;
  const aiExcluded = articles.filter(a => a.ai_decision === "Exclude").length;
  const aiUnsure = articles.filter(a => a.ai_decision === "Unsure").length;

  // --- Early loading and 404 ---
  if (loading && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }
  if (!session) return notFound();

  // --- Main Content ---
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Back button and title */}
      <div className="flex justify-between items-start">
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" /> Back to sessions
          </Button>
        </Link>

        <div className="flex gap-2 items-center">
          {isEditingTitle ? (
            <>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Button size="icon" variant="ghost" onClick={handleUpdateTitle}><CheckIcon className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={cancelTitleEdit}><XIcon className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{session.title || "Systematic Review"}</h1>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(true)}><PencilIcon className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <ReviewStats
          total={articles.length}
          reviewed={reviewed}
          included={included}
          excluded={excluded}
          unsure={unsure}
          pending={articles.length - reviewed}
          inCard
        />
        <AIStats
          total={articles.length}
          evaluated={aiReviewed}
          included={aiIncluded}
          excluded={aiExcluded}
          unsure={aiUnsure}
          isRunning={batchRunning}
          isQueued={awaitingEvaluation}
          inCard
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between mb-4">
          <TabsList>
            <TabsTrigger value="articles"><FileTextIcon className="h-4 w-4" /> Articles</TabsTrigger>
            <TabsTrigger value="criteria"><ListChecks className="h-4 w-4" /> Criteria</TabsTrigger>
            <TabsTrigger value="files"><FolderIcon className="h-4 w-4" /> Files</TabsTrigger>
          </TabsList>

          <Tooltip content="Start AI evaluation">
            <Button onClick={handleEvaluateArticles} disabled={evaluating || batchRunning || awaitingEvaluation}>
              {batchRunning ? (
                <Lottie animationData={coffeeAnimation} className="h-5 w-5" />
              ) : awaitingEvaluation ? (
                <Clock8Icon className="h-4 w-4 mr-2 text-amber-500" />
              ) : (
                <BotIcon className="h-4 w-4 mr-2" />
              )}
              {evaluating ? "Evaluating..." : 
               batchRunning ? "Brewing..." : 
               awaitingEvaluation ? "In Queue..." : 
               "Evaluate all"}
            </Button>
          </Tooltip>
        </div>

        {/* Articles Tab */}
        <TabsContent value="articles">
        <ArticlesTable 
          articles={articles}
          onReviewArticle={async (articleId, decision) => {
            try {
              await updateArticleUserDecision(articleId, decision);

              // Update local UI immediately
              setArticles(prev => prev.map(a => 
                a.id === articleId ? { ...a, user_decision: decision } : a
              ));
            } catch (error) {
              console.error("Error updating decision:", error);
              toast.error("Could not save decision");
            }
          }}
        />
        </TabsContent>

        {/* Criteria Tab */}
        <TabsContent value="criteria">
          <Card>
            <CardHeader><CardTitle>Inclusion Criteria</CardTitle></CardHeader>
            <CardContent>
              {criteria.length > 0 ? (
                <ul className="list-disc pl-4 space-y-2">
                  {criteria.map(c => <li key={c.id}>{c.text}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">No criteria defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <UploadForm sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
