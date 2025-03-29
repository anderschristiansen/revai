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
} from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Tooltip,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/sonner"

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

type Article = {
  id: string
  session_id: string
  title: string
  abstract: string
  full_text: string
  ai_decision?: "Yes" | "No"
  ai_explanation?: string
  user_decision?: "Yes" | "No"
  needs_review: boolean
}

interface ArticlesTableProps {
  articles: Article[]
  onReviewArticle: (id: string, decision: "Yes" | "No") => Promise<void>
}

export function ArticlesTable({ articles, onReviewArticle }: ArticlesTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openArticleDialog(article: Article) {
    setSelectedArticle(article)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setSelectedArticle(null)
  }

  async function handleArticleDecision(decision: "Yes" | "No", articleId?: string, showToast: boolean = true) {
    const targetArticle = articleId ? articles.find(a => a.id === articleId) : selectedArticle;
    if (!targetArticle) return;
    
    setIsSubmitting(true);
    try {
      await onReviewArticle(targetArticle.id, decision);
      
      // Show toast notification with shorter text (only when called from table actions)
      if (showToast) {
        if (decision === "Yes") {
          toast.success(`Article included`);
        } else {
          toast.info(`Article excluded`);
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
            userDecision === "Yes" ? "border-l-[#00b380]" : 
            userDecision === "No" ? "border-l-[#ff1d42]" : 
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
                      userDecision === "Yes" 
                        ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30" 
                        : "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30"
                    )}
                    variant="outline"
                  >
                    {userDecision === "Yes" ? "Included" : "Excluded"}
                  </Badge>
                )}
              </div>
              
              {/* Abstract */}
              <div className="text-[14px] text-muted-foreground mt-1">
                {row.original.abstract}
              </div>
            </div>
            
            {/* AI badge - show for both include and exclude recommendations */}
            {aiDecision && (
              <Tooltip content={`AI recommendation: ${aiDecision === "Yes" ? "Include" : "Exclude"}`}>
                <div className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded border-[0.5px] flex items-center whitespace-nowrap mt-1",
                  aiDecision === "Yes" 
                    ? "border-[#00b380]/30 text-[#00b380]" 
                    : "border-[#ff1d42]/30 text-[#ff1d42]"
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
        initialSorting={[{ id: "user_decision", desc: true }]}
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
                  selectedArticle.user_decision === "Yes" ? "border-l-[#00b380]" : 
                  selectedArticle.user_decision === "No" ? "border-l-[#ff1d42]" : 
                  "border-l-transparent"
                )}>
                  <DialogTitle className="text-xl font-semibold leading-tight mb-2">
                    {selectedArticle.title}
                  </DialogTitle>
                  
                  <p className="text-sm text-muted-foreground">
                    Review this article to decide whether to include it in your systematic review
                  </p>
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
                        selectedArticle.ai_decision === "Yes"
                          ? "border-[#00b380]/20"
                          : "border-[#ff1d42]/20"
                      )}>
                        <div className={cn(
                          "px-4 py-3 flex items-center gap-2 font-medium",
                          selectedArticle.ai_decision === "Yes" 
                            ? "bg-[#00b380]/5 text-[#00b380]" 
                            : "bg-[#ff1d42]/5 text-[#ff1d42]"
                        )}>
                          {selectedArticle.ai_decision === "Yes" ? "Recommendation: Include" : "Recommendation: Exclude"}
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
                  <Button 
                    onClick={() => handleArticleDecision("No", selectedArticle.id, false)}
                    variant="outline"
                    size="lg"
                    className={cn(
                      "min-w-32 font-medium transition-all",
                      "active:scale-95",
                      isSubmitting && selectedArticle.user_decision === "No" && "opacity-50 pointer-events-none"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && selectedArticle.user_decision === "No" ? (
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
                    onClick={() => handleArticleDecision("Yes", selectedArticle.id, false)}
                    size="lg"
                    className={cn(
                      "min-w-32 font-medium transition-all",
                      "active:scale-95",
                      isSubmitting && selectedArticle.user_decision === "Yes" && "opacity-50 pointer-events-none"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && selectedArticle.user_decision === "Yes" ? (
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