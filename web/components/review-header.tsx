"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { ReviewStats } from "@/components/review-stats";
import { AIStats } from "@/components/ai-stats";
import { toast } from "@/components/ui/sonner";
import { updateSessionTitle } from "@/lib/utils/supabase-utils";
import { ReviewSession } from "@/lib/types";

interface ReviewHeaderProps {
  session: ReviewSession;
  sessionId: string;
  articlesCount: number;
  reviewStats: {
    reviewed: number;
    included: number;
    excluded: number;
    unsure: number;
  };
  aiStats: {
    reviewed: number;
    included: number;
    excluded: number;
    unsure: number;
    isRunning: boolean;
    isQueued: boolean;
  };
}

export function ReviewHeader({ 
  session, 
  sessionId, 
  articlesCount, 
  reviewStats, 
  aiStats 
}: ReviewHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(session?.title || "");

  async function handleUpdateTitle() {
    if (!newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      await updateSessionTitle(sessionId, newTitle);
      toast.success("Title updated");
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Could not update title");
    }
  }

  function cancelTitleEdit() {
    setNewTitle(session?.title || "");
    setIsEditingTitle(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="mr-auto w-full sm:w-auto">
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" /> Back to sessions
          </Button>
        </Link>

        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <Input 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              className="min-w-[200px] w-full sm:w-auto"
            />
            <Button size="icon" variant="ghost" onClick={handleUpdateTitle}><CheckIcon className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={cancelTitleEdit}><XIcon className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">{session.title || "Systematic Review"}</h1>
            <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(true)}><PencilIcon className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap w-full sm:w-auto gap-2">
        <ReviewStats
          total={articlesCount}
          reviewed={reviewStats.reviewed}
          included={reviewStats.included}
          excluded={reviewStats.excluded}
          unsure={reviewStats.unsure}
          pending={articlesCount - reviewStats.reviewed}
          inCard
        />
        <AIStats
          total={articlesCount}
          evaluated={aiStats.reviewed}
          included={aiStats.included}
          excluded={aiStats.excluded}
          unsure={aiStats.unsure}
          isRunning={aiStats.isRunning}
          isQueued={aiStats.isQueued}
          inCard
        />
      </div>
    </div>
  );
} 