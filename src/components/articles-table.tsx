"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { 
  ArrowUpDown, 
  CheckCircle, 
  CheckCircle2, 
  Bot,
  FileText,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Tooltip,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/sonner"
import { Article, DecisionType } from "@/lib/types"
import { supabase } from "@/lib/supabase"

// Add URL detection regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function TextWithLinks({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all inline-flex items-center gap-1 after:content-['↗'] after:text-xs after:opacity-70"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

interface ArticlesTableProps {
  articles: Article[]
  onReviewArticle: (id: string, decision: DecisionType) => Promise<void>
}

export function ArticlesTable({ articles, onReviewArticle }: ArticlesTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)

  function openArticleDialog(article: Article) {
    setSelectedArticle(article)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setSelectedArticle(null)
  }

  async function handleArticleDecision(decision: DecisionType, articleId?: string, showToast: boolean = true) {
    const targetArticle = articleId ? articles.find(a => a.id === articleId) : selectedArticle;
    if (!targetArticle) return;
    
    setIsSubmitting(true);
    try {
      await onReviewArticle(targetArticle.id, decision);
      
      // Show toast notification with shorter text (only when called from table actions)
      if (showToast) {
        if (decision === "Include") {
          toast.success(`Article included`);
        } else if (decision === "Exclude") {
          toast.info(`Article excluded`);
        } else if (decision === "Unsure") {
          toast.info(`Article marked as unsure`);
        }
      }
      
      // Update local state optimistically if it's the selected article
      if (selectedArticle && targetArticle.id === selectedArticle.id) {
        setSelectedArticle({
          ...selectedArticle,
          user_decision: decision
        });
        
        // Keep dialog open to show feedback animation
        setTimeout(() => {
          closeDialog();
          setIsSubmitting(false);
        }, 800);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error updating decision:", error);
      if (showToast) {
        toast.error("Failed to update article decision");
      }
      setIsSubmitting(false);
    }
  }

  async function handleManualAIEvaluation() {
    if (!selectedArticle || isEvaluating) return;
    
    setIsEvaluating(true);
    try {
      // Debug the file_id structure
      console.log("File ID:", selectedArticle.file_id);
      
      // Method 1: Try to extract session ID from file_id
      const fileIdParts = selectedArticle.file_id.split("_");
      let sessionId = fileIdParts.length > 1 ? fileIdParts[0] : selectedArticle.file_id;
      
      console.log("Attempting to query session with ID:", sessionId);
      
      // Get the session criteria to send to the AI
      let { data: session, error: sessionError } = await supabase
        .from("review_sessions")
        .select("criterias")
        .eq("id", sessionId)
        .single();

      // Method 2: If that fails, try to get the session from the files table
      if (sessionError || !session) {
        console.log("First approach failed, trying alternative method");
        
        // Get the session ID from the files table using the file_id
        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .select("session_id")
          .eq("id", selectedArticle.file_id)
          .single();
        
        if (fileError || !fileData) {
          console.error("Could not get session ID from files table:", fileError);
        } else {
          sessionId = fileData.session_id;
          console.log("Found session ID from files table:", sessionId);
          
          // Try again with the new session ID
          const sessionResult = await supabase
            .from("review_sessions")
            .select("criterias")
            .eq("id", sessionId)
            .single();
            
          session = sessionResult.data;
          sessionError = sessionResult.error;
        }
      }

      if (sessionError) {
        console.error("Session query error:", sessionError);
        toast.error("Failed to retrieve session criteria");
        setIsEvaluating(false);
        return;
      }

      if (!session) {
        console.error("No session found with ID:", sessionId);
        toast.error("Session not found");
        setIsEvaluating(false);
        return;
      }

      console.log("Session criteria:", session.criterias);

      if (!session.criterias || session.criterias.length === 0) {
        toast.error("No criteria found for this session");
        setIsEvaluating(false);
        return;
      }

      // Format criteria for OpenAI evaluation
      const formattedCriteria = session.criterias.map((c: { text: string }) => c.text).join('\n');

      // Call the evaluate API
      const response = await fetch(`/api/evaluates/${selectedArticle.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedArticle.title,
          abstract: selectedArticle.abstract,
          criteria: formattedCriteria,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to evaluate article");
      }

      const result = await response.json();
      
      // Update the UI optimistically
      setSelectedArticle({
        ...selectedArticle,
        ai_decision: result.decision,
        ai_explanation: result.explanation,
      });

      toast.success("Article evaluated successfully");
    } catch (error) {
      console.error("Error evaluating article:", error);
      toast.error(error instanceof Error ? error.message : "Failed to evaluate article");
    } finally {
      setIsEvaluating(false);
    }
  }

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap font-medium"
        >
          Article Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const title = row.getValue("title") as string;
        const aiDecision = row.original.ai_decision;
        const userDecision = row.original.user_decision;
        
        return (
          <div className={cn(
            "flex items-start gap-3 py-2 pl-4 border-l-2", 
            userDecision === "Include" ? "border-l-[#00b380]" : 
            userDecision === "Exclude" ? "border-l-[#ff1d42]" : 
            userDecision === "Unsure" ? "border-l-[#f59e0b]" : 
            "border-l-transparent"
          )}>
            {/* Content column with title and abstract */}
            <div className="flex-1">
              {/* Title with 14px font and status indicator */}
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-medium">{title}</div>
                
                {userDecision && (
                  <Badge 
                    className={cn(
                      "h-5 text-xs",
                      userDecision === "Include" 
                        ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30" 
                        : userDecision === "Exclude"
                          ? "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30"
                          : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
                    )}
                    variant="outline"
                  >
                    {userDecision === "Include" ? "Included" : userDecision === "Exclude" ? "Excluded" : "Unsure"}
                  </Badge>
                )}
              </div>
              
              {/* Abstract */}
              <div className="text-[14px] text-muted-foreground mt-1">
                {row.original.abstract}
              </div>
            </div>
            
            {/* AI badge - show for all recommendation types */}
            {aiDecision && (
              <Tooltip content={`AI recommendation: ${aiDecision}`}>
                <div className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded border-[0.5px] flex items-center whitespace-nowrap mt-1",
                  aiDecision === "Include" 
                    ? "border-[#00b380]/30 text-[#00b380]" 
                    : aiDecision === "Exclude"
                      ? "border-[#ff1d42]/30 text-[#ff1d42]"
                      : "border-[#f59e0b]/30 text-[#f59e0b]" // Amber for Unsure
                )}>
                  AI
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    }
  ]

  return (
    <div>
      <DataTable 
        columns={columns} 
        data={articles} 
        filterColumn="title"
        filterPlaceholder="Search articles by title..."
        initialSorting={[{ id: "title", desc: false }]}
        pageSize={10}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        getRowClassName={() => {
          return "hover:bg-muted/5 transition-colors cursor-pointer";
        }}
        onRowClick={(row) => openArticleDialog(row.original)}
      />

      {/* Article Details Dialog */}
      <Dialog 
        open={isDialogOpen} 
        modal={true}
        onOpenChange={(open) => {
          if (!open) {
            // Manually handle dialog state to avoid potential navigation issues
            setIsDialogOpen(false);
            
            // Clear selected article after a delay to ensure smooth animation
            setTimeout(() => {
              setSelectedArticle(null);
            }, 300);
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
          {selectedArticle && (
            <>
              <DialogHeader className="flex-shrink-0 pb-3 border-b">
                {/* Status badges and title with left indicator */}
                <div className={cn(
                  "pl-4 border-l-2",
                  selectedArticle.user_decision === "Include" ? "border-l-[#00b380]" : 
                  selectedArticle.user_decision === "Exclude" ? "border-l-[#ff1d42]" : 
                  selectedArticle.user_decision === "Unsure" ? "border-l-[#f59e0b]" : 
                  "border-l-transparent"
                )}>
                  <DialogTitle className="text-xl font-semibold leading-tight mb-2">
                    {selectedArticle.title}
                  </DialogTitle>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-muted/60 px-2 py-0.5 rounded text-muted-foreground font-mono text-xs">
                      {selectedArticle.id}
                    </div>
                    {selectedArticle.user_decision && (
                      <Badge 
                        className={cn(
                          "h-5 text-xs",
                          selectedArticle.user_decision === "Include" 
                            ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30" 
                            : selectedArticle.user_decision === "Exclude"
                              ? "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30"
                              : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
                        )}
                        variant="outline"
                      >
                        {selectedArticle.user_decision === "Include" ? "Included" : selectedArticle.user_decision === "Exclude" ? "Excluded" : "Unsure"}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto min-h-0 py-4 pr-1 -mr-1">
                <div className="space-y-6">
                  {/* AI Assessment Section - moved to be first */}
                  {selectedArticle.ai_decision && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-medium">AI Assessment</h3>
                      </div>
                      <div className={cn(
                        "border rounded-md overflow-hidden",
                        selectedArticle.ai_decision === "Include"
                          ? "border-[#00b380]/20"
                          : selectedArticle.ai_decision === "Exclude"
                            ? "border-[#ff1d42]/20"
                            : "border-[#f59e0b]/20" // Amber for Unsure
                      )}>
                        <div className={cn(
                          "px-4 py-3 flex items-center gap-2 font-medium",
                          selectedArticle.ai_decision === "Include" 
                            ? "bg-[#00b380]/5 text-[#00b380]" 
                            : selectedArticle.ai_decision === "Exclude"
                              ? "bg-[#ff1d42]/5 text-[#ff1d42]"
                              : "bg-[#f59e0b]/5 text-[#f59e0b]" // Amber for Unsure
                        )}>
                          Recommendation: {selectedArticle.ai_decision}
                        </div>
                        <div className="px-4 py-3 bg-background/80 border-t">
                          <div className="text-[14px] leading-relaxed">
                            {selectedArticle.ai_explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="text-base font-medium">Abstract</h3>
                    </div>
                    <div className="border rounded-md p-4 bg-muted/5 shadow-sm">
                      <p className="text-[14px] leading-relaxed">{selectedArticle.abstract}</p>
                    </div>
                  </div>
                  
                  {selectedArticle.full_text && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-medium">Full text</h3>
                      </div>
                      <div className="border rounded-md p-4 bg-muted/5 shadow-sm">
                        <p className="text-[14px] leading-relaxed whitespace-pre-line break-words">
                          <TextWithLinks text={selectedArticle.full_text} />
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decision buttons */}
              <DialogFooter className="sm:justify-end flex-wrap gap-y-2 border-t pt-4 mt-2">
                {selectedArticle.user_decision && (
                  <div className="text-sm text-muted-foreground mr-auto flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Previously reviewed</span>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {/* Add manual AI evaluation button with tooltip */}
                  <Tooltip content="Manually evaluate this article using AI against the session's inclusion criteria">
                    <Button
                      onClick={handleManualAIEvaluation}
                      variant="outline"
                      size="lg"
                      className="min-w-32 font-medium transition-all hover:bg-primary/5"
                      disabled={isEvaluating || isSubmitting}
                    >
                      {isEvaluating ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Evaluating...
                        </div>
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          AI Evaluate
                        </>
                      )}
                    </Button>
                  </Tooltip>

                  <Button 
                    onClick={() => handleArticleDecision("Exclude", selectedArticle.id, false)}
                    variant="outline"
                    size="lg"
                    className={cn(
                      "min-w-32 font-medium transition-all",
                      "active:scale-95",
                      isSubmitting && selectedArticle.user_decision === "Exclude" && "opacity-50 pointer-events-none"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && selectedArticle.user_decision === "Exclude" ? (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Excluded
                      </motion.div>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Exclude
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={() => handleArticleDecision("Unsure", selectedArticle.id, false)}
                    variant="outline"
                    size="lg"
                    className={cn(
                      "min-w-32 font-medium transition-all",
                      "active:scale-95",
                      isSubmitting && selectedArticle.user_decision === "Unsure" && "opacity-50 pointer-events-none"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && selectedArticle.user_decision === "Unsure" ? (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center"
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Marked as Unsure
                      </motion.div>
                    ) : (
                      <>
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Unsure
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleArticleDecision("Include", selectedArticle.id, false)}
                    size="lg"
                    className={cn(
                      "min-w-32 font-medium transition-all",
                      "active:scale-95",
                      isSubmitting && selectedArticle.user_decision === "Include" && "opacity-50 pointer-events-none"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && selectedArticle.user_decision === "Include" ? (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Included
                      </motion.div>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Include
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 