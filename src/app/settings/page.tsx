"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, ChevronDown, RefreshCw, X, Bell, Wrench } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { LottieCoffeeLoader } from "@/components/ui/lottie-coffee-loader";
import coffeeAnimation from "@/lib/lottie/coffee-animation.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// Coffee loader messages by variant
const COFFEE_MESSAGES = [
  [
    "Brygger dine evalueringer...", 
    "Kaffen er klar, evalueringer kommer nu!",
    "Brygger den perfekte evaluering..."
  ],
  [
    "Tager en kaffepause mens vi arbejder...", 
    "Nipper til kaffen mens vi gennemgår artikler...",
    "Kaffepause i gang..."
  ],
  [
    "Maler disse artikler...", 
    "Ligesom kaffebønner, maler vi artikler til perfektion...",
    "Kaffemaskinen arbejder hårdt..."
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
    setShowCoffeeLoader(true);
    
    // Use our custom coffee toast
    toast.coffee(`Tester kaffe-loader i ${loaderDuration} sekunder...`);
    
    timerRef.current = setTimeout(() => {
      setShowCoffeeLoader(false);
      timerRef.current = null;
      // Show a success toast when finished
      toast.success("Kaffe-loader test gennemført!");
    }, loaderDuration * 1000);
  }
  
  // Close the loader manually
  function closeLoader() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowCoffeeLoader(false);
    toast.info("Loader lukket manuelt");
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
      
      toast.info("Ændret loader variant/besked");
    }
  }
  
  // Demonstrate different toast types
  function showToastDemo() {
    toast.info("Dette er en informativ besked");
    
    setTimeout(() => {
      toast.success("Handlingen blev gennemført med succes!");
    }, 1500);
    
    setTimeout(() => {
      toast.error("Noget gik galt!");
    }, 3000);
    
    setTimeout(() => {
      toast.coffee("Kaffen brygger! Tid til en pause.");
    }, 4500);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Wrench className="h-6 w-6 mr-2" />
        <h1 className="text-3xl font-bold">Indstillinger</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>UI Test Værktøjer</CardTitle>
          <CardDescription>Værktøjer til at teste UI-komponenter og funktionalitet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Toast Notifikationer</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test forskellige typer af toast notifikationer
            </p>
            <Button onClick={showToastDemo} className="mr-2">
              <Bell className="mr-2 h-4 w-4" />
              Test Alle Toast Typer
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <Button onClick={() => toast.info("Info toast eksempel")} variant="outline" size="sm">
                Info Toast
              </Button>
              <Button onClick={() => toast.success("Success toast eksempel")} variant="outline" size="sm">
                Success Toast
              </Button>
              <Button onClick={() => toast.error("Error toast eksempel")} variant="outline" size="sm">
                Error Toast
              </Button>
              <Button onClick={() => toast.coffee("Coffee toast eksempel")} variant="outline" size="sm">
                Coffee Toast
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">Kaffe Loader</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test kaffe-loader overlay med forskellige varigheder og beskeder
            </p>
            
            <div className="flex items-center gap-2">
              <Button onClick={toggleCoffeeLoader}>
                <Coffee className="mr-2 h-4 w-4" />
                Test Kaffe Loader
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {loaderDuration}s <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLoaderDuration(5)}>
                    5 sekunder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(10)}>
                    10 sekunder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(30)}>
                    30 sekunder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoaderDuration(60)}>
                    1 minut
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
          
          <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md relative z-10">
            <div className="absolute top-2 right-2 flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={cycleLoader}
                title="Skift variant/besked"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeLoader}
                title="Luk loader"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <LottieCoffeeLoader 
              animationData={coffeeAnimation} 
              message={COFFEE_MESSAGES[loaderVariant][loaderMessageIndex]}
            />
            
            <div className="mt-2 text-center text-sm text-muted-foreground">
              <div>Tester loader - lukker om {loaderDuration} sekunder</div>
              <div className="mt-1">
                <span className="text-xs">Variant: {loaderVariant + 1}/3, Besked: {loaderMessageIndex + 1}/{COFFEE_MESSAGES[loaderVariant].length}</span>
              </div>
              
              <div className="mt-4 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => toast.info("Info toast eksempel")} variant="outline" size="sm">
                    Info Toast
                  </Button>
                  <Button onClick={() => toast.success("Success toast eksempel")} variant="outline" size="sm">
                    Success Toast
                  </Button>
                  <Button onClick={() => toast.error("Error toast eksempel")} variant="outline" size="sm">
                    Error Toast
                  </Button>
                  <Button onClick={() => toast.coffee("Coffee toast eksempel")} variant="outline" size="sm">
                    Coffee Toast
                  </Button>
                </div>
                
                <Button onClick={closeLoader} variant="outline" size="sm" className="mt-2">
                  Luk Loader
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 