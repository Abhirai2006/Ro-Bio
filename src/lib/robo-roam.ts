// Robo's life on the page. He lives in a fixed layer over the whole site: he wakes up, walks along the bottom of the
// screen, hops onto headings and cards, wanders, goes to whatever you are reading, can be picked up and dropped, and
// when you click a link he runs to it, a black hole opens, he gets pulled in, and another one spits him out on the new
// page. While you read, he looks at the section you stopped on, tilts his head at it and says something about it.
// No React in here, so it can be tested.
import { POSES, opacities, transforms, type Pose } from "./robo-rig";
import { WALK_FALL, WALK_IDLE, WALK_JUMP, walkCycle, walkTransforms, type WalkPose } from "./robo-walk";
import { heart } from "./heart";
import { GREET, sectionLine } from "./robo-talk";

export type RoamDom = {
  layer: HTMLElement; robo: HTMLElement; puppet: HTMLElement; front: HTMLElement; side: HTMLElement; hit: HTMLElement;
  bubble: HTMLElement; live: HTMLElement; scan: HTMLElement; ringA: HTMLElement; ringB: HTMLElement;
};
export type RoamOpts = { reduced?: boolean; seen?: boolean; rest?: boolean; timeScale?: number; onTap?: (x: number, y: number) => void };

type V = { x: number; y: number };
type Kind = "plain" | "think";
type Wake = "sleep" | "waking" | "sitting" | "standing" | "yawn" | "relax";
type Pn = "stand" | "look" | "think" | "wave" | "yawn" | "sit" | "held";
type Act =
  | { k: "wait"; t: number; pose: Pn; t0: number }
  | { k: "walk"; tx: number; speed: number; t0: number }
  | { k: "jump"; el: Element | null; tx: number; T: number; arc: number; fall: boolean; t0: number; from?: V }
  | { k: "xray"; t0: number };

const PERCH = "main h1, main h2, main h3, [data-robo-perch]";
const AVOID = "[data-robo-avoid]";
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const RATES: Partial<Record<keyof Pose, number>> = { rx: 4, ry: 4.5, rr: 3.6, spine: 4.5, hr: 7, eye: 16, mouth: 10, lx: 12, ly: 12 };
const beatAt = (ph: number) => Math.exp(-(((ph % 1) / 0.07) ** 2)) + 0.6 * Math.exp(-((((ph % 1) - 0.22) / 0.07) ** 2));

export { GREET };
const IDLE = [
  "Do you hear a heartbeat? It is in the header. Scroll fast and it races.",
  "Click me for a menu. There is an X-ray.",
  "Stop scrolling for a second and I will read along with you.",
  "Click any link and watch me. I travel by black hole.",
  "On the home page there is a robot arm. It solves inverse kinematics.",
  "Further down the home page there is a Robo Sumo game. The CPU is tough.",
  "Bot Forge moved to 6 Nov. More time to tune my motors.",
  "Pick me up and put me somewhere. I dare you.",
];
const POKES = ["Hi, human!", "Fun fact: your heart beats about 100,000 times a day.", "A prosthetic hand can read the electrical signals of your muscles. That is called EMG.", "Careful. I am sensitive."];
const DROPS = ["Wheee!", "Put me down gently, please.", "Nice view from here.", "Landed it."];

