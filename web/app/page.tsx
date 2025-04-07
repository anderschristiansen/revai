"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Brain, 
  FileSearch, 
  Clock, 
  PieChart, 
  Coffee, 
  ArrowRight 
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function HomePage() {
  const { user } = useAuth();
  
  return (
    <>
      {/* Hero Section with Video Background - Full width */}
      <section className="w-full relative overflow-hidden min-h-[700px] md:min-h-[80vh] flex items-center">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full bg-black/60 z-10"></div>
        <video 
          className="absolute inset-0 w-full h-full object-cover" 
          autoPlay 
          muted 
          loop 
          playsInline
        >
          <source src="/promotion.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Content Overlay */}
        <div className="container relative z-20 px-4 md:px-6 mx-auto">
          <div className="max-w-3xl text-white py-12 md:py-16">
            <div className="inline-block rounded-lg bg-primary/20 backdrop-blur-sm px-3 py-1 text-sm mb-5">
              AI-powered Literature Review
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl mb-8">
              Systematic Reviews with Artificial Intelligence
            </h1>
            <p className="max-w-[600px] text-white/80 text-lg md:text-2xl mb-10">
              Streamline your research process with our AI-assisted platform for screening and reviewing scientific articles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={user ? "/sessions" : "/login"}>
                <Button size="lg" className="font-medium w-full sm:w-auto text-md py-5 px-7">
                  Start your reviews
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg" className="font-medium w-full sm:w-auto bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-md py-5 px-7">
                  Learn more
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - With container */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                Features
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Everything you need for systematic reviews
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                Our platform is designed to make your systematic review faster, more accurate, and less time-consuming.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">AI Screening</h3>
              <p className="text-muted-foreground">
                Artificial intelligence helps screen articles based on your inclusion criteria.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileSearch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Easy Text Analysis</h3>
              <p className="text-muted-foreground">
                Review abstracts and full-text articles in a structured and user-friendly interface.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Time-saving</h3>
              <p className="text-muted-foreground">
                Reduce the time you spend on manual article screening by up to 50%.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Data-driven Insights</h3>
              <p className="text-muted-foreground">
                Get visual insights into your review progress and decisions along the way.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Coffee className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">User-friendly</h3>
              <p className="text-muted-foreground">
                Focus on your research content, not on learning complicated software.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg border border-primary/20">
              <h3 className="text-xl font-bold">And much more</h3>
              <p className="text-muted-foreground">
                Dedicated review sessions, text-based search, collaboration tools, and robust data organization.
              </p>
              <Link href="/about" className="text-primary mt-2 inline-flex items-center">
                See all features
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - With container */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <div className="flex flex-col items-center justify-center space-y-4 mx-auto">
            <div className="space-y-2 max-w-[800px]">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Ready to optimize your research process?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                Start your systematic review today and experience the benefits of AI-assisted article screening.
              </p>
            </div>
            <div className="w-full max-w-md space-y-2 flex flex-col sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
              <Link href={user ? "/sessions" : "/login"}>
                <Button size="lg" className="w-full font-medium">
                  Go to your sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
