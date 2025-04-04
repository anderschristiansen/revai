import OpenAI from "openai";
import { supabase } from "./supabase";
import { AISettings, Criterion, DecisionType } from "./types";

/**
 * Service class to handle OpenAI interactions
 */
class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Retrieves the latest AI settings from the database
   */
  private async getAISettings(): Promise<AISettings> {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('instructions, temperature, max_tokens, seed, model')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Failed to fetch AI settings: ${error.message}`);
    }

    if (!data) {
      throw new Error("No AI settings found in database");
    }

    return {
      instructions: data.instructions,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      seed: data.seed,
      model: data.model
    } as AISettings;
  }

  /**
   * Constructs a prompt for article evaluation
   */
  private constructArticleEvaluationPrompt(
    title: string,
    abstract: string,
    criterias: string
  ): string {
    const parsedCriterias: Criterion[] = JSON.parse(criterias);
    const criteriaTexts = parsedCriterias.map(c => c.text.trim());
  
    return `
  You are given a list of inclusion criteria and an article (title and abstract).
  
  Evaluate the article according to the criteria.
  
  ---
  INCLUSION CRITERIA:
  ${criteriaTexts.map((text, i) => `${i + 1}. ${text}`).join('\n')}
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
    const settings = await this.getAISettings();
    const prompt = this.constructArticleEvaluationPrompt(title, abstract, criterias);
  
    let attempt = 0;
  
    while (attempt <= maxRetries) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: settings.model,
          messages: [
            {
              role: "system",
              content: settings.instructions,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          seed: settings.seed,
        });
  
        const response = completion.choices[0]?.message?.content?.trim() || "";
  
        // Auto-fix small issues first
        const cleanResponse = response
          .replace(/Decision:\s*(Include|Exclude|Unsure)[\s\.]/gi, (match, p1) => {
            // Normalize decision labels (capitalize first letter, remove period/space)
            const fixed = p1.trim().toLowerCase();
            if (fixed === "include") return "Decision: Include";
            if (fixed === "exclude") return "Decision: Exclude";
            if (fixed === "unsure") return "Decision: Unsure";
            return match; // if somehow something else
          })
          .replace(/\s+$/, ''); // Remove trailing whitespace if any
  
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
      } catch (error) {
        console.error(`OpenAI call failed on attempt ${attempt + 1}:`, error);
        attempt++;
      }
    }
  
    console.error(`Failed to evaluate article after ${maxRetries + 1} attempts.`);
    return {
      decision: "Unsure",
      explanation: "AI did not respond correctly after multiple attempts.",
    };
  }
}  

// Create and export a singleton instance
const openaiService = new OpenAIService();

// Export the service for more extensive use
export { openaiService }; 