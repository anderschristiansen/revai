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
  ): string {
    return `
You are a scientific reviewer evaluating research articles for a systematic review.

Given:
- A list of inclusion criteria.
- An article's title and abstract (if available).

Task:
1. Carefully assess whether the article might meet the inclusion criteria.
2. If the article appears potentially eligible (even if information is incomplete), choose "Include".
3. If the article clearly does NOT meet one or more criteria, choose "Exclude".
4. If unsure based on limited or unclear information, choose "Unsure".

Respond ONLY with a valid JSON object in this exact format:

{
  "decision": "Include" | "Exclude" | "Unsure",
  "explanation": "A concise explanation (2–5 sentences) justifying the decision. Be specific."
}

Important Rules:
- Do not explain the inclusion criteria again; only assess the article.
- If no abstract is provided, base your judgment only on the title.
- Always use double quotes for JSON keys and values.
- Do NOT add any text outside the JSON object.

---

INCLUSION CRITERIA:
${criterias}

ARTICLE TITLE:
${title}

ARTICLE ABSTRACT:
${abstract || "(No abstract available)"}
`.trim();
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
