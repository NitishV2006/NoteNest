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

import { GoogleGenAI, Type } from "npm:@google/genai@0.14.0";
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as pdfjsLib from 'npm:pdfjs-dist@4.4.175';


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== 'string') {
      throw new Error("Missing or invalid 'filePath' in request body.");
    }

    // --- 1. Download file from Supabase Storage ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('notes')
      .download(filePath);

    if (downloadError) throw downloadError;

    // --- 2. Extract text content from the file ---
    let noteText = '';
    if (fileData.type === 'application/pdf') {
      const pdf = await pdfjsLib.getDocument(await fileData.arrayBuffer()).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        noteText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
      }
    } else if (fileData.type.startsWith('text/')) {
      noteText = await fileData.text();
    } else {
      throw new Error(`Unsupported file type: ${fileData.type}. Only PDF and text files are supported for quiz generation.`);
    }

    if (!noteText.trim()) {
      throw new Error("The file is empty or contains no readable text.");
    }
    
    // --- 3. Generate quiz with Gemini API ---
    const API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Supabase function secrets.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const quizSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The educational quiz question." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of exactly 4 multiple-choice options." },
          answer: { type: Type.STRING, description: "The correct answer, which must be one of the strings from the 'options' array." },
        },
        required: ["question", "options", "answer"],
      },
    };

    const prompt = `Based on the following academic text, generate a 5-question multiple-choice quiz.
    For each question, provide exactly 4 plausible options, with one being the correct answer.
    The questions should cover the most important concepts in the text.
    Text:
    ---
    ${noteText.substring(0, 30000)}
    ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: quizSchema },
    });

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