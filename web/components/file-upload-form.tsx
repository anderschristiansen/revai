"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { PlusIcon, X, Loader2, FileTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArticlePreviewDialog, ParsedArticle } from "./article-preview-dialog";
import { parseArticles } from "@/lib/article-parser";
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileUploadFormProps {
  sessionId: string;
  onUploadComplete?: (hasCriteria: boolean) => void;
}

export function FileUploadForm({ sessionId, onUploadComplete }: FileUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [articlesFiles, setArticlesFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // New states for the preview functionality
  const [isParsing, setIsParsing] = useState(false);
  const [parsedArticles, setParsedArticles] = useState<ParsedArticle[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedFilesCount, setParsedFilesCount] = useState(0);

  const validateFiles = (files: File[]) => {
    const invalidFiles = files.filter(file => !file.name.endsWith('.txt'));
    if (invalidFiles.length > 0) {
      toast.error(`Files must be .txt files: ${invalidFiles.map(f => f.name).join(', ')}`);
      return false;
    }
    
    const largeFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (largeFiles.length > 0) {
      toast.error(`Files must be less than 10MB: ${largeFiles.map(f => f.name).join(', ')}`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (!validateFiles(newFiles)) return;
    
    setArticlesFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setArticlesFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Parse the articles from files
  const handleParseFiles = async () => {
    if (articlesFiles.length === 0) {
      toast.error("Please provide files to upload");
      return;
    }

    setIsParsing(true);
    setParsedArticles([]);
    setParsedFilesCount(0);

    try {
      let allArticles: ParsedArticle[] = [];
      const titles = new Set<string>();
      const abstracts = new Map<string, string[]>();
      
      // Parse each file
      for (const file of articlesFiles) {
        const fileContent = await file.text();
        
        // Use the article parser
        const parsedFromFile = parseArticles(fileContent);
        
        // Convert to our format and add source file info
        const articlesWithSource = parsedFromFile.map(article => {
          // Create a hash for duplicate detection
          const titleLower = article.title?.toLowerCase().trim() || '';
          const abstractLower = article.abstract?.toLowerCase().trim() || '';
          const hash = crypto.createHash('md5').update(`${titleLower}${abstractLower}`).digest('hex');
          
          return {
            title: article.title || 'Untitled',
            abstract: article.abstract || '',
            hash,
            sourceFile: file.name,
            isDuplicate: false
          } as ParsedArticle;
        });
        
        // Track for duplicate detection
        for (const article of articlesWithSource) {
          const titleLower = article.title.toLowerCase().trim();
          if (titles.has(titleLower)) {
            article.isDuplicate = true;
          } else {
            titles.add(titleLower);
          }

          // Check for abstract similarity
          if (article.abstract) {
            const abstractHash = article.hash || '';
            if (abstracts.has(abstractHash)) {
              article.isDuplicate = true;
              
              // Mark previous articles with the same hash as duplicates
              const filenames = abstracts.get(abstractHash) || [];
              allArticles = allArticles.map(a => {
                if (a.hash === abstractHash && !a.isDuplicate) {
                  return { ...a, isDuplicate: true };
                }
                return a;
              });
              
              // Add current file to the list
              abstracts.set(abstractHash, [...filenames, file.name]);
            } else {
              abstracts.set(abstractHash, [file.name]);
            }
          }
        }
        
        // Add to all articles
        allArticles = [...allArticles, ...articlesWithSource];
        
        // Update progress
        setParsedFilesCount(prev => prev + 1);
      }
      
      setParsedArticles(allArticles);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error parsing files:', error);
      toast.error('Failed to parse articles from files');
    } finally {
      setIsParsing(false);
    }
  };

  const uploadSelectedArticles = async (selectedArticles: ParsedArticle[]) => {
    if (selectedArticles.length === 0) {
      toast.error("No articles selected for upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      // Group articles by source file
      const articlesByFile = new Map<string, ParsedArticle[]>();
      
      for (const article of selectedArticles) {
        if (!articlesByFile.has(article.sourceFile)) {
          articlesByFile.set(article.sourceFile, []);
        }
        articlesByFile.get(article.sourceFile)?.push(article);
      }
      
      let totalArticlesCount = 0;
      const processedFiles = [];
      const errors: string[] = [];

      // Process each file
      for (const [fileName, fileArticles] of articlesByFile.entries()) {
        try {
          setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
          
          // Find the corresponding File object
          const fileObj = articlesFiles.find(f => f.name === fileName);
          if (!fileObj) {
            throw new Error(`Could not find file: ${fileName}`);
          }
          
          // Create a FormData with file and articles
          const formData = new FormData();
          formData.append('sessionId', sessionId);
          formData.append('file', fileObj);
          formData.append('selectedArticles', JSON.stringify(fileArticles));
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || `Failed to process file: ${fileName}`);
          }

          if (!result.success || !result.articleCount) {
            throw new Error(`No articles were successfully processed from file: ${fileName}`);
          }
          
          totalArticlesCount += result.articleCount;
          processedFiles.push({
            filename: fileName,
            success: true,
            fileId: result.fileId,
            articleCount: result.articleCount,
            warnings: result.warnings
          });
          
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          errors.push(error instanceof Error ? error.message : `Unknown error processing ${fileName}`);
          setUploadProgress(prev => ({ ...prev, [fileName]: -1 }));
        }
      }

      if (errors.length > 0) {
        throw new Error(`Failed to process some files:\n${errors.join('\n')}`);
      }

      if (totalArticlesCount === 0) {
        throw new Error('No articles were successfully processed from any of the uploaded files');
      }

      // Update session with final counts
      const { error: finalUpdateError } = await supabase
        .from('review_sessions')
        .update({
          articles_count: totalArticlesCount,
          files_count: articlesFiles.length,
          files_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (finalUpdateError) {
        throw new Error('Failed to update session with final counts');
      }

      toast.success(`Successfully processed ${totalArticlesCount} articles from ${articlesFiles.length} files`);
      
      // Check if the session has criteria
      const { data: sessionData } = await supabase
        .from('review_sessions')
        .select('criterias')
        .eq('id', sessionId)
        .single();
      
      const hasCriteria = sessionData?.criterias && 
        Array.isArray(sessionData.criterias) && 
        sessionData.criterias.length > 0;
      
      // Close the preview dialog
      setShowPreview(false);
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete(hasCriteria);
      } else {
        // If no callback is provided, just reload the page
        window.location.href = `/review/${sessionId}`;
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not upload files';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upload Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Article Files (.txt)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                disabled={isUploading || isParsing}
                multiple
                className="flex-1"
              />
              <Button 
                type="button" 
                size="icon" 
                variant="outline"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                disabled={isUploading || isParsing}
                title="Add files"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {articlesFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-sm font-medium">Selected Files ({articlesFiles.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {articlesFiles.map((file, index) => (
                    <Badge 
                      key={`${file.name}-${index}`} 
                      variant="secondary"
                      className="flex items-center gap-1 py-1.5"
                    >
                      <span className="text-xs truncate max-w-[200px]">{file.name}</span>
                      {(isUploading || isParsing) && uploadProgress[file.name] !== undefined && (
                        <span className="ml-2">
                          {uploadProgress[file.name] === -1 ? (
                            <span className="text-red-500">Failed</span>
                          ) : uploadProgress[file.name] === 100 ? (
                            <span className="text-green-500">Done</span>
                          ) : (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 rounded-full"
                        onClick={() => removeFile(index)}
                        disabled={isUploading || isParsing}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleParseFiles}
            disabled={isUploading || isParsing || articlesFiles.length === 0}
            className="w-full sm:w-auto"
          >
            {isParsing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing Articles... {parsedFilesCount}/{articlesFiles.length}</span>
              </div>
            ) : (
              <>
                <FileTextIcon className="h-4 w-4 mr-2" />
                Preview Articles
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Article Preview Dialog */}
      <ArticlePreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        articles={parsedArticles}
        onUpload={uploadSelectedArticles}
        isUploading={isUploading}
      />
    </>
  );
} 