import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent",
  outline: "text-foreground"
}

export type BadgeVariant = keyof typeof badgeVariants

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants[variant],
        className
      )} 
      {...props} 
    />
  )
}

// Helper function for creating link badges
const getBadgeVariantClass = (variant: BadgeVariant = "default"): string => {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    badgeVariants[variant]
  )
}

export { Badge, getBadgeVariantClass as badgeVariants } 