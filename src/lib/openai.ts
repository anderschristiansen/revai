import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EvaluationResult = {
  decision: "Yes" | "No";
  explanation: string;
};

/**
 * Evaluates an article against inclusion criteria using OpenAI's GPT-3.5
 */
export async function evaluateArticle(
  title: string,
  abstract: string,
  criteria: string
): Promise<EvaluationResult> {
  try {
    const prompt = `You are a scientific literature reviewer evaluating whether articles meet specific inclusion criteria for a systematic review. Your task is to assess the article strictly based on the provided criteria.

Inclusion criteria:
${criteria}

Article to evaluate:
Title: ${title}
Abstract: ${abstract}

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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      temperature: 0.1,
      max_tokens: 500,
      seed: 12345,
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