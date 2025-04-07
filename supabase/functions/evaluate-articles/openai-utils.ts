import { OpenAI } from "https://esm.sh/openai@4.20.1";
import type { DecisionType, Evaluation, AISettings } from "./types";

export class OpenAIUtils {
  private openai: OpenAI;

  constructor(apiKey: string) {
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
    const prompt = this.constructArticleEvaluationPrompt(title, abstract, criterias);

    const response = await this.openai.chat.completions.create({
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
      throw new Error("No content in OpenAI response");
    }
    
    // Clean and parse the response
    const cleanedResponse = this.cleanResponse(responseContent);
    const decisionMatch = cleanedResponse.match(/Decision:\s*(Include|Exclude|Unsure)/i);
    const explanationMatch = cleanedResponse.match(/Explanation:\s*([\s\S]*)/i);

    if (!decisionMatch || !explanationMatch) {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      decision: decisionMatch[1] as DecisionType,
      explanation: explanationMatch[1].trim(),
    };
  }
} 