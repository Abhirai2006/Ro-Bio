import { useCallback, useEffect, useRef, useState } from "react";
import { HULL, RING, SENSORS, SUDDEN_DEATH, controlFromInput, makeMatch, step, type Bot, type Match, type Tactic } from "@/lib/sumo";

const KEYS: Record<string, string> = { arrowup: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", a: "l", arrowright: "r", d: "r" };
const BRAIN: Record<Tactic, string> = {
  ENGAGE: "Charging at you", FLANK: "Circling to get behind you", SIDESTEP: "Dodging your charge",
  SURGE: "Ramming", BACKOFF: "Backing off to reset its wheels", RECOVER: "Edge sensor tripped, backing away",
};
const pts = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(" ");
const FRONT = [{ x: 13, y: -13 }, { x: 24, y: -5 }, { x: 24, y: 5 }, { x: 13, y: 13 }];

type Hud = { phase: "idle" | "count" | "fight" | "over"; msg: string; you: number; cpu: number; tactic: Tactic; fadeP: number; fadeC: number; sudden: boolean };
type Els<T> = React.MutableRefObject<(T | null)[]>;

function Robot({ fill, accent, g, sensors, treads }: { fill: string; accent: string; g: React.Ref<SVGGElement>; sensors: Els<SVGCircleElement>; treads: Els<SVGLineElement> }) {
  return (
    <g ref={g}>
      <polygon points={pts(HULL.map((p) => ({ x: p.x + 2, y: p.y + 3 })))} fill="rgba(0,0,0,0.35)" />
      {[-1, 1].map((s, i) => (
        <g key={s}>
          <rect x={-14} y={s < 0 ? -19 : 13} width={20} height={6} rx={1.5} fill="#15131c" />
          <line ref={(el) => { treads.current[i] = el; }} x1={-12} x2={4} y1={s < 0 ? -16 : 16} y2={s < 0 ? -16 : 16} stroke="#6b6880" strokeWidth={4} strokeDasharray="2 3" />
        </g>
      ))}
      <polygon points={pts(HULL)} fill={fill} stroke="#15131c" strokeWidth={1.6} strokeLinejoin="round" />
      <polygon points={pts(FRONT)} fill="#d9d6e6" stroke="#15131c" strokeWidth={1.2} />
      <line x1={15} y1={-8} x2={15} y2={8} stroke="#8d89a3" strokeWidth={1} />
      <rect x={-12} y={-8} width={16} height={16} rx={2} fill={accent} stroke="#15131c" strokeWidth={1} />
      <circle cx={-4} cy={0} r={2.2} fill="#15131c" />
      {[-1, 1].map((s) => <circle key={s} cx={6} cy={s * 9} r={1.1} fill="#15131c" />)}
      {SENSORS.map((p, i) => (
        <circle key={i} ref={(el) => { sensors.current[i] = el; }} cx={p.x} cy={p.y} r={2.1} fill="#1b1a24" stroke="#d9d6e6" strokeWidth={0.8} />
      ))}
    </g>
  );
}

export function SumoGame() {
  const box = useRef<HTMLDivElement>(null);
  const shakeEl = useRef<HTMLDivElement>(null);
  const pG = useRef<SVGGElement>(null), cG = useRef<SVGGElement>(null);
  const outer = useRef<SVGCircleElement>(null), inner = useRef<SVGCircleElement>(null);
  const pSens = useRef<(SVGCircleElement | null)[]>([]), cSens = useRef<(SVGCircleElement | null)[]>([]);
  const pTread = useRef<(SVGLineElement | null)[]>([]), cTread = useRef<(SVGLineElement | null)[]>([]);
  const spark = useRef<(SVGCircleElement | null)[]>([]);
  const engine = useRef({ m: makeMatch(1), phase: "idle" as Hud["phase"], cd: 0, keys: new Set<string>(), score: { you: 0, cpu: 0 }, haptics: true });
  const [hud, setHud] = useState<Hud>({ phase: "idle", msg: "Press START. Arrow keys or WASD drive. Press the opposite way to reverse.", you: 0, cpu: 0, tactic: "ENGAGE", fadeP: 0, fadeC: 0, sudden: false });
  const [haptics, setHaptics] = useState(true);
  const [canVibrate, setCanVibrate] = useState(false);

  useEffect(() => { setCanVibrate(typeof navigator !== "undefined" && "vibrate" in navigator); }, []);
  useEffect(() => { engine.current.haptics = haptics; }, [haptics]);

  const begin = useCallback(() => {
    const e = engine.current;
    e.m = makeMatch((Date.now() & 0xffffff) | 1);
    e.phase = "count"; e.cd = 2.4;
    setHud((h) => ({ ...h, phase: "count", msg: "Get ready...", sudden: false }));
    box.current?.focus();
  }, []);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const e = engine.current;
    const buzz = (p: number | number[]) => { if (e.haptics && "vibrate" in navigator) navigator.vibrate(p); };
    const down = (ev: KeyboardEvent) => { const k = KEYS[ev.key.toLowerCase()]; if (k && (e.phase === "count" || e.phase === "fight")) { ev.preventDefault(); e.keys.add(k); } };
    const up = (ev: KeyboardEvent) => { const k = KEYS[ev.key.toLowerCase()]; if (k) e.keys.delete(k); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);

    const sparks = Array.from({ length: 16 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
    let raf = 0, last = 0, acc = 0, hudAt = 0, lastBuzz = 0, lastRumble = 0, shake = 0, stop = 0, treadP = 0, treadC = 0, visible = true;

    const place = (g: SVGGElement | null, b: Bot) => g?.setAttribute("transform", `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) rotate(${((b.h * 180) / Math.PI).toFixed(2)})`);
    const light = (els: (SVGCircleElement | null)[], on: boolean[]) => els.forEach((el, i) => { if (el) el.style.fill = on[i] ? "var(--lens)" : "#1b1a24"; });

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      const m: Match = e.m;
      if (e.phase === "count") {
        e.cd -= dt;
        if (e.cd <= 0) { e.phase = "fight"; setHud((h) => ({ ...h, phase: "fight", msg: "FIGHT! Get on the centre side of it and push it out." })); }
        else if (now - hudAt > 100) setHud((h) => ({ ...h, msg: e.cd > 1.6 ? "3" : e.cd > 0.8 ? "2" : "1" }));
      }
      if (e.phase === "fight") {
        if (stop > 0) stop--; else {
          acc += dt;
          const ix = (e.keys.has("r") ? 1 : 0) - (e.keys.has("l") ? 1 : 0), iy = (e.keys.has("d") ? 1 : 0) - (e.keys.has("u") ? 1 : 0);
          while (acc >= 1 / 120) { step(m, controlFromInput(m.bots[0], ix, iy), 1 / 120); acc -= 1 / 120; if (m.over) break; }
          if (m.hit > 0.4) {
            const s = Math.min(1, m.hit / 9);
            if (!reduced) { shake = Math.max(shake, s); if (m.hit > 6) stop = 2; }
            if (now - lastBuzz > 90) { buzz(Math.round(12 + s * 34)); lastBuzz = now; }
            if (m.contactPoint && !reduced) for (let i = 0; i < 2 + Math.round(s * 5); i++) { const q = sparks.find((p) => p.life <= 0); if (q) { const a = Math.random() * 6.283, v = 40 + Math.random() * 90 * (0.4 + s); q.x = m.contactPoint.x; q.y = m.contactPoint.y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.life = 0.35 + Math.random() * 0.25; } }
            m.hit = 0;
          }
          if (m.rumble > 0.3 && now - lastRumble > 120) { buzz(Math.round(8 + m.rumble * 22)); lastRumble = now; }
          if (m.over) {
            e.phase = "over";
            const won = m.winner === "you";
            if (won) e.score.you++; else e.score.cpu++;
            buzz(won ? [30, 40, 30, 40, 90] : [90, 40, 130]);
            const why = m.over === "time" ? "Time. " : "";
            setHud((h) => ({ ...h, phase: "over", you: e.score.you, cpu: e.score.cpu, msg: won ? `${why}You pushed it out. Nice.` : `${why}It pushed you out. Try getting behind it, and back off when your grip bar drops.` }));
          }
        }
      }

      const [P, C] = m.bots;
      place(pG.current, P); place(cG.current, C);
      treadP += (P.vx * Math.cos(P.h) + P.vy * Math.sin(P.h)) * dt; treadC += (C.vx * Math.cos(C.h) + C.vy * Math.sin(C.h)) * dt;
      pTread.current.forEach((el) => el && (el.style.strokeDashoffset = String(-treadP))); cTread.current.forEach((el) => el && (el.style.strokeDashoffset = String(-treadC)));
      light(pSens.current, P.sensors); light(cSens.current, C.sensors);
      outer.current?.setAttribute("r", String(m.ringR + 8)); inner.current?.setAttribute("r", String(m.ringR));
      sparks.forEach((q, i) => {
        const el = spark.current[i]; if (!el) return;
        if (q.life > 0) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; el.setAttribute("cx", q.x.toFixed(1)); el.setAttribute("cy", q.y.toFixed(1)); el.style.opacity = String(Math.max(0, q.life * 3)); } else el.style.opacity = "0";
      });
      shake *= 0.88;
      const s = reduced ? 0 : Math.max(shake, m.rumble * 0.3);
      if (shakeEl.current) shakeEl.current.style.transform = s > 0.01 ? `translate(${((Math.random() - 0.5) * 9 * s).toFixed(1)}px, ${((Math.random() - 0.5) * 9 * s).toFixed(1)}px)` : "";

      if (now - hudAt > 100) {
        hudAt = now;
        setHud((h) => (h.tactic === m.brain.tactic && Math.abs(h.fadeP - P.fade) < 0.02 && Math.abs(h.fadeC - C.fade) < 0.02 && h.sudden === (m.t > SUDDEN_DEATH.after) ? h : { ...h, tactic: m.brain.tactic, fadeP: P.fade, fadeC: C.fade, sudden: m.t > SUDDEN_DEATH.after }));
      }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
    if (box.current) io.observe(box.current);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const pad = (k: string, label: string, cls: string) => (
    <button
      type="button"
      aria-label={`Drive ${label}`}
      className={`flex h-12 w-12 touch-none select-none items-center justify-center border-2 border-border bg-card text-xl font-bold shadow-hard active:translate-x-0.5 active:translate-y-0.5 ${cls}`}
      onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); engine.current.keys.add(k); }}
      onPointerUp={() => engine.current.keys.delete(k)}
      onPointerCancel={() => engine.current.keys.delete(k)}
    >
      {label}
    </button>
  );
  const busy = hud.phase === "count" || hud.phase === "fight";
  const bar = (v: number, c: string) => (
    <div className="h-2 w-full overflow-hidden border border-border bg-muted" aria-hidden="true"><div className={`h-full ${c}`} style={{ width: `${Math.round((1 - v / 0.55) * 100)}%`, transition: "width 120ms linear" }} /></div>
  );

  return (
    <div ref={box} data-robo-avoid tabIndex={-1} className="grid gap-6 border-2 border-border bg-card p-4 shadow-hard outline-none md:grid-cols-[1fr_1fr] md:p-6">
      <div ref={shakeEl} className="bg-ink p-2">
        <svg viewBox="0 0 320 320" className="block w-full" role="img" aria-label="Robo Sumo ring seen from above, with two wedge-nosed robots pushing each other">
          <circle ref={outer} cx={RING.cx} cy={RING.cy} r={RING.radius + 8} className="fill-paper" />
          <circle ref={inner} cx={RING.cx} cy={RING.cy} r={RING.radius} className="fill-ink" />
          <line x1={140} y1={130} x2={140} y2={190} className="stroke-paper/40" strokeWidth="3" />
          <line x1={180} y1={130} x2={180} y2={190} className="stroke-paper/40" strokeWidth="3" />
          <Robot g={pG} fill="var(--violet)" accent="var(--lilac)" sensors={pSens} treads={pTread} />
          <Robot g={cG} fill="var(--lens)" accent="#d9d6e6" sensors={cSens} treads={cTread} />
          {Array.from({ length: 16 }, (_, i) => <circle key={i} ref={(el) => { spark.current[i] = el; }} r={1.6} fill="#ffd36b" style={{ opacity: 0 }} />)}
        </svg>
      </div>
      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="font-pixel text-[11px] text-primary">BOT FORGE PREVIEW / ROBO SUMO</p>
          <h3 className="mt-2 text-3xl font-black">Push it out of the ring.</h3>
          <p role="status" className="mt-2 min-h-[3rem] text-muted-foreground">{hud.msg}</p>
          <p className="mt-3 font-mono text-lg">YOU {hud.you} : {hud.cpu} CPU</p>
          <div className="mt-3 grid gap-2 font-mono text-xs">
            <div><div className="mb-1 flex justify-between"><span>YOUR WHEEL GRIP</span></div>{bar(hud.fadeP, "bg-primary")}</div>
            <div><div className="mb-1 flex justify-between"><span>CPU WHEEL GRIP</span></div>{bar(hud.fadeC, "bg-lens")}</div>
            <p className="text-muted-foreground">CPU brain: <span className="text-foreground">{BRAIN[hud.tactic]}</span></p>
            {hud.sudden && <p className="font-bold text-primary">SUDDEN DEATH: the ring is shrinking.</p>}
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={begin} disabled={busy} className="border-2 border-border bg-primary px-6 py-3 font-bold text-primary-foreground shadow-hard disabled:opacity-50">
              {hud.phase === "idle" ? "START" : busy ? "FIGHTING..." : "NEXT ROUND"}
            </button>
            {canVibrate && (
              <button type="button" aria-pressed={haptics} onClick={() => setHaptics(!haptics)} className="border-2 border-border bg-card px-3 py-1 text-xs font-bold">
                Vibration: {haptics ? "on" : "off"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1" aria-label="Touch controls">
            {pad("u", "↑", "col-start-2")}
            {pad("l", "←", "col-start-1 row-start-2")}
            {pad("d", "↓", "col-start-2 row-start-2")}
            {pad("r", "→", "col-start-3 row-start-2")}
          </div>
        </div>
      </div>
    </div>
  );
}
