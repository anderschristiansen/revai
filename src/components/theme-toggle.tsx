"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

type ThemeToggleProps = {
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

// Simple placeholder button for SSR
const ThemeButtonPlaceholder = ({ size = "icon" }: { size?: string }) => (
  <Button
    variant="ghost"
    size={size as any}
    className={size === "sm" ? "px-3" : ""}
  >
    <span className="w-4 h-4"></span>
  </Button>
)

// Create a completely client-side only component with dynamic import
const ClientThemeToggle = dynamic(
  () => import('./theme-toggle-client').then(mod => mod.ClientThemeToggle),
  { 
    ssr: false, // This is crucial - it prevents the component from rendering during SSR
    loading: ({ size }) => <ThemeButtonPlaceholder size={size as string} />
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