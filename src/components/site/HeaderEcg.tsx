import { useEffect, useRef } from "react";
import { beatShape } from "@/lib/ecg";
import { bpmNow } from "@/lib/heart";

const N = 120;

/** A small live ECG that sits in the header, so the heartbeat is always on screen. */
export function HeaderEcg() {
  const path = useRef<SVGPathElement>(null);
  const num = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buf = new Float32Array(N);
    let p = 0, rr = 60 / 72, acc = 0, last = 0, raf = 0, shown = 0;
    const draw = () => {
      let d = "";
      for (let i = 0; i < N; i++) d += `${i ? "L" : "M"}${i} ${(26 - buf[i]! * 22).toFixed(1)}`;
      path.current?.setAttribute("d", d);
    };
    const sample = () => beatShape(p, rr) + beatShape(p - rr, rr);
    if (reduced) {
      for (let i = 0; i < N; i++) { p = (i / 60) % rr; buf[i] = sample(); }
      draw(); return;
    }
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
      const bpm = bpmNow(); rr = 60 / bpm; acc += dt;
      while (acc >= 1 / 60) { acc -= 1 / 60; p += 1 / 60; if (p >= rr) p -= rr; buf.copyWithin(0, 1); buf[N - 1] = sample(); }
      draw();
      if (now - shown > 200 && num.current) { shown = now; num.current.textContent = String(Math.round(bpm)); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div data-thought="That is a live heartbeat. Scroll fast and it races." role="img" aria-label="Live heartbeat monitor. It speeds up when you scroll or move around." className="flex items-center gap-2 border-2 border-border bg-ink px-2 py-1 text-paper">
      <svg viewBox="0 0 120 36" className="h-7 w-16 sm:w-24" preserveAspectRatio="none" aria-hidden="true">
        <path ref={path} fill="none" stroke="var(--lens)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span aria-hidden="true" className="font-mono text-xs leading-none">
        <span className="text-lilac">♥</span> <b ref={num} className="text-sm text-lens">72</b>
        <span className="hidden text-paper/60 md:inline"> BPM</span>
      </span>
    </div>
  );
}
