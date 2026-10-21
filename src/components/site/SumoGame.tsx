import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Play, Square, Vibrate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bodies, Body, Composite, Engine, RING, cpuIntent, type CpuTactic } from "@/lib/robot-physics";
import type Matter from "matter-js";

type Pose = { x: number; y: number; angle: number; speed: number };
const initial = (x: number, angle: number): Pose => ({ x, y: 160, angle, speed: 0 });

function Machine({ pose, player }: { pose: Pose; player: boolean }) {
  return <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle})`}>
    <ellipse cx="1" cy="3" rx="23" ry="22" className="fill-paper/10" />
    {[-17, 13].map((y) => <g key={y}>
      <rect x="-17" y={y} width="32" height="7" rx="2" className="fill-ink stroke-paper/60" strokeWidth="0.8" />
      {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${-14 + i * 4} ${y + 1}v5`} className="stroke-paper/50" strokeWidth="1" />)}
    </g>)}
    <rect x="-15" y="-13" width="29" height="26" rx="3" className={player ? "fill-violet stroke-paper" : "fill-lens stroke-paper"} strokeWidth="1" />
    <rect x="-9" y="-8" width="12" height="16" rx="1" className="fill-ink stroke-paper/40" strokeWidth="0.6" />
    <path d="M-7 -5h8 M-7 -2h8 M-7 1h8 M-7 4h8" className="stroke-paper/50" strokeWidth="0.8" />
    <path d="M4 -8h5v5H4z M4 3h5v5H4z" className="fill-lilac stroke-ink" strokeWidth="0.5" />
    <path d="M12 -16L23 -20V20L12 16Z" className="fill-paper stroke-ink" strokeWidth="1" />
    <path d="M17 -15v30" className="stroke-ink/40" strokeWidth="1" />
    {[-10, 10].map((y) => <circle key={y} cx="11" cy={y} r="1.8" className="fill-ink" />)}
    <circle cx="5" cy="0" r="1.7" className="fill-paper" />
  </g>;
}

