"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { Bot, FileText, ArrowUpDown, CheckCircle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Article, DecisionType } from "@/lib/types";
import { updateArticleDecision } from "@/lib/utils/supabase-utils";

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

export function ArticlesTable({ articles, onReviewArticle }: ArticlesTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  function openArticleDialog(article: Article) {
    setSelectedArticle(article);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setSelectedArticle(null);
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
        const { ai_decision, user_decision } = row.original;
        return (
          <div className={cn(
            "flex items-start gap-3 py-2 pl-4 border-l-2",
            user_decision === "Include" ? "border-l-[#00b380]" :
            user_decision === "Exclude" ? "border-l-[#ff1d42]" :
            user_decision === "Unsure" ? "border-l-[#f59e0b]" :
            "border-l-transparent"
          )}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-medium">{title}</div>
                {user_decision && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 text-xs",
                      user_decision === "Include" ? "bg-[#00b380]/10 text-[#00b380] border-[#00b380]/30" :
                      user_decision === "Exclude" ? "bg-[#ff1d42]/10 text-[#ff1d42] border-[#ff1d42]/30" :
                      "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
                    )}
                  >
                    {user_decision}
                  </Badge>
                )}
              </div>
              <div className="text-[14px] text-muted-foreground mt-1">
                {row.original.abstract}
              </div>
            </div>
            {ai_decision && (
              <Tooltip content={`AI recommendation: ${ai_decision}`}>
                <div className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded border-[0.5px] flex items-center whitespace-nowrap mt-1",
                  ai_decision === "Include" ? "border-[#00b380]/30 text-[#00b380]" :
                  ai_decision === "Exclude" ? "border-[#ff1d42]/30 text-[#ff1d42]" :
                  "border-[#f59e0b]/30 text-[#f59e0b]"
                )}>
                  AI
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    }
  ];

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
        getRowClassName={() => "hover:bg-muted/5 transition-colors cursor-pointer"}
        onRowClick={(row) => openArticleDialog(row.original)}
      />

      {/* Article Details Dialog */}
      <Dialog
        open={isDialogOpen}
        modal
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setTimeout(() => setSelectedArticle(null), 300);
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
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
                <div className="space-y-2 mt-6">
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
                  <div className="space-y-2 mt-6">
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
