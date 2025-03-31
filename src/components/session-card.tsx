"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderOpen, Clock, Trash2, FolderIcon, MoreHorizontal, UploadIcon, BotIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import { useState, useEffect } from "react";

// Colors for the visualization - using the site's red/green color scheme
const COLORS = {
  included: '#00b380', // Green
  excluded: '#ff1d42', // Red
  pending: '#94a3b8',
  aiEvaluated: '#3b82f6',
  notEvaluated: '#6b7280',
  cardHover: 'rgba(0,0,0,0.05)',
  uploadRunning: '#f59e0b', // Amber
  unsure: '#f59e0b', // Amber for unsure status
};

export type SessionCardProps = {
  id: string;
  title: string;
  created_at: string;
  articles_count: number;
  reviewed_count?: number;
  excluded_count?: number;
  unsure_count?: number;
  pending_count?: number;
  ai_evaluated_count?: number;
  ai_included_count?: number;
  ai_excluded_count?: number;
  ai_evaluation_running?: boolean;
  files_processed: boolean;
  upload_running?: boolean;
  className?: string;
  onDelete?: (id: string) => void;
};

export function SessionCard({ 
  id,
  title,
  created_at,
  articles_count,
  reviewed_count = 0,
  excluded_count = 0,
  pending_count = 0,
  unsure_count = 0,
  ai_evaluated_count = 0,
  ai_included_count = 0,
  ai_excluded_count = 0,
  ai_evaluation_running = false,
  files_processed = false,
  upload_running = false,
  className,
  onDelete,
}: SessionCardProps) {
  // Add local state for AI evaluation count
  const [localAiEvaluatedCount, setLocalAiEvaluatedCount] = useState(ai_evaluated_count);

  // Update local state when prop changes
  useEffect(() => {
    setLocalAiEvaluatedCount(ai_evaluated_count);
  }, [ai_evaluated_count]);

  function isCompleted() {
    // Session is completed when all articles have been reviewed
    return articles_count > 0 && pending_count === 0;
  }

  // Calculate the progress percentage
  const completed = isCompleted();

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };
    
  const percentAI = files_processed && articles_count > 0
    ? Math.floor((localAiEvaluatedCount / Math.max(1, articles_count)) * 100)
    : 0;

  const handleDelete = (e: React.MouseEvent) => {
    // Prevent triggering the Link navigation
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

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
          
          {/* AI Brewing indicator */}
          {ai_evaluation_running && (
            <div className="absolute top-0 right-0 mt-3 mr-3 z-10">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <motion.div
                  animate={{ 
                    boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0.1)', '0 0 0 8px rgba(59, 130, 246, 0.2)'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                  }}
                  className="absolute inset-0 rounded-full"
                />
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-md border border-[#3b82f6]/30">
                  <div className="w-7 h-7 relative overflow-hidden">
                    <motion.div 
                      animate={{ scale: [0.95, 1, 0.95], rotate: [0, 3, 0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="absolute inset-0 scale-[2] -translate-y-[12%]"
                    >
                      <Lottie 
                        animationData={coffeeAnimation}
                        loop={true}
                        autoplay={true}
                      />
                    </motion.div>
                  </div>
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <span className="text-sm font-medium whitespace-nowrap text-[#3b82f6]">
                      AI Brewing
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Upload in progress indicator */}
          {upload_running && (
            <div className="absolute top-0 right-0 mt-3 mr-3 z-10">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <motion.div
                  animate={{ 
                    boxShadow: ['0 0 0 0 rgba(245, 158, 11, 0.1)', '0 0 0 8px rgba(245, 158, 11, 0.2)'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                  }}
                  className="absolute inset-0 rounded-full"
                />
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-md border border-amber-300">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        y: [0, -3, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                      }}
                    >
                      <UploadIcon className="h-4 w-4 text-amber-500" />
                    </motion.div>
                  </div>
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <span className="text-sm font-medium whitespace-nowrap text-amber-600">
                      Uploading
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          )}

          <CardContent className="px-5 pt-4 pb-4 relative">
            {/* Session title and timestamp */}
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1.5">
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
                  {formatDate(created_at)}
                </div>
              </div>
              
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(e);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* Left side - Article counts and status */}
              <div className="space-y-3">
                {files_processed ? (
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{articles_count}</span>
                    <span className="text-xs text-muted-foreground">Articles</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[#3b82f6] font-bold">
                  <FolderIcon className="h-4 w-4" />
                  <span>Files Processing Required</span>
                </div>
                )}
                
                {/* Status indicators */}
                {files_processed && (
                  <div className="flex flex-col gap-2">
                      <>
                        <div className="flex items-center gap-4">
                          <TooltipProvider>
                            <Tooltip content="Included articles">
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.included }}></div>
                                  <span className="text-xs text-muted-foreground">{reviewed_count}</span>
                                </div>
                              </TooltipTrigger>
                            </Tooltip>

                            <Tooltip content="Excluded articles">
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.excluded }}></div>
                                  <span className="text-xs text-muted-foreground">{excluded_count}</span>
                                </div>
                              </TooltipTrigger>
                            </Tooltip>

                            <Tooltip content="Unsure articles">
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.unsure }}></div>
                                  <span className="text-xs text-muted-foreground">{unsure_count}</span>
                                </div>
                              </TooltipTrigger>
                            </Tooltip>

                            <Tooltip content="Pending review">
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.pending }}></div>
                                  <span className="text-xs text-muted-foreground">{pending_count}</span>
                                </div>
                              </TooltipTrigger>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </>
                  </div>
                )}
              </div>

              {/* Right side - AI Evaluation Status */}
              { files_processed && (
                <div className="space-y-3 border-l pl-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1 rounded-md", 
                        completed 
                          ? "bg-[#00b380]/10" 
                          : "bg-primary/10"
                      )}>
                        {/* <BarChart4Icon className={cn(
                          "h-3.5 w-3.5", 
                          completed 
                            ? "text-[#00b380]" 
                            : "text-primary"
                        )} /> */}
                        <BotIcon className={cn(
                          "h-3.5 w-3.5 text-primary"
                        )} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">AI Evaluation</span>
                    </div>
                    {ai_evaluation_running && (
                      <span className="font-medium" style={{ color: COLORS.aiEvaluated }}>{percentAI}%</span>
                    )}
                  </div>

                  {/* AI Evaluation Progress */}
                  <div className="space-y-2">
                    {ai_evaluation_running ? (
                      <>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS.aiEvaluated }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentAI}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.6rem] text-[#3b82f6]">
                          <div className="w-3 h-3 relative overflow-hidden">
                            <motion.div 
                              animate={{ rotate: [0, 5, 0, -5, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              className="absolute inset-0 scale-[2] -translate-y-[12%]"
                            >
                              <Lottie 
                                animationData={coffeeAnimation}
                                loop={true}
                                autoplay={true}
                              />
                            </motion.div>
                          </div>
                          <span>AI is evaluating articles...</span>
                        </div>
                      </>
                    ) : ai_evaluated_count > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#3b82f6]">
                        <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.aiEvaluated }}></div>
                        <span>AI Evaluation Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.notEvaluated }}></div>
                        <span>AI Not Evaluated</span>
                      </div>
                    )}
                  </div>

                  {/* AI Decision Indicators */}
                  {ai_evaluated_count > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <TooltipProvider>
                          <Tooltip content="AI marked as included">
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.included }}></div>
                                <span className="text-xs text-muted-foreground">{ai_included_count}</span>
                              </div>
                            </TooltipTrigger>
                          </Tooltip>

                          <Tooltip content="AI marked as excluded">
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.excluded }}></div>
                                <span className="text-xs text-muted-foreground">{ai_excluded_count}</span>
                              </div>
                            </TooltipTrigger>
                          </Tooltip>

                          <Tooltip content="AI marked as unsure">
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: COLORS.unsure }}></div>
                                <span className="text-xs text-muted-foreground">{ai_evaluated_count - (ai_included_count + ai_excluded_count)}</span>
                              </div>
                            </TooltipTrigger>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
} 