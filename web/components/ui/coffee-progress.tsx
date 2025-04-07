import React from "react";

export interface CoffeeProgressProps {
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
    <div className="flex flex-col items-center justify-center space-y-3 text-center">
      <h3 className="text-sm font-medium">{message}</h3>
      
      {/* Progress bar container */}
      <div className="w-full h-4 bg-secondary rounded-full overflow-hidden relative">
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
                className="absolute w-1.5 h-2 bg-amber-500 rounded-full animate-dropFall"
                style={{
                  left: `${(i * 10) + 5}%`,
                  top: '-8px',
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
        <p className="text-xs font-medium">{displayProgress}% complete</p>
      )}
    </div>
  );
} 