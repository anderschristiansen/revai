import React from "react";

interface CoffeeProgressProps {
  message?: string;
  progress?: number;
}

export function CoffeeProgress({
  message = "Evaluating articles...",
  progress = -1,
}: CoffeeProgressProps) {
  // If progress is -1, it means indeterminate progress (no specific percentage)
  const isIndeterminate = progress === -1;
  const displayProgress = isIndeterminate ? 50 : Math.min(100, Math.max(0, progress));
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
      <h3 className="text-xl font-medium">{message}</h3>
      
      {/* Progress bar container */}
      <div className="w-full max-w-md h-8 bg-secondary rounded-full overflow-hidden relative">
        {/* Progress fill */}
        <div 
          className={`h-full bg-amber-700 ${isIndeterminate ? "animate-pulse" : ""}`}
          style={{ width: `${displayProgress}%` }}
        >
          {/* Coffee drops */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-4 bg-amber-500 rounded-full animate-[dropFall_2s_ease-in_infinite]"
                style={{
                  left: `${(i * 10) + 5}%`,
                  top: '-16px',
                  animationDelay: `${i * 0.2}s`,
                  opacity: i * 10 <= displayProgress ? 1 : 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Percentage display */}
      {!isIndeterminate && (
        <p className="text-sm font-medium">{displayProgress}% complete</p>
      )}
      
      <p className="text-muted-foreground max-w-md">
        Each drop of coffee represents 10% progress. We&apos;re brewing up your article evaluations!
      </p>
    </div>
  );
} 