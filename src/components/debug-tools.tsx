"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoffeeLoader } from "@/components/ui/coffee-loader"
import { CoffeeProgress } from "@/components/ui/coffee-progress"
import { ToastDemo } from "@/components/ui/toast-demo"
import { CoffeeLoaderOverlay } from "@/components/ui/coffee-loader-overlay"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function DebugTools() {
  // State to control the overlay visibility
  const [overlayVisible, setOverlayVisible] = React.useState(false)
  const [loaderVariant, setLoaderVariant] = React.useState(0)
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  React.useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [timeoutId])

  const toggleOverlay = () => {
    if (!overlayVisible) {
      // Show overlay
      setOverlayVisible(true)
      // Change loader variant
      setLoaderVariant(prev => (prev + 1) % 2)
      
      // Set a timer to hide it after 5 seconds
      const id = setTimeout(() => {
        setOverlayVisible(false)
        toast({
          title: "Evaluation complete",
          description: "The loader overlay has been automatically hidden after 5 seconds."
        })
      }, 5000)
      
      setTimeoutId(id)
      
      // Toast notification
      toast({
        title: "Processing",
        description: "The loader will automatically hide after 5 seconds."
      })
    } else {
      // Hide overlay
      setOverlayVisible(false)
      
      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId)
        setTimeoutId(null)
      }
    }
  }

  return (
    <CoffeeLoaderOverlay isLoading={overlayVisible} loaderVariant={loaderVariant}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Debug Tools</CardTitle>
          <CardDescription>
            Preview and test UI components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="loaders" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="loaders">Coffee Loaders</TabsTrigger>
              <TabsTrigger value="toasts">Toast Messages</TabsTrigger>
            </TabsList>
            <TabsContent value="loaders" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coffee Loader Overlay</CardTitle>
                  <CardDescription>Test the overlay loading experience as used in article evaluation</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Toggle the overlay to simulate the loading experience during article evaluation.
                    The overlay will automatically hide after 5 seconds.
                  </p>
                  
                  <Button onClick={toggleOverlay} className="mb-8">
                    {overlayVisible ? "Hide Overlay" : "Show Overlay"}
                  </Button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Coffee Loader</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-40">
                        <CoffeeLoader />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Coffee Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-40">
                        <div className="w-full max-w-xs">
                          <CoffeeProgress progress={65} message="Debug progress example" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="toasts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Toast Messages</CardTitle>
                  <CardDescription>Click to trigger different types of toast notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ToastDemo />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </CoffeeLoaderOverlay>
  )
} 