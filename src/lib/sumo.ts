// Robo Sumo: two wedge-front robots on a round dohyo. No dependencies, so it can be tested headlessly.
// Units are pixels and seconds. The dohyo is centred at (160, 160) with radius 130, like the SVG.

export const RING = { cx: 160, cy: 160, radius: 130, lineR: 119 };
/** After this many seconds the dohyo shrinks, so a stalemate always ends in a push. */
export const SUDDEN_DEATH = { after: 22, rate: 2.5, minR: 78 };
export type V = { x: number; y: number };
export type Tactic = "ENGAGE" | "FLANK" | "SIDESTEP" | "SURGE" | "BACKOFF" | "RECOVER";

/** Convex hull in robot space, nose along +x: a box with a wedge plow at the front. */
export const HULL: V[] = [
  { x: -17, y: -14 }, { x: -17, y: 14 }, { x: 9, y: 14 },
  { x: 22, y: 6 }, { x: 22, y: -6 }, { x: 9, y: -14 },
];
/** Line sensors at the four corners, just outside the body: front-left, front-right, back-left, back-right. */
export const SENSORS: V[] = [{ x: 22, y: -13 }, { x: 22, y: 13 }, { x: -20, y: -16 }, { x: -20, y: 16 }];

export type Bot = {
  x: number; y: number; vx: number; vy: number; h: number; w: number;
  m: number; I: number; power: number; turn: number;
  grip: number; fade: number; thr: number; sensors: boolean[];
};

export type Tune = {
  power: number; cpuPower: number; turn: number; cpuTurn: number;
  reaction: number; flank: number; dodge: number; sidestep: number; pushedAfter: number; fadeRate: number;
};
export const DEFAULT_TUNE: Tune = { power: 170, cpuPower: 255, turn: 3.2, cpuTurn: 4.6, reaction: 0.07, flank: 0.4, dodge: 0.9, sidestep: 0.65, pushedAfter: 0.45, fadeRate: 0.18 };

type Brain = {
  tactic: Tactic; until: number; nextThink: number; heading: number; throttle: number;
  pushedFor: number; cyc: "SURGE" | "BACKOFF"; cycUntil: number; side: 1 | -1;
};

export type Match = {
  t: number; ringR: number; bots: [Bot, Bot]; brain: Brain; tune: Tune; rng: () => number;
  contact: boolean; contactPoint: V | null; hit: number; rumble: number;
  over: null | "you" | "cpu" | "time"; winner: null | "you" | "cpu"; limit: number;
};

export type Control = { heading: number; throttle: number };

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const cross = (a: V, b: V) => a.x * b.y - a.y * b.x;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBot(x: number, h: number, power: number, turn: number): Bot {
  const m = 1;
  return { x, y: RING.cy, vx: 0, vy: 0, h, w: 0, m, I: (m * (39 * 39 + 28 * 28)) / 12, power, turn, grip: 1, fade: 0, thr: 0, sensors: [false, false, false, false] };
}

export function makeMatch(seed = 1, tune: Partial<Tune> = {}): Match {
  const t = { ...DEFAULT_TUNE, ...tune };
  return {
    t: 0, ringR: RING.radius, tune: t, rng: mulberry32(seed), limit: 70,
    bots: [makeBot(RING.cx - 60, 0, t.power, t.turn), makeBot(RING.cx + 60, Math.PI, t.cpuPower, t.cpuTurn)],
    brain: { tactic: "ENGAGE", until: 0, nextThink: 0.25, heading: Math.PI, throttle: 1, pushedFor: 0, cyc: "SURGE", cycUntil: 0, side: 1 },
    contact: false, contactPoint: null, hit: 0, rumble: 0, over: null, winner: null,
  };
}

/** The robot outline in world space. */
export function world(b: Bot, pts: V[] = HULL): V[] {
  const c = Math.cos(b.h), s = Math.sin(b.h);
  return pts.map((p) => ({ x: b.x + p.x * c - p.y * s, y: b.y + p.x * s + p.y * c }));
}

function inside(p: V, poly: V[]) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
    const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (c !== 0) { if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c); }
  }
  return true;
}

export type Contact = { n: V; depth: number; p: V };

