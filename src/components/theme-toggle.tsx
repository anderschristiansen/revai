"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import type { ThemeToggleProps } from "@/components/theme-toggle-client"

// Simple placeholder button for SSR
const ThemeButtonPlaceholder = ({ size = "icon" }: { size?: ThemeToggleProps['size'] }) => (
  <Button
    variant="ghost"
    size={size}
    className={size === "sm" ? "px-3" : ""}
  >
    <span className="w-4 h-4"></span>
  </Button>
)

// Create a completely client-side only component with dynamic import
const ClientThemeToggle = dynamic(
  () => import('@/components/theme-toggle-client'),
  { 
    ssr: false, // This is crucial - it prevents the component from rendering during SSR
    loading: () => <ThemeButtonPlaceholder />
  }
)

// Export a simple wrapper that just renders a placeholder during SSR
export function ThemeToggle(props: ThemeToggleProps) {
  return (
    <div suppressHydrationWarning>
      <ClientThemeToggle {...props} />
    </div>
  )
} 