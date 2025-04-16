"use client";

import { ArticlesTable } from "@/components/articles-table";
import { toast } from "@/components/ui/sonner";
import { Article } from "@/lib/types";
import { updateArticleUserDecision } from "@/lib/utils/supabase-utils";

interface ArticlesTabProps {
  articles: Article[];
  onArticleUpdate: (updatedArticles: Article[]) => void;
}

export function ArticlesTab({ articles, onArticleUpdate }: ArticlesTabProps) {
  return (
    <div className="w-full table-container">
      <ArticlesTable 
        articles={articles}
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
  );
} 