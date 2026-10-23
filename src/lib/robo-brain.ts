// The animation brain for Robo: sleep, wake, yawn, curious, cursor tracking, thoughts. No React here,
// so the whole sequence can be run and checked in a plain browser page.
import { POSES, opacities, transforms, type Pose } from "./robo-rig";
import { heart } from "./heart";

export type Phase = "sleep" | "waking" | "sitting" | "standing" | "yawn" | "relax" | "awake";
type Kind = "plain" | "think";
type Msg = { text: string; kind: Kind; hold: number };
export const LABEL: Record<Phase, string> = { sleep: "ASLEEP", waking: "WAKING UP", sitting: "WAKING UP", standing: "WAKING UP", yawn: "STRETCHING", relax: "STRETCHING", awake: "AWAKE" };
const RATES: Partial<Record<keyof Pose, number>> = { rx: 4, ry: 4.5, rr: 3.6, spine: 4.5, hr: 7, eye: 16, mouth: 10, lx: 12, ly: 12 };
const IDLE = [
  "Do you hear a heartbeat? It is in the header. Scroll fast and it races.",
  "Press X-ray. Yes, I am part biology.",
  "There is a robot arm next to me. It solves inverse kinematics.",
  "Further down, a robot follows a line. You can tune it.",
  "Bot Forge is on 28 Oct. I am very excited.",
];
const POKES = [
  "Hi, human!",
  "Fun fact: your heart beats about 100,000 times a day.",
  "A prosthetic hand can read the electrical signals of your muscles. That is called EMG.",
  "Careful. I am sensitive.",
];
const beatAt = (ph: number) => Math.exp(-(((ph % 1) / 0.07) ** 2)) + 0.6 * Math.exp(-((((ph % 1) - 0.22) / 0.07) ** 2));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type RoboOpts = { reduced?: boolean; seen?: boolean; timeScale?: number; onPhase?: (label: string, asleep: boolean) => void };

