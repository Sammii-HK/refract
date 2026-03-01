"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  glsl: string | null;
  onError: (msg: string | null) => void;
}

const VERTEX_SHADER = `void main() { gl_Position = vec4(position, 1.0); }`;

const DEFAULT_GLSL = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(uTime * 0.5 + uv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(col, 1.0);
}
`.trim();

export default function ShaderCanvas({ glsl, onError }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const activeGlslRef = useRef<string>(DEFAULT_GLSL);

  // Initialise Three.js scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: DEFAULT_GLSL,
      uniforms,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let lastTime = performance.now();

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      timeRef.current += (now - lastTime) / 1000;
      lastTime = now;
      uniforms.uTime.value = timeRef.current;
      renderer.render(scene, camera);
    }
    animate();

    const onMouse = (e: MouseEvent) => {
      uniforms.uMouse.value.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight
      );
    };
    window.addEventListener("mousemove", onMouse);

    const ro = new ResizeObserver(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    });
    ro.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("mousemove", onMouse);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Apply new GLSL whenever it changes
  useEffect(() => {
    const renderer = rendererRef.current;
    const material = materialRef.current;
    if (!renderer || !material || !glsl) return;

    // Validate with raw WebGL before applying
    const gl = renderer.getContext();
    const sh = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(sh, glsl);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) ?? "Compile error";
      gl.deleteShader(sh);
      onError(log.split("\n")[0]);
      return;
    }
    gl.deleteShader(sh);

    // Valid — apply
    material.fragmentShader = glsl;
    material.needsUpdate = true;
    activeGlslRef.current = glsl;
    onError(null);
  }, [glsl, onError]);

  return <div ref={mountRef} className="fixed inset-0 z-0" />;
}
