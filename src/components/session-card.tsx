"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Clock, CheckCircle, XCircle, HelpCircle, AlertCircle, BarChart3 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Colors for the visualization - using the site's red/green color scheme
const COLORS = {
  included: '#00b380', // Green
  excluded: '#ff1d42', // Red
  pending: '#94a3b8',
  aiEvaluated: '#3b82f6',
  notEvaluated: '#6b7280',
  cardHover: 'rgba(0,0,0,0.05)'
};

export type SessionCardProps = {
  id: string;
  title?: string;
  created_at: string;
  articles_count: number;
  reviewed_count?: number;
  excluded_count?: number;
  pending_count?: number;
  ai_evaluated_count?: number;
  className?: string;
};

export function SessionCard({ 
  id,
  title,
  created_at,
  articles_count,
  reviewed_count = 0,
  excluded_count = 0,
  pending_count = 0,
  ai_evaluated_count = 0,
  className,
}: SessionCardProps) {
  
  function getProgressPercentage() {
    const total = reviewed_count + excluded_count + pending_count;
    if (total === 0) return 0;
    const completed = reviewed_count + excluded_count;
    return Math.round((completed / total) * 100);
  }

  function hasAiEvaluations() {
    return ai_evaluated_count > 0;
  }
  
  function isCompleted() {
    // Session is completed when all articles have been reviewed
    return articles_count > 0 && pending_count === 0;
  }

  // Calculate the progress percentage
  const progressPercentage = getProgressPercentage();
  const completed = isCompleted();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Link href={`/review/${id}`} className="block">
        <Card className={cn(
          "h-auto overflow-hidden border hover:shadow-lg transition-all group relative", 
          completed ? "border-[#00b380]/30 hover:border-[#00b380]/70" : "hover:border-primary/50",
          className
        )}>
          {/* Hover gradient effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br",
              completed 
                ? "from-[#00b380]/5 to-transparent" 
                : "from-primary/3 to-transparent"
            )} />
          </div>

          <CardContent className="px-5 pt-4 pb-4 relative">
            {/* Session title and timestamp */}
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-md transition-colors", 
                    completed 
                      ? "bg-[#00b380]/10 group-hover:bg-[#00b380]/20" 
                      : "bg-primary/10 group-hover:bg-primary/15"
                  )}>
                    <FolderOpen className={cn(
                      "h-4 w-4 transition-colors",
                      completed 
                        ? "text-[#00b380]/80 group-hover:text-[#00b380]" 
                        : "text-primary/80 group-hover:text-primary"
                    )} />
                  </div>
                  <h3 className={cn(
                    "font-semibold text-lg transition-colors line-clamp-1",
                    completed 
                      ? "group-hover:text-[#00b380]" 
                      : "group-hover:text-primary"
                  )}>
                    {title || "Review Session"}
                  </h3>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  {format(new Date(created_at), "PPP")}
                </div>
              </div>
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Article counts */}
              <div className="space-y-2 border-r pr-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">{articles_count}</span>
                  <span className="text-xs text-muted-foreground">Articles</span>
                </div>
                
                {completed ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-[#00b380]"></div>
                    <span className="text-[#00b380]">All reviewed</span>
                  </div>
                ) : hasAiEvaluations() ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.aiEvaluated }}></div>
                    <span>{ai_evaluated_count} AI evaluated</span>
                  </div>
                ) : articles_count > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3" style={{ color: COLORS.notEvaluated }} />
                    <span>Not evaluated by AI</span>
                  </div>
                ) : null}
              </div>

              {/* Review progress */}
              {articles_count > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 group/stat">
                      <CheckCircle className="h-3.5 w-3.5 group-hover/stat:text-[#00b380]" style={{ color: COLORS.included }} />
                      <span className="text-xs font-medium group-hover/stat:text-[#00b380] transition-colors">Included</span>
                    </div>
                    <span className="text-xs font-bold">{reviewed_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 group/stat">
                      <XCircle className="h-3.5 w-3.5 group-hover/stat:text-[#ff1d42]" style={{ color: COLORS.excluded }} />
                      <span className="text-xs font-medium group-hover/stat:text-[#ff1d42] transition-colors">Excluded</span>
                    </div>
                    <span className="text-xs font-bold">{excluded_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 group/stat">
                      <HelpCircle className="h-3.5 w-3.5 group-hover/stat:text-[#94a3b8]" style={{ color: COLORS.pending }} />
                      <span className="text-xs font-medium group-hover/stat:text-[#94a3b8] transition-colors">Pending</span>
                    </div>
                    <span className="text-xs font-bold">{pending_count}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground italic">No articles yet</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Improved progress indicator */}
            {articles_count > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className={cn(
                    "flex items-center gap-1",
                    completed ? "text-[#00b380]" : "text-muted-foreground"
                  )}>
                    <span className={cn(
                      "inline-block h-1 w-1 rounded-full",
                      completed ? "bg-[#00b380]" : "bg-primary"
                    )}></span>
                    {completed ? "Completed" : "Progress"}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    completed ? "text-[#00b380]" : ""
                  )}>{progressPercentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      completed ? "bg-[#00b380]" : "bg-primary group-hover:brightness-110"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
} 