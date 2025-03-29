"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Colors for the visualization
const COLORS = {
  included: '#00b380',
  excluded: '#ff1d42',
  pending: '#94a3b8',
  aiEvaluated: '#3b82f6',
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

  // Calculate the segment sizes for our progress visualization
  const progressPercentage = getProgressPercentage();
  const includePercent = articles_count ? (reviewed_count / articles_count) * 100 : 0;
  const excludePercent = articles_count ? (excluded_count / articles_count) * 100 : 0;
  const pendingPercent = articles_count ? (pending_count / articles_count) * 100 : 0;

  // Compute a visual rating based on progress
  const getStatusColor = () => {
    if (progressPercentage === 0) return 'bg-gray-200';
    if (progressPercentage < 30) return 'bg-red-500';
    if (progressPercentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Link href={`/review/${id}`} className="block">
        <Card className={cn(
          "h-auto overflow-hidden border hover:border-primary/50 hover:shadow-lg transition-all group", 
          className
        )}>
          <CardContent className="p-0">
            {/* Progress indicator bar at the top */}
            {articles_count > 0 && (
              <div className="flex h-1">
                {includePercent > 0 && (
                  <div 
                    className="bg-[#00b380] h-full transition-all duration-500" 
                    style={{ width: `${includePercent}%` }}
                  />
                )}
                {excludePercent > 0 && (
                  <div 
                    className="bg-[#ff1d42] h-full transition-all duration-500" 
                    style={{ width: `${excludePercent}%` }}
                  />
                )}
                {pendingPercent > 0 && (
                  <div 
                    className="bg-[#94a3b8] h-full transition-all duration-500" 
                    style={{ width: `${pendingPercent}%` }}
                  />
                )}
              </div>
            )}
            
            <div className="p-6">
              {/* Session title and timestamp */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors" />
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {title || "Review Session"}
                    </h3>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {format(new Date(created_at), "PPP")}
                  </div>
                </div>

                {/* Status badge */}
                {articles_count > 0 && (
                  <div className="flex items-center">
                    <Tooltip content={`${progressPercentage}% complete`}>
                      <div className="flex items-center p-1 h-8 rounded-full">
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full transition-colors", 
                          getStatusColor()
                        )} />
                      </div>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Stats section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Article counts */}
                <div className="space-y-3 border-r pr-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{articles_count}</span>
                    <span className="text-xs text-muted-foreground">Articles</span>
                  </div>
                  
                  {hasAiEvaluations() && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.aiEvaluated }}></div>
                      <span>{ai_evaluated_count} AI evaluated</span>
                    </div>
                  )}
                </div>

                {/* Review progress */}
                {articles_count > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" style={{ color: COLORS.included }} />
                        <span className="text-xs font-medium">Included</span>
                      </div>
                      <span className="text-xs font-bold">{reviewed_count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" style={{ color: COLORS.excluded }} />
                        <span className="text-xs font-medium">Excluded</span>
                      </div>
                      <span className="text-xs font-bold">{excluded_count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" style={{ color: COLORS.pending }} />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                      <span className="text-xs font-bold">{pending_count}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground italic">No articles uploaded yet</p>
                  </div>
                )}
              </div>
              
              {/* Progress indicator */}
              {articles_count > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
} 