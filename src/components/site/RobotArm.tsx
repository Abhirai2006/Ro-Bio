import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { ArmSim, SAMPLE, type Kind, type Mode } from "@/lib/arm-sim";
import type { ArmScene } from "./arm-scene";

const KINDS: Kind[] = ["glass", "rubber", "ball"];
const deg = (r: number) => `${Math.round((r * 180) / Math.PI)}°`;
const HUD = [
  ["BASE", (s: ArmSim) => deg(s.q.yaw)],
  ["SHOULDER", (s: ArmSim) => deg(s.q.shoulder)],
  ["ELBOW", (s: ArmSim) => deg(s.q.elbow)],
  ["WRIST", (s: ArmSim) => deg(s.q.wrist)],
  ["ROLL", (s: ArmSim) => deg(s.q.roll)],
  ["GRIP", (s: ArmSim) => `${Math.round(s.grip * 2000)} mm`],
] as const;

/**
 * Pick-and-place cell: a five-joint arm with a parallel gripper, drawn in 3D.
 * The motion and physics live in ArmSim (src/lib/arm-sim.ts). three.js loads after the page, in its own file.
 */
export function RobotArm() {
  const host = useRef<HTMLDivElement>(null);
  const simRef = useRef<ArmSim | null>(null);
  simRef.current ??= new ArmSim();
  const sim = simRef.current;
  const scene = useRef<ArmScene | null>(null);
  const hud = useRef<(HTMLSpanElement | null)[]>([]);
  const down = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "nogl">("loading");
  const [mode, setMode] = useState<Mode>("auto");
  const [status, setStatus] = useState(sim.status);
  const [busy, setBusy] = useState(false);
  const [glassGone, setGlassGone] = useState(false);
  const [said, setSaid] = useState("");

  useEffect(() => {
    let cancelled = false;
    const onFrame = () => {
      HUD.forEach(([, read], i) => {
        const el = hud.current[i];
        if (el) el.textContent = read(sim);
      });
      setStatus(sim.status);
      setBusy(sim.busy);
      setGlassGone(sim.sample("glass").broken);
      if (sim.said.length) setSaid(sim.said.splice(0).pop()!);
    };
    const start = () =>
      import("./arm-scene")
        .then(({ createArmScene }) => {
          if (cancelled || !host.current) return;
          try {
            scene.current = createArmScene(host.current, sim, onFrame);
            setPhase("ready");
          } catch {
            setPhase("nogl");
          }
        })
        .catch(() => !cancelled && setPhase("nogl"));
    // Let the rest of the page settle first. The arm is a toy, not the content.
    const ric = "requestIdleCallback" in window;
    const idle = ric ? window.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 300);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [sim]);

  const aimFrom = (e: React.PointerEvent) => {
    const p = scene.current?.hit(e.clientX, e.clientY).point;
    if (!p) return;
    sim.aim(p.x, p.z);
    scene.current?.aimAt(sim.manual);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scene.current) return;
    if (mode === "manual") return aimFrom(e);
    if (e.pointerType !== "mouse") return;
    const kind = scene.current.hit(e.clientX, e.clientY).kind ?? null;
    scene.current.hover(kind);
    e.currentTarget.style.cursor = kind ? "pointer" : "crosshair";
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    down.current = { x: e.clientX, y: e.clientY };
    if (mode !== "manual" || !scene.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aimFrom(e);
    sim.press(true);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = down.current;
    down.current = null;
    if (mode === "manual") return sim.press(false);
    if (!start || !scene.current || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
    const hit = scene.current.hit(e.clientX, e.clientY);
    if (hit.kind) sim.pick(hit.kind);
    else if (hit.point) sim.point(hit.point.x, hit.point.z);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (mode !== "manual") return;
    const step = 0.015, m = sim.manual;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      sim.aim(m.x + mv[0], m.z + mv[1]);
      scene.current?.aimAt(sim.manual);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) sim.press(!m.pressed);
    }
  };
  const switchMode = (next: Mode) => {
    sim.setMode(next);
    setMode(sim.mode);
    scene.current?.hover(null);
    scene.current?.aimAt(sim.mode === "manual" ? sim.manual : null);
    if (sim.mode === "manual") host.current?.focus({ preventScroll: true }); // so the arrow keys work straight away
  };

  return (
    <figure className="overflow-hidden border-2 border-border bg-ink text-paper shadow-hard-violet">
      <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2 font-mono text-[11px]">
        <span className="text-lens">RB-01 / PICK AND PLACE</span>
        <span className="flex items-center gap-3">
          <span className="text-lilac">{mode === "auto" ? "AUTO" : "MANUAL"}</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-lens blink" />
            {status}
          </span>
        </span>
      </div>
      <div
        ref={host}
        tabIndex={phase === "ready" && mode === "manual" ? 0 : -1}
        role={mode === "manual" ? "application" : "img"}
        aria-roledescription="robot arm"
        aria-label={
          mode === "auto"
            ? "3D robot arm. Use the buttons below to choose what it picks up."
            : "3D robot arm in manual mode. Arrow keys move the gripper over the bench, Space grips and lets go."
        }
        className={`relative aspect-[5/4] w-full select-none outline-none focus-visible:ring-2 focus-visible:ring-lens ${mode === "manual" ? "touch-none cursor-crosshair" : "touch-pan-y cursor-crosshair"}`}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => ((down.current = null), sim.press(false))}
        onPointerLeave={() => scene.current?.hover(null)}
        onKeyDown={onKey}
      >
        {phase !== "ready" && (
          <div className="blueprint absolute inset-0 grid place-items-center">
            <p className="max-w-[80%] text-center font-pixel text-[11px] text-lilac">
              {phase === "loading" ? <span className="blink">LOADING THE ARM</span> : "This browser could not start 3D graphics, so the arm cannot be shown here."}
            </p>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{said}</p>
      <figcaption className="grid grid-cols-3 border-t border-paper/20 font-mono text-[10px] md:grid-cols-6 md:text-[11px]">
        {HUD.map(([k, read], i) => (
          <span key={k} className="border-b border-r border-paper/20 px-2 py-1.5 md:border-b-0 [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:last:border-r-0">
            <span className="block text-paper/50">{k}</span>
            <span ref={(el) => void (hud.current[i] = el)} className="text-lens">
              {read(sim)}
            </span>
          </span>
        ))}
      </figcaption>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-paper/20 px-3 py-2">
        <div className="flex border border-paper/30" role="group" aria-label="Control mode">
          {(["auto", "manual"] as const).map((m) => (
            <Button
              key={m}
              variant="ghost"
              size="sm"
              aria-pressed={mode === m}
              disabled={busy && mode !== m}
              onClick={() => switchMode(m)}
              className={`rounded-none hover:bg-paper/10 hover:text-lens ${mode === m ? "bg-paper/15 text-lens" : "text-paper/60"}`}
            >
              {m === "auto" ? "Auto" : "Manual"}
            </Button>
          ))}
        </div>
        {mode === "auto" ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Pick up">
            {KINDS.map((k) => (
              <Button key={k} variant="ghost" size="sm" disabled={phase !== "ready" || (k === "glass" && glassGone)} onClick={() => sim.pick(k)} className="text-paper/80 hover:bg-paper/10 hover:text-lens">
                {SAMPLE[k].label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-paper/70">Hold to grip, let go to drop.</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-paper hover:bg-paper/10 hover:text-lens"
          aria-label="Reset the bench"
          title="Reset the bench"
          onClick={() => {
            sim.reset();
            setSaid("Bench reset.");
          }}
        >
          <RotateCcw />
        </Button>
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
