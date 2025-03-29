import React, { ReactNode } from "react";
import { CoffeeLoader } from "./coffee-loader";
import { CoffeeProgress } from "./coffee-progress";

interface CoffeeLoaderOverlayProps {
  children: ReactNode;
  isLoading: boolean;
  loaderVariant?: number;
}

export function CoffeeLoaderOverlay({ 
  children,
  isLoading,
  loaderVariant = 0
}: CoffeeLoaderOverlayProps) {
  // Select the appropriate loader based on the variant
  const renderLoader = () => {
    switch (loaderVariant % 2) {
      case 0:
        return <CoffeeLoader />;
      case 1:
        return <CoffeeProgress />;
      default:
        return <CoffeeLoader />;
    }
  };

  return (
    <div className="relative">
      {/* Main content - may be slightly dimmed when loading */}
      <div className={isLoading ? "pointer-events-none opacity-40 transition-opacity duration-300" : ""}>
        {children}
      </div>
      
      {/* Overlay with loader - only visible when loading */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-lg p-6 max-w-md mx-auto pointer-events-auto">
            {renderLoader()}
          </div>
        </div>
      )}
    </div>
  );
} 