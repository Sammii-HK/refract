export function createResourceScope() {
  const releases = new Set<() => void>();
  let disposed = false;
  return {
    own(resource: { dispose: () => void }) {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        releases.delete(release);
        resource.dispose();
      };
      if (disposed) release();
      else releases.add(release);
      return release;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const release of [...releases].reverse()) {
        try {
          release();
        } catch {
          /* One failed disposer must not retain other owned resources. */
        }
      }
    },
    size() {
      return releases.size;
    },
  };
}
export function previewSize(width: number, height: number, dpr: number) {
  const pixelRatio = Math.min(1.5, Math.max(1, Number.isFinite(dpr) ? dpr : 1));
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
    pixelRatio,
  };
}
export interface FrameRuntime {
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
  draw: (elapsed: number) => void;
}
/** One owned animation frame at most; hidden/paused views consume no frames. */
export function createPreviewLoop(runtime: FrameRuntime) {
  let frame: number | null = null,
    running = false,
    visible = true,
    disposed = false,
    last: number | null = null,
    lastDraw: number | null = null,
    elapsed = 0;
  const cancel = () => {
    if (frame !== null) runtime.cancel(frame);
    frame = null;
    last = null;
    lastDraw = null;
  };
  function tick(now: number) {
    frame = null;
    if (disposed || !running || !visible) return;
    if (last !== null)
      elapsed += Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (lastDraw === null || now - lastDraw >= 1000 / 30) {
      lastDraw = now;
      runtime.draw(elapsed);
    }
    frame = runtime.request(tick);
  }
  const schedule = () => {
    if (!disposed && running && visible && frame === null)
      frame = runtime.request(tick);
  };
  return {
    setRunning(value: boolean) {
      running = value;
      if (value) schedule();
      else cancel();
    },
    setVisible(value: boolean) {
      visible = value;
      if (value) schedule();
      else cancel();
    },
    elapsed: () => elapsed,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