export function startRoam(d: RoamDom, o: RoamOpts = {}) {
  const reduced = !!o.reduced, scale = o.timeScale ?? 1;
  const parts = new Map<string, Element>(), wparts = new Map<string, Element>();
  d.front.querySelectorAll("[id^='rb-']").forEach((e) => parts.set(e.id.slice(3), e));
  d.side.querySelectorAll("[id^='rw-']").forEach((e) => wparts.set(e.id.slice(3), e));
  const fsvg = d.front.querySelector("svg")!, wsvg = d.side.querySelector("svg")!;

  let H = 130, S = H / 284;
  const sizeUp = () => { H = innerWidth < 640 ? 100 : 130; S = H / 284; d.robo.style.width = `${260 * S}px`; d.robo.style.height = `${H}px`; };
  sizeUp();
  const floorY = () => innerHeight - 4;

  // ---- state
  let ms = 0, last = 0, raf = 0, tAll = 0, pt = 0, hitLying = false;
  let x = 0, y = floorY(), face: 1 | -1 = 1, view: "front" | "side" = "front";
  let perch: Element | null = null;
  let mode: "wake" | "free" | "carried" | "travel" | "static" = "wake";
  let wake: Wake = "sleep", wakeAt = 3.6, rest = !!o.rest;
  let cur: Act | null = null; const queue: Act[] = [];
  let poseName: Pn = "stand";
  const fcur: Pose = { ...POSES.sleep }, ftgt: Pose = { ...POSES.sleep };
  let wcur: WalkPose = { ...WALK_IDLE }, wphase = 0, wamp = 1, wmoving = false;
  let turn: { to: "front" | "side"; t0: number } | null = null;
  let squash = -1, sx = 1, sy = 1, rot = 0, puppetOp = 1, fly = false;
  let px = -1, py = -1, movedAt = -1e9, scrollAt = -1e9, headC: V = { x: 0, y: 0 }, headAt = -1e9;
  // where he is looking: a section on the page, or just a curious head tilt at you (el null)
  let gaze: { el: Element | null; until: number; cock: 1 | -1 } | null = null, lastGlance = -1e9;
  let beatPh = 0, blinkAt = 3, waveUntil = 0, nextIdle = 8000, lastGuide = 0, lastCursorTalk = 0, avoidAt = -1e9;
  const lastVisit = new WeakMap<Element, number>(), hovered = new Map<string, number>();
  type Msg = { text: string; kind: Kind; hold: number };
  const mq: Msg[] = []; let msg: Msg | null = null, msgAt = 0, msgDone = 0, mkind: Kind = "plain";
  let travel: { st: "leap" | "in" | "wait" | "out" | "drop"; P: V | null; t0: number; from: V; Q?: V; el?: Element | null; routeAt: number; path: string; hole?: boolean } | null = null;
  let carry: { sx: number; sy: number; down: boolean; moved: boolean; t0: number; lx: number; vx: number } | null = null;
  let currentPath = location.pathname;
  const shown = new Map<string, string>();

  // ---- helpers
  const say = (text: string, kind: Kind = "plain", hold = 1800, urgent = false) => { if (rest && !urgent) return; if (urgent) { mq.length = 0; msg = null; msgDone = 0; } mq.push({ text, kind, hold }); };
  const avoids = () => [...document.querySelectorAll(AVOID)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
  const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const perchList = () => {
    const av = avoids();
    return [...document.querySelectorAll(PERCH)].map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width >= 90 && r.height > 8 && r.top >= 78 + H * 0.9 && r.top <= innerHeight - 70 && !av.some((a) => overlap(r, a))); // room for all of him below the header
  };
  const limits = (): [number, number] => {
    if (perch) { const r = perch.getBoundingClientRect(); return [r.left + 16, Math.max(r.left + 17, r.right - 16)]; }
    return [28, innerWidth - 28];
  };
  const startTurn = (to: "front" | "side") => { if (!turn && view !== to) turn = { to, t0: ms }; };
  const needFront = () => { if (view !== "front") { startTurn("front"); return false; } return !turn; };
  const needSide = () => { if (view !== "side") { startTurn("side"); return false; } return !turn; };
  const ring = (el: HTMLElement, p: V, out = false) => { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; el.classList.remove("go", "out"); void el.offsetWidth; el.classList.add("go"); if (out) el.classList.add("out"); };
  const land = (el: Element | null) => { perch = el; squash = ms; fly = false; if (el) lastVisit.set(el, ms); };
  const headingText = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 36);
  const reactTo = (el: Element) => el.getAttribute("data-thought") ?? sectionLine(headingText(el));
  const lookAt = (el: Element | null, secs: number) => { gaze = { el, until: ms + secs * 1000, cock: Math.random() < 0.5 ? 1 : -1 }; };
  // The thing nearest the middle of the screen that is worth a comment: a heading, a card, or anything with a thought.
  const readingTarget = () => {
    const mid = innerHeight * 0.45;
    return [...document.querySelectorAll("main h1, main h2, main h3, [data-robo-perch], [data-thought]")]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 40 && r.bottom > 80 && r.top < innerHeight - 60 && ms - (lastVisit.get(el) ?? -1e9) > 60000)
      .sort((a, b) => Math.abs(a.r.top + a.r.height / 2 - mid) - Math.abs(b.r.top + b.r.height / 2 - mid))[0]?.el ?? null;
  };

  // ---- actions
  const enqueue = (...a: Act[]) => queue.push(...a);
  const wait = (t: number, pose: Pn = "look"): Act => ({ k: "wait", t, pose, t0: 0 });
  const walkTo = (tx: number, speed = 78): Act => ({ k: "walk", tx, speed, t0: 0 });
  const jumpTo = (el: Element | null, tx: number, fall = false): Act => ({ k: "jump", el, tx, T: 0.7, arc: 90, fall, t0: 0 });

  const goPerch = (el: Element, react: boolean) => {
    queue.length = 0; cur = null;
    const r = el.getBoundingClientRect();
    const tx = clamp(r.left + Math.min(r.width * 0.3, 140), r.left + 24, r.right - 24);
    if (!perch && Math.abs(x - tx) > 70) enqueue(walkTo(clamp(tx - 40 * Math.sign(tx - x), 28, innerWidth - 28), 92));
    enqueue(jumpTo(el, tx));
    if (react) { enqueue({ k: "wait", t: 0.2, pose: "look", t0: 0 }); queue.push({ k: "wait", t: 3.2, pose: Math.random() < 0.5 ? "think" : "look", t0: 0 }); say(reactTo(el), "think", 2200, true); lookAt(el, 4.5); }
  };

  const decide = () => {
    if (rest) { cur = { k: "wait", t: 1e9, pose: "sit", t0: ms }; return; }
    const reading = ms - scrollAt > 1000 && ms - lastGuide > 9000;
    if (reading) {
      const c = perchList().filter(({ el }) => ms - (lastVisit.get(el) ?? -1e9) > 90000 && el !== perch);
      c.sort((a, b) => Math.abs(a.r.top + a.r.height / 2 - innerHeight * 0.45) - Math.abs(b.r.top + b.r.height / 2 - innerHeight * 0.45));
      if (c[0] && Math.random() < 0.45) { lastGuide = ms; goPerch(c[0].el, true); return; }
      const t = ms - lastGlance > 7000 ? readingTarget() : null;
      if (t) { lastGuide = lastGlance = ms; lastVisit.set(t, ms); lookAt(t, 4.2); enqueue(wait(4.2, Math.random() < 0.4 ? "think" : "look")); say(reactTo(t), "think", 2400, true); return; }
    }
    if (px >= 0 && ms - movedAt > 3500 && ms - movedAt < 12000 && ms - lastCursorTalk > 40000 && Math.random() < 0.3) {
      lastCursorTalk = ms; const [lo, hi] = limits();
      enqueue(walkTo(clamp(px - 60, lo, hi), 92), wait(2.2, "wave")); say("Hello, cursor.", "plain", 1600, true); return;
    }
    const r = Math.random(), [lo, hi] = limits();
    if (r < 0.4) { let tx = lo + Math.random() * (hi - lo); if (Math.abs(tx - x) < 60) tx = clamp(x + (Math.random() < 0.5 ? -1 : 1) * 140, lo, hi); enqueue(walkTo(tx)); }
    else if (r < 0.6) { const t = 2 + Math.random() * 2.5; enqueue(wait(t, "look")); if (Math.random() < 0.45) lookAt(null, t); if (Math.random() < 0.3) say(IDLE[Math.floor(Math.random() * IDLE.length)]!, "think", 2600); }
    else if (r < 0.7) enqueue(wait(2.3, "yawn"));
    else if (r < 0.78) enqueue(wait(1.7, "wave"));
    else if (r < 0.85) enqueue(wait(3 + Math.random() * 3, "sit"));
    else {
      const c = perchList().filter(({ el }) => el !== perch);
      if (c.length) goPerch(c[Math.floor(Math.random() * c.length)]!.el, Math.random() < 0.5); else enqueue(walkTo(lo + Math.random() * (hi - lo)));
    }
  };

  const detachIfGone = () => {
    if (!perch) return;
    const r = perch.getBoundingClientRect();
    if (!perch.isConnected || r.width === 0 || r.top < 70 + H * 0.6 || r.top > innerHeight - 30) { perch = null; queue.length = 0; cur = { k: "jump", el: null, tx: x, T: 0.5, arc: 0, fall: true, t0: ms, from: { x, y } }; }
  };

  const runAct = (dt: number) => {
    detachIfGone();
    if (perch) { const r = perch.getBoundingClientRect(); y = r.top; const [lo, hi] = limits(); x = clamp(x, lo, hi); }
    else if (!cur || cur.k !== "jump") y = floorY();
    if (!cur) { cur = queue.shift() ?? null; if (cur) cur.t0 = ms; else { decide(); cur = queue.shift() ?? cur; if (cur) cur.t0 = ms; } }
    if (!cur) { wmoving = false; return; }
    const a = cur;
    if (a.k === "wait") {
      wmoving = false; poseName = a.pose;
      if (needFront() && ms - a.t0 > a.t * 1000) cur = null;
    } else if (a.k === "walk") {
      if (!needSide()) { wmoving = false; return; }
      const [lo, hi] = limits(), tx = clamp(a.tx, lo, hi), dx = tx - x;
      if (Math.abs(dx) < 3) { cur = null; wmoving = false; return; }
      face = dx > 0 ? 1 : -1; const step = Math.min(Math.abs(dx), a.speed * dt); x += face * step;
      wmoving = true; wamp = a.speed > 85 ? 1.3 : 1; wphase += (2 * Math.PI * step) / (56 * (S / 0.4577));
    } else if (a.k === "jump") {
      if (!a.from) { a.from = { x, y }; a.t0 = ms; }
      if (!needSide() && !a.fall) return;
      view = "side"; wmoving = false;
      const tr = a.el ? a.el.getBoundingClientRect() : null;
      const ty = tr ? tr.top : floorY(), txx = a.el ? clamp(a.tx, tr!.left + 16, tr!.right - 16) : a.tx;
      const dxx = txx - a.from.x, dyy = ty - a.from.y;
      if (a.fall) a.T = Math.max(0.22, Math.sqrt(Math.abs(dyy) * 2 / 1900) * 1.1);
      else a.T = clamp(0.5 + Math.hypot(dxx, dyy) / 1500, 0.5, 1.0);
      a.arc = a.fall ? 0 : Math.max(60, Math.abs(Math.min(0, dyy)) * 0.3 + 50);
      const u = clamp((ms - a.t0) / (a.T * 1000), 0, 1);
      if (Math.abs(dxx) > 2) face = dxx > 0 ? 1 : -1;
      x = a.from.x + dxx * (a.fall ? u : ease(u));
      y = a.fall ? a.from.y + dyy * u * u : a.from.y + dyy * ease(u) - 4 * a.arc * u * (1 - u);
      fly = !a.fall && Math.abs(Math.min(0, dyy)) > 160;
      if (u >= 1) { y = ty; x = txx; land(a.el); cur = null; if (a.fall && Math.abs(dyy) > 60 && Math.random() < 0.5) say(DROPS[Math.floor(Math.random() * DROPS.length)]!, "plain", 1200); }
    } else if (a.k === "xray") {
      wmoving = false; poseName = "stand";
      if (!needFront()) return;
      const u = (ms - a.t0) / 1000;
      const sc = u < 1.2 ? u / 1.2 : u > 5.2 ? 1 - (u - 5.2) / 1.2 : -1;
      d.scan.style.opacity = sc >= 0 ? "1" : "0"; if (sc >= 0) d.scan.style.top = `${clamp(sc, 0, 1) * 90 + 3}%`;
      fsvg.setAttribute("data-x", u > 1.1 && u < 5.3 ? "1" : "0");
      if (u > 6.4) { d.scan.style.opacity = "0"; fsvg.setAttribute("data-x", "0"); cur = null; }
    }
  };

  // ---- the wake-up sequence (front view, lying on the bottom of the screen)
  const goWake = (n: Wake) => {
    wake = n; pt = 0; fsvg.setAttribute("data-phase", n === "sleep" ? "sleep" : "");
    if (n === "waking") say("...five more minutes.", "plain", 1000, true);
    if (n === "sitting") say("Booting up...", "plain", 900, true);
    if (n === "yawn") say("*yaaawn*", "plain", 1700, true);
  };
  const finishWake = () => {
    mode = "free"; try { sessionStorage.setItem("robo-woke", "1"); } catch { /* private mode */ }
    cur = null; fsvg.setAttribute("data-phase", "");
    say("Where am I?", "think", 1300, true);
    say("RO-BIO. Biomedical and Robotic Engineering. Okay, I like it.", "plain", 2200);
    say("Is that a cursor? Fascinating.", "think", 1600);
    say("I can walk now. Watch!", "plain", 1800);
    enqueue(wait(2.2, "look"));
    nextIdle = ms + 12000;
  };
  const wakeTargets = () => {
    switch (wake) {
      case "sleep": Object.assign(ftgt, POSES.sleep); if (tAll > wakeAt) goWake("waking"); break;
      case "waking": Object.assign(ftgt, POSES.sleep, { hr: 3, aLe: -95, mouth: 0.1, eye: [0.5, 0.1, 0.6, 0.15][Math.min(3, Math.floor(pt / 0.22))]! }); if (pt > 1) goWake("sitting"); break;
      case "sitting": Object.assign(ftgt, POSES.sit, { eye: 0.6 }); if (pt > 1.1) goWake("standing"); break;
      case "standing": Object.assign(ftgt, POSES.stand, { eye: 0.75, mouth: 0.15, spine: 3 }); if (pt > 1.3) goWake("yawn"); break;
      case "yawn": Object.assign(ftgt, POSES.yawn, { mouth: pt > 0.5 ? 1 : 0.4, eye: pt > 0.4 ? 0.06 : 0.3 }); if (pt > 2.1) goWake("relax"); break;
      case "relax": { const sh = Math.exp(-pt * 2.2) * Math.sin(pt * 16) * 14; Object.assign(ftgt, POSES.stand, { aLs: 8 + sh, aRs: 8 - sh, eye: 1, hr: 6 }); if (pt > 1) finishWake(); break; }
    }
  };

  // ---- front-view pose targets for the free actions
  const frontTargets = () => {
    const base = poseName === "yawn" ? POSES.yawn : poseName === "sit" ? POSES.sit : poseName === "held" ? POSES.held : POSES.stand;
    Object.assign(ftgt, base);
    if (poseName === "stand" || poseName === "look" || poseName === "think" || poseName === "wave") Object.assign(ftgt, { aLs: 8 + 1.6 * Math.sin(tAll * 1.3), aRs: 8 + 1.6 * Math.sin(tAll * 1.1 + 1) });
    if ((poseName === "think") || (msg && mkind === "think" && poseName !== "yawn" && poseName !== "sit" && poseName !== "held")) Object.assign(ftgt, { aRs: POSES.think.aRs, aRe: POSES.think.aRe });
    if (poseName === "wave" || tAll < waveUntil) Object.assign(ftgt, { aRs: 118, aRe: -8 + 22 * Math.sin(tAll * 14), mouth: 0.35 });
    if (poseName === "yawn" || poseName === "sit" || poseName === "held") return;
    if (gaze && (ms > gaze.until || (gaze.el && !gaze.el.isConnected))) gaze = null;
    // Look at the section he is thinking about, else at the cursor. Looking at something means a proper head tilt.
    let tx = px, ty = py;
    if (gaze?.el) { const r = gaze.el.getBoundingClientRect(); tx = clamp(r.left + r.width / 2, r.left, r.right); ty = r.top + Math.min(r.height / 2, 40); }
    else if (gaze) { tx = headC.x; ty = headC.y; }
    if (tx < 0 && !gaze) return;
    const dx = clamp((tx - headC.x) / 320, -1, 1), dy = clamp((ty - headC.y) / 320, -1, 1);
    const cock = gaze ? (gaze.el ? Math.sign(dx || gaze.cock) : gaze.cock) * 11 : 0;
    const hr = (msg && mkind === "think" ? 7 : 0) + dx * 22 + cock, lean = clamp(hr / 33, -1, 1);
    // The shoulder on the side he tilts towards lifts a little, the other drops: a light, human shrug.
    Object.assign(ftgt, { hr, lx: dx * 2.9, ly: dy * 2.3, spine: dx * 2.5 + lean * 1.5, shR: 2.6 * lean, shL: -2.6 * lean });
    if (poseName !== "wave" && tAll >= waveUntil) { ftgt.aLs += Math.max(0, -lean) * 4; ftgt.aRs += Math.max(0, lean) * 4; }
  };

  // ---- travel between pages
  const startTravel = (P: V | null) => {
    if (mode === "wake" || mode === "carried" || mode === "static" || rest) return;
    cur = null; queue.length = 0; perch = null; mq.length = 0; msg = null; d.bubble.setAttribute("data-on", "false");
    mode = "travel"; puppetOp = 1;
    travel = P ? { st: "leap", P, t0: ms, from: { x, y }, routeAt: -1, path: currentPath } : { st: "wait", P: null, t0: ms, from: { x, y }, routeAt: ms, path: currentPath };
    if (!P) puppetOp = 0;
  };
  const updateTravel = () => {
    const t = travel!; const el = ms - t.t0;
    if (t.st === "leap") {
      view = "side"; wmoving = false;
      const T = clamp(500 + Math.hypot(t.P!.x - t.from.x, t.P!.y - t.from.y) / 1.4, 500, 950), u = clamp(el / T, 0, 1), dxx = t.P!.x - t.from.x;
      if (Math.abs(dxx) > 2) face = dxx > 0 ? 1 : -1;
      x = t.from.x + dxx * ease(u); y = t.from.y + (t.P!.y - t.from.y) * ease(u) - 4 * 70 * u * (1 - u); fly = Math.abs(t.P!.y - t.from.y) > 120;
      if (u >= 0.55 && !t.hole) { t.hole = true; ring(d.ringA, t.P!); } // the black hole opens before he gets there
      if (u >= 1) { t.st = "in"; t.t0 = ms; say("Uh oh.", "plain", 500, true); }
    } else if (t.st === "in") {
      // Pulled in: he spirals round the hole, shrinks to a point and gets stretched on the way down.
      const u = clamp(el / 560, 0, 1), e = ease(u), a = e * Math.PI * 2.4, rad = 34 * (1 - e);
      x = t.P!.x + Math.cos(a) * rad; y = t.P!.y + Math.sin(a) * rad * 0.5; fly = false;
      sx = (1 - 0.97 * e) * (1 - 0.25 * Math.sin(Math.PI * u)); sy = (1 - 0.97 * e) * (1 + 0.6 * Math.sin(Math.PI * u)); rot = 720 * e;
      if (u >= 1) { puppetOp = 0; t.st = "wait"; t.t0 = ms; }
    } else if (t.st === "wait") {
      puppetOp = 0;
      if ((t.routeAt > 0 && ms - t.routeAt > 320) || el > 2200) {
        const h1 = document.querySelector("main h1"), r = h1?.getBoundingClientRect();
        if (h1 && r && r.top >= 78 + H * 0.9 && r.top <= innerHeight - 140 && ms - t.routeAt >= 0) t.Q = { x: clamp(r.left + 80, 40, innerWidth - 40), y: r.top - 70 }, t.el = h1;
        else t.Q = { x: innerWidth * 0.5, y: innerHeight * 0.4 }, t.el = null;
        t.st = "out"; t.t0 = ms; x = t.Q.x; y = t.Q.y; view = "front"; poseName = "stand"; ring(d.ringB, t.Q, true);
      }
    } else if (t.st === "out") {
      // The new hole opens first, then spits him out spinning.
      const u = clamp((el - 200) / 420, 0, 1); puppetOp = el < 200 ? 0 : 1; x = t.Q!.x; y = t.Q!.y;
      sx = sy = Math.max(0.03, u < 0.7 ? (u / 0.7) * 1.15 : 1.15 - 0.15 * ((u - 0.7) / 0.3)); rot = -540 * (1 - ease(u));
      if (u >= 1) { sx = sy = 1; rot = 0; t.st = "drop"; t.t0 = ms; t.from = { x, y }; view = "side"; }
    } else if (t.st === "drop") {
      view = "side"; wmoving = false;
      const ty = t.el ? t.el.getBoundingClientRect().top : floorY(), dyy = ty - t.from.y, T = Math.max(0.22, Math.sqrt(Math.abs(dyy) * 2 / 1900) * 1.1), u = clamp(el / (T * 1000), 0, 1);
      y = t.from.y + dyy * u * u;
      if (u >= 1) { y = ty; land(t.el ?? null); startAfterTravel(); }
    }
  };
  const startAfterTravel = () => {
    const path = currentPath; travel = null; mode = "free"; view = "side"; startTurn("front");
    say("Made it. Still in one piece.", "plain", 1100, true);
    say(GREET[path] ?? "New page. Let us look around.", "plain", 2200);
    enqueue(wait(2.4, "look"));
  };

  // ---- input
  const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; movedAt = ms; };
  const onScroll = () => { scrollAt = ms; };
  const onOver = (e: PointerEvent) => {
    if (mode !== "free" || rest) return;
    const t = (e.target as Element | null)?.closest?.("[data-thought]")?.getAttribute("data-thought");
    if (t && ms - (hovered.get(t) ?? -1e9) > 8000) { hovered.set(t, ms); say(t, "think", 2400); }
  };
  const onLink = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.search === location.search) return;
    const r = a.getBoundingClientRect();
    if (reduced) return;
    startTravel({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };
  const tap = () => {
    if (mode === "wake") { if (wake === "sleep") wakeAt = tAll; return; }
    if (mode === "static") { say(POKES[Math.floor(Math.random() * POKES.length)]!, "plain", 2400, true); o.onTap?.(x, y - H / 2); return; }
    o.onTap?.(x, y - H / 2);
  };
  // Dropped over something: land on the smallest thing under the pointer. Otherwise fall onto whatever is below his feet.
  const dropTarget = (cx: number, cy: number) => {
    const list = perchList();
    const under = list.filter(({ r }) => cx >= r.left && cx <= r.right && cy >= r.top - 70 && cy <= r.bottom).sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height)[0];
    if (under) return under.el;
    const below = list.filter(({ r }) => x >= r.left && x <= r.right && r.top >= y - 24).sort((a, b) => a.r.top - b.r.top)[0];
    return below ? below.el : null;
  };
  const onDown = (e: PointerEvent) => {
    if (mode === "wake" || mode === "travel" || reduced) return;
    carry = { sx: e.clientX, sy: e.clientY, down: true, moved: false, t0: ms, lx: e.clientX, vx: 0 };
    d.hit.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: PointerEvent) => {
    if (!carry) return;
    if (!carry.moved && Math.hypot(e.clientX - carry.sx, e.clientY - carry.sy) > 6) {
      carry.moved = true; mode = "carried"; cur = null; queue.length = 0; perch = null; fly = false; view = "front"; poseName = "held"; startTurn("front");
      say("Whoa!", "plain", 900, true);
    }
    if (carry.moved) { carry.vx = e.clientX - carry.lx; carry.lx = e.clientX; x = clamp(e.clientX, 30, innerWidth - 30); y = clamp(e.clientY + H * 0.82, 90, innerHeight + 10); }
  };
  const onUp = (e: PointerEvent) => {
    if (!carry) return;
    const wasDrag = carry.moved; carry = null;
    try { d.hit.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (!wasDrag) { tap(); return; }
    mode = "free"; poseName = "stand"; rot = 0;
    const el = dropTarget(e.clientX, e.clientY);
    const up = !!el && el.getBoundingClientRect().top < y - 10;
    cur = { k: "jump", el, tx: x, T: 0.5, arc: 0, fall: !up, t0: ms, from: { x, y } };
    queue.length = 0; enqueue(wait(2.4, "look")); // a moment to enjoy where he landed
    say(DROPS[Math.floor(Math.random() * DROPS.length)]!, "plain", 1300, true);
  };
  const onKey = (e: MouseEvent) => { if (e.detail === 0) tap(); };
  const onResize = () => { sizeUp(); x = clamp(x, 30, innerWidth - 30); if (!perch) y = floorY(); };
  d.hit.addEventListener("pointerdown", onDown); d.hit.addEventListener("pointermove", onDrag); d.hit.addEventListener("pointerup", onUp); d.hit.addEventListener("pointercancel", onUp); d.hit.addEventListener("click", onKey);
  addEventListener("pointermove", onMove, { passive: true }); addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onResize);
  document.addEventListener("pointerover", onOver); document.addEventListener("click", onLink, true);

  // ---- start position
  if (reduced) { mode = "static"; x = innerWidth - 56; Object.assign(fcur, POSES.stand); Object.assign(ftgt, POSES.stand); fsvg.setAttribute("data-phase", ""); }
  else if (o.seen) {
    mode = "free"; x = -60; Object.assign(fcur, POSES.stand); Object.assign(ftgt, POSES.stand); view = "side"; face = 1;
    enqueue(walkTo(innerWidth * 0.16, 100), wait(1.6, "look")); say("Back already?", "plain", 1800);
  } else { x = clamp(innerWidth * 0.1 + 70, 90, innerWidth - 90); }
  if (view === "front") { d.front.style.display = ""; d.side.style.display = "none"; } else { d.front.style.display = "none"; d.side.style.display = ""; }

  // ---- the loop
  const frame = (now: number) => {
    const dt = (last ? Math.min(0.05, (now - last) / 1000) : 0.016) * scale; last = now;
    tAll += dt; pt += dt; ms += dt * 1000;
    sx = 1; sy = 1; rot = 0; puppetOp = 1; fly = false;

    if (mode === "wake") { wakeTargets(); poseName = "stand"; }
    else if (mode === "free") { runAct(dt); if (mode === "free") { if (!(cur && cur.k === "walk") && wmoving) wmoving = false; } }
    else if (mode === "carried") { poseName = "held"; rot = clamp((carry?.vx ?? 0) * 0.9, -16, 16); if (carry) carry.vx *= 0.85; }
    else if (mode === "travel") { updateTravel(); }
    if (mode === "static") { poseName = "stand"; y = floorY(); }
    if (mode === "free" || mode === "wake" || mode === "static") { if (!perch && !(cur && cur.k === "jump")) y = floorY(); }
    if (mode === "wake") y = floorY();
    if (mode === "carried" && !carry) mode = "free";

    // turn animation: squash sideways, swap the view in the middle
    let tsx = 1;
    if (turn) {
      const u = clamp((ms - turn.t0) / 160, 0, 1);
      if (u >= 0.5 && view !== turn.to) view = turn.to;
      tsx = Math.max(0.08, Math.abs(1 - 2 * u)); if (u >= 1) turn = null;
    }
    // landing squash
    let qy = 1, qx = 1; if (squash >= 0) { const u = (ms - squash) / 160; if (u >= 1) squash = -1; else { const e = Math.sin(Math.PI * u); qy = 1 - 0.16 * e; qx = 1 + 0.12 * e; } }
    if (!reduced && mode !== "carried" && wcur) { /* walk smoothing below */ }

    // pose update for the visible view
    if (view === "front") {
      if (mode === "free") frontTargets();
      if (mode === "static") frontTargets();
      if (ms - headAt > 120) { const r = parts.get("head")?.getBoundingClientRect(); if (r && r.width) headC = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; headAt = ms; }
      for (const k of Object.keys(fcur) as (keyof Pose)[]) fcur[k] += (ftgt[k] - fcur[k]) * (reduced ? 1 : 1 - Math.exp(-dt * (RATES[k] ?? 7)));
      beatPh += (dt * heart.bpm * (mode === "wake" && wake === "sleep" ? 0.8 : 1)) / 60;
      if (tAll > blinkAt + 0.14) blinkAt = tAll + 2.5 + Math.random() * 3.5;
      const blink = mode !== "wake" && tAll > blinkAt && tAll < blinkAt + 0.14 ? 0 : 1;
      const out: Pose = { ...fcur, eye: fcur.eye * blink, breath: reduced ? 0 : (Math.sin(tAll * (mode === "wake" && wake === "sleep" ? 1.3 : 2)) + 1) / 2, beat: beatAt(beatPh) };
      fsvg.setAttribute("data-air", mode === "carried" || mode === "travel" ? "1" : "0");
      for (const m of [transforms(out), opacities(out)]) for (const [id, v] of Object.entries(m)) if (shown.get("f" + id) !== v) { shown.set("f" + id, v); parts.get(id)?.setAttribute(id.startsWith("closed") ? "opacity" : "transform", v); }
    } else {
      const want: WalkPose = mode === "travel" || (cur && cur.k === "jump")
        ? (cur && cur.k === "jump" && cur.fall) || (travel && travel.st === "drop") ? WALK_FALL : WALK_JUMP
        : wmoving ? walkCycle(wphase, wamp) : { ...WALK_IDLE };
      const w = wcur as unknown as Record<string, number>, g = want as unknown as Record<string, number>;
      const a = reduced ? 1 : 1 - Math.exp(-dt * 16);
      for (const k of Object.keys(w)) w[k]! += (g[k]! - w[k]!) * a;
      if (!wmoving && !(cur && cur.k === "jump") && mode !== "travel") wcur = { ...wcur };
      if (tAll > blinkAt + 0.14) blinkAt = tAll + 2.5 + Math.random() * 3.5;
      wcur.eye = tAll > blinkAt && tAll < blinkAt + 0.14 ? 0 : 1;
      for (const [id, v] of Object.entries(walkTransforms(wcur, !(mode === "travel" || (cur && cur.k === "jump"))))) if (shown.get("w" + id) !== v) { shown.set("w" + id, v); wparts.get(id)?.setAttribute("transform", v); }
      wsvg.setAttribute("data-fly", fly ? "1" : "0");
      wsvg.setAttribute("data-air", mode === "travel" || (cur && cur.k === "jump") ? "1" : "0");
    }
    d.front.style.display = view === "front" ? "" : "none"; d.side.style.display = view === "side" ? "" : "none";
    d.side.style.transform = face < 0 ? "scaleX(-1)" : "";

    // place him
    d.robo.style.transform = `translate(${(x - 130 * S).toFixed(1)}px, ${(y - 266 * S).toFixed(1)}px)`;
    d.puppet.style.transform = `rotate(${rot.toFixed(1)}deg) scale(${(sx * tsx * qx).toFixed(3)}, ${(sy * qy).toFixed(3)})`;
    d.puppet.style.opacity = String(puppetOp);

    // messages
    if (!msg && mq.length && ms >= msgDone) { msg = mq.shift()!; msgAt = ms; mkind = msg.kind; d.bubble.setAttribute("data-on", "true"); d.live.textContent = msg.text; }
    if (msg) {
      const n = reduced ? msg.text.length : Math.floor((ms - msgAt) / 30);
      d.bubble.textContent = msg.text.slice(0, n) + (n < msg.text.length ? "▌" : "");
      const bw = d.bubble.offsetWidth, bh = d.bubble.offsetHeight;
      d.bubble.style.transform = `translate(${clamp(x - bw * 0.3, 8, innerWidth - bw - 8).toFixed(0)}px, ${Math.max(78, y - H - bh - 6).toFixed(0)}px)`;
      if (n >= msg.text.length && ms - msgAt > msg.text.length * 30 + msg.hold) { msg = null; mkind = "plain"; d.bubble.setAttribute("data-on", "false"); msgDone = ms + 350; }
    } else if (mode === "free" && !rest && !cur && !queue.length && !mq.length && ms > nextIdle) { say(IDLE[Math.floor(Math.random() * IDLE.length)]!, "think", 2600); nextIdle = ms + 12000 + Math.random() * 7000; }

    // while he lies asleep, the clickable area is the lying shape
    const lying = mode === "wake" && (wake === "sleep" || wake === "waking");
    if (lying !== hitLying) { hitLying = lying; d.hit.style.inset = lying ? "58% 2% 0 2%" : ""; }

    // never block taps on the games: switch the hit area off while he is in front of one
    if (ms - avoidAt > 150) { avoidAt = ms; const hr = d.hit.getBoundingClientRect(); d.hit.style.pointerEvents = d.puppet.style.opacity === "0" || avoids().some((a) => overlap(hr, a)) ? "none" : "auto"; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    state: () => ({ mode, wake, act: cur?.k ?? null, view, x, y, face, onPerch: !!perch, perchTag: perch?.tagName ?? null, travel: travel?.st ?? null, rest, msg: msg?.text ?? null, op: puppetOp }),
    goPerch: (el: Element) => goPerch(el, true),
    startTravel, perchList,
    onRoute(path: string) {
      currentPath = path;
      if (travel) { if (travel.routeAt < 0) travel.routeAt = ms; return; }
      if (mode === "free" && !reduced && !rest) startTravel(null);
    },
    setRest(v: boolean) { rest = v; if (v && mode === "free") { cur = { k: "wait", t: 1e9, pose: "sit", t0: ms }; queue.length = 0; mq.length = 0; msg = null; d.bubble.setAttribute("data-on", "false"); } else if (!v && mode === "free") { cur = null; queue.length = 0; say("Ah, that was nice.", "plain", 1400, true); } },
    emote(kind: "xray" | "wave" | "poke") {
      if (mode !== "free" && mode !== "static") return; rest = false;
      if (kind === "xray") { if (reduced) { fsvg.setAttribute("data-x", fsvg.getAttribute("data-x") === "1" ? "0" : "1"); return; } cur = { k: "xray", t0: ms }; queue.length = 0; say("Scanning... biology under the plastic.", "plain", 2200, true); }
      else if (kind === "wave") { cur = null; queue.length = 0; enqueue(wait(1.7, "wave")); }
      else { waveUntil = tAll + 1.6; say(POKES[Math.floor(Math.random() * POKES.length)]!, "plain", 2400, true); }
    },
    stop() {
      cancelAnimationFrame(raf);
      d.hit.removeEventListener("pointerdown", onDown); d.hit.removeEventListener("pointermove", onDrag); d.hit.removeEventListener("pointerup", onUp); d.hit.removeEventListener("pointercancel", onUp); d.hit.removeEventListener("click", onKey);
      removeEventListener("pointermove", onMove); removeEventListener("scroll", onScroll); removeEventListener("resize", onResize);
      document.removeEventListener("pointerover", onOver); document.removeEventListener("click", onLink, true);
    },
  };
}
