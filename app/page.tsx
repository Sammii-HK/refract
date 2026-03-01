"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const ShaderCanvas = dynamic(() => import("@/components/ShaderCanvas"), {
  ssr: false,
});

const SUGGESTIONS = [
  "golden lava lamp",
  "deep ocean bioluminescence",
  "aurora borealis",
  "neon city rain",
  "fractal fire",
  "void with stars",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [glsl, setGlsl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  const generate = useCallback(async (description?: string) => {
    const trimmed = (description ?? input).trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/shader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      setGlsl(data.glsl);
      setLastPrompt(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generate();
    }
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
    generate(s);
  };

  const handleShaderError = useCallback((msg: string | null) => {
    setError(msg);
  }, []);

  return (
    <>
      <ShaderCanvas glsl={glsl} onError={handleShaderError} />

      {/* Wordmark */}
      <div className="fixed top-6 left-7 z-10 select-none">
        <span className="text-xs font-semibold tracking-[0.25em] uppercase text-white/60">
          refract
        </span>
      </div>

      {/* Current prompt label */}
      {lastPrompt && !isLoading && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10 select-none">
          <span className="text-xs text-white/35 tracking-wide">{lastPrompt}</span>
        </div>
      )}

      {/* Bottom UI */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-7 px-4 gap-3">

        {/* Suggestion chips */}
        {!glsl && !isLoading && (
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs text-white/60 transition-all hover:border-white/35 hover:text-white/90 hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400/90 max-w-lg text-center truncate">
            {error}
          </p>
        )}

        {/* Input bar */}
        <div className="w-full max-w-xl">
          <div
            className={[
              "flex items-center gap-2 rounded-2xl border px-4 py-3",
              "bg-black/30 backdrop-blur-xl",
              "transition-all duration-300",
              error
                ? "border-red-500/40"
                : isLoading
                ? "border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                : "border-white/10 hover:border-white/20 focus-within:border-white/25",
            ].join(" ")}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe a shader..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 outline-none leading-relaxed"
            />
            <button
              onClick={() => generate()}
              disabled={isLoading || !input.trim()}
              className={[
                "shrink-0 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200",
                isLoading
                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                  : input.trim()
                  ? "bg-white text-black hover:bg-white/90 active:scale-95"
                  : "bg-white/8 text-white/25 cursor-not-allowed",
              ].join(" ")}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                  generating
                </span>
              ) : (
                "generate"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
