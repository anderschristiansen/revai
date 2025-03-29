"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/session-card";
import { supabase } from "@/lib/supabase";

type Article = {
  user_decision?: "Yes" | "No";
  needs_review: boolean;
  ai_decision?: "Yes" | "No";
};

type Session = {
  id: string;
  created_at: string;
  articles_count: number;
  criteria: string;
  title?: string;
  updated_at?: string;
  reviewed_count?: number;
  excluded_count?: number;
  pending_count?: number;
  articles: Article[];
  ai_evaluated_count?: number;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSessions();
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
      const processedSessions = data.map(session => ({
        ...session,
        reviewed_count: session.articles.filter((a: Article) => a.user_decision === "Yes").length,
        excluded_count: session.articles.filter((a: Article) => a.user_decision === "No").length,
        pending_count: session.articles.filter((a: Article) => !a.user_decision).length,
        ai_evaluated_count: session.articles.filter((a: Article) => a.ai_decision).length
      }));

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

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Your Review Sessions</h1>
        <div className="flex gap-2">
          <Button onClick={createNewSession} size="lg">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              title={session.title}
              created_at={session.created_at}
              articles_count={session.articles_count}
              reviewed_count={session.reviewed_count}
              excluded_count={session.excluded_count}
              pending_count={session.pending_count}
              ai_evaluated_count={session.ai_evaluated_count}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-2xl font-medium mb-4">No review sessions yet</h3>
            <p className="text-muted-foreground mb-6">
              Create a new session to begin your systematic review.
            </p>
            <Button onClick={createNewSession} size="lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 