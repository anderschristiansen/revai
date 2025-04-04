"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  insertReviewSession, 
  deleteReviewSession, 
  deleteAllReviewSessions, 
  getReviewSessionsWithFilesAndArticles 
} from "@/lib/utils/supabase-utils";
import { ReviewSessionView } from "@/lib/types";
import { SessionCard } from "@/components/session-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "@/components/ui/alert-dialog";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ReviewSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const sessionsData = await getReviewSessionsWithFilesAndArticles();

      const processedSessions = sessionsData.map(session => {
        const allArticles = session.files?.flatMap(file => file.articles || []) || [];

        const transformedArticles = allArticles.map(article => ({
          ...article,
          needs_ai_evaluation: article.needs_review,
        }));

        return {
          ...session,
          reviewed_count: transformedArticles.filter(a => a.user_decision === "Include").length,
          excluded_count: transformedArticles.filter(a => a.user_decision === "Exclude").length,
          unsure_count: transformedArticles.filter(a => a.user_decision === "Unsure").length,
          pending_count: transformedArticles.filter(a => !a.user_decision).length,
          ai_evaluated_count: transformedArticles.filter(a => 
            a.ai_decision === "Include" || 
            a.ai_decision === "Exclude" || 
            a.ai_decision === "Unsure"
          ).length,
          ai_included_count: transformedArticles.filter(a => a.ai_decision === "Include").length,
          ai_excluded_count: transformedArticles.filter(a => a.ai_decision === "Exclude").length,
          ai_unsure_count: transformedArticles.filter(a => a.ai_decision === "Unsure").length,
          articles: transformedArticles,
        };
      });

      setSessions(processedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Could not load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Realtime updates for sessions and articles
  useSupabaseRealtime(["INSERT", "UPDATE", "DELETE"], "review_sessions", () => {
    loadSessions();
  });

  useSupabaseRealtime(["INSERT", "UPDATE", "DELETE"], "articles", () => {
    loadSessions();
  });

  // Create a new session
  async function createNewSession() {
    try {
      const newSession = await insertReviewSession({
        title: "New Review Session",
        articles_count: 0,
        criterias: [],
      });

      router.push(`/review/${newSession.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Could not create new session");
    }
  }

  // Delete a session
  async function confirmDeleteSession() {
    if (!deleteSessionId) return;

    try {
      await deleteReviewSession(deleteSessionId);
      toast.success("Session deleted successfully");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Could not delete session");
    } finally {
      setDeleteSessionId(null);
    }
  }

  // Delete all sessions
  async function handleDeleteAllSessions() {
    setIsDeleting(true);
    try {
      await deleteAllReviewSessions();
      setSessions([]);
      toast.success("All sessions deleted");
      router.refresh();
    } catch (error) {
      console.error("Error deleting all sessions:", error);
      toast.error("Could not delete all sessions");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Review Sessions</h1>
        <div className="flex gap-4">
          {sessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Sessions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your review sessions and associated articles. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllSessions}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={createNewSession}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Review Session
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="h-64">
          <CardContent className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </CardContent>
        </Card>
      ) : sessions.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {sessions.map((session) => (
            <motion.div key={session.id} variants={item}>
              <SessionCard
                id={session.id}
                title={session.title}
                created_at={session.created_at}
                articles_count={session.articles_count}
                reviewed_count={session.reviewed_count}
                excluded_count={session.excluded_count}
                pending_count={session.pending_count}
                unsure_count={session.unsure_count}
                ai_evaluated_count={session.ai_evaluated_count}
                ai_included_count={session.ai_included_count}
                ai_excluded_count={session.ai_excluded_count}
                ai_unsure_count={session.ai_unsure_count}
                ai_evaluation_running={session.ai_evaluation_running}
                files_processed={session.files_processed}
                upload_running={session.files_upload_running}
                onDelete={() => setDeleteSessionId(session.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-muted/30 rounded-lg border border-dashed"
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-2xl font-medium mb-4">No review sessions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a new session to begin your systematic review process and start analyzing articles.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={createNewSession} size="lg" className="shadow-sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Session
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session and all its files and articles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSession}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
