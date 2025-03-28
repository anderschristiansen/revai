"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ArrowUpDown, CheckCircle2, Circle, ThumbsUp, ThumbsDown } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Add URL detection regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function TextWithLinks({ text }: { text: string }) {
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
              className="text-primary hover:underline break-all"
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

  function openArticleDialog(article: Article) {
    setSelectedArticle(article)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setSelectedArticle(null)
  }

  const columns: ColumnDef<Article>[] = [
    {
      id: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.user_decision ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      ),
      enableSorting: true,
      accessorFn: (row) => row.user_decision ? 1 : 0,
    },
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs whitespace-nowrap">{row.getValue("id")}</div>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          <span>{row.getValue("title")}</span>
        </div>
      ),
    },
    {
      accessorKey: "ai_decision",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          AI Assessment
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const decision = row.getValue("ai_decision") as string
        if (!decision) return <div className="text-muted-foreground italic">Not evaluated</div>
        
        return (
          <span className="text-muted-foreground">
            {decision === "Yes" ? (
              <ThumbsUp className="h-5 w-5" />
            ) : (
              <ThumbsDown className="h-5 w-5" />
            )}
          </span>
        )
      },
    },
    {
      accessorKey: "user_decision",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Your decision
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const decision = row.getValue("user_decision") as string
        if (!decision) return <div className="text-muted-foreground italic">Pending</div>
        
        return (
          <div className="flex items-center gap-2">
            {decision === "Yes" ? (
              <ThumbsUp className="h-5 w-5 text-[#00b380]" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-[#ff1d42]" />
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          type="button"
          variant={row.original.user_decision ? "secondary" : "outline"}
          size="sm" 
          onClick={(e) => {
            e.preventDefault();
            openArticleDialog(row.original);
          }}
        >
          {row.original.user_decision ? "Review again" : "Review"}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <DataTable 
        columns={columns} 
        data={articles} 
        filterColumn="title"
        filterPlaceholder="Search articles..."
        initialColumnVisibility={{ id: false }}
        initialSorting={[{ id: "status", desc: false }]}
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
        <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
          {selectedArticle && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex flex-col gap-2">
                  {selectedArticle.user_decision ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Previously reviewed</span>
                    </div>
                  ) : null}
                  <DialogTitle className="text-xl font-semibold leading-tight">
                    {selectedArticle.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    {selectedArticle.user_decision 
                      ? (
                        <>
                          <span>Your previous decision:</span>
                          <span>
                            {selectedArticle.user_decision === "Yes" ? (
                              <ThumbsUp className="h-5 w-5 text-[#00b380]" />
                            ) : (
                              <ThumbsDown className="h-5 w-5 text-[#ff1d42]" />
                            )}
                          </span>
                        </>
                      )
                      : "Review this article based on inclusion criteria"
                    }
                  </DialogDescription>
                </div>
              </DialogHeader>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto min-h-0 py-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Abstract</h3>
                    <div className="border rounded-md p-4 bg-muted/10">
                      <p className="text-sm leading-relaxed">{selectedArticle.abstract}</p>
                    </div>
                  </div>
                  
                  {selectedArticle.full_text && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Full text</h3>
                      <div className="border rounded-md p-4 bg-muted/10">
                        <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                          <TextWithLinks text={selectedArticle.full_text} />
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Assessment - Using Accordion */}
              {selectedArticle.ai_decision && (
                <div className="flex-shrink-0 border-t pt-4 mt-4 border-border">
                  <Accordion type="single" collapsible defaultValue="ai-assessment">
                    <AccordionItem value="ai-assessment" className="border-0">
                      <AccordionTrigger className="py-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium">AI assessment</h3>
                          <span className="text-muted-foreground">
                            {selectedArticle.ai_decision === "Yes" ? (
                              <ThumbsUp className="h-5 w-5" />
                            ) : (
                              <ThumbsDown className="h-5 w-5" />
                            )}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-background rounded-md border p-3">
                          <p className="text-sm leading-relaxed">
                            {selectedArticle.ai_explanation}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
              
              <DialogFooter className="flex-shrink-0 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-end sm:space-x-2 pt-4 mt-4 border-t border-border">
                <Button 
                  type="button"
                  variant="default" 
                  className="bg-[#00b380] hover:bg-[#00b380]/90 text-white" 
                  onClick={(e) => {
                    // Prevent default handling to avoid any form submission
                    e.preventDefault();
                    
                    // Use mouseEvent.stopPropagation() to prevent event bubbling
                    e.stopPropagation();
                    
                    // Track that we're handling this click
                    let handled = false;
                    
                    // Execute in a try/catch to ensure we can recover
                    try {
                      if (!handled) {
                        handled = true;
                        
                        // Call without await to prevent blocking
                        onReviewArticle(selectedArticle.id, "Yes")
                          .then(() => {
                            // Only close dialog after async operations complete
                            setTimeout(closeDialog, 100);
                          })
                          .catch((error) => {
                            console.error("Error saving decision:", error);
                          });
                      }
                    } catch (error) {
                      console.error("Unexpected error:", error);
                    }
                    
                    // Explicitly return false to prevent any default browser behavior
                    return false;
                  }}
                >
                  Include
                </Button>
                <Button 
                  type="button"
                  variant="default" 
                  className="bg-[#ff1d42] hover:bg-[#ff1d42]/90 text-white" 
                  onClick={(e) => {
                    // Prevent default handling to avoid any form submission
                    e.preventDefault();
                    
                    // Use mouseEvent.stopPropagation() to prevent event bubbling
                    e.stopPropagation();
                    
                    // Track that we're handling this click
                    let handled = false;
                    
                    // Execute in a try/catch to ensure we can recover
                    try {
                      if (!handled) {
                        handled = true;
                        
                        // Call without await to prevent blocking
                        onReviewArticle(selectedArticle.id, "No")
                          .then(() => {
                            // Only close dialog after async operations complete
                            setTimeout(closeDialog, 100);
                          })
                          .catch((error) => {
                            console.error("Error saving decision:", error);
                          });
                      }
                    } catch (error) {
                      console.error("Unexpected error:", error);
                    }
                    
                    // Explicitly return false to prevent any default browser behavior
                    return false;
                  }}
                >
                  Exclude
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDialog();
                    return false;
                  }}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 