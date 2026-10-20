// How active the visitor is on the page (scroll plus pointer), 0 to 1. It decays back to rest.
let level = 0, lastY = 0, lastT = 0, lastDecay = 0, started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  lastY = scrollY; lastT = lastDecay = performance.now();
  addEventListener("scroll", () => {
    const t = performance.now(), sp = Math.abs(scrollY - lastY) / Math.max(1, t - lastT);
    lastY = scrollY; lastT = t; level = Math.min(1, level + Math.min(0.08, sp * 0.02));
  }, { passive: true });
  addEventListener("pointermove", (e) => { level = Math.min(1, level + Math.min(0.03, (Math.abs(e.movementX) + Math.abs(e.movementY)) * 0.0006)); }, { passive: true });
}

export function bpmNow() {
  start();
  const now = performance.now();
  level *= Math.exp(-(now - lastDecay) / 2500);
  lastDecay = now;
  return 72 + 70 * level;
}
