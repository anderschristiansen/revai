import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-center">Om RevAI</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Hvad er et Systematisk Review?</CardTitle>
            <CardDescription>En oversigt over systematiske reviews i forskning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Et systematisk review er en type litteraturoversigt, der anvender systematiske metoder til at indsamle 
              sekundære data, kritisk vurdere forskningsstudier og sammenfatte resultater. Systematiske 
              reviews formulerer forskningsspørgsmål og bruger derefter metodiske tilgange til at evaluere alle tilgængelige 
              beviser for at besvare disse spørgsmål.
            </p>
            <p>
              Målet er at identificere, udvælge og sammenfatte alle forskningsresultater af høj kvalitet, der er relevante 
              for et specifikt spørgsmål. Systematiske reviews er særligt værdifulde inden for sundhedspleje, hvor de 
              giver evidens til at informere medicinske beslutninger.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Hvordan dette værktøj hjælper</CardTitle>
            <CardDescription>Funktioner i RevAI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              RevAI hjælper forskere med at effektivisere artikelscreeningsprocessen ved at:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Organisere artikler og inklusionskriterier i dedikerede reviewsessioner</li>
              <li>Bruge AI til at levere indledende screeningsbeslutninger baseret på dine kriterier</li>
              <li>Tilbyde en struktureret grænseflade til gennemgang af artikler og beslutningstagning</li>
              <li>Spore fremskridt gennem din screenings-workflow</li>
            </ul>
            <p className="mt-4">
              Dette værktøj er designet til at spare tid, samtidig med at det opretholder den stringens og grundighed, der kræves
              for systematiske reviews af høj kvalitet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 