/** Separating-axis test. The normal points from a to b. */
export function contactOf(a: Bot, b: Bot): Contact | null {
  const A = world(a), B = world(b);
  let depth = Infinity, axis: V = { x: 1, y: 0 };
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len };
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const v of A) { const d = v.x * n.x + v.y * n.y; minA = Math.min(minA, d); maxA = Math.max(maxA, d); }
      for (const v of B) { const d = v.x * n.x + v.y * n.y; minB = Math.min(minB, d); maxB = Math.max(maxB, d); }
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return null;
      if (overlap < depth) { depth = overlap; axis = n; }
    }
  }
  if ((b.x - a.x) * axis.x + (b.y - a.y) * axis.y < 0) axis = { x: -axis.x, y: -axis.y };
  const pts = [...A.filter((v) => inside(v, B)), ...B.filter((v) => inside(v, A))];
  const p = pts.length
    ? { x: pts.reduce((s, v) => s + v.x, 0) / pts.length, y: pts.reduce((s, v) => s + v.y, 0) / pts.length }
    : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return { n: axis, depth, p };
}

/** Wedge advantage: hit a robot from the side or back and it loses grip. Head-on is a fair shoving match. */
function tractions(a: Bot, b: Bot, c: Contact | null): [number, number] {
  if (!c) return [1, 1];
  const fa = { x: Math.cos(a.h), y: Math.sin(a.h) }, fb = { x: Math.cos(b.h), y: Math.sin(b.h) };
  const aInto = Math.max(0, fa.x * c.n.x + fa.y * c.n.y);
  const bInto = Math.max(0, -(fb.x * c.n.x + fb.y * c.n.y));
  return [clamp(1 - 0.55 * bInto * (1 - aInto), 0.45, 1.1) + 0.1 * aInto * (1 - bInto), clamp(1 - 0.55 * aInto * (1 - bInto), 0.45, 1.1) + 0.1 * bInto * (1 - aInto)];
}

function actuate(bot: Bot, ctl: Control, traction: number, dt: number) {
  const err = wrap(ctl.heading - bot.h);
  const wd = clamp(err * 9, -bot.turn, bot.turn);
  bot.w += (wd - bot.w) * (1 - Math.exp(-dt / 0.09));
  const align = Math.max(0, Math.cos(err));
  const thr = ctl.throttle >= 0 ? ctl.throttle * (0.25 + 0.75 * align) : ctl.throttle;
  bot.thr = thr;
  const f = { x: Math.cos(bot.h), y: Math.sin(bot.h) }, l = { x: -f.y, y: f.x };
  traction *= 1 - bot.fade; // wheel slip from pushing hard for too long
  const a = (thr * bot.power * traction) / bot.m;
  bot.vx += f.x * a * dt; bot.vy += f.y * a * dt;
  let vf = bot.vx * f.x + bot.vy * f.y, vl = bot.vx * l.x + bot.vy * l.y;
  vf *= Math.exp(-1.4 * dt);
  vl *= Math.exp(-9 * traction * dt); // wheels grip sideways, unless the wedge has lifted them
  bot.vx = f.x * vf + l.x * vl; bot.vy = f.y * vf + l.y * vl;
  bot.grip = traction;
}

function resolve(a: Bot, b: Bot, c: Contact): number {
  const ra = { x: c.p.x - a.x, y: c.p.y - a.y }, rb = { x: c.p.x - b.x, y: c.p.y - b.y };
  const va = { x: a.vx - a.w * ra.y, y: a.vy + a.w * ra.x }, vb = { x: b.vx - b.w * rb.y, y: b.vy + b.w * rb.x };
  const rel = { x: vb.x - va.x, y: vb.y - va.y };
  const vn = rel.x * c.n.x + rel.y * c.n.y;
  let jn = 0;
  const raN = cross(ra, c.n), rbN = cross(rb, c.n);
  const k = 1 / a.m + 1 / b.m + (raN * raN) / a.I + (rbN * rbN) / b.I;
  if (vn < 0) {
    jn = (-(1 + 0.06) * vn) / k;
    a.vx -= (jn * c.n.x) / a.m; a.vy -= (jn * c.n.y) / a.m; a.w -= (raN * jn) / a.I;
    b.vx += (jn * c.n.x) / b.m; b.vy += (jn * c.n.y) / b.m; b.w += (rbN * jn) / b.I;
    const t = { x: -c.n.y, y: c.n.x }, vt = rel.x * t.x + rel.y * t.y;
    const raT = cross(ra, t), rbT = cross(rb, t);
    const kt = 1 / a.m + 1 / b.m + (raT * raT) / a.I + (rbT * rbT) / b.I;
    const jt = clamp(-vt / kt, -0.45 * jn, 0.45 * jn);
    a.vx -= (jt * t.x) / a.m; a.vy -= (jt * t.y) / a.m; a.w -= (raT * jt) / a.I;
    b.vx += (jt * t.x) / b.m; b.vy += (jt * t.y) / b.m; b.w += (rbT * jt) / b.I;
  }
  const push = (c.depth * 0.8) / (a.m + b.m);
  a.x -= c.n.x * push * b.m; a.y -= c.n.y * push * b.m;
  b.x += c.n.x * push * a.m; b.y += c.n.y * push * a.m;
  return jn;
}

