import { useEffect, useRef, useState } from "react";

/** Small robot head in the corner whose eyes and head follow the cursor. */
export function RobotFace() {
  const ref = useRef<HTMLButtonElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [happy, setHappy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 300);
      setLook({ x: (dx / d) * k, y: (dy / d) * k });
    };
    window.addEventListener("pointermove", onMove);
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(id);
    };
  }, []);

  if (hidden) return null;
  const ex = look.x * 5;
  const ey = look.y * 4;
  return (
    <div className="fixed bottom-4 right-4 z-50 hidden sm:block">
      <button
        ref={ref}
        type="button"
        onClick={() => {
          setHappy(true);
          window.setTimeout(() => setHappy(false), 1200);
        }}
        aria-label="RO-BIO robot buddy. Click to say hi."
        className="block h-20 w-20 transition-transform hover:scale-105"
        style={{ transform: `rotate(${look.x * 8}deg)` }}
      >
        <svg viewBox="0 0 80 80" className="h-full w-full drop-shadow">
          <line x1="40" y1="12" x2="40" y2="4" className="stroke-ink" strokeWidth="3" />
          <circle cx="40" cy="4" r="3.5" className={happy ? "fill-lens" : "fill-lilac"} />
          <rect x="8" y="12" width="64" height="56" rx="18" className="fill-lilac stroke-ink" strokeWidth="3" />
          <rect x="15" y="22" width="50" height="32" rx="12" className="fill-ink" />
          {happy ? (
            <g className="stroke-lens" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M24 40 q6 -8 12 0" />
              <path d="M44 40 q6 -8 12 0" />
            </g>
          ) : (
            <g className="fill-lens">
              <ellipse cx={30 + ex} cy={38 + ey} rx="5" ry={blink ? 0.8 : 6} />
              <ellipse cx={50 + ex} cy={38 + ey} rx="5" ry={blink ? 0.8 : 6} />
            </g>
          )}
          <rect x="30" y="58" width="20" height="4" rx="2" className={happy ? "fill-lens" : "fill-ink"} />
        </svg>
      </button>
      {happy && (
        <span className="absolute -top-8 right-0 whitespace-nowrap border-2 border-border bg-card px-2 py-1 font-pixel text-[10px]">
          HI, HUMAN!
        </span>
      )}
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="absolute -left-2 -top-2 grid h-5 w-5 place-items-center rounded-full border-2 border-border bg-card text-[10px] leading-none"
        aria-label="Hide robot buddy"
      >
        ×
      </button>
    </div>
  );
}

