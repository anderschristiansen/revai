import OpenAI from "openai";
import { supabase } from "./supabase";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EvaluationResult = {
  decision: "Yes" | "No";
  explanation: string;
};

type AiSettings = {
  instructions: string;
  temperature: number;
  max_tokens: number;
  seed: number;
  model: string;
};

/**
 * Evaluates an article against inclusion criteria using OpenAI
 */
export async function evaluateArticle(
  title: string,
  abstract: string,
  criteria: string,
  customSettings?: Partial<AiSettings>
): Promise<EvaluationResult> {
  try {
    // If customSettings is not provided, fetch from Supabase
    let settings: AiSettings = {
      instructions: customSettings?.instructions || '',
      temperature: customSettings?.temperature || 0.1,
      max_tokens: customSettings?.max_tokens || 500,
      seed: customSettings?.seed || 12345,
      model: customSettings?.model || 'gpt-3.5-turbo'
    };

    // If no settings provided, fetch from database
    if (!customSettings || Object.keys(customSettings).length === 0) {
      try {
        const { data, error } = await supabase
          .from('ai_settings')
          .select('instructions, temperature, max_tokens, seed, model')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching AI settings:", error);
        } else if (data) {
          settings = {
            instructions: data.instructions,
            temperature: data.temperature,
            max_tokens: data.max_tokens,
            seed: data.seed,
            model: data.model
          };
        }
      } catch (error) {
        console.error("Failed to fetch AI settings:", error);
      }
    }

    // If we still don't have instructions (failed to fetch or none found), use default
    if (!settings.instructions) {
      settings.instructions = `You are a scientific literature reviewer evaluating whether articles meet specific inclusion criteria for a systematic review. Your task is to assess the article strictly based on the provided criteria.

Instructions:
1. Evaluate each inclusion criterion separately.
2. Only mark the article as meeting the criteria if ALL conditions are met.
3. Be objective and consistent in your assessment.
4. Base your decision ONLY on the information provided in the title and abstract.
5. Do not make assumptions about information not explicitly stated.
6. If any single criterion is not met, the overall decision should be "No".

Your output MUST follow this exact format:
Decision: [Yes/No]
Explanation: [Concise, structured explanation explaining why the article does or does not meet each criterion]`;
    }

    // Construct the prompt with the instructions and article info
    const prompt = `${settings.instructions}

Inclusion criteria:
${criteria}

Article to evaluate:
Title: ${title}
Abstract: ${abstract}`;

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
    const decisionMatch = response.match(/Decision:\s*(Yes|No)/i);
    
    // Use a different approach to handle multi-line explanations
    let explanation = "";
    if (response.includes("Explanation:")) {
      explanation = response.split("Explanation:")[1].trim();
    }
    
    const decision = decisionMatch ? decisionMatch[1] : "No";
    
    return {
      decision: decision as "Yes" | "No",
      explanation: explanation,
    };
  } catch (error) {
    console.error("OpenAI evaluation error:", error);
    throw new Error("Failed to evaluate article with OpenAI");
  }
} 