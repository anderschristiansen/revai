"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/session-card";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Article, Session } from "@/lib/types";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

// Animation variants for staggered animations
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initial load of sessions
    loadSessions();
    
    // Set up Supabase subscription for real-time updates
    const sessionSubscription = supabase
      .channel('sessions_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'review_sessions'
      }, (payload) => {
        console.log("Session update received:", payload);
        // Simply reload all sessions to ensure we get the latest data
        loadSessions();
      })
      .subscribe();
      
    // Set up Supabase subscription for article changes that might affect session stats
    const articlesSubscription = supabase
      .channel('articles_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'articles'
      }, (payload) => {
        console.log("Article update received:", payload);
        // Simply reload all sessions to ensure we get the latest data
        loadSessions();
      })
      .subscribe();
    
    // Also subscribe to INSERT and DELETE events separately for full reloads
    const otherChangesSubscription = supabase
      .channel('other_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'review_sessions'
      }, () => loadSessions())
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'review_sessions'
      }, () => loadSessions())
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'articles'
      }, () => loadSessions())
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'articles'
      }, () => loadSessions())
      .subscribe();
    
    // Clean up subscriptions on unmount
    return () => {
      sessionSubscription.unsubscribe();
      articlesSubscription.unsubscribe();
      otherChangesSubscription.unsubscribe();
    };
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("review_sessions")
        .select(`
          *,
          articles!inner (
            user_decision,
            needs_review,
            ai_decision
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Process the data to count reviewed and excluded articles
      const processedSessions = data.map(session => {
        return {
          ...session,
          reviewed_count: session.articles.filter((a: Article) => a.user_decision === "Yes").length,
          excluded_count: session.articles.filter((a: Article) => a.user_decision === "No").length,
          pending_count: session.articles.filter((a: Article) => !a.user_decision).length,
          ai_evaluated_count: session.articles.filter((a: Article) => 
            a.ai_decision === "Include" || a.ai_decision === "Exclude" || a.ai_decision === "Unsure"
          ).length,
          // Use the stored batch_running value or default to false if not present
          batch_running: session.batch_running || false
        };
      });

      setSessions(processedSessions || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Could not load sessions");
    } finally {
      setLoading(false);
    }
  }

  async function createNewSession() {
    try {
      const { data, error } = await supabase
        .from("review_sessions")
        .insert({
          title: "New Review Session",
          articles_count: 0,
          criteria: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        // Navigate to the new session
        router.push(`/review/${data[0].id}`);
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Could not create new session");
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      // First delete all articles for this session
      const { error: articlesError } = await supabase
        .from("articles")
        .delete()
        .eq("session_id", sessionId);
      
      if (articlesError) {
        console.error("Error deleting articles:", articlesError);
        toast.error("Failed to delete session articles");
        return;
      }
      
      // Then delete the session itself
      const { error: sessionError } = await supabase
        .from("review_sessions")
        .delete()
        .eq("id", sessionId);
      
      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        toast.error("Failed to delete session");
        return;
      }
      
      // Refresh the sessions list
      loadSessions();
      toast.success("Session deleted successfully");
    } catch (error) {
      console.error("Error in deleteSession:", error);
      toast.error("An error occurred while deleting the session");
    } finally {
      // Close the confirmation dialog
      setDeleteSessionId(null);
    }
  }
  
  const handleDeleteConfirm = () => {
    if (deleteSessionId) {
      deleteSession(deleteSessionId);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteSessionId(null);
  };
  
  const handleDeleteRequest = (id: string) => {
    setDeleteSessionId(id);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Your Review Sessions</h1>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={createNewSession} size="lg" className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Session
          </Button>
        </motion.div>
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
                ai_evaluated_count={session.ai_evaluated_count}
                batch_running={session.batch_running}
                onDelete={handleDeleteRequest}
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
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={createNewSession} size="lg" className="shadow-sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Session
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open: boolean) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session and all its associated articles.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
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