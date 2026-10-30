import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, RotateCcw } from "lucide-react";
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

/** One line under the arm that always says what to do next. */
function hint(sim: ArmSim) {
  const k = sim.heldKind;
  if (sim.mode === "manual") {
    if (sim.status === "GLASS BROKEN") return "Oops. Press reset for a new vial.";
    if (k) return `Got the ${SAMPLE[k].label.toLowerCase()}. Move it, then press Let go. Glass only survives a drop onto the foam.`;
    if (sim.status === "GRIPPING") return "Gripping.";
    if (sim.gripClosed) return "Nothing between the fingers. Press Let go, lower a bit more and try again.";
    const over = sim.overSample;
    if (over) return `Right over the ${SAMPLE[over].label.toLowerCase()}. Lower it all the way, then press Grip.`;
    return "Use the arrows to move over a sample.";
  }
  if (k && sim.holding) return `Now tap where the ${SAMPLE[k].label.toLowerCase()} should go. The tray works too.`;
  if (k) return ["CARRY", "PLACING", "RELEASE"].includes(sim.status) ? "Putting it down." : "Picking it up.";
  if (sim.busy && sim.samples.some((s) => s.queued)) return "Picking it up.";
  return "Tap a sample to pick it up.";
}

/**
 * Pick-and-place cell: a five-joint arm with a parallel gripper, drawn in 3D.
 * Tap a sample to pick it up, tap a spot to put it down. With a mouse the sample follows the cursor, and dragging works too.
 * The motion and physics live in ArmSim (src/lib/arm-sim.ts). three.js loads after the page, in its own file.
 */
