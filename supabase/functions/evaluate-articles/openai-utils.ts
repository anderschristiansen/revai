import { logger } from "./logger.ts";
import type { AISettings, DecisionType, Evaluation } from "./types.ts";

export class OpenAIUtils {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = apiKey;
    logger.info("OpenAIUtils", "OpenAI fetch client initialized");
  }

  /**
   * Constructs a strong article evaluation prompt
   */
  private constructArticleEvaluationPrompt(
    title: string,
    abstract: string,
    criterias: string,
    promptTemplate?: string,
  ): string {
    // Require prompt template, throw error if not provided
    if (!promptTemplate) {
      throw new Error("Prompt template is required but was not provided in AI settings");
    }
    
    // Replace placeholders in the template
    return promptTemplate
      .replace(/\${title}/g, title)
      .replace(/\${abstract}/g, abstract || "(No abstract available)")
      .replace(/\${criterias}/g, criterias)
      .trim();
  }

  /**
   * Evaluates an article using OpenAI's fetch endpoint
   */
  async evaluateArticle(
    title: string,
    abstract: string,
    criterias: string,
    settings: AISettings,
  ): Promise<Evaluation> {
    try {
      const prompt = this.constructArticleEvaluationPrompt(
        title,
        abstract,
        criterias,
        settings.prompt_template,
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              { role: "system", content: settings.instructions },
              { role: "user", content: prompt },
            ],
            temperature: settings.temperature,
            max_tokens: settings.max_tokens,
            seed: settings.seed,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("OpenAI", "Fetch failed", errorText);
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;

      if (!message) {
        throw new Error("No content in OpenAI response");
      }

      logger.info("OpenAI", "Raw OpenAI response", message);

      // Try to safely parse the response
      const parsed = JSON.parse(message);

      if (!parsed.decision || !parsed.explanation) {
        logger.error("OpenAI", "Invalid parsed response", parsed);
        throw new Error("Invalid OpenAI response structure");
      }

      const decision = parsed.decision as DecisionType;
      const explanation = parsed.explanation as string;

      return {
        decision,
        explanation: explanation.trim(),
      };
    } catch (error) {
      logger.error("OpenAI", "Error during article evaluation", error);
      throw error;
    }
  }
}
