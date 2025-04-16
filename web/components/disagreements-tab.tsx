"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArticlesTable } from "@/components/articles-table";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Article } from "@/lib/types";
import { updateArticleUserDecision } from "@/lib/utils/supabase-utils";

interface DisagreementsTabProps {
  articles: Article[];
  onArticleUpdate: (updatedArticles: Article[]) => void;
}

export function DisagreementsTab({ articles, onArticleUpdate }: DisagreementsTabProps) {
  const [disagreementFilters, setDisagreementFilters] = useState({
    include: true,
    exclude: true,
    unsure: true
  });
  const [disagreeingArticles, setDisagreeingArticles] = useState<Article[]>([]);

  // Function to toggle disagreement filters
  const toggleDisagreementFilter = (filter: "include" | "exclude" | "unsure") => {
    setDisagreementFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  // Update disagreeing articles when articles or filters change
  useEffect(() => {
    const filtered = articles.filter(article => {
      // Both decisions must exist
      if (!article.user_decision || !article.ai_decision) return false;
      
      // Must be a disagreement
      if (article.user_decision === article.ai_decision) return false;
      
      // Filter by user decision types
      if (article.user_decision === "Include" && !disagreementFilters.include) return false;
      if (article.user_decision === "Exclude" && !disagreementFilters.exclude) return false;
      if (article.user_decision === "Unsure" && !disagreementFilters.unsure) return false;
      
      return true;
    });
    
    setDisagreeingArticles(filtered);
  }, [articles, disagreementFilters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">User and AI Disagreements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Articles where your decision differs from the AI recommendation.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "gap-1",
              disagreementFilters.include && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            )}
            onClick={() => toggleDisagreementFilter("include")}
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Include
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "gap-1",
              disagreementFilters.exclude && "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            )}
            onClick={() => toggleDisagreementFilter("exclude")}
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Exclude
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "gap-1",
              disagreementFilters.unsure && "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
            )}
            onClick={() => toggleDisagreementFilter("unsure")}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsure
          </Button>
        </div>
      </div>

      {disagreeingArticles.length > 0 ? (
        <div className="w-full table-container">
          <ArticlesTable 
            articles={disagreeingArticles}
            onReviewArticle={async (articleId, decision) => {
              try {
                await updateArticleUserDecision(articleId, decision);

                // Update local UI immediately
                const updatedArticles = articles.map(a => 
                  a.id === articleId ? { ...a, user_decision: decision } : a
                );
                onArticleUpdate(updatedArticles);
              } catch (error) {
                console.error("Error updating decision:", error);
                toast.error("Could not save decision");
              }
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="rounded-full bg-muted/50 p-3 mb-4">
            <CheckIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No disagreements found</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {articles.some(a => a.ai_decision && a.user_decision) 
              ? "All reviewed articles have matching user and AI decisions based on your current filters."
              : "Make sure you have both user and AI decisions for articles to compare them."}
          </p>
        </div>
      )}
    </div>
  );
} 