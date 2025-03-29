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
  Eye, 
  Bot,
  Terminal,
  AlertCircle,
  FileText,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
        // Truncate long titles
        const title = row.getValue("title") as string;
        const displayTitle = title.length > 60 ? title.substring(0, 60) + "..." : title;
        const aiDecision = row.original.ai_decision;
        const userDecision = row.original.user_decision;
        
        return (
          <div className="flex items-center gap-3">
            {/* Status dot - now shown for all articles */}
            <div 
              className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                userDecision === "Yes" 
                  ? "bg-[#00b380]" 
                  : userDecision === "No"
                    ? "bg-[#ff1d42]"
                    : "bg-gray-300 dark:bg-gray-600" // Neutral dot for pending articles
              )}
            />
            
            {/* Title with 14px font */}
            <div className="text-[14px] flex-1">{displayTitle}</div>
            
            {/* AI badge */}
            {aiDecision && (
              <Tooltip content={`AI recommendation: ${aiDecision === "Yes" ? "Include" : "Exclude"}`}>
                <div className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded border-[0.5px] flex items-center",
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
    },
    {
      id: "abstract",
      header: () => <span className="font-medium">Abstract</span>,
      cell: ({ row }) => {
        const abstract = row.original.abstract;
        const previewLength = 120;
        const previewText = abstract.length > previewLength 
          ? abstract.substring(0, previewLength) + "..." 
          : abstract;
          
        return (
          <div className="text-sm text-muted-foreground max-w-xl">
            {previewText}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right font-medium">Actions</div>,
      cell: ({ row }) => {
        const article = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-1">
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5"
              onClick={() => openArticleDialog(article)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View
            </Button>
            
            <Button 
              type="button"
              variant={article.user_decision === "Yes" ? "secondary" : "ghost"}
              size="sm" 
              className={cn(
                "h-8 px-2.5",
                article.user_decision === "Yes" && "text-[#00b380]"
              )}
              onClick={() => handleArticleDecision("Yes", article.id)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Include
            </Button>
            
            <Button 
              type="button"
              variant={article.user_decision === "No" ? "secondary" : "ghost"}
              size="sm" 
              className={cn(
                "h-8 px-2.5",
                article.user_decision === "No" && "text-[#ff1d42]"
              )}
              onClick={() => handleArticleDecision("No", article.id)}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Exclude
            </Button>
          </div>
        );
      },
    },
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
          return "hover:bg-muted/5 transition-colors";
        }}
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
              <DialogHeader className="flex-shrink-0 pb-2 border-b">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background/80 text-xs">
                        ID: {selectedArticle.id.substring(0, 8)}...
                      </Badge>
                      
                      {selectedArticle.user_decision && (
                        <Badge 
                          className={cn(
                            selectedArticle.user_decision === "Yes" 
                              ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30"
                              : "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30"
                          )}
                          variant="outline"
                        >
                          {selectedArticle.user_decision === "Yes" ? "Included" : "Excluded"}
                        </Badge>
                      )}
                      
                      {selectedArticle.ai_decision && (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            selectedArticle.ai_decision === "Yes" 
                              ? "border-[#00b380]/30 bg-[#00b380]/5 text-[#00b380]" 
                              : "border-[#ff1d42]/30 bg-[#ff1d42]/5 text-[#ff1d42]"
                          )}
                        >
                          <Bot className="h-3 w-3" /> 
                          {selectedArticle.ai_decision === "Yes" ? "AI: Include" : "AI: Exclude"}
                        </Badge>
                      )}
                    </div>
                    
                    <DialogTitle className="text-xl font-semibold leading-tight">
                      {selectedArticle.title}
                    </DialogTitle>
                  </div>
                </div>
                
                <DialogDescription className="text-muted-foreground">
                  Review this article based on your research inclusion criteria
                </DialogDescription>
              </DialogHeader>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto min-h-0 py-4 pr-1 -mr-1">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary/70" />
                      <h3 className="text-lg font-medium">Abstract</h3>
                    </div>
                    <div className="border rounded-md p-4 bg-muted/5 shadow-sm">
                      <p className="text-sm leading-relaxed">{selectedArticle.abstract}</p>
                    </div>
                  </div>
                  
                  {selectedArticle.full_text && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-primary/70" />
                        <h3 className="text-lg font-medium">Full text</h3>
                      </div>
                      <div className="border rounded-md p-4 bg-muted/5 shadow-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                          <TextWithLinks text={selectedArticle.full_text} />
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Assessment Section */}
                  {selectedArticle.ai_decision && (
                    <div className="border rounded-md overflow-hidden bg-muted/5 shadow-sm">
                      <Accordion type="single" collapsible defaultValue="ai-assessment" className="border-0">
                        <AccordionItem value="ai-assessment" className="border-0">
                          <AccordionTrigger className={cn(
                            "px-4 py-3",
                            selectedArticle.ai_decision === "Yes" 
                              ? "bg-[#00b380]/5 text-[#00b380] hover:bg-[#00b380]/10" 
                              : "bg-[#ff1d42]/5 text-[#ff1d42] hover:bg-[#ff1d42]/10"
                          )}>
                            <div className="flex items-center gap-2">
                              <Bot className="h-5 w-5" />
                              <h3 className="text-base font-medium">
                                AI Assessment: {selectedArticle.ai_decision === "Yes" ? "Include" : "Exclude"}
                              </h3>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-3 bg-background/80 border-t">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Terminal className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium text-muted-foreground">Analysis</h4>
                              </div>
                              <div className="text-sm leading-relaxed">
                                {selectedArticle.ai_explanation}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decision buttons */}
              <DialogFooter className="sm:justify-between flex-wrap gap-y-2 border-t pt-4 mt-2">
                <div className="text-sm text-muted-foreground mr-auto">
                  {selectedArticle.user_decision ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Previously reviewed</span>
                    </div>
                  ) : null}
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={() => handleArticleDecision("No", selectedArticle.id, false)}
                    variant="outline"
                    size="lg"
                    className={cn(
                      "border-[#ff1d42]/30 text-[#ff1d42] hover:bg-[#ff1d42]/10",
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
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Excluded
                      </motion.div>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Exclude
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleArticleDecision("Yes", selectedArticle.id, false)}
                    size="lg"
                    className={cn(
                      "bg-[#00b380] hover:bg-[#00b380]/90",
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