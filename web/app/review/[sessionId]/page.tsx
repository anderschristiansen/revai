"use client";

import { useState, useEffect, useCallback } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArticlesTable } from "@/components/articles-table";
import { FileUploadForm } from "@/components/file-upload-form";
import { CriteriaForm } from "@/components/criteria-form";
import { ReviewStats } from "@/components/review-stats";
import { AIStats } from "@/components/ai-stats";
import { toast } from "@/components/ui/sonner";
import { ArrowLeftIcon, PencilIcon, CheckIcon, XIcon, FileTextIcon, ListChecks, FolderIcon, BotIcon, Clock8Icon, MenuIcon, Loader2 } from "lucide-react";
import { useSupabaseRealtime, useSessionStatusRealtime } from "@/hooks/use-supabase-realtime";

import { getSession, getFiles, getArticles, updateSessionTitle, updateArticleUserDecision } from "@/lib/utils/supabase-utils";
import type { ReviewSession, Article, CriteriaList, File as SessionFile } from "@/lib/types";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
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
    <div className="flex flex-col min-h-screen">
      {/* Mobile Criteria Drawer */}
      <div className="lg:hidden sticky top-0 z-10 bg-background border-b p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
              <div className="flex items-center">
                <ListChecks className="h-4 w-4 mr-2 text-primary" />
                <span>View Screening Criteria</span>
              </div>
              <MenuIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-md pt-6">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> 
                Screening Criteria
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-5">
              {criteria.filter(c => c.type === 'inclusion').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-1 text-green-700 px-2">Inclusion Criteria</h4>
                  <div className="bg-muted/30 rounded-md py-3 px-2">
                    <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
                      {criteria
                        .filter(c => c.type === 'inclusion')
                        .map(c => (
                          <li key={c.id} className="text-foreground">{c.text}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {criteria.filter(c => c.type === 'exclusion').length > 0 && (
                <div className="space-y-2 mt-6">
                  <h4 className="font-medium text-sm mb-1 text-red-700 px-2">Exclusion Criteria</h4>
                  <div className="bg-muted/30 rounded-md py-3 px-2">
                    <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
                      {criteria
                        .filter(c => c.type === 'exclusion')
                        .map(c => (
                          <li key={c.id} className="text-foreground">{c.text}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {criteria.length === 0 && (
                <div className="bg-muted/30 rounded-md p-4 text-sm text-muted-foreground">
                  <p>No criteria defined yet.</p>
                </div>
              )}
              
              <div className="px-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setActiveTab("criteria");
                    document.querySelector('.SheetClose')?.dispatchEvent(new Event('click', { bubbles: true }));
                  }}
                >
                  <PencilIcon className="h-3 w-3 mr-2" />
                  Edit Criteria
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Desktop Layout */}
      <div className="flex flex-1">
        {/* Desktop Criteria Sidebar - Fixed to the left */}
        <div className="hidden lg:block w-72 bg-background border-r shrink-0 overflow-y-auto h-screen sticky top-0 pt-6 pb-20 px-4">
          <div className="space-y-5">
            <h3 className="font-medium text-base flex items-center gap-2 px-2">
              <ListChecks className="h-4 w-4 text-primary" /> Screening Criteria
            </h3>
            
            {criteria.filter(c => c.type === 'inclusion').length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-1 text-green-700 px-2">Inclusion Criteria</h4>
                <div className="bg-muted/30 rounded-md py-3 px-2">
                  <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
                    {criteria
                      .filter(c => c.type === 'inclusion')
                      .map(c => (
                        <li key={c.id} className="text-foreground">{c.text}</li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
            
            {criteria.filter(c => c.type === 'exclusion').length > 0 && (
              <div className="space-y-2 mt-6">
                <h4 className="font-medium text-sm mb-1 text-red-700 px-2">Exclusion Criteria</h4>
                <div className="bg-muted/30 rounded-md py-3 px-2">
                  <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
                    {criteria
                      .filter(c => c.type === 'exclusion')
                      .map(c => (
                        <li key={c.id} className="text-foreground">{c.text}</li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
            
            {criteria.length === 0 && (
              <div className="bg-muted/30 rounded-md p-4 text-sm text-muted-foreground">
                <p>No criteria defined yet.</p>
              </div>
            )}
            
            <div className="px-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setActiveTab("criteria")}
              >
                <PencilIcon className="h-3 w-3 mr-2" />
                Edit Criteria
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto p-8 space-y-8">
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
                <div>
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
                </div>
              </TabsContent>

              {/* Criteria Tab */}
              <TabsContent value="criteria">
                <CriteriaForm 
                  sessionId={sessionId} 
                  criteria={criteria}
                  onCriteriaUpdated={(newCriteria) => {
                    setCriteria(newCriteria);
                    
                    // If there are AI-evaluated articles, suggest re-running evaluation
                    const hasEvaluatedArticles = articles.some(a => a.ai_decision);
                    if (hasEvaluatedArticles) {
                      toast.info("Criteria changed. Consider re-running AI evaluation to update results based on new criteria.");
                    }
                  }}
                />
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : session && session.files_count > 0 ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Uploaded Files</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {session.files_count} file{session.files_count !== 1 ? 's' : ''} · {session.articles_count} article{session.articles_count !== 1 ? 's' : ''}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm mb-4">
                        <p>These files have been processed and the articles are now available for review.</p>
                      </div>
                      
                      {/* Files List */}
                      <div className="space-y-2">
                        {session.files_processed ? (
                          <div className="grid gap-2">
                            {sessionFiles.map((file: SessionFile) => (
                              <div 
                                key={file.id} 
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-3">
                                  <FolderIcon className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{file.filename}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {file.articles_count} article{file.articles_count !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(file.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-4 text-muted-foreground">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                            Processing files...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <FileUploadForm 
                    sessionId={sessionId} 
                    onUploadComplete={(hasCriteria) => {
                      // Don't force users to criteria tab, just show a gentle suggestion
                      if (!hasCriteria) {
                        toast.info("Consider defining inclusion and exclusion criteria for your review");
                      }
                      // Always reload the page to show all articles
                      window.location.href = `/review/${sessionId}`;
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
