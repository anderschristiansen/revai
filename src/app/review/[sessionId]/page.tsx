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
import { 
  PencilIcon, 
  CheckIcon, 
  XIcon, 
  ListChecks, 
  ArrowLeftIcon, 
  FileTextIcon, 
  BarChart4Icon,
  BookOpenIcon, 
  BotIcon,
  CheckCircle,
  XCircle
} from "lucide-react";
import React from "react";
import { LottieCoffeeLoader } from "@/components/ui/lottie-coffee-loader";
import { supabase } from "@/lib/supabase";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Import the Lottie animation data
// Note: You need to place your Lottie JSON file in the public/lottie directory
// and update the path/filename below
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";

// Colors for the visualization - using the same colors as session-card.tsx
const COLORS = {
  included: '#00b380', // Green
  excluded: '#ff1d42', // Red
  pending: '#94a3b8',
  aiEvaluated: '#3b82f6',
  notEvaluated: '#6b7280',
  cardHover: 'rgba(0,0,0,0.05)'
};

// Animation variants
const pageTransition = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2
    }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

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
  const [loaderVariant, setLoaderVariant] = useState(0);
  const [activeTab, setActiveTab] = useState("articles");

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
    
    // Get articles that need AI evaluation - only consider articles that haven't been evaluated
    const articlesToEvaluate = articles.filter(
      article => !(article.ai_decision === "Yes" || article.ai_decision === "No")
    );
    
    // Check if there are articles to evaluate
    if (articlesToEvaluate.length === 0) {
      toast.info("No articles to evaluate");
      return;
    }
    
    setEvaluating(true);
    // Randomly select a loader variant
    setLoaderVariant(Math.floor(Math.random() * 3));
    
    try {
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

  // Calculate some stats
  const articlesReviewed = articles.filter(a => a.user_decision).length;
  const articlesIncluded = articles.filter(a => a.user_decision === "Yes").length;
  const articlesExcluded = articles.filter(a => a.user_decision === "No").length;
  const percentageComplete = articles.length > 0 
    ? Math.round((articlesReviewed / articles.length) * 100) 
    : 0;

  if (loading) {
    return (
      <motion.div 
        className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[70vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">Loading session data...</p>
      </motion.div>
    );
  }

  if (!session) {
    return notFound();
  }

  const mainContent = (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="container mx-auto py-8 space-y-8"
    >
      {/* Back button and header */}
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <Link href="/sessions" className="inline-flex">
            <Button variant="ghost" size="sm" className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back to sessions</span>
            </Button>
          </Link>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-2xl font-bold h-12 w-auto min-w-[300px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateSessionTitle();
                  if (e.key === 'Escape') cancelTitleEdit();
                }}
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={updateSessionTitle}
                  title="Save"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={cancelTitleEdit}
                  title="Cancel"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{session.title || "Systematic Review"}</h1>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setIsEditingTitle(true)}
                  title="Edit title"
                  className="opacity-60 hover:opacity-100"
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="bg-muted/60 px-2 py-1 rounded text-muted-foreground font-mono text-xs">
                {sessionId}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <FileTextIcon className="h-4 w-4 text-muted-foreground/70" />
              <span>{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <ListChecks className="h-4 w-4 text-muted-foreground/70" />
              <span>{criteriaLines.length} criteria</span>
            </div>
            {articles.length > 0 && (
              <div className="flex items-center gap-1 font-medium">
                <span className="text-muted-foreground/70">Progress:</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    percentageComplete === 100 
                      ? "border-[#00b380]/40 bg-[#00b380]/10 text-[#00b380] hover:bg-[#00b380]/20" 
                      : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                >
                  {percentageComplete}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {session.articles_count > 0 ? (
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Stats cards */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Articles Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
                <CardContent className="p-4 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-md bg-muted/40">
                      <BookOpenIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                      <p className="text-2xl font-bold">{articles.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Reviewed Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className={cn(
                "overflow-hidden border hover:shadow-md transition-all h-full",
                percentageComplete === 100 && "border-[#00b380]/30 hover:border-[#00b380]/70"
              )}>
                <CardContent className="p-4 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      percentageComplete === 100 
                        ? "from-[#00b380]/5 to-transparent" 
                        : "from-primary/3 to-transparent"
                    )} />
                  </div>
                
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "p-2 rounded-md", 
                      percentageComplete === 100 
                        ? "bg-[#00b380]/10" 
                        : "bg-primary/10"
                    )}>
                      <BarChart4Icon className={cn(
                        "h-5 w-5", 
                        percentageComplete === 100 
                          ? "text-[#00b380]" 
                          : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
                      <div className="flex items-baseline">
                        <p className="text-2xl font-bold">{articlesReviewed}</p>
                        <span className={cn(
                          "text-xs ml-2",
                          percentageComplete === 100 
                            ? "text-[#00b380]" 
                            : "text-muted-foreground"
                        )}>
                          ({percentageComplete}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Included Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
                <CardContent className="p-4 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00b380]/5 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-md" style={{ backgroundColor: `${COLORS.included}10` }}>
                      <CheckCircle className="h-5 w-5" style={{ color: COLORS.included }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Included</p>
                      <p className="text-2xl font-bold">{articlesIncluded}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Excluded Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
                <CardContent className="p-4 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff1d42]/5 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-md" style={{ backgroundColor: `${COLORS.excluded}10` }}>
                      <XCircle className="h-5 w-5" style={{ color: COLORS.excluded }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Excluded</p>
                      <p className="text-2xl font-bold">{articlesExcluded}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Tabs for different views */}
          <motion.div variants={fadeInUp}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="articles" className="gap-2">
                    <FileTextIcon className="h-4 w-4" />
                    <span>Articles</span>
                  </TabsTrigger>
                  <TabsTrigger value="criteria" className="gap-2">
                    <ListChecks className="h-4 w-4" />
                    <span>Criteria</span>
                  </TabsTrigger>
                </TabsList>

                <Tooltip content={
                  articles.length === 0
                    ? "No articles to evaluate"
                    : articles.every(article => article.ai_decision === "Yes" || article.ai_decision === "No")
                      ? "All articles have already been evaluated by AI"
                      : "Evaluate all articles using AI"
                }>
                  <span>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          evaluateArticles();
                        }} 
                        disabled={evaluating || articles.length === 0 || articles.every(article => article.ai_decision === "Yes" || article.ai_decision === "No")}
                        className="gap-2"
                      >
                        <BotIcon className="h-4 w-4" />
                        {evaluating ? "Evaluating..." : "Evaluate all"}
                      </Button>
                    </motion.div>
                  </span>
                </Tooltip>
              </div>

              <TabsContent value="articles" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="articles-table"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardContent className="p-0 sm:p-6">
                        <ArticlesTable 
                          articles={articles}
                          onReviewArticle={updateUserDecision}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="criteria" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="criteria-list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Inclusion Criteria</CardTitle>
                        <CardDescription>
                          Criteria used to evaluate articles in this review
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {criteriaLines.length > 0 ? (
                          criteriaLines.map((criterion, index) => (
                            <motion.div 
                              key={index} 
                              className="flex items-start gap-3 p-3 border rounded-md bg-card"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                                {index + 1}
                              </div>
                              <p className="text-sm">{criterion}</p>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">No criteria defined for this review.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            className="animate-in fade-in slide-in-from-bottom-5 duration-500 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <UploadForm 
              sessionId={sessionId} 
              onUploadComplete={loadSessionData} 
              onArticlesRefresh={loadArticles}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );

  return (
    <div className="relative min-h-screen bg-background">
      {/* Main content */}
      <AnimatePresence mode="wait">
        {mainContent}
      </AnimatePresence>
      
      {/* Coffee loader overlay */}
      <AnimatePresence>
        {evaluating && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Dimming backdrop */}
            <motion.div 
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            <motion.div 
              className="bg-background/90 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md relative z-10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 