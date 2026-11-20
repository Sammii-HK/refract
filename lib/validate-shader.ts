/** Raw compile AND link check, with temporary GPU resources always released. */
export function validateShader(
  gl: WebGLRenderingContext,
  fragment: string,
): string | null {
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  try {
    for (const [type, source] of [
      [
        gl.VERTEX_SHADER,
        "attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}",
      ],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) return "The GPU could not allocate a shader.";
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        return gl.getShaderInfoLog(shader) || "Shader compilation failed.";
    }
    program = gl.createProgram();
    if (!program) return "The GPU could not allocate a shader program.";
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
    return gl.getProgramParameter(program, gl.LINK_STATUS)
      ? null
      : gl.getProgramInfoLog(program) || "Shader linking failed.";
  } catch {
    return "The preview could not validate this shader.";
  } finally {
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  }
}
