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
import { PlusIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  criteriaText: z.string().min(1, "Please provide inclusion criteria"),
});

type FileFormValues = z.infer<typeof formSchema>;

interface UploadFormProps {
  sessionId: string;
  onUploadComplete?: () => Promise<void>;
  onArticlesRefresh?: () => Promise<void>;
}

export function UploadForm({ sessionId, onUploadComplete, onArticlesRefresh }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [articlesFiles, setArticlesFiles] = useState<File[]>([]);
  const router = useRouter();

  const form = useForm<FileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      criteriaText: "Studies must contain direct or indirect measurements of either ICP or CSF opening pressure.\nOnly studies performed on humans will be included; studies based on animal models will be excluded.\nStudies must include interventions specifically targeting the systemic venous system for ICP management.\nStudies must be published in English and have undergone peer review.\nStudies focusing on patients treated for specific intracranial venous pathologies or obstructions using well-established methods (e.g., surgical shunts, stents, or thrombectomy) will be excluded.",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    
    // Validate all files
    const invalidFiles = newFiles.filter(file => !file.name.endsWith('.txt'));
    if (invalidFiles.length > 0) {
      toast.error(`Files must be .txt files: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    const largeFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (largeFiles.length > 0) {
      toast.error(`Files must be less than 10MB: ${largeFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setArticlesFiles(prev => [...prev, ...newFiles]);
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setArticlesFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (articlesFiles.length === 0 || !form.getValues().criteriaText) {
      toast.error("Please provide both files and inclusion criteria");
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Check if session exists first
      const { data: existingSession, error: checkError } = await supabase
        .from('review_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw checkError;
      }

      // Only create session if it doesn't exist
      if (!existingSession) {
        try {
          // First try with needs_setup column
          const { error: sessionError } = await supabase
            .from('review_sessions')
            .insert([
              {
                id: sessionId,
                title: 'Systematic Review',
                criteria: form.getValues().criteriaText,
                articles_count: 0,
                files_count: 0, // Initialize files count
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                needs_setup: false // This will be a complete session since we're adding criteria and files
              }
            ]);

          // If there's an error with the needs_setup column, try again without it
          if (sessionError && sessionError.message.includes('needs_setup')) {
            console.warn('needs_setup column not found, creating without it');
            const { error: fallbackError } = await supabase
              .from('review_sessions')
              .insert([
                {
                  id: sessionId,
                  title: 'Systematic Review',
                  criteria: form.getValues().criteriaText,
                  articles_count: 0,
                  files_count: 0, // Initialize files count
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);
            
            if (fallbackError) throw fallbackError;
          } else if (sessionError) {
            throw sessionError;
          }
        } catch (error) {
          console.error('Error creating session:', error);
          toast.error('Could not create new session');
          setIsUploading(false);
          return;
        }
      } else {
        // Update existing session with new criteria
        const { error: updateError } = await supabase
          .from('review_sessions')
          .update({
            criteria: form.getValues().criteriaText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (updateError) throw updateError;
      }

      let totalArticlesCount = 0;

      // Process each file
      for (const file of articlesFiles) {
        // Create a FormData for each file upload
        const formData = new FormData();
        formData.append('articles', file);
        formData.append('sessionId', sessionId);
        formData.append('filename', file.name);
        
        // Convert criteria text to JSON format
        const criteriaJson = JSON.stringify(
          form.getValues().criteriaText
            .split('\n')
            .filter(line => line.trim())
            .map(line => ({
              id: crypto.randomUUID(),
              text: line.trim(),
              required: true
            }))
        );
        formData.append('criteria', criteriaJson);

        // Call the API to process the file
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Could not process file: ${file.name}`);
        }

        const result = await response.json();
        totalArticlesCount += result.articleCount;
      }

      // Update session with total article count
      try {
        const { error: updateError } = await supabase
          .from('review_sessions')
          .update({ 
            articles_count: totalArticlesCount,
            files_count: articlesFiles.length,
            updated_at: new Date().toISOString(),
            needs_setup: false // Set needs_setup to false since we now have articles and criteria
          })
          .eq('id', sessionId);

        if (updateError) {
          // If there's an error with the needs_setup column, try again without it
          if (updateError.message.includes('needs_setup')) {
            console.warn('needs_setup column not found, updating without it');
            const { error: fallbackError } = await supabase
              .from('review_sessions')
              .update({ 
                articles_count: totalArticlesCount,
                files_count: articlesFiles.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
              
            if (fallbackError) throw fallbackError;
          } else {
            throw updateError;
          }
        }
      } catch (error) {
        console.error('Error updating session:', error);
        toast.error('Could not update session information');
      }

      setUploadSuccess(true);
      toast.success(`Successfully uploaded ${totalArticlesCount} articles from ${articlesFiles.length} files`);

      // Clear the files list
      setArticlesFiles([]);

      // Call onUploadComplete to trigger a refresh of the parent component
      if (onUploadComplete) {
        await onUploadComplete();
      }

      // Call onArticlesRefresh to refresh the articles data
      if (onArticlesRefresh) {
        await onArticlesRefresh();
      }

      // Force a router refresh to ensure all data is loaded
      router.refresh();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Could not upload files');
    } finally {
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
            {uploadSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2">Upload Completed!</h3>
                <p className="text-muted-foreground">Your articles are being processed...</p>
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="criteriaText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclusion Criteria</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter your inclusion criteria, one per line..."
                          className="min-h-[120px] font-mono text-sm"
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
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={isUploading || articlesFiles.length === 0}>
                  {isUploading ? "Uploading..." : "Upload Files"}
                </Button>
              </>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
} 