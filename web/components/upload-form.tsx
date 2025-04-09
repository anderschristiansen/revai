"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { PlusIcon, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CriteriaList } from "@/lib/types";

const formSchema = z.object({
  criteriaList: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, "Criterion text cannot be empty")
  })).min(1, "Please provide at least one inclusion criterion")
});

type FileFormValues = z.infer<typeof formSchema>;

interface UploadFormProps {
  sessionId: string;
}

const DEFAULT_CRITERIA: CriteriaList = [
  { id: "1", text: "Studies must contain direct or indirect measurements of either ICP or CSF opening pressure." },
  { id: "2", text: "Only studies performed on humans will be included; studies based on animal models will be excluded." },
  { id: "3", text: "Studies must include interventions specifically targeting the systemic venous system for ICP management." },
  { id: "4", text: "Studies must be published in English and have undergone peer review." },
  { id: "5", text: "Studies focusing on patients treated for specific intracranial venous pathologies or obstructions using well-established methods (e.g., surgical shunts, stents, or thrombectomy) will be excluded." }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadForm({ sessionId }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [articlesFiles, setArticlesFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const form = useForm<FileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { criteriaList: DEFAULT_CRITERIA },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteriaList"
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

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to process file: ${file.name}`);
      }

      if (!result.success || !result.articleCount) {
        throw new Error(`No articles were successfully processed from file: ${file.name}`);
      }

      return result;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw error;
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (articlesFiles.length === 0 || !form.getValues().criteriaList.length) {
      toast.error("Please provide both files and inclusion criteria");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      // Update the criteria
      const { error: updateError } = await supabase
        .from('review_sessions')
        .update({
          criterias: form.getValues().criteriaList,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error('Failed to update session criteria');
      }

      // Upload files sequentially
      let totalArticlesCount = 0;
      const processedFiles = [];
      const errors: string[] = [];

      for (const file of articlesFiles) {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          const result = await uploadFile(file);
          
          totalArticlesCount += result.articleCount;
          processedFiles.push({
            filename: file.name,
            success: true,
            fileId: result.fileId,
            articleCount: result.articleCount,
            warnings: result.warnings
          });
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          errors.push(error instanceof Error ? error.message : `Unknown error processing ${file.name}`);
          setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
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
      
      // Force a full page reload to ensure all data is refreshed
      window.location.href = `/review/${sessionId}`;
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not upload files';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
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
            <div className="space-y-4">
              <FormLabel>Inclusion Criteria</FormLabel>
              {fields.map((field: { id: string }, index: number) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`criteriaList.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter an inclusion criterion..."
                            className="min-h-[80px] font-mono text-sm"
                            disabled={isUploading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mt-2"
                    onClick={() => remove(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ id: crypto.randomUUID(), text: "" })}
                disabled={isUploading}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Criterion
              </Button>
            </div>

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
                        {isUploading && (
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