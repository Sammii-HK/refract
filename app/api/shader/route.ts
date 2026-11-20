import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { handleShaderRequest } from "@/lib/shader-request";
import { SYSTEM_PROMPT } from "@/lib/shader-prompt";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  return handleShaderRequest(request, {
    available: !!apiKey,
    generate: async (description) => {
      const groq = createGroq({ apiKey });
      const result = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: SYSTEM_PROMPT,
        prompt: `Create a GLSL fragment shader for: ${description}. Match its colours and mood. Output raw GLSL only.`,
        maxOutputTokens: 2048,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(20000),
      });
      return result.text;
    },
  });
}
