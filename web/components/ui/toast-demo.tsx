"use client"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"

export function ToastDemo() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.info("This is an informational message")
        }}
      >
        Info Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.success("Action completed successfully!")
        }}
      >
        Success Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.error("Something went wrong!")
        }}
      >
        Error Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.coffee("Time for a coffee break!")
        }}
      >
        Coffee Toast
      </Button>
    </div>
  )
} 