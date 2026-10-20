"use client";
import { useEffect, useRef, useState } from "react";
import { solveIK } from "@/lib/ik";

const W = 560, H = 420, BX = 280, BY = 356, TABLE = 372, L1 = 150, L2 = 130;
const TRAY = { x1: 408, x2: 504 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const deg = (r: number) => Math.round((r * 180) / Math.PI);

export default function RobotArm() {
  const cv = useRef<HTMLCanvasElement>(null);
  const ctl = useRef({ grip: (_v: boolean) => {}, flip: () => {}, reset: () => {} });
  const [grip, setGrip] = useState(false);
  const [info, setInfo] = useState({ t1: 0, t2: 0, x: 0, y: 0, score: 0, out: false });

  useEffect(() => {
    const canvas = cv.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const s = { tx: BX + 120, ty: BY - 140, t1: 1.2, t2: -1.4, elbow: 1 as 1 | -1, grip: false, vx: 110, vy: TABLE - 15, vv: 0, held: false, score: 0, wait: 0, last: -1e9, out: false };
    let raf = 0, visible = true, lastInfo = 0;

    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      s.tx = Math.max(0, Math.min(W, (e.clientX - r.left) * (W / r.width)));
      s.ty = Math.min((e.clientY - r.top) * (H / r.height), BY - 6);
      s.last = performance.now();
    };
    const setG = (v: boolean) => { s.grip = v; setGrip(v); };
    ctl.current = { grip: setG, flip: () => { s.elbow = (s.elbow * -1) as 1 | -1; }, reset: () => { s.vx = 110; s.vy = TABLE - 15; s.held = false; s.vv = 0; } };
    const down = (e: PointerEvent) => { aim(e); if (e.pointerType !== "touch") setG(true); };
    const up = (e: PointerEvent) => { if (e.pointerType !== "touch") setG(false); };
    const key = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] };
      if (m[e.key]) { e.preventDefault(); s.tx = Math.max(0, Math.min(W, s.tx + m[e.key][0])); s.ty = Math.min(s.ty + m[e.key][1], BY - 6); s.last = performance.now(); }
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setG(!s.grip); }
    };
    canvas.addEventListener("pointermove", aim); canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointerleave", up); canvas.addEventListener("keydown", key);

    const frame = (now: number) => {
      if (!reduced && now - s.last > 3000) { s.tx = BX + 20 + Math.cos(now / 1800) * 150; s.ty = BY - 120 - Math.sin(now / 1300) * 70; }
      const p = solveIK(s.tx - BX, BY - s.ty, L1, L2, s.elbow);
      s.out = !p.reachable;
      const move = (cur: number, to: number) => (reduced ? to : cur + Math.max(-0.08, Math.min(0.08, wrap(to - cur) * 0.2)));
      s.t1 = move(s.t1, p.t1); s.t2 = move(s.t2, p.t2);
      const ex1 = BX + L1 * Math.cos(s.t1), ey1 = BY - L1 * Math.sin(s.t1);
      const ex = ex1 + L2 * Math.cos(s.t1 + s.t2), ey = ey1 - L2 * Math.sin(s.t1 + s.t2);

      if (s.grip && !s.held && s.wait === 0 && Math.hypot(ex - s.vx, ey - s.vy) < 28) s.held = true;
      if (!s.grip && s.held) { s.held = false; s.vv = 0; }
      if (s.held) { s.vx = ex; s.vy = ey + 10; } else {
        s.vv += 0.6; s.vy = Math.min(s.vy + s.vv, TABLE - 15);
        if (s.vy >= TABLE - 15) s.vv = 0;
        if (s.vy >= TABLE - 15 && s.wait === 0 && s.vx > TRAY.x1 && s.vx < TRAY.x2) { s.score++; s.wait = 45; }
      }
      if (s.wait > 0 && --s.wait === 0) { s.vx = 70 + Math.random() * 150; s.vy = TABLE - 15; }

      const cs = getComputedStyle(canvas), col = (n: string) => cs.getPropertyValue(n).trim() || "#201E2D";
      const text = col("--text"), violet = col("--violet"), lilac = col("--lilac"), blue = col("--blue"), paper = col("--paper");
      ctx.clearRect(0, 0, W, H); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = text; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(BX, BY, L1 + L2, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, TABLE); ctx.lineTo(W - 20, TABLE); ctx.stroke();
      ctx.fillStyle = lilac; ctx.globalAlpha = 0.4; ctx.fillRect(TRAY.x1, TABLE - 34, TRAY.x2 - TRAY.x1, 32); ctx.globalAlpha = 1;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(TRAY.x1, TABLE - 34); ctx.lineTo(TRAY.x1, TABLE - 2); ctx.lineTo(TRAY.x2, TABLE - 2); ctx.lineTo(TRAY.x2, TABLE - 34); ctx.stroke();
      ctx.fillStyle = text; ctx.font = "700 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText("DROP ZONE", (TRAY.x1 + TRAY.x2) / 2, TABLE + 18);
      ctx.fillRect(BX - 30, BY + 2, 60, TABLE - BY - 2);
      const link = (x1: number, y1: number, x2: number, y2: number, c: string) => {
        ctx.strokeStyle = text; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      link(BX, BY, ex1, ey1, violet); link(ex1, ey1, ex, ey, blue);
      for (const [jx, jy] of [[BX, BY], [ex1, ey1]]) { ctx.fillStyle = paper; ctx.strokeStyle = text; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(jx, jy, 9, 0, 7); ctx.fill(); ctx.stroke(); }
      const phi = s.t1 + s.t2, ux = Math.cos(phi), uy = -Math.sin(phi), gap = s.held ? 7 : 13;
      ctx.strokeStyle = text; ctx.lineWidth = 4;
      for (const sg of [-1, 1]) { const ox = ex - uy * gap * sg, oy = ey + ux * gap * sg; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + ux * 14, oy + uy * 14); ctx.stroke(); }
      ctx.fillStyle = lilac; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(s.vx - 9, s.vy - 15, 18, 30, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = blue; ctx.fillRect(s.vx - 6, s.vy + 1, 12, 11);
      ctx.strokeStyle = violet; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.tx, s.ty, 8, 0, 7); ctx.moveTo(s.tx - 13, s.ty); ctx.lineTo(s.tx + 13, s.ty); ctx.moveTo(s.tx, s.ty - 13); ctx.lineTo(s.tx, s.ty + 13); ctx.stroke();

      if (now - lastInfo > 100) { lastInfo = now; setInfo({ t1: deg(s.t1), t2: deg(s.t2), x: Math.round(s.tx - BX), y: Math.round(BY - s.ty), score: s.score, out: s.out }); }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); });
    io.observe(canvas); raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); canvas.removeEventListener("pointermove", aim); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointerleave", up); canvas.removeEventListener("keydown", key); };
  }, []);

  return (
    <div className="win arm">
      <div className="tab"><span>TRY IT</span><span>2-LINK ARM</span></div>
      <div className="body">
        <canvas ref={cv} tabIndex={0} role="application" aria-label="A toy robot arm. Move the pointer or use the arrow keys to aim. Press space to grip or release the vial. Drop it in the tray." />
        <dl className="readout" aria-label="Live joint values">
          <div><dt>θ1</dt><dd>{info.t1}°</dd></div><div><dt>θ2</dt><dd>{info.t2}°</dd></div>
          <div><dt>X</dt><dd>{info.x}</dd></div><div><dt>Y</dt><dd>{info.y}</dd></div>
          <div><dt>Dropped</dt><dd>{info.score}</dd></div>
        </dl>
        <p className="muted">{info.out ? "Out of reach, so it stretches as far as it can." : "Aim, press near the vial to grip, release over the tray."} The arm solves both joint angles live with inverse kinematics.</p>
        <div className="cta">
          <button type="button" className="btn" aria-pressed={grip} onClick={() => ctl.current.grip(!grip)}>{grip ? "Release" : "Grip"}</button>
          <button type="button" className="btn alt" onClick={() => ctl.current.flip()}>Flip elbow</button>
          <button type="button" className="btn alt" onClick={() => ctl.current.reset()}>Reset vial</button>
        </div>
      </div>
    </div>
  );
}
