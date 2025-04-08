"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export type ThemeToggleProps = {
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

// Export as default component
export default function ThemeToggleClient({ size = "icon", showLabel = false }: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18
  
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={size}
        className={size === "sm" ? "px-3" : ""}
      >
        <span className="w-4 h-4"></span>
      </Button>
    )
  }
  
  const isDark = theme === "dark"
  
  return (
    <Button
      variant="ghost"
      size={size}
      className={size === "sm" ? "px-3" : ""}
      onClick={() => setTheme(isDark ? "light" : "dark")}
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
} 