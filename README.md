# Refract

A local shader workshop with a description-to-GLSL path, three hand-authored studies, an editable fragment source panel and a live GPU preview. The examples are labelled as authored source, not AI-generated output.

Suggestions fill the brief. Only Generate submits it to the configured model. Local studies, source edits, pause, copying and shader downloads do not call a model. Generation must remain unexercised under the owner's current no-provider-spend instruction.

## Preview behaviour

The preview checks compilation and linking before accepting source. It also checks the actual Three.js rendering pipeline before replacing the previous material. Invalid edits keep the last valid preview and its exportable source. Full compiler diagnostics remain available in a scrolling error panel. Reapplying the same invalid draft still validates and reports the error.

Pause freezes shader time. Hidden tabs stop scheduling frames. Drawing is capped at 30 frames per second and device pixel ratio at 1.5. Resolution uniforms use actual drawing-buffer dimensions. Old materials are disposed on replacement; geometry, observers, frame callbacks and renderer resources are released on unmount.

The installed Three.js renderer requires WebGL 2. Shader source uses GLSL ES 1.00-style `gl_FragColor` and the uniforms `uTime`, `uResolution`, `uMouse`. Integer loop counters, array sizes and indexes are preserved. See [Three.js renderer documentation](https://threejs.org/docs/pages/WebGLRenderer) and [Khronos WebGL 2 shader-language support](https://registry.khronos.org/webgl/specs/latest/2.0/).

## Generation boundary

The existing route refers to Groq's `llama-3.3-70b-versatile`. Its live availability and output quality were not verified. Missing configuration returns 503 without contacting it. Malformed input returns 400; provider failures return a safe error; timeouts return 504. The route makes no automatic provider retries. Response normalisation removes a whole GLSL fence but never rewrites numeric literals.

No environment files are needed for local authored-source work. Provider settings belong to the owner's existing platform configuration and must not be copied into this checkout.

## Local checks

Use Node 24 and the existing package manager:

```sh
pnpm test
pnpm lint
pnpm build
pnpm exec next start --hostname 127.0.0.1 --port 4826
```

The tests inject provider, animation and GPU-resource IO. They do not request model output. The actual browser verification used only authored shaders and local edits. See [the verification record](docs/quality/refract-verification-20261120.md) for exact evidence and limits.
