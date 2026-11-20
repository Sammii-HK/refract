import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleShaderRequest,
  normaliseShaderSource,
} from "../lib/shader-request.ts";
const source =
  "precision mediump float;\nvoid main(){float weights[4];for(int i=0;i<4;i++){weights[i]=float(i)*1e-3;}gl_FragColor=vec4(1.0);}";
const request = (body: unknown) =>
  new Request("http://local.test/api/shader", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
test("normalisation preserves integer loops, indexes, array sizes and exponent literals exactly", () => {
  assert.equal(normaliseShaderSource(source), source);
  assert.equal(normaliseShaderSource("```glsl\n" + source + "\n```"), source);
});
test("invalid inputs fail before the provider, including whitespace-only descriptions", async () => {
  let calls = 0;
  for (const body of [
    null,
    {},
    { description: 12 },
    { description: "   " },
    { description: "x".repeat(501) },
  ]) {
    const response = await handleShaderRequest(request(body), {
      available: true,
      generate: async () => {
        calls++;
        return source;
      },
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});
test("missing provider configuration returns an honest unavailable state without calling it", async () => {
  let calls = 0;
  const response = await handleShaderRequest(
    request({ description: "calm rings" }),
    {
      available: false,
      generate: async () => {
        calls++;
        return source;
      },
    },
  );
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
  assert.match((await response.json()).error, /unavailable/);
});
test("provider failures and malformed output cannot return successful shader results", async () => {
  for (const generate of [
    async () => {
      throw new Error("private-provider-detail");
    },
    async () => "",
    async () => "not shader source",
  ]) {
    const response = await handleShaderRequest(
      request({ description: "calm rings" }),
      { available: true, generate },
    );
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.glsl, undefined);
    assert.ok(!body.error.includes("private-provider-detail"));
  }
});
test("timeouts are distinct and successful source is returned unchanged with no retries", async () => {
  const error = new Error("timeout");
  error.name = "TimeoutError";
  assert.equal(
    (
      await handleShaderRequest(request({ description: "rings" }), {
        available: true,
        generate: async () => {
          throw error;
        },
      })
    ).status,
    504,
  );
  let calls = 0;
  const response = await handleShaderRequest(
    request({ description: " rings " }),
    {
      available: true,
      generate: async (prompt) => {
        calls++;
        assert.equal(prompt, "rings");
        return source;
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal((await response.json()).glsl, source);
});
