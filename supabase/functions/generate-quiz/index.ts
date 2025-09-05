// Fix: Add a manual type declaration for the Deno namespace.
// This resolves "Cannot find name 'Deno'" errors in environments
// where Deno's native types are not automatically available.
declare const Deno: {
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): { finished: Promise<void> };
  env: {
    get(key: string): string | undefined;
  };
};

// Use the more stable `npm:` specifier and pin the version for reliability.
import { GoogleGenAI, Type } from "npm:@google/genai@0.14.0";

// Define CORS headers for browser interaction.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the modern, built-in Deno.serve for better performance.
Deno.serve(async (req) => {
  // Handle CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { noteText } = await req.json();
    if (!noteText || typeof noteText !== 'string') {
      throw new Error("Missing or invalid 'noteText' in request body.");
    }

    const API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Supabase function secrets.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Define the expected JSON structure for the quiz.
    const quizSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The educational quiz question." },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 4 multiple-choice options.",
          },
          answer: {
            type: Type.STRING,
            description: "The correct answer, which must be one of the strings from the 'options' array.",
          },
        },
        required: ["question", "options", "answer"],
      },
    };

    // Refined prompt for better, more focused results.
    const prompt = `Based on the following academic text, generate a 5-question multiple-choice quiz to help a student study.
    For each question, provide exactly 4 plausible options, with one being the correct answer.
    The questions should cover the most important concepts in the text.
    The correct answer must be one of the provided options.

    Text:
    ---
    ${noteText.substring(0, 30000)}
    ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      },
    });

    // The Gemini API returns a stringified JSON in the .text property when a schema is used.
    const jsonText = response.text.trim();
    const quizData = JSON.parse(jsonText);

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