export const radiusOf = (b: Bot) => Math.hypot(b.x - RING.cx, b.y - RING.cy);
export const toCentre = (b: Bot) => Math.atan2(RING.cy - b.y, RING.cx - b.x);

function readSensors(b: Bot, ringR: number) {
  b.sensors = world(b, SENSORS).map((p) => Math.hypot(p.x - RING.cx, p.y - RING.cy) >= ringR - 11);
}

// ---------------------------------------------------------------- CPU brain

function think(m: Match) {
  const [P, C] = m.bots, br = m.brain, tn = m.tune, rng = m.rng;
  const dx = P.x - C.x, dy = P.y - C.y, dist = Math.hypot(dx, dy), toP = Math.atan2(dy, dx);
  const rC = radiusOf(C), rP = radiusOf(P), centre = toCentre(C);
  const noise = (rng() - 0.5) * 0.16;
  const set = (tactic: Tactic, heading: number, throttle: number, hold = 0) => {
    br.tactic = tactic; br.heading = heading + noise; br.throttle = throttle; br.until = m.t + hold;
  };
  // Unit vector from the centre out to the player. To shove them out, we want to be on the centre side of them.
  const ux = rP > 8 ? (P.x - RING.cx) / rP : Math.cos(toP), uy = rP > 8 ? (P.y - RING.cy) / rP : Math.sin(toP);
  const onInnerSide = (C.x - P.x) * -ux + (C.y - P.y) * -uy > 0;
  const bearing = Math.atan2(C.y - P.y, C.x - P.x), inner = Math.atan2(-uy, -ux);
  const delta = wrap(inner - bearing);

  // 1. Line sensors win over everything: get back inside the ring.
  const front = C.sensors[0] || C.sensors[1], rear = C.sensors[2] || C.sensors[3];
  if (front || rear || rC > m.ringR * 0.86) {
    const facingIn = Math.abs(wrap(centre - C.h)) < 1.75;
    if (facingIn) set("RECOVER", centre, 1, 0.4); else set("RECOVER", centre + Math.PI, -1, 0.4);
    return;
  }
  if (m.t < br.until && br.tactic === "SIDESTEP") return;

  // 2. In contact.
  if (m.contact) {
    // Losing ground towards the edge, or on the wrong side of them: slip sideways round to the inside.
    if ((!onInnerSide && rng() < 0.9) || (br.pushedFor > tn.pushedAfter && rC > 55 && rng() < tn.sidestep)) {
      const side: 1 | -1 = delta >= 0 ? 1 : -1;
      set("SIDESTEP", toP + side * (Math.PI / 2), 1, 0.5);
      br.pushedFor = 0; return;
    }
    // Otherwise brace, then ram in bursts. Backing off also gives the wheels their grip back.
    if (br.cycUntil <= m.t || C.fade > 0.2) {
      br.cyc = br.cyc === "SURGE" && C.fade <= 0.2 ? "BACKOFF" : "SURGE";
      if (C.fade > 0.2) br.cyc = "BACKOFF";
      br.cycUntil = m.t + (br.cyc === "BACKOFF" ? 0.25 + 0.15 * rng() : 0.55 + 0.4 * rng());
    }
    set(br.cyc, toP, br.cyc === "BACKOFF" ? -1 : 1);
    return;
  }

  // 3. Someone is charging straight at us: step aside and let them go past.
  const rv = { x: P.vx - C.vx, y: P.vy - C.vy };
  const closing = -(rv.x * (dx / (dist || 1)) + rv.y * (dy / (dist || 1)));
  const theyFaceUs = Math.cos(wrap(toP + Math.PI - P.h));
  if (dist < 150 && closing > 55 && theyFaceUs > 0.88 && rng() < tn.dodge) {
    const side: 1 | -1 = delta >= 0 ? 1 : -1;
    set("SIDESTEP", toP + side * (Math.PI / 2), 1, 0.45);
    return;
  }

  // 4. Approach. Not on the centre side yet: orbit round them. Otherwise go straight in and push outward.
  if (!onInnerSide || Math.abs(delta) > 0.6) {
    if (rng() < tn.flank || br.tactic === "FLANK") {
      const step = clamp(delta, -0.75, 0.75), r = Math.max(64, dist);
      const wx = P.x + Math.cos(bearing + step) * r, wy = P.y + Math.sin(bearing + step) * r;
      set("FLANK", Math.atan2(wy - C.y, wx - C.x), 1); return;
    }
  }
  const lead = 0.22;
  set("ENGAGE", Math.atan2(P.y + P.vy * lead - C.y, P.x + P.vx * lead - C.x), 1);
}