export function RobotArm() {
  const host = useRef<HTMLDivElement>(null);
  const simRef = useRef<ArmSim | null>(null);
  simRef.current ??= new ArmSim();
  const sim = simRef.current;
  const scene = useRef<ArmScene | null>(null);
  const hud = useRef<(HTMLSpanElement | null)[]>([]);
  const press = useRef<{ x: number; y: number; grabbed: boolean; moved: boolean } | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "nogl">("loading");
  const [status, setStatus] = useState(sim.status);
  const [tip, setTip] = useState(hint(sim));
  const [holding, setHolding] = useState(false);
  const [mode, setMode] = useState<Mode>("tap");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const jogKeys = useRef(new Set<string>());
  const [said, setSaid] = useState("");

  useEffect(() => {
    let cancelled = false;
    const onFrame = () => {
      HUD.forEach(([, read], i) => {
        const el = hud.current[i];
        if (el) el.textContent = read(sim);
      });
      setStatus(sim.status);
      setTip(hint(sim));
      setHolding(!!sim.heldKind);
      setBusy(sim.busy);
      setClosed(sim.gripClosed);
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

  const hitAt = (e: React.PointerEvent) => {
    const hit = scene.current?.hit(e.clientX, e.clientY) ?? {};
    if (hit.kind || !hit.point) return hit;
    // Fingers are big and the samples are small: a tap close to one counts as a tap on it.
    const pt = hit.point;
    const near = sim.samples
      .filter((s) => !s.held)
      .map((s) => ({ kind: s.kind, d: Math.hypot(s.p.x - pt.x, s.p.z - pt.z) }))
      .sort((a, b) => a.d - b.d)[0];
    return near && near.d < 0.06 ? { ...hit, kind: near.kind } : hit;
  };

  // Manual mode: every held jog button or key adds a direction. On screen, up is away from you and left is left.
  const applyJog = () => {
    const keys = jogKeys.current, ax = scene.current?.axes();
    if (!ax) return;
    const sx = Number(keys.has("right")) - Number(keys.has("left")), sy = Number(keys.has("away")) - Number(keys.has("near"));
    const lift = Number(keys.has("raise")) - Number(keys.has("lower"));
    sim.jog(sx * ax.right.x + sy * ax.away.x, lift, sx * ax.right.z + sy * ax.away.z);
  };
  const hold = (dir: string, on: boolean) => {
    if (on) jogKeys.current.add(dir);
    else jogKeys.current.delete(dir);
    applyJog();
  };
  const switchMode = (next: Mode) => {
    jogKeys.current.clear();
    if (sim.setMode(next)) setMode(next);
    scene.current?.hover(null);
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scene.current || e.button > 0 || sim.mode === "manual") return;
    const hit = hitAt(e);
    let grabbed = false;
    if (!sim.heldKind && hit.kind) grabbed = sim.grab(hit.kind);
    if (grabbed || sim.heldKind) e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, y: e.clientY, grabbed, moved: false };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scene.current || sim.mode === "manual") return;
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true;
    const hit = hitAt(e);
    // While something is held it glides after the pointer: a mouse just moves, a finger drags.
    if (sim.heldKind && hit.point && (e.pointerType === "mouse" || p)) sim.carry(hit.point.x, hit.point.z);
    if (e.pointerType === "mouse") {
      scene.current.hover(hit.kind ?? null);
      e.currentTarget.style.cursor = hit.kind && !sim.heldKind ? "grab" : sim.heldKind ? "copy" : "default";
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p || !scene.current) return;
    const hit = hitAt(e);
    if (p.grabbed) {
      // Dragged straight away: put it down where the pointer let go. A plain tap keeps holding it.
      if (p.moved && hit.point) sim.place(hit.point.x, hit.point.z);
      return;
    }
    if (sim.heldKind) {
      if (hit.kind === sim.heldKind && !p.moved) sim.place(); // tapped the sample itself: straight down
      else if (hit.point) sim.place(hit.point.x, hit.point.z);
      return;
    }
    if (!p.moved && hit.point && !hit.kind) sim.point(hit.point.x, hit.point.z);
  };
  const KEYS: Record<string, string> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "away", ArrowDown: "near", w: "raise", W: "raise", s: "lower", S: "lower" };
  const onKeyUp = (e: React.KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (sim.mode === "manual" && dir) hold(dir, false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (sim.mode === "manual") {
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        if (!e.repeat) hold(dir, true);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) sim.toggleGrip();
      }
      return;
    }
    if (!sim.heldKind) return;
    const step = 0.02;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      sim.carry(sim.aim.x + mv[0], sim.aim.z + mv[1]);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      sim.place();
    }
  };

  return (
    <figure className="overflow-hidden border-2 border-border bg-ink text-paper shadow-hard-violet">
      <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2 font-mono text-[11px]">
        <span className="text-lens">RB-01 / PICK AND PLACE</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-lens blink" />
          {status}
        </span>
      </div>
      <div
        ref={host}
        tabIndex={phase === "ready" ? 0 : -1}
        role="application"
        aria-roledescription="robot arm"
        aria-label={
          mode === "manual"
            ? "3D robot arm in manual mode. Arrow keys move the gripper, W raises it, S lowers it, Space grips and lets go."
            : "3D robot arm. Use the buttons below to put a sample in the tray. While the arm holds something, the arrow keys move it and Enter puts it down."
        }
        // A finger only locks the page scroll while the arm is holding something; otherwise swiping scrolls as usual.
        className={`relative aspect-[5/4] w-full select-none outline-none focus-visible:ring-2 focus-visible:ring-lens ${holding && mode === "tap" ? "touch-none" : "touch-pan-y"}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (press.current = null)}
        onPointerLeave={() => scene.current?.hover(null)}
        onKeyDown={onKey}
        onKeyUp={onKeyUp}
        onBlur={() => {
          jogKeys.current.clear();
          applyJog();
        }}
      >
        {phase !== "ready" && (
          <div className="blueprint absolute inset-0 grid place-items-center">
            <p className="max-w-[80%] text-center font-pixel text-[11px] text-lilac">
              {phase === "loading" ? <span className="blink">LOADING THE ARM</span> : "This browser could not start 3D graphics, so the arm cannot be shown here."}
            </p>
          </div>
        )}
        {phase === "ready" && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-2 pt-6 text-center text-sm font-semibold text-paper" aria-hidden="true">
            {tip}
          </p>
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
          {(["tap", "manual"] as const).map((m) => (
            <Button
              key={m}
              variant="ghost"
              size="sm"
              aria-pressed={mode === m}
              disabled={phase !== "ready" || (busy && mode !== m)}
              onClick={() => switchMode(m)}
              className={`rounded-none hover:bg-paper/10 hover:text-lens ${mode === m ? "bg-paper/15 text-lens" : "text-paper/60"}`}
            >
              {m === "tap" ? "Tap to move" : "Manual"}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-paper hover:bg-paper/10 hover:text-lens"
          aria-label="Reset the bench"
          title="Reset the bench"
          disabled={phase !== "ready"}
          onClick={() => {
            jogKeys.current.clear();
            sim.reset();
            setSaid("Bench reset.");
          }}
        >
          <RotateCcw />
        </Button>
      </div>
      {mode === "tap" ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-paper/20 px-3 py-2" role="group" aria-label="Put in the tray">
          <span className="mr-1 font-pixel text-[10px] text-paper/60">TO THE TRAY</span>
          {KINDS.map((k) => (
            <Button key={k} variant="ghost" size="sm" disabled={phase !== "ready" || holding} onClick={() => sim.pick(k)} className="text-paper/80 hover:bg-paper/10 hover:text-lens">
              {SAMPLE[k].label}
            </Button>
          ))}
        </div>
      ) : (
        <JogPad hold={hold} grip={() => sim.toggleGrip()} closed={closed} disabled={phase !== "ready" || busy} />
      )}
    </figure>
  );
}

/** A button that moves the arm for as long as it is held down, with a finger or a mouse. */
function JogButton({ dir, label, hold, disabled, children }: { dir: string; label: string; hold: (dir: string, on: boolean) => void; disabled: boolean; children: React.ReactNode }) {
  const off = () => hold(dir, false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="grid h-11 w-11 touch-none select-none place-items-center border-2 border-paper/40 bg-paper/5 text-paper transition-colors hover:border-lens hover:text-lens active:bg-lens active:text-ink disabled:opacity-40 [&_svg]:size-5"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        hold(dir, true);
      }}
      onPointerUp={off}
      onPointerCancel={off}
      onLostPointerCapture={off}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && hold(dir, true)}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && off()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** Manual mode controls, laid out like a robot's control pendant: move, raise and lower, grip. */
function JogPad({ hold, grip, closed, disabled }: { hold: (dir: string, on: boolean) => void; grip: () => void; closed: boolean; disabled: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper/20 px-3 py-3" role="group" aria-label="Manual controls">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <JogButton dir="away" label="Move away from you" hold={hold} disabled={disabled}><ArrowUp /></JogButton>
        <span />
        <JogButton dir="left" label="Move left" hold={hold} disabled={disabled}><ArrowLeft /></JogButton>
        <JogButton dir="near" label="Move towards you" hold={hold} disabled={disabled}><ArrowDown /></JogButton>
        <JogButton dir="right" label="Move right" hold={hold} disabled={disabled}><ArrowRight /></JogButton>
      </div>
      <div className="flex flex-col gap-1">
        <JogButton dir="raise" label="Raise" hold={hold} disabled={disabled}><ChevronsUp /></JogButton>
        <JogButton dir="lower" label="Lower" hold={hold} disabled={disabled}><ChevronsDown /></JogButton>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={grip}
        aria-pressed={closed}
        className={`min-h-[5.75rem] min-w-[7rem] flex-1 border-2 px-4 font-display text-lg font-black transition-colors disabled:opacity-40 ${closed ? "border-lilac bg-lilac text-ink" : "border-lens bg-lens text-ink hover:bg-paper"}`}
      >
        {closed ? "Let go" : "Grip"}
      </button>
    </div>
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
