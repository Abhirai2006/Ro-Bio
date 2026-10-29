import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Engine, Bodies, Body, Composite, Events, makeSample, shouldBreak, type Material } from "@/lib/robot-physics";
import type Matter from "matter-js";

const BASE = { x: 200, y: 300 };
const L1 = 130;
const L2 = 110;

/**
 * Two-link planar inverse kinematics. Angles in radians, screen coordinates (y points down).
 * There are two elbow solutions. Keep the one used last time, so the arm never flips mid-move,
 * unless it would put the elbow under the floor; then take the other one.
 */
export function solveIK(tx: number, ty: number, prefer: 1 | -1 = -1) {
  const dx = tx - BASE.x;
  const dy = ty - BASE.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1), L1 + L2 - 0.5);
  const c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const solve = (sign: 1 | -1) => {
    const t2 = sign * Math.acos(Math.max(-1, Math.min(1, c2)));
    const t1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    return { t1, t2, sign, elbowY: BASE.y + L1 * Math.sin(t1) };
  };
  const a = solve(prefer);
  return a.elbowY <= BASE.y - 4 ? a : solve(prefer === 1 ? -1 : 1);
}

const deg = (r: number) => Math.round((r * 180) / Math.PI);
const TRAY = { x: 330, y: 300 };
const VIAL0 = { x: 90, y: 304 };

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} ${a1 > a0 ? 1 : 0} ${x1} ${y1}`;
}

/** Pick-and-place HMI: 2-DOF arm solved with inverse kinematics. */
export function RobotArm() {
  const svgRef = useRef<SVGSVGElement>(null);
  const target = useRef({ x: 300, y: 170 });
  const pos = useRef({ x: 300, y: 170 });
  const world = useRef<ReturnType<typeof Engine.create> | null>(null);
  const sample = useRef<Matter.Body | null>(null);
  const held = useRef(false);
  const elbow = useRef<1 | -1>(-1); // which elbow solution the arm is using
  const fragments = useRef<Matter.Body[]>([]);
  const activeMaterial = useRef<Material>("glass");
  const [, force] = useState(0);
  const [grip, setGrip] = useState(false);
  const [material, setMaterial] = useState<Material>("glass");
  const [broken, setBroken] = useState(false);
  const [status, setStatus] = useState("READY");

  const resetSample = (kind: Material) => {
    const engine = world.current;
    if (!engine) return;
    if (sample.current) Composite.remove(engine.world, sample.current);
    fragments.current.forEach((body) => Composite.remove(engine.world, body));
    fragments.current = [];
    activeMaterial.current = kind;
    sample.current = makeSample(kind);
    Composite.add(engine.world, sample.current);
    held.current = false;
    setGrip(false); setBroken(false); setStatus("READY");
  };

  useEffect(() => {
    const engine = Engine.create();
    world.current = engine;
    Composite.add(engine.world, [
      Bodies.rectangle(210, 330, 460, 24, { isStatic: true, label: "floor" }),
      Bodies.rectangle(-10, 170, 20, 340, { isStatic: true }),
      Bodies.rectangle(430, 170, 20, 340, { isStatic: true }),
      Bodies.rectangle(296, 303, 4, 30, { isStatic: true }),
      Bodies.rectangle(364, 303, 4, 30, { isStatic: true }),
    ]);
    resetSample("glass");
    Events.on(engine, "collisionStart", (event) => {
      const body = sample.current;
      if (!body || held.current || fragments.current.length) return;
      if (!event.pairs.some((pair) => pair.bodyA === body || pair.bodyB === body)) return;
      if (!shouldBreak(activeMaterial.current, body.speed)) return;
      const { x, y } = body.position;
      Composite.remove(engine.world, body);
      sample.current = null;
      fragments.current = Array.from({ length: 7 }, (_, i) => {
        const shard = Bodies.polygon(x + (i - 3) * 2, y - 6, 3, 3 + i % 3, { restitution: 0.2, friction: 0.6 });
        Body.setVelocity(shard, { x: (i - 3) * 0.6, y: -1.5 - i % 2 });
        return shard;
      });
      Composite.add(engine.world, fragments.current);
      setBroken(true); setStatus("GLASS BROKEN");
    });
    let raf = 0, previous = 0, accumulator = 0;
    const tick = (now: number) => {
      accumulator += previous ? Math.min(now - previous, 50) : 16.67;
      previous = now;
      while (accumulator >= 1000 / 60) {
        pos.current.x += (target.current.x - pos.current.x) * 0.2;
        pos.current.y += (target.current.y - pos.current.y) * 0.2;
        if (held.current && sample.current) {
          Body.setPosition(sample.current, { x: pos.current.x, y: pos.current.y + 18 });
          Body.setAngle(sample.current, 0);
        }
        Engine.update(engine, 1000 / 60);
        accumulator -= 1000 / 60;
      }
      force((n) => (n + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); Engine.clear(engine); Composite.clear(engine.world, false); world.current = null; };
  }, []);

  const toLocal = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const point = pt.matrixTransform(matrix.inverse());
    const dx = point.x - BASE.x, dy = Math.min(point.y, 300) - BASE.y;
    const reach = Math.min(1, 238 / Math.max(1, Math.hypot(dx, dy)));
    target.current = { x: BASE.x + dx * reach, y: BASE.y + dy * reach };
    if (grip && !held.current) tryGrab();
  };
  const tryGrab = () => {
    const body = sample.current;
    if (!body || held.current) return;
    if (Math.hypot(pos.current.x - body.position.x, pos.current.y + 18 - body.position.y) < 30) {
      held.current = true; Body.setStatic(body, true); setStatus("GRIPPED");
    }
  };
  const press = () => { setGrip(true); tryGrab(); };
  const release = () => {
    setGrip(false);
    const body = sample.current;
    if (!held.current || !body) return;
    held.current = false;
    Body.setStatic(body, false);
    Body.setVelocity(body, { x: Math.max(-3, Math.min(3, (target.current.x - pos.current.x) * 0.15)), y: 0 });
    setStatus("RELEASED");
  };

  const { t1, t2, sign } = solveIK(pos.current.x, pos.current.y, elbow.current);
  elbow.current = sign;
  const ex = BASE.x + L1 * Math.cos(t1);
  const ey = BASE.y + L1 * Math.sin(t1);
  const hx = ex + L2 * Math.cos(t1 + t2);
  const hy = ey + L2 * Math.sin(t1 + t2);
  const ha = ((t1 + t2) * 180) / Math.PI;
  const jaw = grip ? 5 : 11;
  const v = sample.current?.position ?? VIAL0;

  return (
    <figure className="overflow-hidden border-2 border-border bg-ink text-paper shadow-hard-violet">
      <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2 font-mono text-[11px]">
        <span className="text-lens">RB-01 / PICK AND PLACE</span>
        <span className="flex items-center gap-3">
          <span className="text-lilac">MANUAL</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lens blink" />{status}</span>
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 420 340"
        className="block w-full touch-none select-none cursor-crosshair"
        role="img"
        aria-label="Interactive robot arm. Move to aim, press to grip. Pick the sample vial and drop it in the tray."
        onPointerMove={toLocal}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); toLocal(e); press(); }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <defs>
          <pattern id="hmi-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity="0.08" />
          </pattern>
        </defs>
        <rect width="420" height="340" fill="url(#hmi-grid)" />
        {/* floor + ruler */}
        <line x1="10" y1="318" x2="410" y2="318" stroke="currentColor" strokeOpacity="0.5" />
        {Array.from({ length: 21 }, (_, i) => (
          <line key={i} x1={10 + i * 20} y1="318" x2={10 + i * 20} y2={i % 5 ? 322 : 326} stroke="currentColor" strokeOpacity="0.4" />
        ))}
        {/* reach envelope */}
        <path d={arcPath(BASE.x, BASE.y, L1 + L2, Math.PI, 2 * Math.PI)} fill="none" className="stroke-lens" strokeOpacity="0.35" strokeDasharray="3 5" />
        {/* tray */}
        <path d={`M${TRAY.x - 34} ${TRAY.y - 14} V${TRAY.y + 16} H${TRAY.x + 34} V${TRAY.y - 14}`} fill="none" className="stroke-lilac" strokeWidth="2" />
        <text x={TRAY.x} y={TRAY.y - 20} textAnchor="middle" className="fill-lilac font-mono" fontSize="9">DROP ZONE</text>
        {/* vial */}
        {!broken && <g data-sample={material} transform={`translate(${v.x} ${v.y}) rotate(${(sample.current?.angle ?? 0) * 180 / Math.PI})`}>
          {material === "ball" ? <><circle r="12" className="fill-lilac stroke-paper" strokeWidth="1.5" /><path d="M-9 0H9 M0 -9V9" className="stroke-paper" /></> : material === "rubber" ? <rect x="-7" y="-14" width="14" height="28" rx="3" className="fill-violet stroke-paper" strokeWidth="1.5" /> : <>
          <rect x="-6" y="-14" width="12" height="26" rx="5" className="fill-lens/30 stroke-lens" strokeWidth="1.5" />
          <rect x="-6" y="0" width="12" height="12" rx="5" className="fill-lens" />
          <rect x="-8" y="-17" width="16" height="4" className="fill-paper" />
          </>}
        </g>}
        {fragments.current.map((shard, i) => <polygon key={i} points={shard.vertices.map((p) => `${p.x},${p.y}`).join(" ")} className="fill-lens/50 stroke-lens" strokeWidth="1" />)}
        {/* base */}
        <rect x={BASE.x - 44} y={BASE.y + 6} width="88" height="12" className="fill-none stroke-paper" strokeWidth="1.5" />
        {[-30, -10, 10, 30].map((o) => <circle key={o} cx={BASE.x + o} cy={BASE.y + 12} r="2" className="fill-paper" />)}
        {/* angle arcs */}
        <path d={arcPath(BASE.x, BASE.y, 34, Math.PI, Math.PI + ((t1 + Math.PI) % (2 * Math.PI)))} fill="none" className="stroke-lilac" strokeWidth="1.2" />
        {/* links: CAD style */}
        {([[BASE.x, BASE.y, ex, ey, 16], [ex, ey, hx, hy, 12]] as const).map(([x1, y1, x2, y2, w], i) => {
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const len = Math.hypot(x2 - x1, y2 - y1);
          return (
            <g key={i} transform={`translate(${x1} ${y1}) rotate(${(ang * 180) / Math.PI})`}>
              <rect x={-w} y={-w} width={len + 2 * w} height={2 * w} rx={w} className={i ? "fill-violet/40 stroke-lens" : "fill-violet/50 stroke-lilac"} strokeWidth="1.8" />
              <line x1={w} y1="0" x2={len - w} y2="0" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="6 3 1 3" />
              <rect x={len / 2 - 14} y={-w / 2.5} width="28" height={w / 1.25} rx="2" fill="none" stroke="currentColor" strokeOpacity="0.4" />
            </g>
          );
        })}
        {/* joints */}
        {([[BASE.x, BASE.y, 13], [ex, ey, 10]] as const).map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} className="fill-ink stroke-paper" strokeWidth="2" />
            <circle cx={x} cy={y} r={r / 2.6} className="fill-lens" />
          </g>
        ))}
        {/* gripper */}
        <g transform={`translate(${hx} ${hy}) rotate(${ha})`}>
          <rect x="-2" y="-9" width="10" height="18" className="fill-paper" />
          <path d={`M8 ${-jaw} h14`} className="stroke-paper" strokeWidth="4" strokeLinecap="round" />
          <path d={`M8 ${jaw} h14`} className="stroke-paper" strokeWidth="4" strokeLinecap="round" />
        </g>
        {/* target */}
        <g className="stroke-lens" strokeWidth="1">
          <circle cx={pos.current.x} cy={pos.current.y} r="7" fill="none" />
          <line x1={pos.current.x - 12} y1={pos.current.y} x2={pos.current.x + 12} y2={pos.current.y} />
          <line x1={pos.current.x} y1={pos.current.y - 12} x2={pos.current.x} y2={pos.current.y + 12} />
        </g>
      </svg>
      <figcaption className="grid grid-cols-4 border-t border-paper/20 font-mono text-[10px] md:text-[11px]">
        {[
          ["θ1", `${deg(-t1)}°`],
          ["θ2", `${deg(-t2)}°`],
          ["X", `${Math.round(pos.current.x - BASE.x)}`],
          ["Y", `${Math.round(BASE.y - pos.current.y)}`],
        ].map(([k, val]) => (
          <span key={k} className="border-r border-paper/20 px-2 py-1.5 last:border-0">
            <span className="block text-paper/50">{k}</span>
            <span className="text-lens">{val}</span>
          </span>
        ))}
      </figcaption>
      <div className="flex items-center justify-between gap-2 border-t border-paper/20 px-3 py-2">
        <div className="flex gap-1" role="group" aria-label="Sample material">
          {([['glass', 'Glass'], ['rubber', 'Rubber'], ['ball', 'Ball']] as const).map(([kind, label]) => <Button key={kind} variant="ghost" size="sm" aria-pressed={material === kind} onClick={() => { setMaterial(kind); resetSample(kind); }} className={material === kind ? "bg-paper/15 text-lens" : "text-paper/60"}>{label}</Button>)}
        </div>
        <Button variant="ghost" size="icon" className="text-paper" aria-label="Reset sample" title="Reset sample" onClick={() => resetSample(material)}><RotateCcw /></Button>
      </div>
    </figure>
  );
}

/** A tiny line-follower bot that drives an ECG-shaped track forever. */
export function LineFollower({ className = "" }: { className?: string }) {
  const track =
    "M10 60 H170 L185 60 L195 44 L205 60 L225 60 L235 76 L250 8 L266 108 L278 60 L300 60 L320 36 L340 60 H590";
  return (
    <svg viewBox="0 0 600 120" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d={track} fill="none" className="stroke-ink dark:stroke-paper" strokeWidth={8} strokeLinejoin="round" />
      <path d={track} fill="none" className="stroke-lens" strokeWidth={2} strokeDasharray="6 8" />
      <g>
        <rect x={-14} y={-10} width={28} height={20} rx={5} className="fill-violet stroke-ink" strokeWidth={2} />
        <circle cx={-8} cy={-12} r={4} className="fill-ink" />
        <circle cx={-8} cy={12} r={4} className="fill-ink" />
        <circle cx={10} cy={0} r={3} className="fill-lens blink" />
        <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path={track} />
      </g>
    </svg>
  );
}
