import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-center">About RevAI</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>What is a Systematic Review?</CardTitle>
            <CardDescription>An overview of systematic reviews in research</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              A systematic review is a type of literature review that uses systematic methods to collect 
              secondary data, critically appraise research studies, and synthesize results. Systematic 
              reviews formulate research questions and then use methodical approaches to evaluate all available 
              evidence to answer these questions.
            </p>
            <p>
              The goal is to identify, select, and synthesize all high-quality research evidence relevant 
              to a specific question. Systematic reviews are particularly valuable in healthcare, where they 
              provide evidence to inform medical decisions.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>How this tool helps</CardTitle>
            <CardDescription>Features of RevAI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              RevAI helps researchers streamline the article screening process by:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Organizing articles and inclusion criteria in dedicated review sessions</li>
              <li>Using AI to provide initial screening decisions based on your criteria</li>
              <li>Offering a structured interface for reviewing articles and making decisions</li>
              <li>Tracking progress through your screening workflow</li>
            </ul>
            <p className="mt-4">
              This tool is designed to save time while maintaining the rigor and thoroughness required 
              for high-quality systematic reviews.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 