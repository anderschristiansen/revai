import React from "react";
import Lottie from "lottie-react";

interface LottieCoffeeLoaderProps {
  animationData: object;
  message?: string;
}

export function LottieCoffeeLoader({
  animationData,
  message = "Brewing your evaluations..."
}: LottieCoffeeLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      <div className="w-100 h-100">
        <Lottie 
          animationData={animationData}
          loop={true}
          autoplay={true}
        />
      </div>
      
      <h3 className="text-xl font-medium animate-pulse">{message}</h3>
      
      <p className="text-muted-foreground max-w-md">
        This might take a minute or two. Why not grab a coffee while the AI does its work?
      </p>
    </div>
  );
} 