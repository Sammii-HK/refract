"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Download,
  Layers3,
  LoaderCircle,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { STUDIES } from "@/lib/studies";
import { normaliseShaderSource } from "@/lib/shader-request";
const ShaderCanvas = dynamic(() => import("@/components/ShaderCanvas"), {
  ssr: false,
  loading: () => (
    <p className="preview-loading" role="status">
      Opening the local preview.
    </p>
  ),
});
const SUGGESTIONS = [
  "golden lava lamp",
  "deep ocean bioluminescence",
  "aurora borealis",
  "neon city rain",
  "void with stars",
];
export default function Home() {
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<string>(STUDIES[0].source),
    [candidate, setCandidate] = useState<string>(STUDIES[0].source);
  const [revision, setRevision] = useState(0),
    [previewAvailable, setPreviewAvailable] = useState(false);
  const [activeSource, setActiveSource] = useState(""),
    [activeLabel, setActiveLabel] = useState("Opening hand-authored study");
  const [loading, setLoading] = useState(false),
    [paused, setPaused] = useState(false),
    [sourceOpen, setSourceOpen] = useState(false);
  const [requestError, setRequestError] = useState(""),
    [compileError, setCompileError] = useState(""),
    [actionStatus, setActionStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const metadata = useRef({
    source: STUDIES[0].source as string,
    label: `Hand-authored study: ${STUDIES[0].name}`,
  });
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPaused(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const onResult = useCallback((source: string, error: string | null) => {
    setCompileError(error ?? "");
    if (error && source === "") setPreviewAvailable(false);
    if (!error) {
      setPreviewAvailable(true);
      setActiveSource(source);
      setActiveLabel(
        metadata.current.source === source
          ? metadata.current.label
          : "Local GLSL edit",
      );
    }
  }, []);
  function apply(source: string, label: string) {
    setCompileError("");
    metadata.current = { source, label };
    setDraft(source);
    setCopied(false);
    setCandidate(source);
    setRevision((value) => value + 1);
  }
  async function generate() {
    const brief = description.trim();
    if (!brief || brief.length > 500 || loading) return;
    setLoading(true);
    setRequestError("");
    setActionStatus("");
    try {
      const response = await fetch("/api/shader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: brief }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : `Generation could not complete (HTTP ${response.status}).`,
        );
      apply(normaliseShaderSource(body?.glsl), `Model output: ${brief}`);
      setSourceOpen(true);
    } catch (problem) {
      setRequestError(
        problem instanceof Error
          ? problem.message
          : "Generation could not complete. Your last valid preview is still here.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function copySource() {
    setActionStatus("");
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setActionStatus("Draft source copied.");
    } catch {
      setActionStatus(
        "Copy failed. Select the source text and copy it manually.",
      );
    }
  }
  function download() {
    if (!activeSource) return;
    try {
      const url = URL.createObjectURL(
        new Blob([activeSource], { type: "text/plain" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "refract.frag";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionStatus("Last valid shader downloaded.");
    } catch {
      setActionStatus(
        "Download failed. Your source is still available in the editor.",
      );
    }
  }
  return (
    <div className="refract-app">
      <header className="refract-header">
        <a href="#workspace" className="refract-wordmark">
          <Layers3 size={23} aria-hidden />
          refract<span>Shader workshop</span>
        </a>
        <a
          href="#source"
          onClick={() => setSourceOpen(true)}
          className="text-link"
        >
          Open source <ArrowUpRight size={15} aria-hidden />
        </a>
      </header>
      <main id="workspace" className="refract-workspace">
        <section className="brief-panel" aria-labelledby="brief-title">
          <p className="eyebrow">Describe a little atmosphere</p>
          <h1 id="brief-title">
            Light, colour.
            <br />
            <span>A little movement.</span>
          </h1>
          <p className="intro">
            Start with a study, shape a description, or write your own fragment
            shader. See what it does, then keep exploring.
          </p>
          <div className="brief-section">
            <label htmlFor="shader-description">Your direction</label>
            <textarea
              id="shader-description"
              value={description}
              disabled={loading}
              maxLength={500}
              rows={4}
              placeholder="Soft amber bands, moving slowly across a dark surface…"
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="field-meta">
              <span>Suggestions fill this brief.</span>
              <span>{description.length}/500</span>
            </div>
            <div
              className="suggestions"
              role="group"
              aria-label="Brief suggestions"
            >
              {SUGGESTIONS.map((value) => (
                <button
                  key={value}
                  disabled={loading}
                  onClick={() => setDescription(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              className="generate-button"
              onClick={() => void generate()}
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <LoaderCircle size={17} className="spin" aria-hidden />
              ) : (
                <Sparkles size={17} aria-hidden />
              )}
              {loading ? "Requesting shader…" : "Generate shader"}
            </button>
            <p className="help">
              Only Generate sends your description to the configured model.
              Local studies and source editing do not call a model.
            </p>
            {requestError && (
              <p className="error-message" role="alert">
                {requestError}
              </p>
            )}
          </div>
          <div className="brief-section">
            <h2>Begin without a model</h2>
            <p className="help">
              Three hand-authored studies, ready to inspect and edit.
            </p>
            <div className="study-list">
              {STUDIES.map((study) => (
                <button
                  key={study.id}
                  disabled={loading}
                  onClick={() => {
                    setRequestError("");
                    setActionStatus("");
                    apply(study.source, `Hand-authored study: ${study.name}`);
                  }}
                >
                  <span>{study.name}</span>
                  <ArrowUpRight size={15} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </section>
        <section
          className="preview-panel"
          aria-label="Shader preview and source"
        >
          <div className="preview-heading">
            <div>
              <p className="eyebrow">The preview</p>
              <p className="preview-label" role="status">
                {activeLabel}
              </p>
            </div>
            <button
              className="playback-button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? (
                <Play size={16} aria-hidden />
              ) : (
                <Pause size={16} aria-hidden />
              )}
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
          <div className="preview-frame">
            <ShaderCanvas
              source={candidate}
              revision={revision}
              paused={paused}
              onResult={onResult}
            />
            <span className="preview-badge">
              {!previewAvailable
                ? "Preview unavailable"
                : compileError
                  ? "Last valid preview"
                  : paused
                    ? "Time paused"
                    : "Live preview"}
            </span>
          </div>
          {compileError && (
            <div className="compile-error" role="alert">
              <strong>Preview could not apply this source.</strong>
              <p>The last valid shader is kept when available.</p>
              <pre>{compileError}</pre>
            </div>
          )}
          <div className="preview-toolbar">
            <span>WebGL 2 · GLSL fragment source</span>
            <button disabled={!activeSource} onClick={download}>
              <Download size={15} aria-hidden />
              Save valid shader
            </button>
          </div>
          <section id="source" className="source-panel">
            <button
              className="source-toggle"
              aria-expanded={sourceOpen}
              aria-controls="shader-source-panel"
              onClick={() => setSourceOpen((value) => !value)}
            >
              <Code2 size={17} aria-hidden />
              Fragment source
              <span>{sourceOpen ? "Hide" : "Inspect and edit"}</span>
            </button>
            {sourceOpen && (
              <div id="shader-source-panel">
                <label htmlFor="shader-source" className="sr-only">
                  Fragment shader source
                </label>
                <textarea
                  id="shader-source"
                  disabled={loading}
                  spellCheck={false}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setCopied(false);
                  }}
                />
                <div className="source-actions">
                  <span>Apply to check compilation on this browser.</span>
                  <button onClick={() => void copySource()}>
                    {copied ? (
                      <Check size={15} aria-hidden />
                    ) : (
                      <Copy size={15} aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy draft"}
                  </button>
                  <button
                    disabled={!draft.trim() || loading}
                    onClick={() => apply(draft, "Local GLSL edit")}
                  >
                    Apply source
                  </button>
                </div>
              </div>
            )}
          </section>
          {actionStatus && (
            <p className="action-status" role="status">
              {actionStatus}
            </p>
          )}
        </section>
      </main>
      <footer className="refract-footer">
        A shader can compile successfully and still look different from the
        brief. Inspect the result before using it.
      </footer>
    </div>
  );
}