export function startRobo(host: HTMLElement, box: HTMLElement, live: HTMLElement, o: RoboOpts = {}) {
  const svg = host.querySelector("svg")!;
  const parts = new Map<string, Element>();
  host.querySelectorAll("[id^='rb-']").forEach((e) => parts.set(e.id.slice(3), e));
  const reduced = !!o.reduced, scale = o.timeScale ?? 1;
  let seen = !!o.seen;

  const cur: Pose = { ...POSES.sleep }, tgt: Pose = { ...POSES.sleep };
  const shown = new Map<string, string>();
  let phase: Phase = "sleep", pt = 0, tAll = 0, ms = 0, wakeAt = 3.6, last = 0, raf = 0, visible = false, started = false;
  let blinkAt = 3, px = -1, py = -1, movedAt = -99, waveUntil = 0, beatPh = 0, nextIdle = 0, headC = { x: 0, y: 0 }, headAt = 0;
  const queue: Msg[] = [];
  let msg: Msg | null = null, msgAt = 0, doneAt = 0, kind: Kind = "plain";
  const hovered = new Map<string, number>();

  const say = (text: string, k: Kind = "plain", hold = 1800, urgent = false) => {
    if (urgent) { queue.length = 0; msg = null; doneAt = 0; }
    queue.push({ text, kind: k, hold });
  };
  const go = (next: Phase) => {
    phase = next; pt = 0;
    svg.setAttribute("data-phase", next === "sleep" ? "sleep" : "");
    o.onPhase?.(LABEL[next], next === "sleep");
    if (next === "waking") say("...five more minutes.", "plain", 1000, true);
    if (next === "sitting") say("Booting up...", "plain", 900, true);
    if (next === "yawn") say("*yaaawn*", "plain", 1700, true);
    if (next === "awake") {
      try { sessionStorage.setItem("robo-woke", "1"); } catch { /* private mode */ }
      say("Where am I?", "think", 1300, true);
      say("RO-BIO. Biomedical and Robotic Engineering. Okay, I like it.", "plain", 2200);
      say("Is that a cursor? Fascinating.", "think", 1600);
      say("Try the arm. Or poke me.", "plain", 2200);
      nextIdle = ms + 14000;
    }
  };
  if (seen || reduced) {
    Object.assign(cur, POSES.stand); Object.assign(tgt, POSES.stand);
    go("awake");
    if (seen && !reduced) { queue.length = 0; say("Back already?", "plain", 1800); }
  }

  const targets = () => {
    switch (phase) {
      case "sleep": Object.assign(tgt, POSES.sleep); if (tAll > wakeAt) go("waking"); break;
      case "waking": Object.assign(tgt, POSES.sleep, { hr: 3, aLe: -95, mouth: 0.1, eye: [0.5, 0.1, 0.6, 0.15][Math.min(3, Math.floor(pt / 0.22))]! }); if (pt > 1) go("sitting"); break;
      case "sitting": Object.assign(tgt, POSES.sit, { eye: 0.6 }); if (pt > 1.1) go("standing"); break;
      case "standing": Object.assign(tgt, POSES.stand, { eye: 0.75, mouth: 0.15, spine: 3 }); if (pt > 1.3) go("yawn"); break;
      case "yawn": Object.assign(tgt, POSES.yawn, { mouth: pt > 0.5 ? 1 : 0.4, eye: pt > 0.4 ? 0.06 : 0.3 }); if (pt > 2.1) go("relax"); break;
      case "relax": { const sh = Math.exp(-pt * 2.2) * Math.sin(pt * 16) * 14; Object.assign(tgt, POSES.stand, { aLs: 8 + sh, aRs: 8 - sh, eye: 1, hr: 6 }); if (pt > 1) go("awake"); break; }
      case "awake": {
        Object.assign(tgt, POSES.stand, { eye: 1, aLs: 8 + 1.6 * Math.sin(tAll * 1.3), aRs: 8 + 1.6 * Math.sin(tAll * 1.1 + 1) });
        if (kind === "think" && msg) Object.assign(tgt, { aRs: POSES.think.aRs, aRe: POSES.think.aRe });
        if (tAll < waveUntil) Object.assign(tgt, { aRs: 118, aRe: -8 + 22 * Math.sin(tAll * 14), mouth: 0.35 });
        if (px >= 0) {
          const dx = clamp((px - headC.x) / 320, -1, 1), dy = clamp((py - headC.y) / 320, -1, 1);
          tgt.hr = (kind === "think" && msg ? 7 : 0) + dx * 22; tgt.lx = dx * 2.9; tgt.ly = dy * 2.3; tgt.spine = dx * 2.5;
        }
        if (!reduced && tAll - movedAt > 6) { tgt.hr = 10 * Math.sin(tAll * 0.8); tgt.lx = 2.6 * Math.sin(tAll * 0.8); }
        break;
      }
    }
  };

  const frame = (now: number) => {
    const dt = (last ? Math.min(0.05, (now - last) / 1000) : 0.016) * scale; last = now;
    tAll += dt; pt += dt; ms += dt * 1000;
    targets();
    for (const k of Object.keys(cur) as (keyof Pose)[]) cur[k] += (tgt[k] - cur[k]) * (reduced ? 1 : 1 - Math.exp(-dt * (RATES[k] ?? 7)));
    if (ms - headAt > 120) { const r = parts.get("head")?.getBoundingClientRect(); if (r) headC = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; headAt = ms; }

    beatPh += (dt * heart.bpm * (phase === "sleep" ? 0.8 : 1)) / 60;
    if (tAll > blinkAt + 0.14) blinkAt = tAll + 2.5 + Math.random() * 3.5;
    const blink = phase === "awake" && tAll > blinkAt && tAll < blinkAt + 0.14 ? 0 : 1;
    const out: Pose = { ...cur, eye: cur.eye * blink, breath: reduced ? 0 : (Math.sin(tAll * (phase === "sleep" ? 1.3 : 2)) + 1) / 2, beat: beatAt(beatPh) };
    for (const m of [transforms(out), opacities(out)]) {
      for (const [id, v] of Object.entries(m)) if (shown.get(id) !== v) { shown.set(id, v); parts.get(id)?.setAttribute(id.startsWith("closed") ? "opacity" : "transform", v); }
    }

    if (!msg && queue.length && ms >= doneAt) { msg = queue.shift()!; msgAt = ms; kind = msg.kind; box.setAttribute("data-on", "true"); live.textContent = msg.text; }
    if (msg) {
      const n = reduced ? msg.text.length : Math.floor((ms - msgAt) / 30);
      box.textContent = msg.text.slice(0, n) + (n < msg.text.length ? "▌" : "");
      if (n >= msg.text.length && ms - msgAt > msg.text.length * 30 + msg.hold) { msg = null; kind = "plain"; box.setAttribute("data-on", "false"); doneAt = ms + 350; }
    } else if (phase === "awake" && !queue.length && ms > nextIdle) { say(IDLE[Math.floor(Math.random() * IDLE.length)]!, "think", 2600); nextIdle = ms + 10000 + Math.random() * 6000; }
    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  const move = (e: PointerEvent) => { px = e.clientX; py = e.clientY; movedAt = tAll; };
  const over = (e: PointerEvent) => {
    if (phase !== "awake") return;
    const t = (e.target as Element | null)?.closest?.("[data-thought]")?.getAttribute("data-thought");
    if (t && ms - (hovered.get(t) ?? -1e9) > 8000) { hovered.set(t, ms); say(t, "think", 2400); }
  };
  const enter = () => { if (phase === "sleep") wakeAt = Math.min(wakeAt, tAll + 0.8); };
  window.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerover", over); host.addEventListener("pointerenter", enter);

  const io = new IntersectionObserver(([en]) => {
    visible = !!en?.isIntersecting;
    if (visible && !started) { started = true; tAll = 0; wakeAt = 3.6; }
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }, { threshold: 0.35 });
  io.observe(host);

  return {
    phase: () => phase,
    poke() {
      if (phase === "sleep") { wakeAt = tAll; return; }
      if (phase !== "awake") return;
      waveUntil = tAll + 1.6;
      const pool = [...POKES, `My heart is at ${Math.round(heart.bpm)} beats a minute right now.`];
      say(pool[Math.floor(Math.random() * pool.length)]!, "plain", 2400, true);
    },
    xray(on: boolean) {
      svg.setAttribute("data-x", on ? "1" : "0");
      if (phase === "awake") say(on ? "X-ray! There is biology under the plastic." : "Better. Modesty restored.", "plain", 1800, true);
    },
    stop() { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("pointermove", move); document.removeEventListener("pointerover", over); host.removeEventListener("pointerenter", enter); },
  };
}
