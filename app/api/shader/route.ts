import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const bodySchema = z.object({
  description: z.string().min(1).max(500),
});

const SYSTEM_PROMPT = `You are a GLSL fragment shader expert. Your job is to translate a visual description into a matching GLSL shader.

CRITICAL RULES — follow every one without exception:
1. Output ONLY raw GLSL source. No markdown, no backticks, no comments, no explanation whatsoever.
2. Valid WebGL 1.0. First line must be: precision mediump float;
3. Available uniforms (use exact names): uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse;
4. Entry point: void main() { ... gl_FragColor = vec4(r, g, b, 1.0); }
5. Normalise coords: vec2 uv = gl_FragCoord.xy / uResolution.xy;
6. Always animate with uTime so the shader moves.
7. STRICT TYPE SAFETY: WebGL 1.0 does not allow mixing int and float. Every numeric literal used in a float expression MUST have a decimal point. Write 2.0 not 2, 10.0 not 10, 300.0 not 300. Never write an integer literal where a float is expected. This is a hard error on many GPUs.

VISUAL MATCHING — this is the most important rule:
- Read the description carefully and match it LITERALLY. The colours, mood, and subject must reflect what was asked.
- If the description is dark (void, space, night, deep ocean, shadow): the background must be predominantly BLACK or very dark. Do not add bright colours that contradict this.
- If the description is calm or ethereal (fairy, mist, soft, gentle): use soft pastel tones and slow gentle movement. Do NOT produce harsh neon or psychedelic patterns.
- If the description mentions specific colours, use those colours. Do not substitute with rainbow palettes.
- NEVER default to a generic rainbow / psychedelic / high-saturation grid pattern regardless of description.
- Stars = small bright points on a dark field. Achieved with hash/fract noise, not grids.
- Fire = orange/red/yellow with upward movement. Plasma = electric blue/cyan. Lava = orange/black slow blobs.
- Avoid tiling dot grids, repeating circle patterns, or disco effects unless explicitly asked for.

TECHNIQUE EXAMPLES — use these exact patterns for these subjects:

Stars / space / void (background MUST be black, stars MUST be tiny bright points):
  vec2 cell = floor(uv * 300.0);
  float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + h * 3.0));
  vec2 cellUv = fract(uv * 300.0) - 0.5;
  float star = smoothstep(0.04, 0.01, length(cellUv) - h * 0.02);
  gl_FragColor = vec4(vec3(star * twinkle), 1.0);  // black bg, white dots

Soft/ethereal/fairy (muted pastels, slow movement, NO neon — keep all channels well below 1.0):
  vec2 p = uv * 2.0 - 1.0;
  float r = 0.50 + 0.10 * sin(p.x * 2.1 + uTime * 0.3) + 0.06 * sin(p.y * 1.7 + uTime * 0.2);
  float g = 0.40 + 0.09 * sin(p.y * 1.9 + uTime * 0.25) + 0.05 * sin(p.x * 2.3 + uTime * 0.15);
  float b = 0.62 + 0.10 * sin((p.x + p.y) * 1.5 + uTime * 0.2);
  gl_FragColor = vec4(r, g, b, 1.0);  // soft lavender/mint, slow drift — never exceed 0.85 on any channel

Fire (orange/red/yellow, upward movement):
  float flame = sin(uv.x * 8.0 + uTime) * sin(uv.y * 4.0 - uTime * 2.0) * (1.0 - uv.y);
  gl_FragColor = vec4(flame, flame * 0.3, 0.0, 1.0);

For all other descriptions, invent appropriate technique but ALWAYS match the mood and colours exactly.`;


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { description } = parsed.data;

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: SYSTEM_PROMPT,
    prompt: `Create a GLSL fragment shader that accurately looks like: "${description}". Match the colours, mood, and subject of that description exactly. Output raw GLSL only.`,
    maxOutputTokens: 1024,
  });

  let glsl = text
    .replace(/```glsl\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Ensure all numeric literals used in float arithmetic have a decimal point.
  // Matches integers that are: preceded by an operator/paren/comma/= and followed by same,
  // but NOT already suffixed with a dot, and not part of a larger word (e.g. vec2, uv2).
  glsl = glsl.replace(/([+\-*\/,(=<>]\s*)(\d+)(?!\.\d*|\d)(\s*[+\-*\/,);])/g, "$1$2.0$3");

  return NextResponse.json({ glsl });
}
