"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, TooltipProps } from "recharts";
import { Tooltip } from "@/components/ui/tooltip";

// Colors for the pie chart
const COLORS = ['#00b380', '#ff1d42', '#94a3b8'];

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
  
  // Helper functions
  function getChartData() {
    return [
      { name: 'Included', value: reviewed_count, color: COLORS[0] },
      { name: 'Excluded', value: excluded_count, color: COLORS[1] },
      { name: 'Pending', value: pending_count, color: COLORS[2] }
    ];
  }

  function getProgressPercentage() {
    const total = reviewed_count + excluded_count + pending_count;
    if (total === 0) return 0;
    const completed = reviewed_count + excluded_count;
    return Math.round((completed / total) * 100);
  }

  function hasAiEvaluations() {
    return ai_evaluated_count > 0;
  }

  // Chart customization for tooltips
  type ChartTooltipProps = TooltipProps<number, string> & {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: {
        name: string;
        value: number;
      };
    }>;
  };

  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded p-2 shadow-md text-xs">
          <p className="font-medium">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Link href={`/review/${id}`}>
      <Card className={`h-[140px] hover:shadow-lg transition-all duration-300 group ${className}`}>
        <CardContent className="flex items-center justify-between h-full p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {title || "Review Session"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Created on {format(new Date(created_at), "PP")}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs inline-flex items-center text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground mr-1"></span>
                {articles_count} article{articles_count !== 1 ? 's' : ''}
              </span>
              
              {hasAiEvaluations() && (
                <span className="text-xs inline-flex items-center text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-400 mr-1"></span>
                  AI-evaluated
                </span>
              )}
            </div>
          </div>

          {articles_count > 0 ? (
            <Tooltip content={`${getProgressPercentage()}% reviewed • ${reviewed_count} included • ${excluded_count} excluded • ${pending_count} pending`}>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={35}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {getChartData().map((entry, index) => (
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
                      {getProgressPercentage()}%
                    </text>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Tooltip>
          ) : (
            <div className="w-24 h-24 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No articles</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
} 