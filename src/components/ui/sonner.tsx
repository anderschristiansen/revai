"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast, ToasterProps } from "sonner"
import { Coffee, Info, CheckCircle, XCircle } from "lucide-react"

// Enhanced toast with icons and animations
export const toast = {
  info: (message: string, options = {}) => {
    return sonnerToast(
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-blue-500 animate-pulse" />
        <p>{message}</p>
      </div>,
      {
        className: "info-toast",
        ...options
      }
    )
  },
  // success: (message: string, options = {}) => {
  //   return sonnerToast.success(
  //     <div className="flex items-center gap-3">
  //       <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
  //       <p>{message}</p>
  //     </div>,
  //     {
  //       className: "success-toast",
  //       ...options
  //     }
  //   )
  // },
  success: (message: string, options = {}) => {
    return sonnerToast(
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
        <p>{message}</p>
      </div>,
      {
        className: "success-toast",
        duration: 4000,
        ...options
      }
    )
  },
  error: (message: string, options = {}) => {
    return sonnerToast(
      <div className="flex items-center gap-3">
        <XCircle className="h-5 w-5 text-destructive animate-shake" />
        <p>{message}</p>
      </div>,
      {
        className: "error-toast",
        duration: 4000,
        ...options
      }
    )
  },
  // error: (message: string, options = {}) => {
  //   return sonnerToast.error(
  //     <div className="flex items-center gap-3">
  //       <XCircle className="h-5 w-5 text-destructive animate-shake" />
  //       <p>{message}</p>
  //     </div>,
  //     {
  //       className: "error-toast",
  //       ...options
  //     }
  //   )
  // },
  coffee: (message: string, options = {}) => {
    return sonnerToast(
      <div className="flex items-center gap-3">
        <Coffee className="h-5 w-5 text-amber-700 animate-bounce" />
        <p>{message}</p>
      </div>,
      {
        className: "coffee-toast",
        duration: 4000,
        ...options
      }
    )
  }
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md",
          title: "group-[.toast]:text-foreground group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive/15 group-[.toaster]:text-destructive group-[.toaster]:border-destructive/30",
          success: "group-[.toaster]:bg-green-500/15 group-[.toaster]:text-green-600 group-[.toaster]:border-green-500/30",
          info: "group-[.toaster]:bg-blue-500/15 group-[.toaster]:text-blue-600 group-[.toaster]:border-blue-500/30",
          warning: "group-[.toaster]:bg-yellow-500/15 group-[.toaster]:text-yellow-600 group-[.toaster]:border-yellow-500/30"
        }
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--green-100)",
          "--success-text": "var(--green-600)",
          "--success-border": "var(--green-200)",
          "--error-bg": "var(--destructive)",
          "--error-border": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)"
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
