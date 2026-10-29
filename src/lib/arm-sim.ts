// The pick-and-place arm on the home page, without any drawing: kinematics, motion planning and a small physics world.
// RobotArm3D draws whatever this file says, so everything here can be unit tested. Units are metres, seconds and radians.
// y points up, the arm's base sits at the origin, and at yaw 0 the arm faces +z (towards the camera).

export type Vec3 = { x: number; y: number; z: number };

export const ARM = {
  shoulderY: 0.17, // height of the shoulder axis above the table
  upper: 0.26, // shoulder to elbow. A little longer than the forearm, like a human arm
  fore: 0.22, // elbow to wrist
  tool: 0.105, // wrist axis to the point between the finger pads
  fingerLen: 0.05,
  open: 0.045, // half the gap between the fingers when fully open
};

export type JointName = "yaw" | "shoulder" | "elbow" | "wrist" | "roll";
export type Joints = Record<JointName, number>;
export const JOINTS: JointName[] = ["yaw", "shoulder", "elbow", "wrist", "roll"];

/** Top joint speeds in rad/s. The heavy joints near the base are the slowest, the wrist the quickest. */
export const MAX_SPEED: Joints = { yaw: 2.6, shoulder: 2.2, elbow: 2.6, wrist: 3.4, roll: 4 };

/** Where the grip point hovers when the arm has nothing to do. */
export const READY: Vec3 = { x: 0.22, y: 0.22, z: 0.1 };
export const HOVER = 0.17; // carrying height in manual mode
const APPROACH = 0.12; // how far above a sample the gripper lines up before going straight down
const G = 9.81;
const TAU = Math.PI * 2;

/**
 * Minimum-jerk profile: 0 to 1 with zero speed and zero acceleration at both ends.
 * Human reaching movements follow this curve closely (Flash and Hogan, 1985), which is why it looks natural.
 */
