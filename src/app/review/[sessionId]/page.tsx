"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { notFound, useParams } from "next/navigation";
import { ArticlesTable } from "@/components/articles-table";
import { UploadForm } from "@/components/upload-form";
import { toast } from "@/components/ui/sonner";
import { SessionView, Article, File as ReviewFile, DecisionType, CriteriaList } from "@/lib/types";
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
  XCircle,
  FolderIcon
} from "lucide-react";
import React from "react";
import { supabase } from "@/lib/supabase";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Lottie from "lottie-react";
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

export default function ReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionView | null>(null);
  const [criteria, setCriteria] = useState<CriteriaList>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [files, setFiles] = useState<ReviewFile[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [activeTab, setActiveTab] = useState("articles");
  const [batchRunning, setBatchRunning] = useState(false);

  const loadSessionData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from("review_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') { // Not found
          setSession(null);
          setLoading(false);
          return;
        }
        throw sessionError;
      }

      // Check if this session needs setup (no articles or empty criteria)
      const needsSetup = sessionData.needs_setup || 
        (sessionData.articles_count === 0 && (!sessionData.criterias || sessionData.criterias.length === 0));
      
      // If needs_setup status changed, update it in the database
      if (needsSetup !== sessionData.needs_setup) {
        await supabase
          .from("review_sessions")
          .update({ needs_setup: needsSetup })
          .eq("id", sessionId);
        
        // Update the session data with the new needs_setup value
        sessionData.needs_setup = needsSetup;
      }

      setSession(sessionData);
      setNewTitle(sessionData.title || "");
      
      if (sessionData.criterias) {
        setCriteria(sessionData.criterias);
      }
      
      // Load files for this session
      const { data: filesData, error: filesError } = await supabase
        .from("files")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      
      if (filesError) {
        console.error("Error loading files:", filesError);
      } else {
        setFiles(filesData || []);
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
      // Get all files for this session
      const { data: filesData, error: filesError } = await supabase
        .from("files")
        .select("id")
        .eq("session_id", sessionId);
        
      if (filesError) {
        console.error("Error loading files:", filesError);
        throw filesError;
      }
      
      // If no files, return empty array
      if (!filesData || filesData.length === 0) {
        setArticles([]);
        return;
      }
      
      // Get all article_ids from all files in this session
      const fileIds = filesData.map(file => file.id);
      
      // Get all articles for these files
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .in("file_id", fileIds)
        .order("id");

      if (error) {
        throw error;
      }

      setArticles(data || []);
      
      // Get the latest session data to check ai_evaluation_running status
      const { data: sessionData, error: sessionError } = await supabase
        .from("review_sessions")
        .select("ai_evaluation_running")
        .eq("id", sessionId)
        .single();
        
      if (!sessionError && sessionData) {
        // Use the ai_evaluation_running flag directly from the database
        setBatchRunning(sessionData.ai_evaluation_running || false);
      } else {
        setBatchRunning(false);
      }
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
        // Simply refresh data and check batch status
        loadSessionData();
        loadArticles(); // This will also check batch status
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

  const updateUserDecision = React.useCallback(async (articleId: string, decision: DecisionType) => {
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
      article => !article.ai_decision
    );
    
    // Check if there are articles to evaluate
    if (articlesToEvaluate.length === 0) {
      toast.info("No articles to evaluate");
      return;
    }
    
    setEvaluating(true);
    
    try {
      toast.info(`Starting evaluation of ${articlesToEvaluate.length} articles in batches...`);
      
      // Update the session to set ai_evaluation_running to true
      const { error: updateError } = await supabase
        .from("review_sessions")
        .update({
          ai_evaluation_running: true,
          last_evaluated_at: new Date().toISOString()
        })
        .eq("id", sessionId);
        
      if (updateError) {
        console.error("Error updating session batch status:", updateError);
        // Continue anyway, as this is not critical
      }
      
      // Call the API to start evaluation
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
        throw new Error(result.error || "Failed to start article evaluation");
      }
      
      // Set the batch running state locally as well
      setBatchRunning(true);
      
      toast.success(`Evaluation of ${result.count} articles has started`);
    } catch (error: unknown) {
      console.error("Error starting evaluation:", error);
      
      // If there was an error, set ai_evaluation_running back to false in the database
      try {
        await supabase
          .from("review_sessions")
          .update({ ai_evaluation_running: false })
          .eq("id", sessionId);
      } catch (updateError) {
        console.error("Error resetting batch status:", updateError);
      }
      
      // Show a more specific error message
      if (error instanceof Error && error.message?.includes("API key")) {
        toast.error("OpenAI API key is missing or invalid. Please check your environment variables.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Could not start evaluation";
        toast.error(errorMessage);
      }
    } finally {
      setEvaluating(false);
    }
  }

  // Calculate some stats
  const articlesReviewed = articles.filter(a => a.user_decision).length;
  const articlesIncluded = articles.filter(a => a.user_decision === "Include").length;
  const articlesExcluded = articles.filter(a => a.user_decision === "Exclude").length;
  const percentageComplete = articles.length > 0 
    ? Math.round((articlesReviewed / articles.length) * 100) 
    : 0;
  
  // AI evaluation stats
  const articlesAIEvaluated = articles.filter(a => 
    a.ai_decision === "Include" || a.ai_decision === "Exclude" || a.ai_decision === "Unsure"
  ).length;
  const aiPercentageComplete = articles.length > 0
    ? Math.round((articlesAIEvaluated / articles.length) * 100)
    : 0;
  const aiIncluded = articles.filter(a => a.ai_decision === "Include").length;
  const aiExcluded = articles.filter(a => a.ai_decision === "Exclude").length;
  const aiUnsure = articles.filter(a => a.ai_decision === "Unsure").length;

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
        </div>
        
        {batchRunning && (
          <Tooltip content="AI is currently evaluating your articles">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0.1)', '0 0 0 8px rgba(59, 130, 246, 0.2)'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                }}
                className="absolute inset-0 rounded-full"
              />
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-md border border-[#3b82f6]/30">
                <div className="w-7 h-7 relative overflow-hidden">
                  <motion.div 
                    animate={{ scale: [0.95, 1, 0.95], rotate: [0, 3, 0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute inset-0 scale-[2] -translate-y-[12%]"
                  >
                    <Lottie 
                      animationData={coffeeAnimation}
                      loop={true}
                      autoplay={true}
                    />
                  </motion.div>
                </div>
                <motion.div
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="text-sm font-medium whitespace-nowrap text-[#3b82f6]">
                    AI Brewing
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </Tooltip>
        )}
      </div>

      {session.articles_count > 0 ? (
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Stats cards */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* Total Articles Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
                <CardContent className="p-2 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1 rounded-md bg-muted/40">
                      <BookOpenIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">Total</p>
                      <p className="text-lg font-bold leading-none">{articles.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* AI Evaluation Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className={cn(
                "overflow-hidden border hover:shadow-md transition-all h-full",
                aiPercentageComplete === 100 && "border-[#3b82f6]/30 hover:border-[#3b82f6]/70"
              )}>
                <CardContent className="p-2 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 rounded-md bg-[#3b82f6]/10">
                        <BotIcon className="h-3.5 w-3.5 text-[#3b82f6]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">AI</p>
                          {batchRunning && (
                            <div className="flex items-center ml-1">
                              <div className="w-3.5 h-3.5 relative overflow-hidden">
                                <motion.div 
                                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                  className="absolute inset-0 scale-[2] -translate-y-[12%]"
                                >
                                  <Lottie 
                                    animationData={coffeeAnimation}
                                    loop={true}
                                    autoplay={true}
                                  />
                                </motion.div>
                              </div>
                              <motion.span 
                                animate={{ opacity: [0.8, 1, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="text-[0.6rem] ml-0.5 text-[#3b82f6] font-medium"
                              >
                                Brewing
                              </motion.span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-baseline">
                          <p className="text-lg font-bold leading-none">{articlesAIEvaluated}</p>
                          <span className="text-[0.6rem] ml-1 text-muted-foreground">
                            ({aiPercentageComplete}%)
                          </span>
                        </div>
                        <div className="flex gap-2 mt-0.5 text-[0.6rem] text-muted-foreground">
                          <div className="flex items-center gap-0.5">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.included }}></div>
                            <span>{aiIncluded}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.excluded }}></div>
                            <span>{aiExcluded}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.aiEvaluated }}></div>
                            <span>{aiUnsure}</span>
                          </div>
                        </div>
                      </div>
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
                <CardContent className="p-2 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      percentageComplete === 100 
                        ? "from-[#00b380]/5 to-transparent" 
                        : "from-primary/3 to-transparent"
                    )} />
                  </div>
                
                  <div className="flex items-center space-x-1.5">
                    <div className={cn(
                      "p-1 rounded-md", 
                      percentageComplete === 100 
                        ? "bg-[#00b380]/10" 
                        : "bg-primary/10"
                    )}>
                      <BarChart4Icon className={cn(
                        "h-3.5 w-3.5", 
                        percentageComplete === 100 
                          ? "text-[#00b380]" 
                          : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">Reviewed</p>
                      <div className="flex items-baseline">
                        <p className="text-lg font-bold leading-none">{articlesReviewed}</p>
                        <span className={cn(
                          "text-[0.6rem] ml-1",
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
                <CardContent className="p-2 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00b380]/5 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1 rounded-md" style={{ backgroundColor: `${COLORS.included}10` }}>
                      <CheckCircle className="h-3.5 w-3.5" style={{ color: COLORS.included }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">Included</p>
                      <p className="text-lg font-bold leading-none">{articlesIncluded}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Excluded Card */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
                <CardContent className="p-2 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff1d42]/5 to-transparent" />
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1 rounded-md" style={{ backgroundColor: `${COLORS.excluded}10` }}>
                      <XCircle className="h-3.5 w-3.5" style={{ color: COLORS.excluded }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">Excluded</p>
                      <p className="text-lg font-bold leading-none">{articlesExcluded}</p>
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
                  <TabsTrigger value="files" className="gap-2">
                    <FolderIcon className="h-4 w-4" />
                    <span>Files</span>
                  </TabsTrigger>
                </TabsList>

                <Tooltip content={
                  articles.length === 0
                    ? "No articles to evaluate"
                    : articles.every(article => 
                        article.ai_decision === "Include" || 
                        article.ai_decision === "Exclude" || 
                        article.ai_decision === "Unsure"
                      )
                      ? "All articles have already been evaluated by AI"
                      : batchRunning
                        ? "AI is brewing your evaluations... ☕"
                        : "Evaluate all articles using AI"
                }>
                  <span>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          evaluateArticles();
                        }} 
                        disabled={
                          evaluating || 
                          batchRunning || 
                          articles.length === 0 || 
                          articles.every(article => 
                            article.ai_decision === "Include" || 
                            article.ai_decision === "Exclude" || 
                            article.ai_decision === "Unsure"
                          )
                        }
                        className="gap-2"
                      >
                        {batchRunning ? (
                          <>
                            <div className="w-4 h-4 relative overflow-hidden">
                              <div className="absolute inset-0 scale-[2] -translate-y-[12%]">
                                <Lottie 
                                  animationData={coffeeAnimation}
                                  loop={true}
                                  autoplay={true}
                                />
                              </div>
                            </div>
                            <motion.span 
                              animate={{ opacity: [0.9, 1, 0.9] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                              Brewing evaluations...
                            </motion.span>
                          </>
                        ) : (
                          <>
                            <BotIcon className="h-4 w-4" />
                            {evaluating ? "Evaluating..." : "Evaluate all"}
                          </>
                        )}
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
                        {criteria.length > 0 ? (
                          criteria.map((criterion) => (
                            <motion.div 
                              key={criterion.id} 
                              className="flex items-start gap-3 p-3 border rounded-md bg-card"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: criteria.indexOf(criterion) * 0.05 }}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                                {criteria.indexOf(criterion) + 1}
                              </div>
                              <p className="text-sm">{criterion.text}</p>
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

              <TabsContent value="files" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="files-list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Uploaded Files</CardTitle>
                        <CardDescription>
                          Files containing articles for this review
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {files.length > 0 ? (
                          <div className="space-y-4">
                            <div className="rounded-md border">
                              <table className="w-full divide-y divide-border">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Filename</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Articles</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Uploaded</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {files.map((file) => (
                                    <motion.tr 
                                      key={file.id}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="bg-card hover:bg-muted/50 transition-colors"
                                    >
                                      <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center">
                                          <FileTextIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{file.filename}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-sm">{file.articles_count}</td>
                                      <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                                      </td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <FolderIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No files have been uploaded.</p>
                            <Button 
                              onClick={() => setActiveTab("articles")} 
                              variant="outline" 
                              className="mt-4"
                            >
                              View Articles
                            </Button>
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
    </div>
  );
} 