/** Heartbeat monitor whose BPM rises when you scroll fast. */
export function HeartbeatMonitor() {
  const N = 160;
  const buf = useRef<number[]>(Array(N).fill(0));
  const [path, setPath] = useState("");
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    let excite = 0;
    let phase = 0;
    let rate = 72;
    const wave = (p: number) => {
      if (p < 0.08) return Math.sin((p / 0.08) * Math.PI) * 0.15;
      if (p < 0.14) return 0;
      if (p < 0.16) return -0.2;
      if (p < 0.19) return 1;
      if (p < 0.22) return -0.35;
      if (p < 0.35) return 0;
      if (p < 0.5) return Math.sin(((p - 0.35) / 0.15) * Math.PI) * 0.25;
      return 0;
    };
    let frame = 0;
    const tick = () => {
      const y = window.scrollY;
      excite = Math.min(1, excite * 0.97 + Math.abs(y - lastY) / 1500);
      lastY = y;
      rate = 72 + excite * 108;
      phase = (phase + rate / 60 / 60) % 1;
      buf.current.push(wave(phase));
      buf.current.shift();
      if (++frame % 2 === 0) {
        setPath(buf.current.map((v, i) => `${i ? "L" : "M"}${(i / (N - 1)) * 600} ${50 - v * 38}`).join(""));
        setBpm(Math.round(rate));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="overflow-hidden border-2 border-border bg-ink text-paper shadow-hard">
      <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2 font-mono text-[11px]">
        <span className="text-lens">ECG / LEAD II</span>
        <span>
          <span className="text-lilac">♥</span> <span className="text-xl font-bold text-lens">{bpm}</span> BPM
        </span>
      </div>
      <svg viewBox="0 0 600 100" className="block h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" className="stroke-lens" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <p className="border-t border-paper/20 px-3 py-1.5 font-mono text-[10px] text-paper/60">
        Scroll fast and watch the heart rate climb. Stop and it calms down.
      </p>
    </div>
  );
}

type Bot = { x: number; y: number; vx: number; vy: number };
const R = 130;
const C = 160;
const BR = 16;

/** Robo Sumo preview: push the other bot out of the ring. */
export function SumoGame() {
  const keys = useRef<Record<string, boolean>>({});
  const me = useRef<Bot>({ x: C - 60, y: C, vx: 0, vy: 0 });
  const cpu = useRef<Bot>({ x: C + 60, y: C, vx: 0, vy: 0 });
  const [, force] = useState(0);
  const [score, setScore] = useState({ you: 0, cpu: 0 });
  const [msg, setMsg] = useState("Press START, then use arrow keys or WASD.");
  const [running, setRunning] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const reset = () => {
    me.current = { x: C - 60, y: C, vx: 0, vy: 0 };
    cpu.current = { x: C + 60, y: C, vx: 0, vy: 0 };
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!running) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
        keys.current[k] = true;
      }
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      const k = keys.current as Partial<Record<"arrowup" | "arrowdown" | "arrowleft" | "arrowright" | "w" | "a" | "s" | "d", boolean>>;
      const a = 0.32;
      const m = me.current;
      const c = cpu.current;
      if (k.arrowup || k.w) m.vy -= a;
      if (k.arrowdown || k.s) m.vy += a;
      if (k.arrowleft || k.a) m.vx -= a;
      if (k.arrowright || k.d) m.vx += a;
      // CPU: chase you, but steer back toward centre when near the edge
      const toMe = Math.atan2(m.y - c.y, m.x - c.x);
      const edge = Math.hypot(c.x - C, c.y - C) / R;
      const toC = Math.atan2(C - c.y, C - c.x);
      const ang = edge > 0.75 ? toC : toMe;
      c.vx += Math.cos(ang) * 0.24;
      c.vy += Math.sin(ang) * 0.24;
      for (const b of [m, c]) {
        b.vx *= 0.92;
        b.vy *= 0.92;
        b.x += b.vx;
        b.y += b.vy;
      }
      const dx = c.x - m.x;
      const dy = c.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < BR * 2 && d > 0) {
        const nx = dx / d;
        const ny = dy / d;
        const overlap = BR * 2 - d;
        m.x -= nx * overlap / 2;
        m.y -= ny * overlap / 2;
        c.x += nx * overlap / 2;
        c.y += ny * overlap / 2;
        const rel = (m.vx - c.vx) * nx + (m.vy - c.vy) * ny;
        if (rel > 0) {
          m.vx -= rel * nx;
          m.vy -= rel * ny;
          c.vx += rel * nx;
          c.vy += rel * ny;
        }
      }
      const out = (b: Bot) => Math.hypot(b.x - C, b.y - C) > R;
      if (out(m) || out(c)) {
        const youWon = out(c) && !out(m);
        setScore((s) => (youWon ? { ...s, you: s.you + 1 } : { ...s, cpu: s.cpu + 1 }));
        setMsg(youWon ? "Ring out! You win the round." : "You got pushed out. Try again.");
        setRunning(false);
        reset();
        force((n) => n + 1);
        return;
      }
      force((n) => (n + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const hold = (k: string, v: boolean) => (keys.current[k] = v);
  const pad = (k: string, label: string, cls: string) => (
    <button
      type="button"
      className={`grid h-11 w-11 place-items-center border-2 border-border bg-card font-bold active:bg-primary active:text-primary-foreground ${cls}`}
      onPointerDown={() => hold(k, true)}
      onPointerUp={() => hold(k, false)}
      onPointerLeave={() => hold(k, false)}
      aria-label={`Move ${k.replace("arrow", "")}`}
    >
      {label}
    </button>
  );

  const bot = (b: Bot, me: boolean) => (
    <g transform={`translate(${b.x} ${b.y})`}>
      <g transform={`rotate(${(Math.atan2(b.vy, b.vx) * 180) / Math.PI})`}>
        <rect x={-BR} y={-BR} width={BR * 2} height={BR * 2} rx="5" className={me ? "fill-violet stroke-paper" : "fill-lens stroke-paper"} strokeWidth="2" />
        <rect x={BR - 4} y={-BR} width="6" height={BR * 2} className="fill-paper" />
      </g>
      <text y="4" textAnchor="middle" fontSize="10" className="fill-paper font-mono">{me ? "YOU" : "CPU"}</text>
    </g>
  );

  return (
    <div ref={box} className="grid gap-6 border-2 border-border bg-card p-4 shadow-hard md:grid-cols-[1fr_1fr] md:p-6">
      <div className="bg-ink p-2">
        <svg viewBox="0 0 320 320" className="block w-full" role="img" aria-label="Robo Sumo ring">
          <circle cx={C} cy={C} r={R + 8} className="fill-paper" />
          <circle cx={C} cy={C} r={R} className="fill-ink" />
          <line x1={C - 20} y1={C - 30} x2={C - 20} y2={C + 30} className="stroke-paper/40" strokeWidth="3" />
          <line x1={C + 20} y1={C - 30} x2={C + 20} y2={C + 30} className="stroke-paper/40" strokeWidth="3" />
          {bot(me.current, true)}
          {bot(cpu.current, false)}
        </svg>
      </div>
      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="font-pixel text-[11px] text-primary">BOT FORGE PREVIEW / ROBO SUMO</p>
          <h3 className="mt-2 text-3xl font-black">Push it out of the ring.</h3>
          <p className="mt-2 text-muted-foreground">{msg}</p>
          <p className="mt-4 font-mono text-lg">
            YOU {score.you} : {score.cpu} CPU
          </p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              reset();
              setMsg("Go! Arrow keys or WASD.");
              setRunning(true);
              box.current?.focus();
            }}
            disabled={running}
            className="border-2 border-border bg-primary px-6 py-3 font-bold text-primary-foreground shadow-hard disabled:opacity-50"
          >
            {running ? "FIGHTING..." : "START"}
          </button>
          <div className="grid grid-cols-3 gap-1" aria-label="Touch controls">
            {pad("arrowup", "↑", "col-start-2")}
            {pad("arrowleft", "←", "col-start-1 row-start-2")}
            {pad("arrowdown", "↓", "col-start-2 row-start-2")}
            {pad("arrowright", "→", "col-start-3 row-start-2")}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Flip card: front shows initials (photo later), back shows role. */
export function FlipCard({ front, back, label }: { front: React.ReactNode; back: React.ReactNode; label: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped(!flipped)}
      aria-pressed={flipped}
      aria-label={`${label}. Tap to flip.`}
      className="group block h-56 w-full text-left [perspective:900px]"
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div className="absolute inset-0 border-2 border-border bg-card shadow-hard [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 border-2 border-border bg-primary text-primary-foreground shadow-hard [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </button>
  );
}
