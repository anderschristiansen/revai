import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export const COLORS = {
  included: '#00b380', // Green
  excluded: '#ff1d42', // Red
  pending: '#94a3b8',
  aiEvaluated: '#3b82f6',
  notEvaluated: '#6b7280',
  cardHover: 'rgba(0,0,0,0.05)',
  unsure: '#f59e0b'
};

interface DecisionDotsProps {
  included: number;
  excluded: number;
  unsure: number;
  pending?: number;
  className?: string;
  prefix?: string;
}

export function DecisionDots({ included, excluded, unsure, pending, className, prefix = "" }: DecisionDotsProps) {
  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.included }}></div>
        <span>{included} {prefix}articles included</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.excluded }}></div>
        <span>{excluded} {prefix}articles excluded</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.unsure }}></div>
        <span>{unsure} {prefix}articles marked as unsure</span>
      </div>
      {pending !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.pending }}></div>
          <span>{pending} {prefix}articles pending review</span>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div className={cn("flex gap-2 mt-0.5 text-[0.6rem] text-muted-foreground", className)}>
        <div className="flex items-center gap-0.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.included }}></div>
          <span>{included}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.excluded }}></div>
          <span>{excluded}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.unsure }}></div>
          <span>{unsure}</span>
        </div>
        {pending !== undefined && (
          <div className="flex items-center gap-0.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.pending }}></div>
            <span>{pending}</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
}