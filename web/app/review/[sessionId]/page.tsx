"use client";

import { useState, useEffect, useCallback } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArticlesTable } from "@/components/articles-table";
import { UploadForm } from "@/components/upload-form";
import { ReviewStats } from "@/components/review-stats";
import { AIStats } from "@/components/ai-stats";
import { toast } from "@/components/ui/sonner";
import { ArrowLeftIcon, PencilIcon, CheckIcon, XIcon, FileTextIcon, ListChecks, FolderIcon, BotIcon, Clock8Icon, PlusIcon } from "lucide-react";
import { useSupabaseRealtime, useSessionStatusRealtime } from "@/hooks/use-supabase-realtime";

import { getSession, getFiles, getArticles, updateSessionTitle, updateArticleUserDecision, updateSessionCriteria } from "@/lib/utils/supabase-utils";
import type { ReviewSession, Article, CriteriaList } from "@/lib/types";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [criteria, setCriteria] = useState<CriteriaList>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingCriteria, setIsEditingCriteria] = useState(false);
  const [editedCriteria, setEditedCriteria] = useState<CriteriaList>([]);
  const [newTitle, setNewTitle] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("articles");
  const [awaitingEvaluation, setAwaitingEvaluation] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);

  // --- Load Session ---
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const sessionData = await getSession(sessionId);
      const filesData = await getFiles(sessionId);
      const articlesData = await getArticles(filesData.map(f => f.id));

      setSession(sessionData);
      
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

  // Keep existing realtime subscription as a fallback
  useSupabaseRealtime(["UPDATE"], "review_sessions", (payload) => {
    console.log('Session update received:', payload);
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
        console.log('Files processed state changed, refreshing article data');
        const fetchUpdatedArticles = async () => {
          try {
            const filesData = await getFiles(sessionId);
            const articlesData = await getArticles(filesData.map(f => f.id));
            console.log(`Refreshed ${articlesData.length} articles after files_processed update`);
            setArticles(articlesData);
          } catch (error) {
            console.error('Error refreshing articles:', error);
          }
        };
        fetchUpdatedArticles();
      }
      
      // Log general session updates
      console.log('General session update received:', payload.new);
    }
  });
  
  // Memoize the status change callback to prevent re-subscriptions
  const handleStatusChange = useCallback((running: boolean, awaiting: boolean) => {
    console.log(`Status update received: running=${running}, awaiting=${awaiting}`);
    
    // Update the status flags directly for UI state
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
  
  // Add dedicated status monitoring subscription
  useSessionStatusRealtime(sessionId, handleStatusChange);

  // --- UI Actions ---
  async function handleUpdateTitle() {
    if (!newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      await updateSessionTitle(sessionId, newTitle);
      // Update local session state to reflect the title change
      setSession(prev => prev ? { ...prev, title: newTitle } : null);
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
  }

  // Add a function to add new criteria
  const addCriterion = (type: 'inclusion' | 'exclusion') => {
    setEditedCriteria(prev => [
      ...prev,
      { id: crypto.randomUUID(), text: "", type }
    ]);
  };

  // Add a function to remove criteria
  const removeCriterion = (id: string) => {
    setEditedCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Add a function to update criteria text
  const updateCriterionText = (id: string, text: string) => {
    setEditedCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, text } : c)
    );
  };

  // Add a function to update criteria type
  const updateCriterionType = (id: string, type: 'inclusion' | 'exclusion') => {
    setEditedCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, type } : c)
    );
  };

  // Add a function to save criteria
  const saveCriteria = async () => {
    // Check that all criteria have text
    if (editedCriteria.some(c => !c.text.trim())) {
      toast.error("All criteria must have text");
      return;
    }
    
    // Ensure at least one criterion exists (either inclusion or exclusion)
    if (editedCriteria.length === 0) {
      toast.error("You must provide at least one criterion (inclusion or exclusion)");
      return;
    }

    try {
      setSavingCriteria(true);
      
      await updateSessionCriteria(sessionId, editedCriteria);
      
      setCriteria(editedCriteria);
      setIsEditingCriteria(false);
      toast.success("Criteria updated");
      
      // If there are AI-evaluated articles, suggest re-running evaluation
      const hasEvaluatedArticles = articles.some(a => a.ai_decision);
      if (hasEvaluatedArticles) {
        toast.info("Criteria changed. Consider re-running AI evaluation to update results based on new criteria.");
      }
    } catch (error) {
      console.error("Error updating criteria:", error);
      toast.error("Could not update criteria");
    } finally {
      setSavingCriteria(false);
    }
  };

  // Add a function to cancel criteria editing
  const cancelCriteriaEdit = () => {
    setEditedCriteria(criteria);
    setIsEditingCriteria(false);
  };

  // Start editing criteria
  const startEditingCriteria = () => {
    setEditedCriteria([...criteria]);
    setIsEditingCriteria(true);
  };

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
       <div className="flex gap-2 items-center mb-0">
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
      {/* Back button and title */}
      <div className="flex justify-between items-start">
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" /> Back to sessions
          </Button>
        </Link>
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
            <Button 
              onClick={handleEvaluateArticles} 
              disabled={evaluating || batchRunning || awaitingEvaluation}
              className="transition-all duration-200"
            >
              {batchRunning ? (
                <Lottie animationData={coffeeAnimation} className="h-5 w-5" />
              ) : awaitingEvaluation ? (
                <Clock8Icon className="h-4 w-4 mr-2 text-amber-500 animate-pulse" />
              ) : (
                <BotIcon className="h-4 w-4 mr-2" />
              )}
              {evaluating ? "Starting..." : 
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
          <div className="space-y-6">
            {isEditingCriteria ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Criteria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editedCriteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-start gap-2">
                      <Select
                        value={criterion.type}
                        onValueChange={(value) => updateCriterionType(criterion.id, value as 'inclusion' | 'exclusion')}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inclusion">Inclusion</SelectItem>
                          <SelectItem value="exclusion">Exclusion</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={criterion.text}
                        onChange={(e) => updateCriterionText(criterion.id, e.target.value)}
                        placeholder="Enter a criterion..."
                        className="flex-1 min-h-[80px] font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-2"
                        onClick={() => removeCriterion(criterion.id)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCriterion('inclusion')}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Inclusion
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCriterion('exclusion')}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Exclusion
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelCriteriaEdit}
                    disabled={savingCriteria}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveCriteria}
                    disabled={savingCriteria}
                  >
                    {savingCriteria ? (
                      <>Saving...</>
                    ) : (
                      <>Save Criteria</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Inclusion & Exclusion Criteria</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditingCriteria}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Criteria
                  </Button>
                </div>
                <Card>
                  <CardHeader><CardTitle>Inclusion Criteria</CardTitle></CardHeader>
                  <CardContent>
                    {criteria.filter(c => c.type === 'inclusion').length > 0 ? (
                      <ul className="list-disc pl-4 space-y-2">
                        {criteria.filter(c => c.type === 'inclusion').map(c => <li key={c.id}>{c.text}</li>)}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No inclusion criteria defined.</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader><CardTitle>Exclusion Criteria</CardTitle></CardHeader>
                  <CardContent>
                    {criteria.filter(c => c.type === 'exclusion').length > 0 ? (
                      <ul className="list-disc pl-4 space-y-2">
                        {criteria.filter(c => c.type === 'exclusion').map(c => <li key={c.id}>{c.text}</li>)}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No exclusion criteria defined.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <UploadForm sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
