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

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section with Video Background */}
      <section className="w-full relative overflow-hidden min-h-[600px] flex items-center">
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
          <div className="max-w-3xl text-white">
            <div className="inline-block rounded-lg bg-primary/20 backdrop-blur-sm px-3 py-1 text-sm mb-4">
              AI-drevet litteraturgennemgang
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl mb-6">
              Systematiske reviews med kunstig intelligens
            </h1>
            <p className="max-w-[600px] text-white/80 md:text-xl mb-8">
              Effektiviser din forskningsproces med vores AI-assisteret platform til screening og gennemgang af videnskabelige artikler.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sessions">
                <Button size="lg" className="font-medium w-full sm:w-auto">
                  Start dine reviews
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg" className="font-medium w-full sm:w-auto bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20">
                  Lær mere
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                Funktioner
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Alt hvad du har brug for til systematiske reviews
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                Vores platform er designet til at gøre dit systematiske review hurtigere, mere præcist og mindre tidskrævende.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">AI-screening</h3>
              <p className="text-muted-foreground">
                Kunstig intelligens hjælper med at screene artikler baseret på dine inklusionskriterier.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileSearch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Nem tekstanalyse</h3>
              <p className="text-muted-foreground">
                Gennemgå abstracts og fuldtekst-artikler i en struktureret og brugervenlig grænseflade.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Tidsbesparende</h3>
              <p className="text-muted-foreground">
                Reducer den tid, du bruger på manuel screening af artikler med op til 50%.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Datadrevet indsigt</h3>
              <p className="text-muted-foreground">
                Få visuel indsigt i dit review-fremskridt og beslutninger undervejs.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Coffee className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Brugervenlig</h3>
              <p className="text-muted-foreground">
                Fokuser på dit forskningsindhold, ikke på at lære kompliceret software.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 bg-muted/50 rounded-lg border border-primary/20">
              <h3 className="text-xl font-bold">Og meget mere</h3>
              <p className="text-muted-foreground">
                Dedikerede reviewsessioner, tekstbaseret søgning, samarbejdsværktøjer og robust dataorganisering.
              </p>
              <Link href="/about" className="text-primary mt-2 inline-flex items-center">
                Se alle funktioner
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <div className="flex flex-col items-center justify-center space-y-4 mx-auto">
            <div className="space-y-2 max-w-[800px]">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Klar til at optimere din forskningsproces?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                Start dit systematiske review i dag og oplev fordelene ved AI-assisteret artikelscreening.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <Link href="/sessions">
                <Button size="lg" className="w-full font-medium">
                  Gå til dine sessioner
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
