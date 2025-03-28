"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, ChevronDown, RefreshCw, X, Bell, Wrench } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import { LottieCoffeeLoader } from "@/components/ui/lottie-coffee-loader";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ToastDemo } from "@/components/ui/toast-demo";

// Coffee loader messages by variant
const COFFEE_MESSAGES = [
  [
    "Brewing your evaluations...", 
    "Coffee is ready, evaluations coming up!",
    "Brewing the perfect evaluation..."
  ],
  [
    "Taking a coffee break while we work...", 
    "Sipping coffee while reviewing articles...",
    "Coffee break in progress..."
  ],
  [
    "Grinding these articles...", 
    "Like coffee beans, we're grinding articles to perfection...",
    "Coffee machine working hard..."
  ]
];

export default function Settings() {
  const [showCoffeeLoader, setShowCoffeeLoader] = useState(false);
  const [loaderVariant, setLoaderVariant] = useState(0);
  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0);
  const [loaderDuration, setLoaderDuration] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up timer on unmount if it exists
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Show coffee loader for selected duration
  function toggleCoffeeLoader() {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setLoaderVariant(Math.floor(Math.random() * 3));
    setLoaderMessageIndex(0); // Reset message index when opening
    
    // Use our new toast format
    toast({
      title: "Coffee Loader",
      description: `Testing coffee loader for ${loaderDuration} seconds...`,
    });
    
    // Start the loader
    showLoaderWithTimeout();
  }
  
  // Close the loader manually
  function closeLoader() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowCoffeeLoader(false);
    toast({
      title: "Loader Closed",
      description: "The loader was closed manually",
    });
  }
  
  // Cycle to next loader variant and message
  function cycleLoader() {
    if (showCoffeeLoader) {
      // First cycle through messages for current variant
      if (loaderMessageIndex < COFFEE_MESSAGES[loaderVariant].length - 1) {
        setLoaderMessageIndex(prev => prev + 1);
      } else {
        // Then cycle to next variant when we've seen all messages
        setLoaderVariant((prev) => (prev + 1) % 3);
        setLoaderMessageIndex(0);
      }
      
      toast({
        title: "Loader Updated",
        description: "Changed loader variant/message",
      });
    }
  }
  
  // Set a timeout to show the loader for the specified duration
  function showLoaderWithTimeout() {
    setShowCoffeeLoader(true);
    
    // Schedule to close the loader after the specified duration
    timerRef.current = setTimeout(() => {
      setShowCoffeeLoader(false);
      timerRef.current = null;
      
      // Show a success toast when finished
      toast({
        title: "Success",
        description: "Coffee loader test completed!",
        variant: "default",
      });
    }, loaderDuration * 1000);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Wrench className="h-6 w-6 mr-2" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>UI Test Tools</CardTitle>
          <CardDescription>Tools for testing UI components and functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Toast Notifications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test different types of toast notifications
            </p>
            <Button 
              onClick={() => {
                toast({
                  title: "Test Notification",
                  description: "This is a test toast with a close button that appears on hover.",
                  duration: 5000,
                })
              }} 
              className="mr-2"
            >
              <Bell className="mr-2 h-4 w-4" />
              Test Toast
            </Button>
            <ToastDemo />
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">Coffee Loader</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test coffee loader overlay with different durations and messages
            </p>
            
            <div className="flex items-center gap-2">
              <Button onClick={toggleCoffeeLoader}>
                <Coffee className="mr-2 h-4 w-4" />
                Test Coffee Loader
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {loaderDuration}s <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLoaderDuration(5)}>
                    5 seconds
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(10)}>
                    10 seconds
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(30)}>
                    30 seconds
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(60)}>
                    1 minute
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coffee Loader Overlay */}
      {showCoffeeLoader && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Dimming backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
          
          {/* Centered loader content */}
          <div className="relative z-10 bg-card rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Coffee Loader</h2>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={closeLoader}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col items-center mb-4">
              <div className="w-40 h-40 mb-6">
                <LottieCoffeeLoader animationData={coffeeAnimation} />
              </div>
              
              <p className="text-lg font-medium mb-2">
                {COFFEE_MESSAGES[loaderVariant][loaderMessageIndex]}
              </p>
              
              <p className="text-sm text-muted-foreground">
                Testing loader - will close in {loaderDuration} seconds
              </p>
            </div>
            
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  Variant: {loaderVariant + 1}/{COFFEE_MESSAGES.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  Message: {loaderMessageIndex + 1}/{COFFEE_MESSAGES[loaderVariant].length}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cycleLoader}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Change variant/message
                </Button>
                <Button size="sm" variant="outline" onClick={closeLoader}>
                  Close loader
                </Button>
              </div>
            </div>
            
            {/* Toast test buttons */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm mb-2">Test toast notifications from here:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => toast({
                    title: "Info",
                    description: "Info toast example"
                  })} 
                  variant="outline" 
                  size="sm"
                >
                  Info Toast
                </Button>
                <Button 
                  onClick={() => toast({
                    title: "Success",
                    description: "Success toast example",
                    variant: "default"
                  })} 
                  variant="outline" 
                  size="sm"
                >
                  Success Toast
                </Button>
                <Button 
                  onClick={() => toast({
                    title: "Error",
                    description: "Error toast example",
                    variant: "destructive"
                  })} 
                  variant="outline" 
                  size="sm"
                >
                  Error Toast
                </Button>
                <Button 
                  onClick={() => toast({
                    title: "Coffee",
                    description: "Coffee toast example"
                  })} 
                  variant="outline" 
                  size="sm"
                >
                  Coffee Toast
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 