export function SumoGame() {
  const keys = useRef<Record<string, boolean>>({});
  const world = useRef<{ engine: ReturnType<typeof Engine.create>; player: Matter.Body; cpu: Matter.Body } | null>(null);
  const [poses, setPoses] = useState({ player: initial(100, 0), cpu: initial(220, 180) });
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState({ you: 0, cpu: 0 });
  const [message, setMessage] = useState("READY TO FIGHT");
  const [tactic, setTactic] = useState<CpuTactic>("DRIVE");
  const [impact, setImpact] = useState(0);
  const [haptics, setHaptics] = useState(false);
  const hapticRef = useRef(false);
  const arena = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const release = () => { keys.current = {}; };
    const down = (e: KeyboardEvent) => {
      if (!running || !arena.current?.contains(document.activeElement)) return;
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) { e.preventDefault(); keys.current[key] = true; }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const visibility = () => { if (document.hidden) release(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", visibility); };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const options = { frictionAir: 0.085, restitution: 0.08, friction: 0.9, density: 0.004 };
    const player = Bodies.circle(100, 160, RING.botRadius, options);
    const cpu = Bodies.circle(220, 160, RING.botRadius, options);
    Composite.add(engine.world, [player, cpu]); world.current = { engine, player, cpu };
    let raf = 0, previous = 0, accumulator = 0, time = 0, lastHaptic = 0;
    let playerAngle = 0, cpuAngle = 180;
    const update = (now: number) => {
      accumulator += previous ? Math.min(now - previous, 50) : 16.67; previous = now;
      let contact = false;
      while (accumulator >= 1000 / 60) {
        time += 1000 / 60;
        const k = keys.current;
        const x = Number(Boolean(k['arrowright'] || k['d'])) - Number(Boolean(k['arrowleft'] || k['a']));
        const y = Number(Boolean(k['arrowdown'] || k['s'])) - Number(Boolean(k['arrowup'] || k['w']));
        const length = Math.max(1, Math.hypot(x, y));
        Body.applyForce(player, player.position, { x: x / length * 0.0025, y: y / length * 0.0025 });
        contact = Math.hypot(player.position.x - cpu.position.x, player.position.y - cpu.position.y) < 38;
        const intent = cpuIntent(cpu, player, time, contact);
        setTactic(intent.tactic);
        // Strong traction, equal mass: tactical recovery rather than invulnerability.
        Body.applyForce(cpu, cpu.position, { x: intent.x * 0.00265, y: intent.y * 0.00265 });
        if (x || y) playerAngle = Math.atan2(y, x) * 180 / Math.PI;
        cpuAngle = Math.atan2(intent.y, intent.x) * 180 / Math.PI;
        for (const bot of [player, cpu]) {
          if (bot.speed > 3.8) Body.setVelocity(bot, { x: bot.velocity.x / bot.speed * 3.8, y: bot.velocity.y / bot.speed * 3.8 });
        }
        Engine.update(engine, 1000 / 60); accumulator -= 1000 / 60;
        const out = (bot: Matter.Body) => Math.hypot(bot.position.x - 160, bot.position.y - 160) > RING.radius;
        if (out(player) || out(cpu)) {
          const win = out(cpu) && !out(player);
          setScore((s) => ({ you: s.you + Number(win), cpu: s.cpu + Number(!win) }));
          setMessage(win ? "RING OUT / YOU WIN" : "RING OUT / CPU WINS");
          setRunning(false); keys.current = {}; break;
        }
      }
      const pose = (body: Matter.Body, angle: number): Pose => ({ x: body.position.x, y: body.position.y, speed: body.speed, angle });
      setPoses({ player: pose(player, playerAngle), cpu: pose(cpu, cpuAngle) });
      setImpact(contact ? Math.floor(time / 40) % 2 + 1 : 0);
      if (contact && hapticRef.current && now - lastHaptic > 180 && typeof navigator.vibrate === "function") { navigator.vibrate(18); lastHaptic = now; }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(raf); Composite.clear(engine.world, false); Engine.clear(engine); world.current = null; setImpact(0); };
  }, [running]);

  const pad = (key: string, label: string, Icon: typeof ArrowUp, position: string) => <Button variant="outline" size="icon" className={`h-12 w-12 touch-none border-2 border-border ${position}`} aria-label={`Move ${label}`} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current[key] = true; arena.current?.focus(); }} onPointerUp={() => { keys.current[key] = false; }} onPointerCancel={() => { keys.current[key] = false; }} onLostPointerCapture={() => { keys.current[key] = false; }}><Icon /></Button>;

  return <div ref={arena} tabIndex={0} className="sumo-arena grid gap-8 border-y-2 border-border py-6 md:grid-cols-[1.1fr_1fr] md:py-8">
    <div className="relative overflow-hidden border-2 border-border bg-ink text-paper">
      <div className="absolute left-3 top-3 z-10 font-mono text-[10px] text-paper/60">DOHYO / 01</div>
      <svg viewBox="0 0 320 320" className={`block aspect-square w-full ${impact === 1 ? "collision-left" : impact === 2 ? "collision-right" : ""}`} role="img" aria-label="Mechanical sumo robots fighting in the ring">
        <defs><pattern id="sumo-surface" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0h8" className="stroke-paper/5" strokeWidth="0.5" /></pattern></defs>
        <circle cx="160" cy="164" r="139" className="fill-paper/10" />
        <circle cx="160" cy="160" r="138" className="fill-paper" />
        <circle cx="160" cy="160" r="130" className="fill-ink" />
        <circle cx="160" cy="160" r="130" fill="url(#sumo-surface)" />
        <circle cx="160" cy="160" r="100" fill="none" className="stroke-paper/10" strokeDasharray="2 5" />
        <path d="M140 132v56 M180 132v56" className="stroke-lilac" strokeWidth="2" />
        {[0, 90, 180, 270].map((angle) => <path key={angle} d="M160 26v5" transform={`rotate(${angle} 160 160)`} className="stroke-ink" strokeWidth="2" />)}
        <Machine pose={poses.player} player /><Machine pose={poses.cpu} player={false} />
        {impact > 0 && <g transform={`translate(${(poses.player.x + poses.cpu.x) / 2} ${(poses.player.y + poses.cpu.y) / 2})`} className="stroke-lilac" strokeWidth="1.4"><path d="M-8 -4l-5 -5 M8 -4l5 -5 M-5 6l-4 5 M5 6l4 5" /></g>}
      </svg>
      <div className="flex justify-between border-t border-paper/20 px-3 py-2 font-mono text-[10px]"><span className="text-lilac">RB-02 / YOU</span><span className="text-lens">RB-03 / CPU</span></div>
    </div>
    <div className="flex flex-col justify-between gap-6">
      <div><p className="font-pixel text-[11px] text-primary">BOT FORGE / PRACTICE ARENA</p><h3 className="mt-3 text-4xl font-black">Steel. Traction.<br />A little strategy.</h3><p className="mt-5 font-mono text-xs text-muted-foreground" role="status">{message}</p>
        <div className="mt-6 flex items-end gap-6 border-y border-border/30 py-4"><span className="font-pixel text-xs">YOU</span><span className="font-display text-4xl font-bold tabular-nums">{score.you} : {score.cpu}</span><span className="font-pixel text-xs text-primary">CPU</span></div>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">CPU / {running ? tactic : "STANDBY"} <span className="ml-3">{impact ? "CONTACT" : "CLEAR"}</span></p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-3"><Button size="lg" onClick={() => { keys.current = {}; setMessage("ROUND ACTIVE"); setRunning(!running); arena.current?.focus(); }} className="h-12 border-2 border-border font-pixel text-xs shadow-hard">{running ? <Square /> : <Play />}{running ? "STOP" : "START"}</Button>
          <Button variant="ghost" size="sm" aria-pressed={haptics} aria-label="Toggle collision vibration" onClick={() => { hapticRef.current = !haptics; setHaptics(!haptics); }}><Vibrate /><span className="font-mono text-[10px]">HAPTICS {haptics ? "ON" : "OFF"}</span></Button></div>
        <div className="grid grid-cols-3 gap-1.5" aria-label="Touch controls">{pad("arrowup", "up", ArrowUp, "col-start-2")}{pad("arrowleft", "left", ArrowLeft, "col-start-1 row-start-2")}{pad("arrowdown", "down", ArrowDown, "col-start-2 row-start-2")}{pad("arrowright", "right", ArrowRight, "col-start-3 row-start-2")}</div>
      </div>
    </div>
  </div>;
}