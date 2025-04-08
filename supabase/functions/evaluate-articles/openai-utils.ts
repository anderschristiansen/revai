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
   * Cleans the response from OpenAI by removing any extraneous text
   */
  private cleanResponse(response: string): string {
    // Remove any markdown code block indicators
    return response.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '').trim();
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
    const startTime = Date.now();
    try {
      const prompt = this.constructArticleEvaluationPrompt(title, abstract, criterias);
      const promptLength = prompt.length;
      
      logger.info('OpenAI', 'Sending article evaluation request to OpenAI', { 
        model: settings.model,
        temperature: settings.temperature,
        titleLength: title.length,
        abstractLength: abstract?.length || 0,
        promptLength
      });

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

      const apiResponseTime = Date.now() - startTime;
      const responseContent = response.choices[0].message.content;
      
      if (!responseContent) {
        logger.error('OpenAI', 'No content in OpenAI response', null, {
          apiResponseTimeMs: apiResponseTime
        });
        throw new Error("No content in OpenAI response");
      }
      
      const responseStats = {
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        apiResponseTimeMs: apiResponseTime
      };
      
      logger.info('OpenAI', 'Received response from OpenAI', responseStats);
      
      // Clean and parse the response
      const cleanedResponse = this.cleanResponse(responseContent);
      const decisionMatch = cleanedResponse.match(/Decision:\s*(Include|Exclude|Unsure)/i);
      const explanationMatch = cleanedResponse.match(/Explanation:\s*([\s\S]*)/i);

      if (!decisionMatch || !explanationMatch) {
        logger.error('OpenAI', 'Invalid response format from OpenAI', null, {
          response: cleanedResponse,
          ...responseStats
        });
        throw new Error("Invalid response format from OpenAI");
      }

      const decision = decisionMatch[1] as DecisionType;
      const explanation = explanationMatch[1].trim();
      
      logger.info('OpenAI', 'Successfully parsed OpenAI response', {
        decision,
        explanationLength: explanation.length,
        ...responseStats
      });

      return {
        decision,
        explanation,
      };
    } catch (error) {
      const apiErrorTime = Date.now() - startTime;
      logger.error('OpenAI', 'Error during OpenAI evaluation', error, {
        titleLength: title.length,
        abstractLength: abstract?.length || 0,
        apiErrorTimeMs: apiErrorTime
      });
      throw error;
    }
  }
} 