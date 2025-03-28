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
  const [articlesFile, setArticlesFile] = useState<File | null>(null);
  const router = useRouter();

  const form = useForm<FileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      criteriaText: "Studies must contain direct or indirect measurements of either ICP or CSF opening pressure.\nOnly studies performed on humans will be included; studies based on animal models will be excluded.\nStudies must include interventions specifically targeting the systemic venous system for ICP management.\nStudies must be published in English and have undergone peer review.\nStudies focusing on patients treated for specific intracranial venous pathologies or obstructions using well-established methods (e.g., surgical shunts, stents, or thrombectomy) will be excluded.",
    },
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!articlesFile || !form.getValues().criteriaText) {
      toast.error("Please provide both a file and inclusion criteria");
      return;
    }

    // Validate articles file
    if (!articlesFile.name.endsWith('.txt')) {
      toast.error("The article file must be a .txt file");
      return;
    }
    
    if (articlesFile.size > 10 * 1024 * 1024) {
      toast.error("The article file must be less than 10MB");
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
        const { error: sessionError } = await supabase
          .from('review_sessions')
          .insert([
            {
              id: sessionId,
              title: 'Systematic Review',
              criteria: form.getValues().criteriaText,
              articles_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);

        if (sessionError) throw sessionError;
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

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('articles', articlesFile);
      formData.append('sessionId', sessionId);
      
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
        throw new Error(errorData.error || 'Kunne ikke behandle artikler');
      }

      const result = await response.json();
      
      // Update session with article count
      const { error: updateError } = await supabase
        .from('review_sessions')
        .update({ 
          articles_count: result.articleCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setUploadSuccess(true);
      toast.success(`Successfully uploaded ${result.articleCount} articles`);

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
      toast.error('Could not upload file');
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
                  <FormLabel>Article File (.txt)</FormLabel>
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={(e) => setArticlesFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                  />
                </div>

                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
} 