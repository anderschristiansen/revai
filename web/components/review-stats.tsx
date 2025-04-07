import { cn } from "@/lib/utils";
import { BarChart4Icon } from "lucide-react";
import { DecisionDots } from "@/components/decision-dots";
import { Card, CardContent } from "@/components/ui/card";

interface ReviewStatsProps {
  total: number;
  reviewed: number;
  included: number;
  excluded: number;
  unsure: number;
  pending?: number;
  className?: string;
  inCard?: boolean;
}

export function ReviewStats({ 
  total, 
  reviewed, 
  included, 
  excluded, 
  unsure, 
  pending,
  className,
  inCard = false
}: ReviewStatsProps) {
  const percentageComplete = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const completed = percentageComplete === 100;

  const content = (
    <div className={cn("flex items-center space-x-1.5", className)}>
      <div className={cn(
        "p-1 rounded-md", 
        completed 
          ? "bg-[#00b380]/10" 
          : "bg-primary/10"
      )}>
        <BarChart4Icon className={cn(
          "h-3.5 w-3.5", 
          completed 
            ? "text-[#00b380]" 
            : "text-primary"
        )} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground leading-none mb-0.5">Reviewed</p>
        <div className="flex items-baseline">
          <p className="text-lg font-bold leading-none">{reviewed}</p>
          <span className={cn(
            "text-[0.6rem] ml-1",
            completed 
              ? "text-[#00b380]" 
              : "text-muted-foreground"
          )}>
            ({percentageComplete}%)
          </span>
        </div>
        <DecisionDots
          included={included}
          excluded={excluded}
          unsure={unsure}
          pending={pending}
        />
      </div>
    </div>
  );

  if (inCard) {
    return (
      <Card className="overflow-hidden border hover:shadow-md transition-all h-full">
        <CardContent className="p-2 relative">
          {/* Hover gradient effect */}
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br",
              completed 
                ? "from-[#00b380]/5 to-transparent" 
                : "from-primary/3 to-transparent"
            )} />
          </div>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
} 