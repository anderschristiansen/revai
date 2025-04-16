"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import { FileTextIcon, ListChecks, FolderIcon, BotIcon, Clock8Icon, ArrowLeftRight } from "lucide-react";

// Custom hook
import { useReviewSession } from "@/hooks/use-review-session";

// Components
import { ReviewHeader } from "@/components/review-header";
import { CriteriaSidebar } from "@/components/criteria-sidebar";
import { CriteriaSidebarMobile } from "@/components/criteria-sidebar-mobile";
import { ArticlesTab } from "@/components/articles-tab";
import { DisagreementsTab } from "@/components/disagreements-tab";
import { FilesTab } from "@/components/files-tab";
import { CriteriaForm } from "@/components/criteria-form";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState("articles");
  
  // Use our custom hook for data management
  const {
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
  } = useReviewSession(sessionId);

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
        <CriteriaSidebarMobile 
          criteria={criteria} 
          onEditCriteria={() => setActiveTab("criteria")} 
        />
      </div>
      
      {/* Desktop Layout */}
      <div className="flex flex-1">
        {/* Desktop Criteria Sidebar - Fixed to the left */}
        <div className="hidden lg:block w-72 bg-background border-r shrink-0 overflow-y-auto h-screen sticky top-0 pt-6 pb-20 px-4">
          <CriteriaSidebar 
            criteria={criteria} 
            onEditCriteria={() => setActiveTab("criteria")} 
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto p-8 space-y-8">
            {/* Header with Title and Stats */}
            <ReviewHeader 
              session={session} 
              sessionId={sessionId}
              articlesCount={articles.length}
              reviewStats={{
                reviewed: stats.reviewed,
                included: stats.included,
                excluded: stats.excluded,
                unsure: stats.unsure
              }}
              aiStats={{
                reviewed: stats.aiReviewed,
                included: stats.aiIncluded,
                excluded: stats.aiExcluded,
                unsure: stats.aiUnsure,
                isRunning: batchRunning,
                isQueued: awaitingEvaluation
              }}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TabsList className="w-full sm:w-auto gap-1">
                  <TabsTrigger value="articles" className="text-xs sm:text-sm"><FileTextIcon className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Articles</span></TabsTrigger>
                  <TabsTrigger value="disagreements" className="text-xs sm:text-sm">
                    <ArrowLeftRight className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Disagreements</span>
                    {stats.disagreements > 0 && (
                      <Badge variant="outline" className="ml-1 h-5 w-auto px-1 flex items-center justify-center">
                        {stats.disagreements}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="criteria" className="text-xs sm:text-sm"><ListChecks className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Criteria</span></TabsTrigger>
                  <TabsTrigger value="files" className="text-xs sm:text-sm"><FolderIcon className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Files</span></TabsTrigger>
                </TabsList>

                <Tooltip content="Start AI evaluation">
                  <Button 
                    onClick={startEvaluation} 
                    disabled={evaluating || batchRunning || awaitingEvaluation}
                    className="transition-all duration-200 w-full sm:w-auto mobile-full-width"
                    variant="outline"
                  >
                    {batchRunning ? (
                      <Lottie animationData={coffeeAnimation} className="h-4 w-4" />
                    ) : awaitingEvaluation ? (
                      <Clock8Icon className="h-3.5 w-3.5 mr-1.5 text-amber-500 animate-pulse" />
                    ) : (
                      <BotIcon className="h-3.5 w-3.5 mr-1.5" />
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
                <ArticlesTab 
                  articles={articles} 
                  onArticleUpdate={setArticles} 
                />
              </TabsContent>

              {/* Disagreements Tab */}
              <TabsContent value="disagreements">
                <DisagreementsTab 
                  articles={articles}
                  onArticleUpdate={setArticles}
                />
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
                <FilesTab 
                  session={session}
                  sessionId={sessionId}
                  loading={loading}
                  sessionFiles={sessionFiles}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
