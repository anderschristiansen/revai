import OpenAI, { APIError } from "openai";
import { getAISettings } from "@/lib/utils/supabase-utils"; // 👈 Use our supabase-utils
import { DecisionType } from "@/lib/types";

/**
 * Service class to handle OpenAI interactions
 */
class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.");
    }

    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Constructs a prompt for article evaluation
   */
  private constructArticleEvaluationPrompt(
    title: string,
    abstract: string,
    criterias: string
  ): string {
    return `
You are given a list of inclusion criteria and an article (title and abstract).

Evaluate the article according to the criteria.

---
INCLUSION CRITERIA:
${criterias}
---

ARTICLE TITLE:
${title}

ARTICLE ABSTRACT:
${abstract || "(No abstract available)"}
---

Respond in the following format:
Decision: [Include | Exclude | Unsure]
Explanation: [Short explanation why you made this decision]
`.trim();
  }

  /**
   * Evaluates an article against inclusion criteria using OpenAI
   */
  async evaluateArticle(
    title: string,
    abstract: string,
    criterias: string,
    maxRetries = 2
  ): Promise<{
    decision: DecisionType;
    explanation: string;
  }> {
    const settings = await getAISettings();
    const prompt = this.constructArticleEvaluationPrompt(title, abstract, criterias);

    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: settings.model,
          messages: [
            { role: "system", content: settings.instructions },
            { role: "user", content: prompt },
          ],
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          seed: settings.seed,
        });

        const response = completion.choices[0]?.message?.content?.trim() || "";

        // Auto-fix common formatting issues
        const cleanResponse = this.cleanResponse(response);

        const decisionMatch = cleanResponse.match(/Decision:\s*(Include|Exclude|Unsure)/i);
        const explanationMatch = cleanResponse.match(/Explanation:\s*([\s\S]*)/i);

        let decision: DecisionType = "Unsure"; // Default fallback
        let explanation = "";

        if (decisionMatch) {
          decision = decisionMatch[1] as DecisionType;
        } else {
          console.warn(`Attempt ${attempt + 1}: Missing Decision. Retrying...`, cleanResponse);
          attempt++;
          continue;
        }

        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
        } else {
          console.warn(`Attempt ${attempt + 1}: Missing Explanation. Retrying...`, cleanResponse);
          attempt++;
          continue;
        }

        return { decision, explanation };
      } catch (error: unknown) {
        if (error instanceof APIError) {
          console.error(`OpenAI API Error [${error.status}]:`, error.message);

          if (error.status === 429 || error.code === 'rate_limit_exceeded') {
            console.warn('Rate limit hit, waiting before retry...');
            await this.delay(1000 * Math.pow(2, attempt)); // 1s, 2s, 4s, 8s...
          }
        } else {
          console.error('Unexpected error during OpenAI evaluation:', error);
        }

        attempt++;
      }
    }

    console.error(`Failed to evaluate article after ${maxRetries + 1} attempts.`);
    return {
      decision: "Unsure",
      explanation: "AI did not respond correctly after multiple attempts.",
    };
  }

  /**
   * Cleans the raw OpenAI response to normalize common mistakes
   */
  private cleanResponse(response: string): string {
    return response
      .replace(/Decision:\s*(Include|Exclude|Unsure)[\s\.]/gi, (match, p1) => {
        const fixed = p1.trim().toLowerCase();
        if (fixed === "include") return "Decision: Include";
        if (fixed === "exclude") return "Decision: Exclude";
        if (fixed === "unsure") return "Decision: Unsure";
        return match;
      })
      .replace(/\s+$/, ''); // Remove trailing whitespace
  }

  /**
   * Helper function to delay execution (e.g., on rate limits)
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create and export a singleton instance
const openaiService = new OpenAIService();
export { openaiService };
