"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, ArrowUpDown, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LottieCoffeeLoader } from "@/components/ui/lottie-coffee-loader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Import the Lottie animation data
// Note: You need to place your Lottie JSON file in the public/lottie directory
// and update the path/filename below
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

type Article = {
  id: string;
  session_id: string;
  title: string;
  abstract: string;
  full_text: string;
  ai_decision?: "Yes" | "No";
  ai_explanation?: string;
  user_decision?: "Yes" | "No";
  needs_review: boolean;
};

type SortConfig = {
  key: keyof Article | null;
  direction: 'ascending' | 'descending';
};

export function ReviewArticles({ sessionId }: { sessionId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: null,
    direction: 'ascending'
  });
  const [loaderVariant, setLoaderVariant] = useState<number>(0);

  useEffect(() => {
    async function loadArticles() {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("session_id", sessionId)
          .order("id");

        if (error) {
          throw error;
        }

        setArticles(data || []);
        setFilteredArticles(data || []);
      } catch (error) {
        console.error("Error loading articles:", error);
        toast.error("Could not load articles");
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, [sessionId]);

  // Apply search filter and sorting
  useEffect(() => {
    let result = [...articles];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.abstract.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Article];
        const bValue = b[sortConfig.key as keyof Article];
        
        // Handle null or undefined values
        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortConfig.direction === 'ascending' 
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
    }
    
    setFilteredArticles(result);
  }, [articles, searchQuery, sortConfig]);

  function requestSort(key: keyof Article) {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  }

  function getSortIcon(key: keyof Article) {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-4 w-4 inline" />;
    }
    
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp className="ml-1 h-4 w-4 inline text-primary" /> 
      : <ChevronDown className="ml-1 h-4 w-4 inline text-primary" />;
  }

  async function evaluateArticles() {
    if (evaluating) return;
    
    setEvaluating(true);
    // Randomly select a loader variant
    setLoaderVariant(Math.floor(Math.random() * 3));
    
    try {
      // Get articles that need AI evaluation
      const articlesToEvaluate = articles.filter(
        article => !article.ai_decision
      );
      
      if (articlesToEvaluate.length === 0) {
        toast.info("All articles have already been evaluated");
        setEvaluating(false);
        return;
      }
      
      toast.info(`Evaluating ${articlesToEvaluate.length} articles...`);
      
      // Call the API to evaluate articles
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
      
      if (!response.ok) {
        throw new Error("Failed to evaluate articles");
      }
      
      const result = await response.json();
      
      // Refresh articles
      const { data: updatedArticles, error } = await supabase
        .from("articles")
        .select("*")
        .eq("session_id", sessionId)
        .order("id");
        
      if (error) {
        throw error;
      }
      
      setArticles(updatedArticles || []);
      toast.success(`${result.count} articles were successfully evaluated`);
    } catch (error) {
      console.error("Error evaluating articles:", error);
      toast.error("Could not evaluate articles");
    } finally {
      setEvaluating(false);
    }
  }
  
  async function updateUserDecision(articleId: string, decision: "Yes" | "No") {
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          user_decision: decision,
          needs_review: false,
        })
        .eq("id", articleId);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article.id === articleId 
            ? { ...article, user_decision: decision, needs_review: false } 
            : article
        )
      );
      
      closeDialog();
      toast.success("Decision saved");
    } catch (error) {
      console.error("Error saving decision:", error);
      toast.error("Could not save decision");
    }
  }

  function openArticleDialog(article: Article) {
    setSelectedArticle(article);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setSelectedArticle(null);
  }
  
  if (loading) {
    return <div>Loading articles...</div>;
  }
  
  if (articles.length === 0) {
    return <div>No articles found for this review session.</div>;
  }
  
  // Instead of replacing the entire content with a loader, we'll render our main UI
  // and show the loader in an overlay
  const mainContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-col sm:flex-row">
        <h2 className="text-xl font-semibold">Articles ({filteredArticles.length} of {articles.length})</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={evaluateArticles} disabled={evaluating}>
            {evaluating ? "Evaluating..." : "Evaluate all"}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Review Session List</CardTitle>
          <CardDescription>
            {articles.filter(a => !a.needs_review).length} of {articles.length} articles reviewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="w-auto cursor-pointer" 
                    onClick={() => requestSort('id')}
                  >
                    ID {getSortIcon('id')}
                  </TableHead>
                  <TableHead 
                    className="w-full cursor-pointer" 
                    onClick={() => requestSort('title')}
                  >
                    Title {getSortIcon('title')}
                  </TableHead>
                  <TableHead 
                    className="w-auto whitespace-nowrap cursor-pointer" 
                    onClick={() => requestSort('ai_decision')}
                  >
                    AI assessment {getSortIcon('ai_decision')}
                  </TableHead>
                  <TableHead 
                    className="w-auto whitespace-nowrap cursor-pointer" 
                    onClick={() => requestSort('user_decision')}
                  >
                    Your decision {getSortIcon('user_decision')}
                  </TableHead>
                  <TableHead className="w-auto">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <p className="text-center text-muted-foreground py-10">
                        No articles match your search
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{article.id}</TableCell>
                      <TableCell className="font-medium whitespace-normal break-words">
                        {article.title}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {article.ai_decision ? (
                          <span className="text-muted-foreground">
                            {article.ai_decision === "Yes" ? (
                              <ThumbsUp className="h-5 w-5" />
                            ) : (
                              <ThumbsDown className="h-5 w-5" />
                            )}
                          </span>
                        ) : (
                          "Not evaluated"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {article.user_decision ? (
                          <span className={article.user_decision === "Yes" ? "text-[#00b380]" : "text-[#ff1d42]"}>
                            {article.user_decision === "Yes" ? (
                              <ThumbsUp className="h-5 w-5" />
                            ) : (
                              <ThumbsDown className="h-5 w-5" />
                            )}
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openArticleDialog(article)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Article Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
          {selectedArticle && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{selectedArticle.title}</DialogTitle>
                <DialogDescription>Review this article against the inclusion criteria</DialogDescription>
              </DialogHeader>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto min-h-0 py-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Summary</h3>
                    <div className="border rounded-md p-3 bg-muted/10">
                      <p className="text-sm leading-relaxed">{selectedArticle.abstract}</p>
                    </div>
                  </div>
                  
                  {selectedArticle.full_text && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Full text</h3>
                      <div className="border rounded-md p-3 bg-muted/10">
                        <p className="text-sm leading-relaxed whitespace-pre-line">{selectedArticle.full_text}</p>
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
                        <div className="border rounded-md p-3 bg-muted/10">
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
                  variant="default" 
                  className="bg-[#00b380] hover:bg-[#00b380]/90 text-white" 
                  onClick={() => updateUserDecision(selectedArticle.id, "Yes")}
                >
                  Include
                </Button>
                <Button 
                  variant="default" 
                  className="bg-[#ff1d42] hover:bg-[#ff1d42]/90 text-white" 
                  onClick={() => updateUserDecision(selectedArticle.id, "No")}
                >
                  Exclude
                </Button>
                <Button 
                  variant="outline" 
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Show the overlay with the loader while evaluating
  return (
    <div className="relative">
      {/* Main content */}
      {mainContent}
      
      {/* Overlay that shows the coffee loader */}
      {evaluating && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Dimming backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
          
          <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md relative z-10">
            <LottieCoffeeLoader 
              animationData={coffeeAnimation} 
              message={
                loaderVariant === 0 
                  ? "Brewing your evaluations..." 
                  : loaderVariant === 1 
                    ? "Taking a coffee break while we work..." 
                    : "Grinding these articles..."
              }
            />
          </div>
        </div>
      )}
    </div>
  );
} 