export function minJerk(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t * (10 + t * (-15 + 6 * t));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
/** The angle equal to `a` (modulo `period`) that is closest to `near`. */
const nearest = (a: number, near: number, period: number) => (period ? a + period * Math.round((near - a) / period) : a);

/** Where each joint is in space, worked out from the joint angles. */
export function forward(j: Joints) {
  const a1 = j.shoulder, a2 = a1 + j.elbow, a3 = a2 + j.wrist;
  const er = ARM.upper * Math.cos(a1), eh = ARM.shoulderY + ARM.upper * Math.sin(a1);
  const wr = er + ARM.fore * Math.cos(a2), wh = eh + ARM.fore * Math.sin(a2);
  const gr = wr + ARM.tool * Math.cos(a3), gh = wh + ARM.tool * Math.sin(a3);
  const s = Math.sin(j.yaw), c = Math.cos(j.yaw);
  const at = (r: number, h: number): Vec3 => ({ x: r * s, y: h, z: r * c });
  return { elbow: at(er, eh), wrist: at(wr, wh), grip: at(gr, gh), pitch: a3 };
}

/**
 * Joint angles that put the grip point at `p` with the gripper pointing straight down.
 * Always the elbow-up solution, so the elbow stays above the table and never flips over mid-move.
 */
export function inverse(p: Vec3, roll: number) {
  const yaw = Math.atan2(p.x, p.z);
  const r = Math.hypot(p.x, p.z);
  const dr = r, dh = p.y + ARM.tool - ARM.shoulderY; // wrist centre, straight above the grip point
  const max = ARM.upper + ARM.fore - 1e-4, min = Math.abs(ARM.upper - ARM.fore) + 0.02;
  const raw = Math.hypot(dr, dh);
  const d = clamp(raw, min, max);
  const c2 = clamp((d * d - ARM.upper ** 2 - ARM.fore ** 2) / (2 * ARM.upper * ARM.fore), -1, 1);
  const elbow = -Math.acos(c2);
  const shoulder = Math.atan2(dh, dr) + Math.atan2(ARM.fore * Math.sin(-elbow), ARM.upper + ARM.fore * Math.cos(elbow));
  const wrist = -Math.PI / 2 - shoulder - elbow;
  return { joints: { yaw, shoulder, elbow, wrist, roll }, reachable: raw <= max && raw >= min && r > 0.1 };
}

export type Kind = "glass" | "rubber" | "ball";

/** `half` is half the width the fingers close on, `h` half the height, `foot` the radius it takes up on the table. */
export const SAMPLE: Record<Kind, { label: string; half: number; h: number; foot: number; bounce: number; slide: number; sym: number }> = {
  glass: { label: "Glass vial", half: 0.017, h: 0.036, foot: 0.018, bounce: 0.1, slide: 3.5, sym: 0 },
  rubber: { label: "Rubber block", half: 0.021, h: 0.024, foot: 0.027, bounce: 0.55, slide: 3, sym: Math.PI / 2 },
  ball: { label: "Ball", half: 0.026, h: 0.026, foot: 0.026, bounce: 0.45, slide: 0.22, sym: 0 },
};

/** Grip point height above the sample's centre: high on the vial so the fingers miss the table, centre for the rest. */
const gripAbove = (k: Kind) => (k === "glass" ? 0.012 : k === "rubber" ? 0.006 : 0);
/** How far off centre a sample can be and still end up in the jaws: closing fingers push it to the middle. */
const capture = (k: Kind) => ARM.open - SAMPLE[k].half - 0.002;

export const TRAY = { x: 0.25, z: 0.2, w: 0.24, d: 0.1, wall: 0.008, rim: 0.035, foam: 0.012 };
export const TABLE = { minX: -0.55, maxX: 0.55, minZ: -0.25, maxZ: 0.42 };
/** Faster than this, falling glass breaks. About a 6 cm drop onto the bare table. */
export const BREAK_SPEED = 1.1;

const HOMES: Record<Kind, Vec3> = {
  glass: { x: -0.3, y: 0, z: 0.1 },
  rubber: { x: -0.22, y: 0, z: 0.25 },
  ball: { x: -0.06, y: 0, z: 0.31 },
};
const SLOTS = [TRAY.x - 0.07, TRAY.x, TRAY.x + 0.07];

export type Sample = {
  kind: Kind;
  p: Vec3;
  v: Vec3;
  yaw: number;
  broken: boolean;
  held: boolean;
  queued: boolean;
  off: Vec3; // offset from the grip point while held
  rel: number; // sample yaw minus gripper yaw while held
};
export type Shard = { p: Vec3; v: Vec3; axis: Vec3; ang: number; spin: number; size: number };

export const inTray = (p: Vec3, margin = 0) =>
  Math.abs(p.x - TRAY.x) <= TRAY.w / 2 - margin && Math.abs(p.z - TRAY.z) <= TRAY.d / 2 - margin;

/** A step is built when it starts, so it plans from wherever things really are by then. */
type Seg =
  | { kind: "joint"; from: Joints; to: Joints; T: number; t: number }
  | { kind: "line"; from: Vec3; to: Vec3; roll: number; T: number; t: number }
  | { kind: "grip"; close: boolean; to?: number }
  | { kind: "wait"; T: number; t: number }
  | { kind: "done" };
type Step = () => Seg;

// Each joint starts and finishes at a slightly different moment, the way a shoulder leads and a wrist follows.
const STAGGER: Record<JointName, [number, number]> = { yaw: [0, 0.92], shoulder: [0, 1], elbow: [0.04, 1], wrist: [0.1, 1], roll: [0.12, 0.96] };

function jointMove(from: Joints, to: Joints): Seg {
  const target = { ...to, yaw: from.yaw + wrap(to.yaw - from.yaw), roll: from.roll + wrap(to.roll - from.roll) };
  let T = 0.6;
  for (const k of JOINTS) {
    const [a, b] = STAGGER[k];
    T = Math.max(T, (1.875 * Math.abs(target[k] - from[k])) / (MAX_SPEED[k] * (b - a)));
  }
  return { kind: "joint", from: { ...from }, to: target, T, t: 0 };
}

function lineMove(from: Vec3, to: Vec3, roll: number, speed: number): Seg {
  const dist = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  return { kind: "line", from: { ...from }, to: { ...to }, roll, T: Math.max(0.35, (1.875 * dist) / speed), t: 0 };
}

/** A tiny seeded random generator, so the glass breaks the same way in tests. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export type Mode = "auto" | "manual";

export class ArmSim {
  q: Joints;
  qd: Joints = { yaw: 0, shoulder: 0, elbow: 0, wrist: 0, roll: 0 };
  grip = ARM.open; // half gap between the fingers
  gripTarget = ARM.open;
  gripPos: Vec3;
  gripVel: Vec3 = { x: 0, y: 0, z: 0 };
  samples: Sample[] = [];
  shards: Shard[] = [];
  puddle: { x: number; z: number; r: number } | null = null;
  mode: Mode = "auto";
  status = "READY";
  /** Short messages for screen readers, taken by the component as they happen. */
  said: string[] = [];
  manual = { x: READY.x, z: READY.z, pressed: false, phase: "hover" as "hover" | "down" | "blocked" | "closing" | "up", downTo: HOVER, beta: 0, lockX: 0, lockZ: 0 };
  private picks: Step[][] = []; // queued moves, each a list of steps
  private current: Step[] | null = null;
  private seg: Seg | null = null;
  private held: Sample | null = null;
  private squeeze: Sample | null = null; // the sample the closing fingers will meet
  private random = rng(7);
  private settled = 0;

  constructor() {
    this.q = inverse(READY, 0).joints;
    this.gripPos = forward(this.q).grip;
    this.reset();
  }

  reset() {
    this.samples = (Object.keys(HOMES) as Kind[]).map((kind) => ({
      kind,
      p: { ...HOMES[kind], y: SAMPLE[kind].h },
      v: { x: 0, y: 0, z: 0 },
      yaw: kind === "rubber" ? 0.35 : 0,
      broken: false,
      held: false,
      queued: false,
      off: { x: 0, y: 0, z: 0 },
      rel: 0,
    }));
    this.shards = [];
    this.puddle = null;
    this.picks = [];
    this.current = null;
    this.held = null;
    this.squeeze = null;
    this.gripTarget = ARM.open;
    this.manual.pressed = false;
    this.manual.phase = "hover";
    this.manual.beta = 0;
    this.seg = this.mode === "auto" ? jointMove(this.q, inverse(READY, 0).joints) : null;
    this.status = "READY";
    this.settled = 0;
  }

  get busy() {
    return this.picks.length > 0 || !!this.current?.length || (this.seg !== null && this.seg.kind !== "done");
  }

  /** True while anything is still moving, so the renderer can stop drawing when the scene is at rest. */
  get moving() {
    return this.settled < 30;
  }

  sample(kind: Kind) {
    return this.samples.find((s) => s.kind === kind)!;
  }

  setMode(mode: Mode) {
    if (mode === this.mode || this.busy) return;
    this.mode = mode;
    this.qd = { yaw: 0, shoulder: 0, elbow: 0, wrist: 0, roll: 0 };
    const g = forward(this.q).grip;
    Object.assign(this.manual, { x: g.x, z: g.z, pressed: false, phase: "hover", beta: 0 });
    this.status = mode === "manual" ? "MANUAL" : "READY";
    this.settled = 0;
    if (mode === "auto") this.picks.push([() => jointMove(this.q, inverse(READY, 0).joints), () => this.set("READY")]);
  }

  /** Auto mode: pick this sample up and put it in the tray, or back where it started if it is in the tray already. */
  pick(kind: Kind) {
    const s = this.sample(kind);
    if (this.mode !== "auto" || s.broken || s.queued || s.held) return false;
    const back = inTray(s.p);
    const pre = { x: s.p.x, y: s.p.y + gripAbove(kind) + APPROACH, z: s.p.z };
    if (!inverse(pre, 0).reachable) {
      this.set("OUT OF REACH");
      return false;
    }
    s.queued = true;
    // The free slot is chosen when this pick starts, after the ones queued before it have landed.
    const dest = (): Vec3 => {
      if (back) return { ...HOMES[kind] };
      const slot = SLOTS.find((x) => !this.samples.some((o) => o !== s && !o.broken && Math.abs(o.p.x - x) < 0.04 && inTray(o.p)));
      return { x: slot ?? TRAY.x, y: 0, z: TRAY.z };
    };
    this.picks.push(this.planPick(s, dest, back && kind === "rubber" ? 0.35 : 0));
    this.settled = 0;
    return true;
  }

  /** Auto mode: tapping bare table makes the arm hover over that spot. */
  point(x: number, z: number) {
    if (this.mode !== "auto" || this.busy) return;
    const p = { x, y: 0.16, z };
    if (!inverse(p, 0).reachable) return void this.set("OUT OF REACH");
    this.picks.push([() => (this.set("MOVING"), jointMove(this.q, inverse(p, this.keepRoll(p, 0)).joints)), () => this.set("READY")]);
    this.settled = 0;
  }

  private set(status: string, say = false): Seg {
    this.status = status;
    if (say) this.said.push(status);
    return { kind: "done" };
  }

  /** Roll that turns the fingers to face the sample's sides, using the smallest twist of the wrist. */
  private rollFor(p: Vec3, beta: number, sym: number) {
    const yaw = Math.atan2(p.x, p.z);
    return sym ? nearest(yaw - beta, this.q.roll, sym) : this.q.roll;
  }

  /** Roll that keeps whatever is held facing the same way in the room, like a cobot jogging in tool mode. */
  private keepRoll(p: Vec3, beta: number) {
    const yaw = Math.atan2(p.x, p.z);
    return nearest(yaw - beta, this.q.roll, TAU);
  }

  private planPick(s: Sample, where: () => Vec3, destYaw: number): Step[] {
    const k = SAMPLE[s.kind];
    let grasp: Vec3 = { x: 0, y: 0, z: 0 }, dest: Vec3 = grasp, roll = 0;
    return [
      () => {
        if (s.broken) return this.abort(s, "READY");
        this.gripTarget = ARM.open; // fingers open on the way, like a hand opening as it reaches
        grasp = { x: s.p.x, y: s.p.y + gripAbove(s.kind), z: s.p.z };
        dest = where();
        roll = k.sym ? this.rollFor(grasp, s.yaw, k.sym) : this.q.roll;
        this.status = "MOVING";
        return jointMove(this.q, inverse({ ...grasp, y: grasp.y + APPROACH }, roll).joints);
      },
      () => (this.status = "APPROACH", lineMove(forward(this.q).grip, grasp, roll, 0.32)),
      () => (this.status = "GRIPPING", { kind: "grip", close: true }),
      () => (this.held ? this.set("GRIPPED", true) : this.abort(s, "MISSED")),
      () => ({ kind: "wait", T: 0.12, t: 0 }),
      () => (this.status = "LIFT", lineMove(grasp, { ...grasp, y: grasp.y + APPROACH }, this.q.roll, 0.4)),
      () => {
        const above = { x: dest.x, y: k.h + TRAY.foam + gripAbove(s.kind) + APPROACH + 0.004, z: dest.z };
        const r = k.sym ? nearest(Math.atan2(above.x, above.z) + s.rel - destYaw, this.q.roll, k.sym) : this.q.roll;
        this.status = "CARRY";
        return jointMove(this.q, inverse(above, r).joints);
      },
      () => {
        const floor = inTray(dest) ? TRAY.foam : 0;
        const at = { x: dest.x, y: floor + k.h + gripAbove(s.kind) + 0.003, z: dest.z };
        this.status = "PLACING";
        return lineMove(forward(this.q).grip, at, this.q.roll, 0.26);
      },
      () => (this.status = "RELEASE", { kind: "grip", close: false }),
      () => this.set(inTray(s.p) ? "PLACED" : "RETURNED", true),
      () => ({ kind: "wait", T: 0.1, t: 0 }),
      () => {
        const g = forward(this.q).grip;
        return lineMove(g, { ...g, y: g.y + 0.08 }, this.q.roll, 0.3);
      },
      () => (this.picks.length ? { kind: "done" } : jointMove(this.q, inverse(READY, nearest(0, this.q.roll, k.sym || TAU)).joints)),
      () => this.set("READY"),
    ];
  }

  /** Give up on the current pick: open the hand, back off to the ready pose, and carry on with the queue. */
  private abort(s: Sample, status: string): Seg {
    s.queued = false;
    this.gripTarget = ARM.open;
    this.current = [
      () => {
        const g = forward(this.q).grip;
        return lineMove(g, { ...g, y: Math.max(g.y, 0.12) + 0.04 }, this.q.roll, 0.3);
      },
      () => (this.picks.length ? { kind: "done" } : jointMove(this.q, inverse(READY, this.q.roll).joints)),
      () => this.set("READY"),
    ];
    return this.set(status, status !== "READY");
  }

  /** Advance the whole world by `dt` seconds, in small fixed steps. */
  step(dt: number) {
    const h = 1 / 240;
    for (let t = 0; t < dt - 1e-9; t += h) this.tick(Math.min(h, dt - t));
  }

  private tick(dt: number) {
    const before = { ...this.q };
    if (this.mode === "auto") this.runPlan(dt);
    else this.runManual(dt);
    this.moveFingers(dt);
    const g = forward(this.q).grip;
    this.gripVel = { x: (g.x - this.gripPos.x) / dt, y: (g.y - this.gripPos.y) / dt, z: (g.z - this.gripPos.z) / dt };
    this.gripPos = g;
    this.carry(dt);
    const still = this.physics(dt) && JOINTS.every((k) => Math.abs(this.q[k] - before[k]) < 1e-7) && Math.abs(this.grip - this.gripTarget) < 1e-6;
    this.settled = still && !this.busy && !this.manual.pressed ? this.settled + 1 : 0;
  }

  private runPlan(dt: number) {
    let budget = 8; // finish instant steps in the same tick
    while (budget-- > 0) {
      if (!this.seg || this.seg.kind === "done") {
        if (!this.current?.length) this.current = this.picks.shift() ?? null;
        const next = this.current?.shift();
        if (!next) return void ((this.seg = null), (this.current = null));
        this.seg = next();
        continue;
      }
      const s = this.seg;
      if (s.kind === "joint") {
        s.t = Math.min(s.T, s.t + dt);
        const u = s.t / s.T;
        for (const k of JOINTS) {
          const [a, b] = STAGGER[k];
          this.q[k] = s.from[k] + (s.to[k] - s.from[k]) * minJerk((u - a) / (b - a));
        }
        if (s.t >= s.T) this.seg = { kind: "done" };
        return;
      }
      if (s.kind === "line") {
        s.t = Math.min(s.T, s.t + dt);
        const e = minJerk(s.t / s.T);
        const p = { x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e, z: s.from.z + (s.to.z - s.from.z) * e };
        this.q = inverse(p, s.roll).joints;
        if (s.t >= s.T) this.seg = { kind: "done" };
        return;
      }
      if (s.kind === "wait") {
        s.t += dt;
        if (s.t >= s.T) this.seg = { kind: "done" };
        return;
      }
      if (s.kind === "grip") {
        s.to ??= s.close ? this.closeTarget() : ARM.open;
        this.gripTarget = s.to;
        if (Math.abs(this.grip - s.to) < 1e-5) this.seg = { kind: "done" };
        return;
      }
    }
  }

  /** How far the fingers can close: onto the sample between them, or all the way if there is nothing there. */
  private closeTarget() {
    if (this.held) return SAMPLE[this.held.kind].half;
    const g = forward(this.q).grip;
    const s = this.samples.find(
      (o) => !o.broken && Math.hypot(o.p.x - g.x, o.p.z - g.z) < capture(o.kind) && Math.abs(o.p.y + gripAbove(o.kind) - g.y) < SAMPLE[o.kind].h * 0.8 + 0.01,
    );
    this.squeeze = s ?? null;
    return s ? SAMPLE[s.kind].half : 0.004;
  }

  private moveFingers(dt: number) {
    const speed = 0.13 * dt;
    this.grip += clamp(this.gripTarget - this.grip, -speed, speed);
    const s = this.squeeze;
    if (s && !this.held && this.gripTarget < ARM.open && this.grip <= SAMPLE[s.kind].half + 1e-5) {
      // Fingers meet the sample: it is held from here on, and it slides to the middle of the jaws.
      this.held = s;
      s.held = true;
      const g = forward(this.q).grip;
      s.off = { x: s.p.x - g.x, y: s.p.y - g.y, z: s.p.z - g.z };
      s.rel = s.yaw - (this.q.yaw - this.q.roll);
      s.v = { x: 0, y: 0, z: 0 };
    }
    const held = this.held;
    if (held && this.gripTarget > this.grip && this.grip > SAMPLE[held.kind].half + 0.003) {
      held.held = false;
      held.queued = false;
      held.v = { ...this.gripVel };
      this.held = null;
      this.squeeze = null;
    }
  }

  private carry(dt: number) {
    const s = this.held;
    if (!s) return;
    const k = Math.exp(-dt / 0.05);
    s.off.x *= k;
    s.off.z *= k;
    s.off.y += (-gripAbove(s.kind) - s.off.y) * (1 - k);
    s.p = { x: this.gripPos.x + s.off.x, y: this.gripPos.y + s.off.y, z: this.gripPos.z + s.off.z };
    s.yaw = this.q.yaw - this.q.roll + s.rel;
    s.v = { ...this.gripVel };
  }

  // Manual mode: the visitor sets a spot on the table, and each joint chases its target like a tuned servo.
  aim(x: number, z: number) {
    const r = Math.hypot(x, z);
    const scale = r > 0.44 ? 0.44 / r : r < 0.15 ? 0.15 / Math.max(r, 1e-6) : 1;
    this.manual.x = x * scale;
    this.manual.z = Math.max(-0.15, z * scale);
    this.settled = 0;
  }

  press(down: boolean) {
    if (this.mode !== "manual") return;
    this.manual.pressed = down;
    this.settled = 0;
  }

  private runManual(dt: number) {
    const m = this.manual;
    const g = forward(this.q).grip;
    if (m.phase === "hover" && m.pressed && !this.held) {
      m.lockX = m.x;
      m.lockZ = m.z;
      const near = this.samples
        .filter((s) => !s.broken)
        .map((s) => ({ s, d: Math.hypot(s.p.x - m.x, s.p.z - m.z) }))
        .sort((a, b) => a.d - b.d)[0];
      m.phase = "down";
      if (near && near.d < capture(near.s.kind)) {
        m.downTo = near.s.p.y + gripAbove(near.s.kind);
        m.beta = SAMPLE[near.s.kind].sym ? near.s.yaw : m.beta;
        this.status = "LOWERING";
      } else if (near && near.d < SAMPLE[near.s.kind].foot + ARM.open + 0.01) {
        // A finger would land on it: stop just above and wait to be let go, like a real arm with a collision check.
        m.downTo = near.s.p.y + SAMPLE[near.s.kind].h + ARM.fingerLen / 2 + 0.012;
        m.phase = "blocked";
        this.status = "OFF CENTRE";
      } else {
        m.downTo = (inTray({ x: m.x, y: 0, z: m.z }, -0.02) ? TRAY.rim : 0) + ARM.fingerLen / 2 + 0.006;
        this.status = "LOWERING";
      }
    }
    if ((m.phase === "down" || m.phase === "blocked") && !m.pressed) {
      m.phase = "up";
      if (this.status === "OFF CENTRE") this.status = "MANUAL";
    }
    const slow = JOINTS.every((k) => Math.abs(this.qd[k]) < 0.12);
    if (m.phase === "down" && Math.abs(g.y - m.downTo) < 0.004 && slow) {
      this.gripTarget = this.closeTarget();
      m.phase = "closing";
    }
    if (m.phase === "closing" && Math.abs(this.grip - this.gripTarget) < 1e-5) {
      m.phase = "up";
      this.status = this.held ? "GRIPPED" : "MISSED";
      if (this.held) {
        m.beta = this.held.yaw;
        this.said.push("GRIPPED");
      }
    }
    if (m.phase === "up" && !m.pressed) {
      if (this.gripTarget < ARM.open) {
        this.gripTarget = ARM.open;
        if (this.held) this.status = "RELEASED";
      }
      m.phase = "hover";
    }
    if (m.phase === "hover" && !this.held && this.status === "GRIPPED") this.status = "MANUAL";
    const lock = m.phase === "down" || m.phase === "blocked" || m.phase === "closing";
    // Line up over the spot first, then go straight down, so the fingers never sweep through anything.
    const over = Math.hypot(g.x - m.lockX, g.z - m.lockZ) < 0.008;
    const low = m.phase === "closing" || ((m.phase === "down" || m.phase === "blocked") && (over || g.y < HOVER - 0.01));
    const p = { x: lock ? m.lockX : m.x, y: low ? m.downTo : HOVER, z: lock ? m.lockZ : m.z };
    // Keep the fingers (and anything in them) facing the same way in the room while the base turns.
    const period = this.held ? SAMPLE[this.held.kind].sym || TAU : Math.PI;
    const roll = nearest(Math.atan2(p.x, p.z) + (this.held?.rel ?? 0) - m.beta, this.q.roll, period);
    const want = inverse(p, roll).joints;
    want.yaw = this.q.yaw + wrap(want.yaw - this.q.yaw);
    const w = 9; // stiffness: about a fifth of a second to settle, with no overshoot
    for (const k of JOINTS) {
      const a = w * w * (want[k] - this.q[k]) - 2 * w * this.qd[k];
      this.qd[k] = clamp(this.qd[k] + a * dt, -MAX_SPEED[k], MAX_SPEED[k]);
      this.q[k] += this.qd[k] * dt;
    }
  }

  private surface(s: Sample) {
    let floor = inTray(s.p) ? TRAY.foam : 0;
    let foam = inTray(s.p);
    const k = SAMPLE[s.kind];
    for (const o of this.samples) {
      if (o === s || o.broken || o.held) continue;
      if (Math.hypot(o.p.x - s.p.x, o.p.z - s.p.z) < (SAMPLE[o.kind].foot + k.foot) * 0.6 && o.p.y < s.p.y) {
        const top = o.p.y + SAMPLE[o.kind].h;
        if (top > floor) {
          floor = top;
          foam = false;
        }
      }
    }
    return { floor, foam };
  }

  /** Returns true when nothing loose is moving. */
  private physics(dt: number) {
    let still = true;
    for (const s of this.samples) {
      if (s.held || s.broken) continue;
      const k = SAMPLE[s.kind];
      const prev = { ...s.p };
      s.v.y -= G * dt;
      s.p.x += s.v.x * dt;
      s.p.y += s.v.y * dt;
      s.p.z += s.v.z * dt;
      const { floor, foam } = this.surface(s);
      let grounded = false;
      if (s.p.y - k.h <= floor + 1e-6) {
        const impact = -s.v.y;
        s.p.y = floor + k.h;
        if (s.kind === "glass" && !foam && impact > BREAK_SPEED) {
          this.shatter(s);
          continue;
        }
        s.v.y = impact > 0.15 ? impact * (foam ? 0.08 : k.bounce) : 0;
        grounded = s.v.y === 0;
      }
      if (grounded) {
        const speed = Math.hypot(s.v.x, s.v.z);
        const left = Math.max(0, speed - (foam ? 4 : k.slide) * dt);
        const f = speed > 0 ? left / speed : 0;
        s.v.x *= f;
        s.v.z *= f;
      }
      this.walls(s, prev);
      if (Math.hypot(s.v.x, s.v.y, s.v.z) > 1e-4 || !grounded) still = false;
    }
    this.separate();
    for (const sh of this.shards) {
      if (sh.v.x === 0 && sh.v.y === 0 && sh.v.z === 0) continue;
      still = false;
      sh.v.y -= G * dt;
      sh.p.x += sh.v.x * dt;
      sh.p.y += sh.v.y * dt;
      sh.p.z += sh.v.z * dt;
      sh.ang += sh.spin * dt;
      const floor = (inTray(sh.p) ? TRAY.foam : 0) + sh.size * 0.4;
      if (sh.p.y < floor) {
        sh.p.y = floor;
        sh.v.y = -sh.v.y * 0.25;
        sh.v.x *= 0.6;
        sh.v.z *= 0.6;
        sh.spin *= 0.5;
        if (Math.abs(sh.v.y) < 0.08) sh.v = { x: 0, y: 0, z: 0 };
      }
      sh.p.x = clamp(sh.p.x, TABLE.minX, TABLE.maxX);
      sh.p.z = clamp(sh.p.z, TABLE.minZ, TABLE.maxZ);
    }
    if (this.puddle && this.puddle.r < 0.042) {
      this.puddle.r = Math.min(0.042, this.puddle.r + 0.09 * dt);
      still = false;
    }
    return still;
  }

  private walls(s: Sample, prev: Vec3) {
    const k = SAMPLE[s.kind];
    const r = k.foot;
    if (s.p.x < TABLE.minX + r || s.p.x > TABLE.maxX - r) {
      s.p.x = clamp(s.p.x, TABLE.minX + r, TABLE.maxX - r);
      s.v.x *= -0.4;
    }
    if (s.p.z < TABLE.minZ + r || s.p.z > TABLE.maxZ - r) {
      s.p.z = clamp(s.p.z, TABLE.minZ + r, TABLE.maxZ - r);
      s.v.z *= -0.4;
    }
    if (s.p.y - k.h >= TRAY.rim) return;
    const hw = TRAY.w / 2, hd = TRAY.d / 2;
    if (inTray(prev)) {
      // inside the tray: the walls keep it in
      const lx = hw - r, lz = hd - r;
      if (Math.abs(s.p.x - TRAY.x) > lx) {
        s.p.x = TRAY.x + Math.sign(s.p.x - TRAY.x) * lx;
        s.v.x *= -0.3;
      }
      if (Math.abs(s.p.z - TRAY.z) > lz) {
        s.p.z = TRAY.z + Math.sign(s.p.z - TRAY.z) * lz;
        s.v.z *= -0.3;
      }
    } else {
      // outside: it bumps into the outer wall instead of passing through
      const ox = hw + TRAY.wall + r, oz = hd + TRAY.wall + r;
      const dx = s.p.x - TRAY.x, dz = s.p.z - TRAY.z;
      if (Math.abs(dx) < ox && Math.abs(dz) < oz) {
        if (ox - Math.abs(dx) < oz - Math.abs(dz)) {
          s.p.x = TRAY.x + Math.sign(dx || 1) * ox;
          s.v.x *= -0.3;
        }
        else {
          s.p.z = TRAY.z + Math.sign(dz || 1) * oz;
          s.v.z *= -0.3;
        }
      }
    }
  }

  private separate() {
    const loose = this.samples.filter((s) => !s.broken && !s.held);
    for (let i = 0; i < loose.length; i++)
      for (let j = i + 1; j < loose.length; j++) {
        const a = loose[i]!, b = loose[j]!;
        const ka = SAMPLE[a.kind], kb = SAMPLE[b.kind];
        if (Math.abs(a.p.y - b.p.y) >= ka.h + kb.h - 0.004) continue; // one is resting on the other
        const dx = b.p.x - a.p.x, dz = b.p.z - a.p.z;
        const d = Math.hypot(dx, dz), min = ka.foot + kb.foot;
        if (d >= min) continue;
        const nx = d ? dx / d : 1, nz = d ? dz / d : 0, push = (min - d) / 2;
        a.p.x -= nx * push;
        a.p.z -= nz * push;
        b.p.x += nx * push;
        b.p.z += nz * push;
        const rel = (b.v.x - a.v.x) * nx + (b.v.z - a.v.z) * nz;
        if (rel < 0) {
          const imp = -rel * 0.6;
          a.v.x -= nx * imp;
          a.v.z -= nz * imp;
          b.v.x += nx * imp;
          b.v.z += nz * imp;
        }
      }
  }

  private shatter(s: Sample) {
    s.broken = true;
    s.queued = false;
    const rand = this.random;
    for (let i = 0; i < 14; i++) {
      const a = rand() * TAU, sp = 0.25 + rand() * 0.6;
      this.shards.push({
        p: { x: s.p.x + Math.cos(a) * 0.01, y: 0.012 + rand() * 0.03, z: s.p.z + Math.sin(a) * 0.01 },
        v: { x: Math.cos(a) * sp, y: 0.4 + rand() * 0.8, z: Math.sin(a) * sp },
        axis: { x: rand() - 0.5, y: rand() - 0.5, z: rand() - 0.5 },
        ang: rand() * TAU,
        spin: (rand() - 0.5) * 30,
        size: 0.008 + rand() * 0.009,
      });
    }
    this.puddle = { x: s.p.x, z: s.p.z, r: 0 };
    this.status = "GLASS BROKEN";
    this.said.push("Glass broken. Press reset for a new vial.");
  }
}
