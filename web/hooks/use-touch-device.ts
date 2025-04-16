"use client";

import { useState, useEffect } from "react";

export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // This function detects if the device supports touch
    const detectTouch = () => {
      if (typeof window !== "undefined") {
        return (
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia("(hover: none)").matches
        );
      }
      return false;
    };

    setIsTouchDevice(detectTouch());
  }, []);

  return isTouchDevice;
} 