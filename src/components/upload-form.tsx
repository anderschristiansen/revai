"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PlusIcon, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  criteriaText: z.string().min(1, "Please provide inclusion criteria"),
});

type FileFormValues = z.infer<typeof formSchema>;

interface UploadFormProps {
  sessionId: string;
}

const DEFAULT_CRITERIA = `Studies must contain direct or indirect measurements of either ICP or CSF opening pressure.
Only studies performed on humans will be included; studies based on animal models will be excluded.
Studies must include interventions specifically targeting the systemic venous system for ICP management.
Studies must be published in English and have undergone peer review.
Studies focusing on patients treated for specific intracranial venous pathologies or obstructions using well-established methods (e.g., surgical shunts, stents, or thrombectomy) will be excluded.`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadForm({ sessionId }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [articlesFiles, setArticlesFiles] = useState<File[]>([]);
  const router = useRouter();

  const form = useForm<FileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { criteriaText: DEFAULT_CRITERIA },
  });

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

  const updateSession = async (updates: {
    criteria?: string;
    articles_count?: number;
    files_count?: number;
    needs_setup?: boolean;
  }) => {
    const { error } = await supabase
      .from('review_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  };

  async function uploadFiles() {
    let totalArticlesCount = 0;
    const processedFiles = [];
    
    for (const file of articlesFiles) {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('articles', file);
      formData.append(`filenames[0]`, file.name);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Could not process file: ${file.name}`);
        }
  
        const result = await response.json();
        totalArticlesCount += result.totalArticlesCount || 0;
        processedFiles.push(...(result.files || []));
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw error;
      }
    }
    
    return {
      totalArticlesCount,
      filesCount: articlesFiles.length,
      files: processedFiles
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (articlesFiles.length === 0 || !form.getValues().criteriaText) {
      toast.error("Please provide both files and inclusion criteria");
      return;
    }

    setIsUploading(true);

    try {
      // Upload the files
      const result = await uploadFiles();
      
      // Update the session with all properties in a single call
      await updateSession({ 
        criteria: form.getValues().criteriaText,
        articles_count: result.totalArticlesCount,
        files_count: result.filesCount,
        needs_setup: false
      });

      // Navigate to the review page
      router.push(`/review/${sessionId}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Could not upload files');
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Articles</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="criteriaText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inclusion Criteria</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter your inclusion criteria, one per line..."
                      className="min-h-[120px] font-mono text-sm"
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Article Files (.txt)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".txt"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  multiple
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline"
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  disabled={isUploading}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 rounded-full"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
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
              type="submit" 
              disabled={isUploading || articlesFiles.length === 0}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                "Upload Files"
              )}
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
} 