// ---------------------------------------------------------------- the step

/** Advance one fixed step. `you` is the player's control, or null for no input. */
export function step(m: Match, you: Control | null, dt: number) {
  if (m.over) return;
  const [P, C] = m.bots;
  m.t += dt;
  m.ringR = Math.max(SUDDEN_DEATH.minR, RING.radius - Math.max(0, m.t - SUDDEN_DEATH.after) * SUDDEN_DEATH.rate);
  readSensors(P, m.ringR); readSensors(C, m.ringR);

  const pre = contactOf(P, C);
  const [tp, tc] = tractions(P, C, pre);

  if (m.t >= m.brain.nextThink) { think(m); m.brain.nextThink = m.t + m.tune.reaction * (0.7 + 0.6 * m.rng()); }
  actuate(P, you ?? { heading: P.h, throttle: 0 }, tp, dt);
  actuate(C, { heading: m.brain.heading, throttle: m.brain.throttle }, tc, dt);

  for (const b of m.bots) { b.x += b.vx * dt; b.y += b.vy * dt; b.h += b.w * dt; }

  const c = contactOf(P, C);
  for (const b of m.bots) {
    const pushing = !!c && b.thr > 0.4;
    b.fade = clamp(b.fade + (pushing ? m.tune.fadeRate : -0.4) * dt, 0, 0.55);
  }
  m.contact = !!c;
  m.contactPoint = c ? c.p : null;
  if (c) {
    const j = resolve(P, C, c);
    m.hit = Math.max(m.hit, j);
    const pairSpeed = Math.hypot((P.vx + C.vx) / 2, (P.vy + C.vy) / 2);
    m.rumble = clamp(0.2 + 0.5 * (pairSpeed / 60) + 0.3 * ((Math.abs(P.thr) + Math.abs(C.thr)) / 2), 0, 1);
    // Is the CPU being shoved away from the player?
    const away = C.vx * c.n.x + C.vy * c.n.y;
    m.brain.pushedFor = away > 14 ? m.brain.pushedFor + dt : Math.max(0, m.brain.pushedFor - dt * 1.5);
  } else {
    m.rumble = 0; m.brain.pushedFor = Math.max(0, m.brain.pushedFor - dt * 2);
  }

  const outP = radiusOf(P) > m.ringR, outC = radiusOf(C) > m.ringR;
  if (outP || outC) { m.winner = outC && !outP ? "you" : "cpu"; m.over = m.winner; }
  else if (m.t >= m.limit) { m.winner = radiusOf(P) < radiusOf(C) ? "you" : "cpu"; m.over = "time"; }
}

/** Turn a direction (arrow keys or D-pad) into a robot control. Pressing roughly opposite to the nose backs up. */
export function controlFromInput(b: Bot, ix: number, iy: number): Control | null {
  if (!ix && !iy) return null;
  const want = Math.atan2(iy, ix);
  if (Math.abs(wrap(want - b.h)) > 2.6) return { heading: b.h, throttle: -1 };
  return { heading: want, throttle: 1 };
}
