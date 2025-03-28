"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

type ThemeToggleProps = {
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

export function ThemeToggle({ size = "icon", showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18
  const isDark = resolvedTheme === "dark"
  const [mounted, setMounted] = React.useState(false)

  // Only render the toggle on the client to avoid hydration issues
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Button to be rendered only on client side after mounting
  const button = (
    <Button
      variant="ghost"
      size={size}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={size === "sm" ? "px-3" : ""}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <Sun 
        size={iconSize} 
        className={`${showLabel ? 'mr-1' : ''} rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0`} 
      />
      <Moon 
        size={iconSize} 
        className={`absolute ${showLabel ? 'mr-1' : ''} rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100`} 
      />
      {showLabel && <span>{isDark ? "Lys tema" : "Mørk tema"}</span>}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )

  // Render a placeholder with same dimensions during SSR to avoid layout shift
  if (!mounted) {
    return (
      <div 
        className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${size === "sm" ? "px-3" : ""}`} 
        aria-hidden="true"
      ></div>
    )
  }

  return button
} 