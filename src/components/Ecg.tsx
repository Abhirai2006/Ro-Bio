"use client";
import { useEffect, useRef, useState } from "react";
import { ecgAt } from "@/lib/ecg";
import { bpmNow } from "@/lib/activity";

// A sweep-style ECG monitor. The heart rate follows how active the visitor is on the page.
export default function Ecg({ compact = false }: { compact?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    const canvas = cv.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = compact ? 132 : 560, H = compact ? 32 : 200, WIN = compact ? 3 : 4;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GAP = reduced ? 0 : compact ? 8 : 24;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const trace = new Float32Array(W).fill(NaN), beats: number[] = [];
    let t = 0, head = 0, last = 0, raf = 0, visible = true, hover = false, shownAt = 0, rr = 60 / 72;
    const mid = H * (compact ? 0.62 : 0.66), amp = H * (compact ? 0.5 : 0.52);

    const draw = () => {
      const cs = getComputedStyle(canvas), col = (n: string) => cs.getPropertyValue(n).trim() || "#725DFF";
      ctx.clearRect(0, 0, W, H);
      if (!compact) {
        ctx.strokeStyle = col("--blue");
        for (let x = 0; x <= W; x += 8) { ctx.globalAlpha = x % 40 ? 0.1 : 0.24; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 8) { ctx.globalAlpha = y % 40 ? 0.1 : 0.24; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = col("--accent-strong"); ctx.lineWidth = compact ? 1.5 : 2; ctx.lineJoin = "round"; ctx.beginPath();
      let pen = false;
      for (let x = 0; x < W; x++) {
        const v = trace[x];
        if (((x - head + W) % W) < GAP || Number.isNaN(v)) { pen = false; continue; }
        if (pen) ctx.lineTo(x, mid - v * amp); else { ctx.moveTo(x, mid - v * amp); pen = true; }
      }
      ctx.stroke();
      if (GAP) { ctx.fillStyle = col("--text"); ctx.beginPath(); ctx.arc(head, mid - (trace[(head + W - 1) % W] || 0) * amp, compact ? 2 : 3, 0, 7); ctx.fill(); }
      if (hover && !compact) {
        const tR = [...beats].reverse().find((b) => b <= t - 0.45);
        if (tR !== undefined) {
          const ps = W / WIN, k = Math.sqrt(rr / 0.833), xR = head - (t - tR) * ps;
          if (xR - 40 > 0 && xR + 0.3 * k * ps + 20 < W) {
            ctx.fillStyle = col("--text"); ctx.font = "700 13px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("P", xR - 0.17 * k * ps, mid - 0.14 * amp - 10); ctx.fillText("QRS", xR, mid - amp - 6); ctx.fillText("T", xR + 0.3 * k * ps, mid - 0.32 * amp - 10);
          }
        }
      }
    };

    if (reduced) { // one still frame: a clean strip at 72 beats a minute
      for (let b = 0.4; b < WIN + 1; b += rr) beats.push(b);
      for (let x = 0; x < W; x++) trace[x] = ecgAt((x / W) * WIN, beats, rr);
      draw(); return;
    }
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      const bp = bpmNow(); rr = 60 / bp; t += dt;
      while ((beats[beats.length - 1] ?? -1) < t + 0.9) { const p = beats[beats.length - 1] ?? 0.3; beats.push(p + rr * (1 + 0.03 * Math.sin(p * 1.6))); }
      while (beats.length && beats[0] < t - 6) beats.shift();
      const nh = Math.floor(((t % WIN) / WIN) * W);
      for (let x = head; x !== nh; x = (x + 1) % W) trace[x] = ecgAt(t - (((nh - x + W) % W) / W) * WIN, beats, rr);
      head = nh; draw();
      if (now - shownAt > 200) { shownAt = now; setBpm(Math.round(bp)); }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
    io.observe(canvas); raf = requestAnimationFrame(frame);
    const on = () => { hover = true; }, off = () => { hover = false; };
    canvas.addEventListener("pointerenter", on); canvas.addEventListener("pointerleave", off);
    return () => { cancelAnimationFrame(raf); io.disconnect(); canvas.removeEventListener("pointerenter", on); canvas.removeEventListener("pointerleave", off); };
  }, [compact]);

  if (compact) {
    return (
      <span className="ecg-mini" role="img" aria-label={`Live heartbeat monitor, ${bpm} beats per minute`}>
        <canvas ref={cv} /><span className="ecg-bpm" aria-hidden="true">{bpm}</span>
      </span>
    );
  }
  return (
    <div className="win ecg-full">
      <div className="tab"><span>LEAD II</span><span>{bpm} BPM</span></div>
      <div className="body">
        <canvas ref={cv} role="img" aria-label={`A live ECG trace at ${bpm} beats per minute.`} />
        <p className="muted">Scroll or move around the page and watch the heart rate respond. Hover the trace to label the waves. P: the atria contract. QRS: the ventricles fire. T: the ventricles reset. At higher rates the gap between QRS and T shortens, as it does in a real heart.</p>
      </div>
    </div>
  );
}
