const defaultFrameMs = 1000 / 60;
const maxCatchUpMs = 48;
const gameplaySpeed = 1.2;
const iosSafariFrameIntervalMs = 1000 / 30;

export function isIosSafariBrowser(userAgent: string, maxTouchPoints = 0): boolean {
  const iosDevice = /iPad|iPhone|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  return iosDevice
    && /WebKit/i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

export function arcadeFrameIntervalMs(userAgent = "", maxTouchPoints = 0): number {
  return isIosSafariBrowser(userAgent, maxTouchPoints) ? iosSafariFrameIntervalMs : 0;
}

export function frameScaleForTick(now: number, previousFrameAt: number, simulationStepMs: number): number {
  const rawDelta = previousFrameAt > 0 ? now - previousFrameAt : defaultFrameMs;
  const safeDelta = Math.min(maxCatchUpMs, Math.max(8, Number.isFinite(rawDelta) ? rawDelta : defaultFrameMs));
  return (safeDelta / Math.max(1, simulationStepMs)) * gameplaySpeed;
}

export function startArcadeFrameLoop(tick: () => void): () => void {
  let active = true;
  let frameId = 0;
  let lastTickAt = 0;
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints;
  const minimumInterval = arcadeFrameIntervalMs(userAgent, maxTouchPoints);
  const frame = (timestamp: number) => {
    if (!active) return;
    const pageVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    if (pageVisible && (!lastTickAt || timestamp - lastTickAt >= minimumInterval)) {
      lastTickAt = timestamp;
      tick();
    }
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  return () => {
    active = false;
    cancelAnimationFrame(frameId);
  };
}
