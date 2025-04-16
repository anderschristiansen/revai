"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import * as Collapsible from '@radix-ui/react-collapsible';

export interface ParsedArticle {
  title: string;
  abstract: string;
  id?: string; // Used to track duplicates
  hash?: string; // Used for identifying duplicates
  sourceFile: string;
  isDuplicate?: boolean;
}

interface ArticlePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  articles: ParsedArticle[];
  onUpload: (selectedArticles: ParsedArticle[]) => void;
  isUploading: boolean;
}

export function ArticlePreviewDialog({
  isOpen,
  onClose,
  articles,
  onUpload,
  isUploading,
}: ArticlePreviewDialogProps) {
  const [selectedArticles, setSelectedArticles] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Group articles by file
  const articlesByFile = useMemo(() => {
    const grouped: Record<string, ParsedArticle[]> = {};
    articles.forEach(article => {
      if (!grouped[article.sourceFile]) {
        grouped[article.sourceFile] = [];
      }
      grouped[article.sourceFile].push(article);
    });
    return grouped;
  }, [articles]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = articles.length;
    const duplicates = articles.filter(a => a.isDuplicate).length;
    const selected = Object.entries(selectedArticles).filter(([, isSelected]) => isSelected).length;
    
    return { total, duplicates, selected };
  }, [articles, selectedArticles]);

  const getArticleKey = useCallback((article: ParsedArticle) => {
    return `${article.sourceFile}-${article.hash || article.title}`;
  }, []);

  // Initialize selected articles (all selected by default, except duplicates)
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    articles.forEach(article => {
      const key = getArticleKey(article);
      initialState[key] = !article.isDuplicate;
    });
    setSelectedArticles(initialState);
  }, [articles, getArticleKey]);

  const toggleArticle = (article: ParsedArticle) => {
    const key = getArticleKey(article);
    setSelectedArticles(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllInFile = (fileName: string, value: boolean) => {
    const newSelectedArticles = { ...selectedArticles };
    
    articlesByFile[fileName].forEach(article => {
      const key = getArticleKey(article);
      newSelectedArticles[key] = value;
    });
    
    setSelectedArticles(newSelectedArticles);
  };

  const toggleAll = (value: boolean) => {
    const newSelectedArticles: Record<string, boolean> = {};
    
    articles.forEach(article => {
      const key = getArticleKey(article);
      newSelectedArticles[key] = value;
    });
    
    setSelectedArticles(newSelectedArticles);
  };

  const handleUpload = () => {
    const selectedArticlesList = articles.filter(article => 
      selectedArticles[getArticleKey(article)]
    );
    
    if (selectedArticlesList.length === 0) {
      toast.error("Please select at least one article to upload");
      return;
    }
    
    onUpload(selectedArticlesList);
  };

  const isArticleSelected = useCallback((article: ParsedArticle) => {
    return !!selectedArticles[getArticleKey(article)];
  }, [selectedArticles, getArticleKey]);

  // Filter articles based on active tab and search query
  const getFilteredArticles = useCallback((fileArticles: ParsedArticle[]) => {
    let filtered = fileArticles;
    
    // First filter by tab
    if (activeTab === "all") filtered = fileArticles;
    else if (activeTab === "duplicates") filtered = filtered.filter(a => a.isDuplicate);
    else if (activeTab === "selected") filtered = filtered.filter(a => isArticleSelected(a));
    
    // Then filter by search query if it exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.abstract.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [activeTab, searchQuery, isArticleSelected]);

  // Check if any file has articles that match the current filter
  const hasFilteredArticles = useMemo(() => {
    return Object.values(articlesByFile).some(fileArticles => 
      getFilteredArticles(fileArticles).length > 0
    );
  }, [articlesByFile, getFilteredArticles]);

  // Calculate total search results
  const totalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    
    return Object.values(articlesByFile).reduce((count, fileArticles) => {
      return count + getFilteredArticles(fileArticles).length;
    }, 0);
  }, [articlesByFile, getFilteredArticles, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Articles</DialogTitle>
          <DialogDescription>
            {stats.total} article{stats.total !== 1 ? 's' : ''} found
            {stats.duplicates > 0 && ` • ${stats.duplicates} potential duplicate${stats.duplicates !== 1 ? 's' : ''}`}
            {` • ${stats.selected} selected`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="selected">Selected</TabsTrigger>
              {stats.duplicates > 0 && (
                <TabsTrigger value="duplicates">
                  Duplicates
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-white">
                    {stats.duplicates}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(true)}
              disabled={isUploading}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(false)}
              disabled={isUploading}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles by title or abstract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery.trim() && (
            <Badge variant="secondary" className="absolute right-2.5 top-2.5">
              {totalSearchResults} result{totalSearchResults !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 border rounded-md p-4">
          {searchQuery.trim() && totalSearchResults === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Search className="h-10 w-10 mb-2 opacity-20" />
              <p>No articles found matching &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : !hasFilteredArticles ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              {activeTab === "duplicates" ? (
                <>
                  <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                  <p>No duplicate articles found</p>
                </>
              ) : activeTab === "selected" ? (
                <>
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                  <p>No selected articles</p>
                </>
              ) : (
                <>
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p>No articles found</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(articlesByFile).map(([fileName, fileArticles]) => {
                const filteredArticles = getFilteredArticles(fileArticles);
                if (filteredArticles.length === 0) return null;
                
                return (
                  <div key={fileName} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium flex items-center">
                        <span className="text-muted-foreground mr-2">File:</span> {fileName}
                        <Badge variant="outline" className="ml-2">{fileArticles.length} article{fileArticles.length !== 1 ? 's' : ''}</Badge>
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllInFile(fileName, true)}
                          disabled={isUploading}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllInFile(fileName, false)}
                          disabled={isUploading}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredArticles.map((article, index) => (
                        <div 
                          key={`${fileName}-${index}`} 
                          className={`
                            group relative border rounded-md p-3 hover:bg-accent/20 transition-colors
                            ${article.isDuplicate ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900 !ring-1 !ring-yellow-300 dark:!ring-yellow-800' : ''}
                            ${isArticleSelected(article) ? 'ring-1 ring-primary/30' : ''}
                            ${expandedArticleId === `${fileName}-${index}` ? 'bg-accent/30 dark:bg-accent/20' : ''}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`${fileName}-${index}`} 
                              checked={isArticleSelected(article)}
                              onCheckedChange={() => toggleArticle(article)}
                              disabled={isUploading}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-medium text-sm text-foreground line-clamp-1">{article.title || "Untitled article"}</h4>
                                {article.isDuplicate && (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800 shrink-0 px-1.5 py-0 text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" /> Duplicate
                                  </Badge>
                                )}
                              </div>
                              {article.abstract && (
                                <Collapsible.Root 
                                  className="w-full" 
                                  open={expandedArticleId === `${fileName}-${index}`}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setExpandedArticleId(`${fileName}-${index}`);
                                    } else if (expandedArticleId === `${fileName}-${index}`) {
                                      setExpandedArticleId(null);
                                    }
                                  }}
                                >
                                  <Collapsible.Trigger asChild>
                                    <button className="flex w-full items-center justify-between rounded-md p-1 text-left text-xs hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                      <span className="line-clamp-2 text-muted-foreground">
                                        {article.abstract}
                                      </span>
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background/80 ml-2">
                                        {expandedArticleId === `${fileName}-${index}` ? (
                                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        )}
                                      </span>
                                    </button>
                                  </Collapsible.Trigger>
                                  <Collapsible.Content className="overflow-hidden transition-all data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                                    <div className="rounded-md bg-accent/30 dark:bg-accent/20 p-3 mt-2 text-sm text-foreground">
                                      {article.abstract}
                                    </div>
                                  </Collapsible.Content>
                                </Collapsible.Root>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || stats.selected === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Upload {stats.selected} Article{stats.selected !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 