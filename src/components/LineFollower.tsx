"use client";
import { useEffect, useRef, useState } from "react";
import { W, H, LINE_W, SENSOR_X, AHEAD, makeTrack, newRobot, step, type Params } from "@/lib/linefollow";

const FIELDS = [
  { k: "kp", label: "Kp: steer harder", min: 0, max: 12, step: 0.1 },
  { k: "ki", label: "Ki: remove drift", min: 0, max: 2, step: 0.05 },
  { k: "kd", label: "Kd: damp the wobble", min: 0, max: 4, step: 0.1 },
  { k: "speed", label: "Speed", min: 60, max: 260, step: 5 },
] as const;

export default function LineFollower() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState<Params>({ kp: 3, ki: 0, kd: 1, speed: 110 });
  const [run, setRun] = useState(true);
  const [info, setInfo] = useState({ laps: 0, lap: 0, best: 0, msg: "" });
  const live = useRef({ p, run, reset: false });
  live.current.p = p; live.current.run = run;

  useEffect(() => {
    const canvas = cv.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRun(false);
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const track = makeTrack();
    let robot = newRobot(track), msg = "", msgAt = 0, last = 0, raf = 0, visible = true, shown = 0;
    const trail: { x: number; y: number }[] = [], err: number[] = [];

    const frame = (now: number) => {
      const L = live.current, dtF = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      if (L.reset) { robot = newRobot(track); trail.length = 0; err.length = 0; L.reset = false; msg = ""; }
      if (L.run) {
        const n = Math.ceil(dtF * 120);
        for (let i = 0; i < n; i++) step(robot, L.p, track, dtF / n);
        trail.push({ x: robot.x, y: robot.y }); if (trail.length > 140) trail.shift();
        err.push(robot.e); if (err.length > 300) err.shift();
      }
      if (robot.lost > 1.2) { const best = robot.best; robot = newRobot(track); robot.best = best; trail.length = 0; msg = "Lost the line. Try more Kp or less speed."; msgAt = now; }
      if (msg && now - msgAt > 4000) msg = "";

      const cs = getComputedStyle(canvas), col = (n: string) => cs.getPropertyValue(n).trim() || "#201E2D";
      const text = col("--text"), violet = col("--violet"), lilac = col("--lilac"), blue = col("--blue"), paper = col("--paper"), accent = col("--accent-strong");
      ctx.clearRect(0, 0, W, H); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = text; ctx.lineWidth = LINE_W; ctx.beginPath();
      track.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = lilac; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.beginPath();
      trail.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(robot.x, robot.y); ctx.rotate(robot.phi);
      ctx.fillStyle = text; ctx.fillRect(-9, -18, 18, 6); ctx.fillRect(-9, 12, 18, 6);
      ctx.fillStyle = violet; ctx.strokeStyle = text; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-16, -12, 32, 24, 5); ctx.fill(); ctx.stroke();
      SENSOR_X.forEach((sx, i) => { ctx.fillStyle = robot.s[i] > 0.3 ? blue : paper; ctx.beginPath(); ctx.arc(AHEAD, sx, 3.2, 0, 7); ctx.fill(); ctx.stroke(); });
      ctx.restore();
      ctx.strokeStyle = text; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 284); ctx.lineTo(W, 284); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = text; ctx.globalAlpha = 0.6; ctx.font = "700 10px sans-serif"; ctx.textAlign = "left"; ctx.fillText("SENSOR ERROR", 8, 297); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      err.forEach((v, i) => { const x = (i / 300) * W, y = 312 - Math.max(-2.5, Math.min(2.5, v)) * 10; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
      if (now - shown > 100) { shown = now; setInfo({ laps: robot.laps, lap: robot.lapT, best: robot.best, msg }); }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
    io.observe(canvas); raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div className="win">
      <div className="tab"><span>LINE FOLLOWER</span><span>PID SIM</span></div>
      <div className="body">
        <canvas ref={cv} className="lf" role="img" aria-label="A simulated line-following robot driving around a track, with a live graph of its sensor error." />
        <dl className="readout" aria-live="off">
          <div><dt>Laps</dt><dd>{info.laps}</dd></div>
          <div><dt>This lap</dt><dd>{info.lap.toFixed(1)} s</dd></div>
          <div><dt>Best</dt><dd>{info.best ? `${info.best.toFixed(1)} s` : "none yet"}</dd></div>
        </dl>
        <p role="status" className="muted">{info.msg || "Tune the gains and beat your best lap."}</p>
        <div className="sliders">
          {FIELDS.map((f) => (
            <label key={f.k}>
              <span>{f.label} <output>{p[f.k]}</output></span>
              <input type="range" min={f.min} max={f.max} step={f.step} value={p[f.k]} onChange={(e) => setP({ ...p, [f.k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <p className="muted">Try Kp 10 with Kd 0 and watch it wobble. Then raise Kd to damp it. The motors have lag, like real ones, which is why too much gain oscillates.</p>
        <div className="cta">
          <button type="button" className="btn" aria-pressed={run} onClick={() => setRun(!run)}>{run ? "Pause" : "Run"}</button>
          <button type="button" className="btn alt" onClick={() => { live.current.reset = true; setRun(true); }}>Restart</button>
        </div>
      </div>
    </div>
  );
}
