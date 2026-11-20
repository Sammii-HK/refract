# Refract local product verification, 20 November 2026

Unreleased isolated branch `codex/refract-product-polish` in `/Users/sammii/development-worktrees/refract-product-polish`, based on clean owner commit `8ee0c7a`. The owner's checkout was preserved. Environment files were excluded. No environment file, database, private runtime data or provider credential was read or copied. No model/provider request, release, push or deployment was made.

## Correctness and product changes

The API previously rewrote integer-looking numbers with a regular expression. Valid integer loops could become float initialisers, breaking their GLSL types. Normalisation now preserves numeric tokens exactly, including loop counters, array sizes/indexes and exponent notation, and only unwraps a whole recognised source fence.

The request handler validates trimmed descriptions, handles missing configuration, distinguishes timeouts/provider failures and returns its own safe errors. The provider is constructed lazily; SDK retries are disabled. Tests inject generation rather than contacting a model. Suggestions now fill the brief without sending a request. Only explicit Generate submits the description.

The workspace separates the brief, actual preview and editable source. Three local studies are explicitly labelled hand-authored. Failed source applications retain the last valid image and its exportable source. Errors are separate from request errors and keep complete compiler logs. Reapplying the same invalid source validates again rather than clearing the error silently. Copy handles failure; export chooses the last valid source, not an invalid draft.

The renderer validates compile and link stages, checks the actual Three.js pipeline, releases rejected/replaced material resources and disposes geometry/renderer/observers. Animation owns at most one scheduled frame, stops when paused or hidden and resumes without adding hidden time. Frame frequency and pixel ratio are capped. Resolution uniforms match actual drawing-buffer size rather than CSS size. System reduced-motion preferences start the preview paused.

The current Three.js renderer uses WebGL 2, while the editor's fragment contract uses legacy GLSL-style syntax. This was checked against [the official renderer documentation](https://threejs.org/docs/pages/WebGLRenderer) and [Khronos's WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/), as well as the installed renderer source. No general guarantee of cross-GPU compatibility is claimed.

## Automated checks

21 tests pass: 11 canonical icon regressions plus 10 meaningful request/render-resource regressions. They cover unchanged integer GLSL, invalid/whitespace input, missing configuration without generation, provider failures/empty output, safe timeout reporting, one provider invocation, ownership/replacement cleanup, failure-tolerant disposal, bounded drawing dimensions, pause/visibility/frame cancellation and complete diagnostic/resource cleanup for shader compile/link errors.

Icon gate: zero violations and zero data-review candidates. TypeScript and the normal production build pass with Next 16.4.6. Dependency audit: zero vulnerabilities. Tests do not import or invoke the live provider adapter.

## Actual browser evidence

Production preview at `127.0.0.1:4826`, title Refract: a shader workshop verified before testing. Only independent agent tabs were used.

- Desktop viewport 1144 px: real authored GPU preview compiled. CSS canvas size 654×547 had drawing buffer 981×820, matching the 1.5 maximum pixel ratio. No horizontal page overflow.
- Selecting golden lava lamp filled the textarea and enabled Generate while the preview remained labelled as the hand-authored study. Generate was never pressed; the handler was reviewed to perform only a local input update.
- Pause exposed Resume/pressed state and Time paused. Two clipped preview captures 1.1 seconds apart were byte-identical.
- Copper bands, including `for(int i=0;i<4;i++)`, compiled on the actual GPU and became the labelled hand-authored preview.
- A deliberately invalid local draft produced the full compiler error and Last valid preview state. Reapplying it did not clear the error. The Copper bands label/source remained active.
- Saving after that failure produced `/Users/sammii/Downloads/refract.frag`: 397 bytes, retaining the integer loop and excluding the deliberately broken draft. The browser download event watcher timed out, but the visible saved status and actual file were reconciled before any further download attempt. No duplicate download was attempted.
- Phone viewport 390 px: document width 390 px, canvas CSS/drawing size 348×358, single-column controls and keyboard-operable pause. All visible buttons/links measured at least 44 px high. The authored-study label remains visible beside the preview controls.
- Viewport was reset and confirmed at 1144 px before browser handoff.

Actual local screenshots in `.codex-artifacts`, excluded from the code commit:

- `refract-authored-desktop.jpg`: real 1144 px workspace with an explicitly hand-authored shader, empty brief and disabled Generate.
- `refract-authored-phone.jpg`: real 390 px paused authored preview and source-study controls.
- `refract-compile-error-desktop.jpg`: local invalid draft, full compiler error and retained valid shader state.

These are authored/local-edit tool views. They are not model-generated examples, recorded AI demos or live deployed screenshots.

## Limits

Provider availability, model output quality, billing, real model retries and live deployment were not exercised. GPU ownership/frame tests use injected IO; actual browser checks confirm selected authored shaders and failure states rather than instrumenting internal GPU memory. Background visibility, context loss, every possible shader feature and other GPU/browser combinations were not exhaustively exercised. The generation route retains its prior configured-provider integration and remains outside the standing no-provider-call verification boundary.
