import OpenAI from "openai";
import { supabase } from "./supabase";
import { AISettings, DecisionType } from "./types";

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OpenAI API key in environment variables');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluates an article against inclusion criteria using OpenAI
 */
export async function evaluateArticle(
  title: string,
  abstract: string,
  criteria: string
): Promise<{
  decision: DecisionType;
  explanation: string;
}> {
  try {
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

    const settings: AISettings = {
      instructions: data.instructions,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      seed: data.seed,
      model: data.model
    };

    if (!settings.instructions) {
      throw new Error("AI settings instructions are required");
    }

    // Construct the prompt with the instructions and article info
    const prompt = `${settings.instructions}

Inclusion criteria:
${criteria}

Article to evaluate:
Title: ${title}
Abstract: ${abstract}`;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.");
    }

    const completion = await openai.chat.completions.create({
      model: settings.model,
      messages: [
        {
          role: "system",
          content: "You are a precise and consistent scientific literature reviewer. You make objective evaluations based strictly on provided criteria without adding personal interpretation. Always format your response exactly as requested with 'Decision:' and 'Explanation:' on separate lines.",
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

    const response = completion.choices[0]?.message?.content || "";
    
    // Extract the decision and explanation using the specified format
    const decisionMatch = response.match(/Decision:\s*(Include|Exclude|Unsure)/i);
    
    // Use a different approach to handle multi-line explanations
    let explanation = "";
    if (response.includes("Explanation:")) {
      explanation = response.split("Explanation:")[1].trim();
    }
    
    const decision = decisionMatch ? decisionMatch[1] : "Unsure";
    
    return {
      decision: decision as DecisionType,
      explanation: explanation,
    };
  } catch (error) {
    console.error("OpenAI evaluation error:", error);
    throw new Error("Failed to evaluate article with OpenAI");
  }
} 