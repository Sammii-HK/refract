import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPreviewLoop,
  createResourceScope,
  previewSize,
} from "../lib/preview-resources.ts";
import { validateShader } from "../lib/validate-shader.ts";
test("replaced material ownership releases the old resource and cleanup releases each remainder once", () => {
  const scope = createResourceScope();
  let old = 0,
    current = 0,
    geometry = 0,
    renderer = 0;
  scope.own({ dispose: () => renderer++ });
  scope.own({ dispose: () => geometry++ });
  const release = scope.own({ dispose: () => old++ });
  scope.own({ dispose: () => current++ });
  release();
  release();
  assert.equal(old, 1);
  assert.equal(scope.size(), 3);
  scope.dispose();
  scope.dispose();
  assert.deepEqual([old, current, geometry, renderer], [1, 1, 1, 1]);
  assert.equal(scope.size(), 0);
});
test("preview drawing dimensions are bounded while preserving CSS dimensions", () => {
  assert.deepEqual(previewSize(320.7, 240.8, 4), {
    width: 320,
    height: 240,
    pixelRatio: 1.5,
  });
  assert.equal(previewSize(0, 0, NaN).width, 1);
});
test("pause, hidden state and disposal cancel owned frames and resume without a time jump", () => {
  let id = 0;
  const callbacks = new Map<number, (time: number) => void>(),
    draws: number[] = [];
  const loop = createPreviewLoop({
    request: (callback) => {
      callbacks.set(++id, callback);
      return id;
    },
    cancel: (frame) => {
      callbacks.delete(frame);
    },
    draw: (value) => draws.push(value),
  });
  const frame = (time: number) => {
    const [key, callback] = [...callbacks][0];
    callbacks.delete(key);
    callback(time);
  };
  loop.setRunning(true);
  assert.equal(callbacks.size, 1);
  frame(100);
  frame(150);
  assert.equal(draws.length, 2);
  loop.setVisible(false);
  assert.equal(callbacks.size, 0);
  loop.setVisible(true);
  frame(60000);
  assert.equal(draws.at(-1), 0.05);
  loop.setRunning(false);
  assert.equal(callbacks.size, 0);
  loop.setRunning(true);
  assert.equal(callbacks.size, 1);
  loop.dispose();
  loop.setRunning(true);
  assert.equal(callbacks.size, 0);
});
function context(failure: "none" | "fragment" | "link") {
  let id = 0;
  const shaders = new Set<object>(),
    programs = new Set<object>();
  let log = "ERROR: 0:7: first diagnostic\nERROR: 0:8: second diagnostic";
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    createShader: (type: number) => {
      const value = { id: ++id, type };
      shaders.add(value);
      return value;
    },
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: (s: { type: number }) =>
      failure !== "fragment" || s.type !== 2,
    getShaderInfoLog: () => log,
    deleteShader: (s: object) => shaders.delete(s),
    createProgram: () => {
      const value = { id: ++id };
      programs.add(value);
      return value;
    },
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => failure !== "link",
    getProgramInfoLog: () => log,
    deleteProgram: (p: object) => programs.delete(p),
  };
  return { gl: gl as unknown as WebGLRenderingContext, shaders, programs, log };
}
test("compile/link validation always frees temporary GPU objects and preserves every diagnostic line", () => {
  for (const failure of ["none", "fragment", "link"] as const) {
    const c = context(failure);
    const result = validateShader(c.gl, "void main(){}");
    assert.equal(c.shaders.size, 0);
    assert.equal(c.programs.size, 0);
    assert.equal(result, failure === "none" ? null : c.log);
  }
});

test("a failing disposer cannot retain the remaining GPU resources", () => {
  const scope = createResourceScope();
  let released = 0;
  scope.own({ dispose: () => released++ });
  scope.own({
    dispose: () => {
      throw new Error("already lost context");
    },
  });
  scope.own({ dispose: () => released++ });
  assert.doesNotThrow(() => scope.dispose());
  assert.equal(released, 2);
  assert.equal(scope.size(), 0);
});
