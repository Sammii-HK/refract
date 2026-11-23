# Refract

A shader workshop. Describe a mood and generate a GLSL fragment shader, start from one of three hand-authored studies, or edit the source directly and watch it run on the GPU.

## How it works

- **Generate** sends the description to `/api/shader`, which asks Groq's `llama-3.3-70b-versatile` for a fragment shader. Without `GROQ_API_KEY` the route returns 503 and the rest of the workshop still works.
- **Studies and source edits** run entirely in the browser.
- **The preview** compiles and links new source before swapping it in. If a shader fails, the last valid one keeps running and the full compiler log is shown.
- **Save valid shader** downloads the last source that compiled, never a broken draft.

Shaders use GLSL ES 1.00-style `gl_FragColor` with the uniforms `uTime`, `uResolution` and `uMouse`. The renderer is Three.js on WebGL 2. Frame rate is capped at 30fps and pixel ratio at 1.5; the preview pauses in hidden tabs and starts paused when reduced motion is requested.

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

`npm run build` runs the icon lint and a type check before `next build`.
