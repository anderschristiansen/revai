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
  Circle, 
  Eye, 
  ListFilter,
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
      id: "status",
      header: ({ column }) => (
        <div className="flex justify-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 w-8 p-0"
            title="Toggle review status sort"
          >
            <ListFilter className="h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const reviewed = !!row.original.user_decision;
        const decision = row.original.user_decision;
        
        return (
          <div className="flex justify-center">
            {reviewed ? (
              <Tooltip content={`${decision === "Yes" ? "Included" : "Excluded"}`}>
                <div className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center border",
                  decision === "Yes" 
                    ? "bg-[#00b380]/5 text-[#00b380] border-[#00b380]/20" 
                    : "bg-[#ff1d42]/5 text-[#ff1d42] border-[#ff1d42]/20"
                )}>
                  {decision === "Yes" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
              </Tooltip>
            ) : (
              <Tooltip content="Pending review">
                <div className="h-7 w-7 rounded-md flex items-center justify-center border border-muted/30 bg-muted/5">
                  <Circle className="h-4 w-4 text-muted-foreground/70" />
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
      enableSorting: true,
      accessorFn: (row) => row.user_decision ? 1 : 0,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
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
        
        return (
          <div className="font-medium flex items-center gap-2">
            <div className="flex-1">{displayTitle}</div>
            
            {/* AI badge when available - more subtle */}
            {aiDecision && (
              <Tooltip content={`AI: ${aiDecision === "Yes" ? "Include" : "Exclude"}`}>
                <Badge 
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 flex items-center gap-0.5 whitespace-nowrap text-xs border-muted-foreground/20 bg-background",
                    aiDecision === "Yes" 
                      ? "text-[#00b380]/80" 
                      : "text-[#ff1d42]/80"
                  )}
                >
                  <Bot className="h-2.5 w-2.5 mr-0.5" /> 
                  AI
                </Badge>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: "abstract",
      header: "Abstract",
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
      cell: ({ row }) => {
        const article = row.original;
        const hasUserDecision = !!article.user_decision;
        
        return (
          <div className="flex items-center justify-end gap-2">
            {/* View details button */}
            <Button 
              type="button"
              variant="ghost"
              size="icon" 
              className="h-8 w-8"
              onClick={() => openArticleDialog(article)}
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            {/* Include button */}
            <Tooltip content="Include">
              <Button 
                type="button"
                variant="ghost"
                size="icon" 
                className={cn(
                  "h-8 w-8",
                  hasUserDecision && article.user_decision === "Yes" && "bg-[#00b380]/5 text-[#00b380] ring-1 ring-[#00b380]/20"
                )}
                onClick={() => handleArticleDecision("Yes", article.id)}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </Tooltip>
            
            {/* Exclude button */}
            <Tooltip content="Exclude">
              <Button 
                type="button"
                variant="ghost"
                size="icon" 
                className={cn(
                  "h-8 w-8",
                  hasUserDecision && article.user_decision === "No" && "bg-[#ff1d42]/5 text-[#ff1d42] ring-1 ring-[#ff1d42]/20"
                )}
                onClick={() => handleArticleDecision("No", article.id)}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </Tooltip>
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
        initialSorting={[{ id: "status", desc: false }]}
        pageSize={10}
        pageSizeOptions={[5, 10, 25, 50, 100]}
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