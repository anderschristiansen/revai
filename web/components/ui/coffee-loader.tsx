import React from "react";

interface CoffeeLoaderProps {
  message?: string;
}

export function CoffeeLoader({ 
  message = "Time for a coffee break while we evaluate your articles..."
}: CoffeeLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
      <div className="relative">
        {/* Coffee cup */}
        <div className="w-24 h-16 rounded-b-3xl bg-amber-800 relative mx-auto">
          {/* Cup handle */}
          <div className="absolute right-[-15px] top-2 w-5 h-10 border-4 border-amber-800 rounded-r-full"></div>
          
          {/* Coffee liquid */}
          <div className="absolute top-1 left-1 right-1 bottom-1 rounded-b-3xl bg-amber-600"></div>
          
          {/* Cup plate */}
          <div className="absolute bottom-[-8px] left-[-8px] right-[-8px] h-2 bg-amber-950 rounded-full"></div>
        </div>
        
        {/* Steam animation */}
        <div className="absolute left-2 top-[-20px] flex space-x-2">
          <div className="w-2 h-6 bg-gray-200/40 rounded-full animate-[wiggle_3s_ease-in-out_infinite]"></div>
          <div className="w-2 h-8 bg-gray-200/40 rounded-full animate-[wiggle_2.5s_ease-in-out_0.3s_infinite]"></div>
          <div className="w-2 h-6 bg-gray-200/40 rounded-full animate-[wiggle_3.5s_ease-in-out_0.7s_infinite]"></div>
        </div>
      </div>
      
      <h3 className="text-xl font-medium animate-pulse">{message}</h3>
      
      <p className="text-muted-foreground max-w-md">
        This might take a minute or two. Why not grab a real coffee while the AI does its work?
      </p>
    </div>
  );
} 