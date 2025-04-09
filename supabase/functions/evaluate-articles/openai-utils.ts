import { OpenAI } from "https://deno.land/x/openai@v4.16.1/mod.ts";
import { logger } from "./logger.ts";
import type { DecisionType, Evaluation, AISettings } from "./types.ts";

export class OpenAIUtils {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({
      apiKey,
    });
    logger.info("OpenAIUtils", "OpenAI client initialized");
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
   * Evaluates an article using OpenAI
   */
  async evaluateArticle(
    title: string,
    abstract: string,
    criterias: string,
    settings: AISettings
  ): Promise<Evaluation> {
    try {
      const prompt = this.constructArticleEvaluationPrompt(title, abstract, criterias);
      
      const response = await this.client.chat.completions.create({
        model: settings.model,
        messages: [
          { role: "system", content: settings.instructions },
          { role: "user", content: prompt },
        ],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        seed: settings.seed,
      });

      const responseContent = response.choices[0].message.content;
      
      if (!responseContent) {
        logger.error('OpenAI', 'No content in OpenAI response');
        throw new Error("No content in OpenAI response");
      }
      
      // Clean and parse the response
      const cleanedResponse = this.cleanResponse(responseContent);
      const decisionMatch = cleanedResponse.match(/Decision:\s*(Include|Exclude|Unsure)/i);
      const explanationMatch = cleanedResponse.match(/Explanation:\s*([\s\S]*)/i);

      if (!decisionMatch || !explanationMatch) {
        logger.error('OpenAI', 'Invalid response format from OpenAI');
        throw new Error("Invalid response format from OpenAI");
      }

      const decision = decisionMatch[1] as DecisionType;
      const explanation = explanationMatch[1].trim();

      return {
        decision,
        explanation,
      };
    } catch (error) {
      logger.error('OpenAI', 'Error during OpenAI evaluation', error);
      throw error;
    }
  }
} 