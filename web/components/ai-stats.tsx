import { cn } from "@/lib/utils";
import { BotIcon, Clock8Icon } from "lucide-react";
import { DecisionDots } from "@/components/decision-dots";
import { Card, CardContent } from "@/components/ui/card";
import Lottie from "lottie-react";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";

interface AIStatsProps {
  total: number;
  evaluated: number;
  included: number;
  excluded: number;
  unsure: number;
  isRunning?: boolean;
  isQueued?: boolean;
  className?: string;
  inCard?: boolean;
}

export function AIStats({ 
  total, 
  evaluated, 
  included, 
  excluded, 
  unsure,
  isRunning = false,
  isQueued = false,
  className,
  inCard = false
}: AIStatsProps) {
  const percentageComplete = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const completed = percentageComplete === 100;

  const content = (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center space-x-1.5">
        <div className="p-1 rounded-md bg-[#3b82f6]/10">
          <BotIcon className="h-3.5 w-3.5 text-[#3b82f6]" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">AI</p>
            {isRunning && (
              <div className="flex items-center ml-1">
                <div className="w-3.5 h-3.5 relative overflow-hidden">
                  <div className="absolute inset-0 scale-[2] -translate-y-[12%]">
                    <Lottie 
                      animationData={coffeeAnimation}
                      loop={true}
                      autoplay={true}
                    />
                  </div>
                </div>
                <span className="text-[0.6rem] ml-0.5 text-[#3b82f6] font-medium">
                  Brewing
                </span>
              </div>
            )}
            {isQueued && !isRunning && (
              <div className="flex items-center ml-1">
                <Clock8Icon className="w-3 h-3 text-amber-500" />
                <span className="text-[0.6rem] ml-0.5 text-amber-500 font-medium">
                  Queued
                </span>
              </div>
            )}
          </div>
          <div className="flex items-baseline">
            <p className="text-lg font-bold leading-none">{evaluated}</p>
            <span className="text-[0.6rem] ml-1 text-muted-foreground">
              ({percentageComplete}%)
            </span>
          </div>
          <DecisionDots
            included={included}
            excluded={excluded}
            unsure={unsure}
          />
        </div>
      </div>
    </div>
  );

  if (inCard) {
    return (
      <Card className={cn(
        "overflow-hidden border hover:shadow-md transition-all h-full",
        completed && "border-[#3b82f6]/30 hover:border-[#3b82f6]/70"
      )}>
        <CardContent className="p-2 relative">
          {/* Hover gradient effect */}
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent" />
          </div>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
} 