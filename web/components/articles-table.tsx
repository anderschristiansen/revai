"use client";

import { useState, useEffect } from "react";
import { ColumnDef, Table, Column } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { Bot, FileText, ArrowUpDown, CheckCircle, XCircle, HelpCircle, Loader2, Settings, ChevronDown, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Article, DecisionType } from "@/lib/types";
import { updateArticleDecision } from "@/lib/utils/supabase-utils";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Regex to linkify URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function TextWithLinks({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, index) =>
        part.match(URL_REGEX) ? (
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
        ) : (
          part
        )
      )}
    </>
  );
}

interface ArticlesTableProps {
  articles: Article[];
  onReviewArticle: (id: string, decision: DecisionType) => Promise<void>;
}

// Column visibility menu item with internal state
function ColumnVisibilityItem({ column, label }: { column: Column<Article, unknown>; label: string }) {
  const [isVisible, setIsVisible] = useState(column.getIsVisible());
  
  // Update our local state when visibility changes externally
  useEffect(() => {
    setIsVisible(column.getIsVisible());
  }, [column]);
  
  return (
    <DropdownMenuItem
      key={column.id}
      onClick={(e) => {
        e.preventDefault();
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        column.toggleVisibility(newVisibility);
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span className={isVisible ? "" : "opacity-40"}>
          {label}
        </span>
        <div className="flex items-center space-x-2">
          {isVisible && <CheckIcon className="h-4 w-4 ml-1" />}
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function ArticlesTable({ articles, onReviewArticle }: ArticlesTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [tableInstance, setTableInstance] = useState<Table<Article> | null>(null);

  function closeDialog() {
    setIsDialogOpen(false);
    setSelectedArticle(null);
  }

  function openArticleDialog(article: Article) {
    setSelectedArticle(article);
    setIsDialogOpen(true);
  }

  async function handleArticleDecision(decision: DecisionType, articleId?: string, showToast = true) {
    const targetArticle = articleId ? articles.find(a => a.id === articleId) : selectedArticle;
    if (!targetArticle) return;

    setIsSubmitting(true);
    try {
      await updateArticleDecision(targetArticle.id, decision);
      await onReviewArticle(targetArticle.id, decision);

      if (showToast) {
        const message =
          decision === "Include" ? "Article included" :
          decision === "Exclude" ? "Article excluded" :
          "Article marked as unsure";
        toast.success(message);
      } else {
        // Show a minimal toast for quick actions
        const message = 
          decision === "Include" ? "✓ Included" : 
          decision === "Exclude" ? "✗ Excluded" : 
          "? Marked as unsure";
          
        toast.info(message, {
          duration: 1500,
          position: "bottom-right"
        });
      }

      if (selectedArticle && selectedArticle.id === targetArticle.id) {
        setSelectedArticle({ ...selectedArticle, user_decision: decision });
        setTimeout(() => {
          closeDialog();
          setIsSubmitting(false);
        }, 800);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error updating article decision:", error);
      if (showToast) toast.error("Failed to update article decision");
      setIsSubmitting(false);
    }
  }

  async function handleManualAIEvaluation() {
    if (!selectedArticle || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const response = await fetch(`/api/evaluates/${selectedArticle.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedArticle.title,
          abstract: selectedArticle.abstract,
          fileId: selectedArticle.file_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to evaluate article');
      }

      const data = await response.json();

      setSelectedArticle({
        ...selectedArticle,
        ai_decision: data.decision,
        ai_explanation: data.explanation,
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
        const { user_decision, id, ai_decision, abstract } = row.original;
        return (
          <div className={cn(
            "flex items-start gap-3 py-2 pl-4 border-l-2 group relative",
            user_decision === "Include" ? "border-l-[#00b380]" :
            user_decision === "Exclude" ? "border-l-[#ff1d42]" :
            user_decision === "Unsure" ? "border-l-[#f59e0b]" :
            "border-l-transparent"
          )}>
            <div className="flex-1">
              <Tooltip 
                delayDuration={300}
                content={
                  <div className="max-w-md p-3 space-y-2">
                    <h3 className="font-medium">{title}</h3>
                    <div className="flex gap-2 items-center pt-1">
                      <div className="text-sm space-x-1">
                        <span className="text-muted-foreground">User:</span>
                        <span className={cn(
                          user_decision === "Include" ? "text-[#00b380]" :
                          user_decision === "Exclude" ? "text-[#ff1d42]" :
                          user_decision === "Unsure" ? "text-[#f59e0b]" :
                          "text-muted-foreground"
                        )}>
                          {user_decision || "Not reviewed"}
                        </span>
                      </div>
                      <div className="text-sm space-x-1">
                        <span className="text-muted-foreground">AI:</span>
                        <span className={cn(
                          ai_decision === "Include" ? "text-[#00b380]" :
                          ai_decision === "Exclude" ? "text-[#ff1d42]" :
                          ai_decision === "Unsure" ? "text-[#f59e0b]" :
                          "text-muted-foreground"
                        )}>
                          {ai_decision || "Not evaluated"}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground max-h-[100px] overflow-y-auto pt-1 border-t">
                      <p className="pt-2">{abstract?.substring(0, 100)}{abstract?.length > 100 ? "..." : ""}</p>
                    </div>
                  </div>
                }
              >
                <div className="flex items-center gap-2 cursor-help">
                  <div className="text-[14px] font-medium">{title}</div>
                </div>
              </Tooltip>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="absolute right-2 top-2 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 touch-visible flex gap-1 bg-white/90 dark:bg-background/90 backdrop-blur-sm p-1 rounded shadow-sm border" onClick={(e) => e.stopPropagation()}>
              <Tooltip content="Include">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-[#00b380] hover:text-[#00b380] hover:bg-[#00b380]/10"
                  onClick={() => handleArticleDecision("Include", id, false)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Unsure">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-[#f59e0b] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10"
                  onClick={() => handleArticleDecision("Unsure", id, false)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Exclude">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-[#ff1d42] hover:text-[#ff1d42] hover:bg-[#ff1d42]/10"
                  onClick={() => handleArticleDecision("Exclude", id, false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        );
      },
      enableHiding: false,
      maxSize: 400,
    },
    {
      accessorKey: "filename",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap font-medium"
        >
          File
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const filename = row.getValue("filename") as string;
        return (
          <div className="text-sm text-muted-foreground">
            {filename || "Unknown file"}
          </div>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "abstract",
      header: "Abstract",
      cell: ({ row }) => {
        const abstract = row.getValue("abstract") as string;
        
        // Create a truncated version for display
        const truncatedText = abstract ? 
          abstract.substring(0, 100) + (abstract.length > 100 ? "..." : "") : 
          "No abstract available";
        
        return (
          <Tooltip
            delayDuration={300}
            content={
              <div className="max-w-md max-h-[300px] overflow-y-auto p-3">
                <p className="text-sm leading-relaxed whitespace-normal">{abstract || "No abstract available"}</p>
              </div>
            }
          >
            <div className="text-[14px] text-muted-foreground cursor-help line-clamp-2 sm:line-clamp-3 max-w-[200px] sm:max-w-xs">
              {truncatedText}
            </div>
          </Tooltip>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "user_decision",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap font-medium"
        >
          User Decision
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const decision = row.getValue("user_decision") as DecisionType | undefined;
        if (!decision) return <div className="text-muted-foreground text-sm">Not reviewed</div>;
        
        return (
          <Badge
            variant="outline"
            className={cn(
              "h-5 text-xs",
              decision === "Include" ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30" :
              decision === "Exclude" ? "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30" :
              "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
            )}
          >
            {decision}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      enableHiding: true,
    },
    {
      accessorKey: "ai_decision",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap font-medium"
        >
          AI Decision
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const decision = row.getValue("ai_decision") as DecisionType | undefined;
        if (!decision) return <div className="text-muted-foreground text-sm">Not evaluated</div>;
        
        return (
          <div className="flex items-center gap-2">
            <div className={cn(
              "text-[11px] px-1.5 py-0.5 rounded border-[0.5px] flex items-center whitespace-nowrap",
              decision === "Include" ? "border-[#00b380]/30 text-[#00b380]" :
              decision === "Exclude" ? "border-[#ff1d42]/30 text-[#ff1d42]" :
              "border-[#f59e0b]/30 text-[#f59e0b]"
            )}>
              <Bot className="h-3 w-3 mr-1" />
              {decision}
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      enableHiding: true,
    }
  ];

  return (
    <div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search articles..."
              value={(tableInstance?.getColumn("title")?.getFilterValue() as string) ?? ""}
              onChange={(e) => tableInstance?.getColumn("title")?.setFilterValue(e.target.value)}
              className="max-w-xs"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">View options</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tableInstance?.getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <ColumnVisibilityItem 
                    key={column.id}
                    column={column}
                    label={
                      column.id === "abstract" ? "Abstract" :
                      column.id === "user_decision" ? "User Decision" :
                      column.id === "ai_decision" ? "AI Decision" :
                      column.id === "filename" ? "File Name" : column.id
                    }
                  />
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="rounded-md border overflow-x-auto">
          <DataTable 
            columns={columns}
            data={articles}
            onTableInstanceChange={setTableInstance}
            onRowClick={(row) => openArticleDialog(row.original)}
          />
        </div>
      </div>

      {/* Article Detail Dialog */}
      <Dialog
        open={isDialogOpen}
        modal
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-7xl flex flex-col max-h-[90vh] sm:p-6 p-3">
          <DialogDescription className="sr-only">
            Article review dialog showing details and allowing the user to include, exclude, or mark as unsure
          </DialogDescription>
          {selectedArticle && (
            <>
              <DialogHeader className="flex-shrink-0 pb-3 border-b">
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
                    {selectedArticle.filename && (
                      <div className="bg-muted/60 px-2 py-0.5 rounded text-muted-foreground text-xs">
                        {selectedArticle.filename}
                      </div>
                    )}
                    {selectedArticle.user_decision && (
                      <Badge
                        variant="outline"
                        className="h-5 text-xs"
                      >
                        {selectedArticle.user_decision}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-6">
                  {/* AI Assessment */}
                  {selectedArticle.ai_decision && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-medium">AI Assessment</h3>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <div className={cn(
                          "px-4 py-3 font-medium flex items-center gap-2",
                          selectedArticle.ai_decision === "Include"
                            ? "bg-[#00b380]/10 text-[#00b380]"
                            : selectedArticle.ai_decision === "Exclude"
                            ? "bg-[#ff1d42]/10 text-[#ff1d42]"
                            : "bg-[#f59e0b]/10 text-[#f59e0b]"
                        )}>
                          Recommendation: {selectedArticle.ai_decision}
                        </div>
                        <div className="px-4 py-3 bg-muted/5 border-t">
                          <div className="text-[14px] leading-relaxed">
                            {selectedArticle.ai_explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Abstract */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="text-base font-medium">Abstract</h3>
                    </div>
                    <div className="border rounded-md p-4 bg-muted/5">
                      <p className="text-[14px] leading-relaxed">{selectedArticle.abstract}</p>
                    </div>
                  </div>

                  {/* Full text */}
                  {selectedArticle.full_text && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-medium">Full text</h3>
                      </div>
                      <div className="border rounded-md p-4 bg-muted/5 whitespace-pre-line">
                        <TextWithLinks text={selectedArticle.full_text} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="sm:justify-end flex-wrap gap-y-2 border-t pt-4 mt-2">
                <Button onClick={handleManualAIEvaluation} variant="outline" size="lg" disabled={isEvaluating || isSubmitting}>
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Evaluating...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" /> AI Evaluate
                    </>
                  )}
                </Button>

                <Button onClick={() => handleArticleDecision("Exclude", selectedArticle.id)} variant="outline" size="lg" disabled={isSubmitting}>
                  <XCircle className="h-4 w-4 mr-2" /> Exclude
                </Button>

                <Button onClick={() => handleArticleDecision("Unsure", selectedArticle.id)} variant="outline" size="lg" disabled={isSubmitting}>
                  <HelpCircle className="h-4 w-4 mr-2" /> Unsure
                </Button>

                <Button onClick={() => handleArticleDecision("Include", selectedArticle.id)} size="lg" disabled={isSubmitting}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Include
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
