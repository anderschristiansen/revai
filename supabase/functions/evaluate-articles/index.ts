// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:/@kitsonk/xhr";
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";

console.log("Hello from Functions!")

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const { prompt } = await req.json()

  console.log("prompt", prompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that evaluates articles." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });

    const responseData = {
      message: response.choices[0].message.content
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/evaluate-articles' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"prompt":"Evaluate this article: The vascular system regulates brain clearance through arterial blood flow and lymphatic drainage of cerebrospinal fluid (CSF). Idiopathic intracranial hypertension (IIH), characterized by elevated intracranial pressure and dural venous sinus stenoses, can be treated by restoring venous blood flow via venous stenting, suggesting a role for venous blood flow in brain fluid clearance. Using magnetic resonance imaging (MRI) in IIH patients and healthy controls, we identified that dural venous stenoses in IIH were associated with impaired lymphatic drainage, perivenous fluid retention, and brain fluid accumulation. To investigate this further, we developed a mouse model with bilateral jugular vein ligation (JVL), which recapitulated key human findings, including intracranial hypertension, calvarial lymphatic regression, and brain swelling due to impaired clearance. To further dissect the respective roles of dural lymphatics and venous blood flow in brain clearance, we performed JVL in mice with dural lymphatic depletion. These mice exhibited spontaneous elevated intracranial pressure, but JVL did not further exacerbate this effect. Moreover, the synchronous restoration of brain clearance and dural lymphatics observed in mice after JVL was absent in lymphatic-deficient mice.Transcriptomic analyses revealed that lymphatic remodeling induced by JVL was driven by VEGF-C signaling between dural mesenchymal and lymphatic endothelial cells. These findings establish the dural venous sinuses as a critical platform where venous blood flow interacts with mesenchymal cells to preserve dural lymphatic integrity and function, essential for brain fluid clearance."}'

*/
