"use client";

import { useState, useEffect } from "react";

// Define breakpoints that match Tailwind's defaults
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

type Breakpoint = keyof typeof breakpoints;

export function useScreenSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });
  
  // Initialize to undefined to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [isTablet, setIsTablet] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Function to update screen size and breakpoint flags
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      
      setIsMobile(window.innerWidth < breakpoints.md);
      setIsTablet(window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg);
    }

    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures this only runs on mount and unmount

  // Helper function to check if window width is less than a given breakpoint
  const isLessThan = (breakpoint: Breakpoint): boolean => {
    if (typeof windowSize.width === "undefined") return false;
    return windowSize.width < breakpoints[breakpoint];
  };

  // Helper function to check if window width is greater than a given breakpoint
  const isGreaterThan = (breakpoint: Breakpoint): boolean => {
    if (typeof windowSize.width === "undefined") return false;
    return windowSize.width >= breakpoints[breakpoint];
  };

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile,
    isTablet,
    isLessThan,
    isGreaterThan,
  };
} 