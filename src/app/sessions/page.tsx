"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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

const COLORS = ['#00b380', '#ff1d42', '#94a3b8'];

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
      toast.error("Kunne ikke indlæse sessioner");
    } finally {
      setLoading(false);
    }
  }

  async function createNewSession() {
    try {
      const { data, error } = await supabase
        .from("review_sessions")
        .insert({
          title: "Ny Review Session",
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
      toast.error("Kunne ikke oprette ny session");
    }
  }

  function getChartData(session: Session) {
    return [
      { name: 'Inkluderet', value: session.reviewed_count || 0, color: COLORS[0] },
      { name: 'Ekskluderet', value: session.excluded_count || 0, color: COLORS[1] },
      { name: 'Afventer', value: session.pending_count || 0, color: COLORS[2] }
    ];
  }

  function getProgressPercentage(session: Session) {
    const total = (session.reviewed_count || 0) + (session.excluded_count || 0) + (session.pending_count || 0);
    if (total === 0) return 0;
    const completed = (session.reviewed_count || 0) + (session.excluded_count || 0);
    return Math.round((completed / total) * 100);
  }

  function hasDecisions(session: Session) {
    return (session.reviewed_count || 0) > 0 || (session.excluded_count || 0) > 0;
  }

  function hasAiEvaluations(session: Session) {
    return (session.ai_evaluated_count || 0) > 0;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Dine Review Sessioner</h1>
        <div className="flex gap-2">
          <Button onClick={createNewSession} size="lg">
            <PlusCircle className="mr-2 h-4 w-4" />
            Opret Ny Session
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
            <Link key={session.id} href={`/review/${session.id}`}>
              <Card className="h-[140px] hover:shadow-lg transition-all duration-300">
                <CardContent className="flex items-center justify-between h-full p-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      <h3 className="font-semibold">
                        {session.title || "Review Session"}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Oprettet den {format(new Date(session.created_at), "PP")}
                    </p>
                    {hasAiEvaluations(session) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center">
                          <span className="h-2 w-2 rounded-full bg-blue-400 mr-1.5"></span>
                          AI-evalueret
                        </span>
                      </p>
                    )}
                  </div>
                  {hasDecisions(session) ? (
                    <div className="w-24 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getChartData(session)}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={35}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {getChartData(session).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-sm font-medium fill-foreground"
                          >
                            {getProgressPercentage(session)}%
                          </text>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-24 h-24" />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="h-[140px] hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Ingen eksisterende sessioner
              </CardTitle>
              <CardDescription>
                Start din første review session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Opret en ny session for at begynde dit systematiske review.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 