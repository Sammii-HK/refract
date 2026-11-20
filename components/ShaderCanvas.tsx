"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  createPreviewLoop,
  createResourceScope,
  previewSize,
} from "@/lib/preview-resources";
import { validateShader } from "@/lib/validate-shader";
interface Props {
  source: string;
  revision: number;
  paused: boolean;
  onResult: (source: string, error: string | null) => void;
}
const VERTEX = "void main(){gl_Position=vec4(position,1.0);}";
export default function ShaderCanvas({
  source,
  revision,
  paused,
  onResult,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const session = useRef<{
    apply: (source: string) => void;
    pause: (paused: boolean) => void;
  } | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scope = createResourceScope();
    let cleanup = () => {};
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power",
      });
      scope.own({
        dispose: () => {
          renderer.dispose();
          renderer.forceContextLoss();
        },
      });
      renderer.domElement.style.cssText =
        "display:block;width:100%;height:100%";
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      scope.own(geometry);
      const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      };
      let material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader:
          "precision mediump float; void main(){gl_FragColor=vec4(0.0);}",
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
      let releaseMaterial = scope.own(material);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const draw = () => {
        if (material) renderer.render(scene, camera);
      };
      const loop = createPreviewLoop({
        request: (callback) => window.requestAnimationFrame(callback),
        cancel: (id) => window.cancelAnimationFrame(id),
        draw: (elapsed) => {
          uniforms.uTime.value = elapsed;
          draw();
        },
      });
      const resize = () => {
        const size = previewSize(
          mount.clientWidth,
          mount.clientHeight,
          window.devicePixelRatio,
        );
        renderer.setPixelRatio(size.pixelRatio);
        renderer.setSize(size.width, size.height, false);
        renderer.getDrawingBufferSize(uniforms.uResolution.value);
        draw();
      };
      const apply = (next: string) => {
        const error = validateShader(renderer.getContext(), next);
        if (error) {
          onResult(next, error);
          return;
        }
        const previousMaterial = material,
          previousRelease = releaseMaterial;
        const nextMaterial = new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: next,
          uniforms,
          depthTest: false,
          depthWrite: false,
        });
        const releaseNext = scope.own(nextMaterial);
        mesh.material = nextMaterial;
        let pipelineError: string | null = null;
        const previousHandler = renderer.debug.onShaderError;
        renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
          pipelineError =
            [
              gl.getProgramInfoLog(program),
              gl.getShaderInfoLog(vertex),
              gl.getShaderInfoLog(fragment),
            ]
              .filter(Boolean)
              .join("\n") || "The renderer could not link this shader.";
        };
        try {
          renderer.render(scene, camera);
        } catch {
          pipelineError = "The renderer could not apply this shader.";
        } finally {
          renderer.debug.onShaderError = previousHandler;
        }
        if (pipelineError) {
          mesh.material = previousMaterial;
          releaseNext();
          draw();
          onResult(next, pipelineError);
          return;
        }
        material = nextMaterial;
        releaseMaterial = releaseNext;
        previousRelease();
        onResult(next, null);
      };
      const pointer = (event: PointerEvent) => {
        const rect = mount.getBoundingClientRect();
        uniforms.uMouse.value.set(
          Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
          Math.max(
            0,
            Math.min(1, 1 - (event.clientY - rect.top) / rect.height),
          ),
        );
        if (pausedRef.current) draw();
      };
      const visibility = () => loop.setVisible(!document.hidden);
      const lost = (event: Event) => {
        event.preventDefault();
        loop.setRunning(false);
        onResult(
          "",
          "The graphics context was lost. Reload this page to restart the preview.",
        );
      };
      const observer = new ResizeObserver(resize);
      scope.own({ dispose: () => observer.disconnect() });
      observer.observe(mount);
      resize();
      mount.addEventListener("pointermove", pointer);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      document.addEventListener("visibilitychange", visibility);
      session.current = { apply, pause: (value) => loop.setRunning(!value) };
      visibility();
      cleanup = () => {
        session.current = null;
        loop.dispose();
        observer.disconnect();
        mount.removeEventListener("pointermove", pointer);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        document.removeEventListener("visibilitychange", visibility);
        scene.remove(mesh);
        scope.dispose();
        renderer.domElement.remove();
      };
    } catch {
      scope.dispose();
      mount.replaceChildren();
      onResult(
        "",
        "WebGL 2 is unavailable in this browser. The source editor is still available.",
      );
    }
    return cleanup;
    // The stable callback owns one renderer for this mount. Source and playback update below.
  }, [onResult]);
  useEffect(() => {
    session.current?.apply(source);
  }, [source, revision]);
  useEffect(() => {
    session.current?.pause(paused);
  }, [paused]);
  return (
    <div
      ref={mountRef}
      className="shader-surface"
      role="img"
      aria-label="Live shader preview"
    />
  );
}
