"use client"

import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"

export function ToastDemo() {
  const { toast } = useToast()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            title: "Info Notification",
            description: "This is an informational message",
          })
        }}
      >
        Info Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            title: "Success",
            description: "Action completed successfully!",
            variant: "default",
          })
        }}
      >
        Success Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            title: "Error",
            description: "Something went wrong!",
            variant: "destructive",
          })
        }}
      >
        Error Toast
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            title: "With Action",
            description: "Friday, February 10, 2023 at 5:57 PM",
            action: (
              <ToastAction altText="Try again">Try again</ToastAction>
            ),
          })
        }}
      >
        Action Toast
      </Button>
    </div>
  )
} 