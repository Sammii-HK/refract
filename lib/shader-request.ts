class ShaderResponseError extends Error {}
/** Remove only a whole response fence. Never guess the types of GLSL literals. */
export function normaliseShaderSource(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new ShaderResponseError("The model returned no shader source.");
  let source = value.trim();
  const fenced = source.match(
    /^```(?:glsl|frag|fragment)?\s*\n([\s\S]*?)\n?```$/i,
  );
  if (fenced) source = fenced[1].trim();
  if (source.length > 50000)
    throw new ShaderResponseError("The shader source is too large to preview.");
  if (!/\bvoid\s+main\s*\(/.test(source) || !source.includes("gl_FragColor"))
    throw new ShaderResponseError(
      "The response is not a WebGL 1 fragment shader.",
    );
  return source;
}
export interface ShaderRuntime {
  available: boolean;
  generate: (description: string) => Promise<string>;
}
export async function handleShaderRequest(
  request: Request,
  runtime: ShaderRuntime,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a JSON shader description." },
      { status: 400 },
    );
  }
  const description = (body as { description?: unknown } | null)?.description;
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 500
  )
    return Response.json(
      { error: "Describe the shader in 1 to 500 characters." },
      { status: 400 },
    );
  if (!runtime.available)
    return Response.json(
      {
        error:
          "Generation is unavailable. You can still use a hand-authored study or edit GLSL locally.",
      },
      { status: 503 },
    );
  try {
    return Response.json({
      glsl: normaliseShaderSource(await runtime.generate(description.trim())),
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name);
    return Response.json(
      {
        error:
          error instanceof ShaderResponseError
            ? error.message
            : timeout
              ? "Generation timed out. Your last valid preview is still here."
              : "Generation could not complete. Your last valid preview is still here.",
      },
      { status: timeout ? 504 : 502 },
    );
  }
}
