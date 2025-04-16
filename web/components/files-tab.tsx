"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadForm } from "@/components/file-upload-form";
import { toast } from "@/components/ui/sonner";
import { Loader2, FolderIcon } from "lucide-react";
import { ReviewSession, File as SessionFile } from "@/lib/types";

interface FilesTabProps {
  session: ReviewSession;
  sessionId: string;
  loading: boolean;
  sessionFiles: SessionFile[];
}

export function FilesTab({ session, sessionId, loading, sessionFiles }: FilesTabProps) {
  return (
    <>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : session && session.files_count > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Uploaded Files</CardTitle>
            <div className="text-sm text-muted-foreground">
              {session.files_count} file{session.files_count !== 1 ? 's' : ''} · {session.articles_count} article{session.articles_count !== 1 ? 's' : ''}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm mb-4">
              <p>These files have been processed and the articles are now available for review.</p>
            </div>
            
            {/* Files List */}
            <div className="space-y-2">
              {session.files_processed ? (
                <div className="grid gap-2">
                  {sessionFiles.map((file: SessionFile) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FolderIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{file.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.articles_count} article{file.articles_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                  Processing files...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <FileUploadForm 
          sessionId={sessionId} 
          onUploadComplete={(hasCriteria) => {
            // Don't force users to criteria tab, just show a gentle suggestion
            if (!hasCriteria) {
              toast.info("Consider defining inclusion and exclusion criteria for your review");
            }
            // Always reload the page to show all articles
            window.location.href = `/review/${sessionId}`;
          }}
        />
      )}
    </>
  );
} 