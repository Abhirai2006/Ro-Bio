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
export const CARRY_Y = 0.18; // grip point height while carrying: everything held clears the other samples and the tray rim
const APPROACH = 0.12; // how far above a sample the gripper lines up before going straight down
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
const G = 9.81;
/** Faster than this, falling glass breaks: about a 6 cm drop onto the bare bench. Foam in the tray always saves it. */
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

export const inTray = (p: { x: number; z: number }, margin = 0) =>
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

/** Pull a spot on the bench back inside what the arm can reach. */
export function reachable(x: number, z: number) {
  z = Math.max(-0.12, z);
  const r = Math.hypot(x, z);
  const s = r > 0.42 ? 0.42 / r : r < 0.16 ? 0.16 / Math.max(r, 1e-6) : 1;
  return { x: clamp(x * s, TABLE.minX + 0.03, TABLE.maxX - 0.03), z: clamp(z * s, TABLE.minZ + 0.03, TABLE.maxZ - 0.03) };
}

/** A tiny seeded random generator, so the glass breaks the same way in tests. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export type Mode = "tap" | "manual";
// Manual jogging: top speed across the bench and up or down, and how quickly it gets there.
const JOG = { speed: 0.16, lift: 0.12, accel: 0.9, top: 0.26 };

// How the arm glides while carrying: it speeds up gently, cruises, and brakes into the spot without overshooting.
const CARRY = { speed: 0.55, accel: 2.2, brake: 1.6, settle: 7 };

export class ArmSim {
  q: Joints;
  grip = ARM.open; // half the gap between the fingers
  gripTarget = ARM.open;
  gripPos: Vec3;
  gripVel: Vec3 = { x: 0, y: 0, z: 0 };
  samples: Sample[] = [];
  status = "READY";
  /** Short messages for screen readers, taken by the component as they happen. */
  said: string[] = [];
  /** Where the held sample is being carried to, on the bench. */
  aim = { x: READY.x, z: READY.z };
  mode: Mode = "tap";
  shards: Shard[] = [];
  puddle: { x: number; z: number; r: number } | null = null;
  private jogCmd: Vec3 = { x: 0, y: 0, z: 0 };
  private jogBeta = 0; // in manual mode the fingers keep facing this way
  private closing = false;
  private random = rng(7);
  private picks: Step[][] = []; // queued moves, each a list of steps
  private current: Step[] | null = null;
  private seg: Seg | null = null;
  private held: Sample | null = null;
  private squeeze: Sample | null = null; // the sample the closing fingers will meet
  private carryP: Vec3 = { x: 0, y: 0, z: 0 };
  private carryV: Vec3 = { x: 0, y: 0, z: 0 };
  private carryBeta = 0; // the held sample keeps facing this way while it is carried
  private dropAt: { x: number; z: number } | null = null; // put down here once the arm gets there
  private grabbing: Sample | null = null; // being picked up by a tap, not by a tray button
  private settled = 0;

  constructor() {
    this.q = inverse(READY, 0).joints;
    this.gripPos = forward(this.q).grip;
    this.reset();
    this.seg = null; // it starts in the ready pose already, so there is nothing to move
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
    this.picks = [];
    this.current = null;
    this.held = null;
    this.squeeze = null;
    this.dropAt = null;
    this.grabbing = null;
    this.shards = [];
    this.puddle = null;
    this.random = rng(7);
    this.jogCmd = { x: 0, y: 0, z: 0 };
    this.jogBeta = 0;
    this.closing = false;
    this.gripTarget = ARM.open;
    this.seg = jointMove(this.q, inverse(READY, nearest(0, this.q.roll, Math.PI)).joints);
    this.status = this.mode === "manual" ? "MANUAL" : "READY";
    this.settled = 0;
  }

  /** Switch between tap to move and manual jogging. Only while the arm is not in the middle of a planned move. */
  setMode(mode: Mode) {
    if (mode === this.mode || this.busy) return false;
    this.mode = mode;
    this.jogCmd = { x: 0, y: 0, z: 0 };
    this.carryP = forward(this.q).grip;
    this.carryV = { x: 0, y: 0, z: 0 };
    this.closing = false;
    const h = this.held;
    if (mode === "manual") {
      this.jogBeta = h ? h.yaw : this.q.yaw - this.q.roll;
      this.status = h ? "GRIPPED" : "MANUAL";
    } else {
      // Something still in the fingers: carry on holding it, waiting for a tap.
      this.aim = { x: this.carryP.x, z: this.carryP.z };
      if (h) this.carryBeta = h.yaw;
      else this.gripTarget = ARM.open;
      this.status = h ? "HOLDING" : "READY";
    }
    this.settled = 0;
    return true;
  }

  /** Manual: which way to move, each from -1 to 1. x is left and right, y up and down, z towards and away from you. 0 stops. */
  jog(x: number, y: number, z: number) {
    if (this.mode !== "manual") return;
    this.jogCmd = { x: clamp(x, -1, 1), y: clamp(y, -1, 1), z: clamp(z, -1, 1) };
    this.settled = 0;
  }

  /** Manual: close the fingers on whatever is between them, or open them and let go. */
  toggleGrip() {
    if (this.mode !== "manual" || this.busy) return;
    if (this.gripTarget < ARM.open) {
      this.gripTarget = ARM.open;
      this.closing = false;
      this.status = this.held ? "RELEASED" : "MANUAL";
    } else {
      this.gripTarget = this.closeTarget();
      this.closing = true;
      this.status = "GRIPPING";
    }
    this.settled = 0;
  }

  /** Manual: the sample right under the open fingers, ready to be gripped. */
  get overSample(): Kind | null {
    if (this.mode !== "manual" || this.held) return null;
    const g = this.gripPos;
    return this.samples.find((o) => !o.broken && Math.hypot(o.p.x - g.x, o.p.z - g.z) < capture(o.kind))?.kind ?? null;
  }

  get gripClosed() {
    return this.gripTarget < ARM.open;
  }

  /** The arm is running a planned move. */
  get busy() {
    return this.picks.length > 0 || !!this.current?.length || (this.seg !== null && this.seg.kind !== "done");
  }

  /** The arm has something in its fingers and is waiting to be told where it goes. */
  get holding() {
    return !!this.held && !this.busy && !this.dropAt;
  }

  get heldKind() {
    return this.held?.kind ?? null;
  }

  /** True while anything is still moving, so the renderer can stop drawing when the scene is at rest. */
  get moving() {
    return this.settled < 30;
  }

  sample(kind: Kind) {
    return this.samples.find((s) => s.kind === kind)!;
  }

  /** Buttons: put this sample in the tray, or back where it started if it is in the tray already. */
  pick(kind: Kind) {
    const s = this.sample(kind);
    if (this.mode !== "tap" || s.broken || this.held || this.grabbing || s.queued) return false;
    const back = inTray(s.p);
    s.queued = true;
    // The free slot is chosen when this pick starts, after the ones queued before it have landed.
    const dest = (): Vec3 => {
      if (back) return { ...HOMES[kind] };
      const slot = SLOTS.find((x) => !this.samples.some((o) => o !== s && Math.abs(o.p.x - x) < 0.04 && inTray(o.p)));
      return { x: slot ?? TRAY.x, y: 0, z: TRAY.z };
    };
    this.picks.push([...this.pickUp(s), ...this.putDown(s, dest, back && kind === "rubber" ? 0.35 : 0, true)]);
    this.settled = 0;
    return true;
  }

  /** Pick a sample up and hold it above the bench, waiting for `place` (or carrying it towards `carry`). Waits for any move already running. */
  grab(kind: Kind) {
    const s = this.sample(kind);
    if (this.mode !== "tap" || s.broken || this.held || this.grabbing || s.queued) return false;
    s.queued = true;
    this.grabbing = s;
    this.aim = { x: s.p.x, z: s.p.z };
    this.picks.push(this.pickUp(s));
    this.settled = 0;
    return true;
  }

  /** While holding: glide the held sample over this spot. */
  carry(x: number, z: number) {
    if (!this.held) return;
    this.aim = reachable(x, z);
    this.settled = 0;
  }

  /** Put the held sample down at this spot (or right where it is). Gently: the arm lowers it all the way. */
  place(x = this.aim.x, z = this.aim.z) {
    if (this.mode !== "tap") return false;
    const s = this.grabbing ?? (this.holding ? this.held : null);
    if (!s) return false;
    this.aim = this.freeSpot(s, reachable(x, z));
    this.dropAt = { ...this.aim };
    this.settled = 0;
    return true;
  }

  /** Bare bench tapped with nothing in hand: the arm swings over to look. */
  point(x: number, z: number) {
    if (this.mode !== "tap" || this.held || this.busy) return;
    const p = { ...reachable(x, z), y: 0.16 };
    this.picks.push([() => ((this.status = "MOVING"), jointMove(this.q, inverse(p, nearest(Math.atan2(p.x, p.z), this.q.roll, Math.PI)).joints)), () => this.set("READY")]);
    this.settled = 0;
  }

  /** A spot where the sample fits: inside the tray if it is mostly over it, and never on top of another sample. */
  private freeSpot(s: Sample, p: { x: number; z: number }) {
    const k = SAMPLE[s.kind];
    const snap = () => {
      if (Math.abs(p.x - TRAY.x) < TRAY.w / 2 + TRAY.wall + k.foot && Math.abs(p.z - TRAY.z) < TRAY.d / 2 + TRAY.wall + k.foot) {
        p.x = clamp(p.x, TRAY.x - TRAY.w / 2 + k.foot + 0.003, TRAY.x + TRAY.w / 2 - k.foot - 0.003);
        p.z = clamp(p.z, TRAY.z - TRAY.d / 2 + k.foot + 0.003, TRAY.z + TRAY.d / 2 - k.foot - 0.003);
      }
    };
    snap();
    for (let pass = 0; pass < 4; pass++) {
      for (const o of this.samples) {
        if (o === s || o.broken) continue;
        const min = k.foot + SAMPLE[o.kind].foot + 0.006;
        const dx = p.x - o.p.x, dz = p.z - o.p.z, d = Math.hypot(dx, dz);
        if (d >= min) continue;
        const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
        p.x = o.p.x + nx * min;
        p.z = o.p.z + nz * min;
      }
      p = reachable(p.x, p.z);
      snap();
    }
    return p;
  }

  private set(status: string, say = false): Seg {
    this.status = status;
    if (say) this.said.push(status);
    return { kind: "done" };
  }

  /** Reach over the sample, go straight down, close the fingers on it and lift it to carrying height. */
  private pickUp(s: Sample): Step[] {
    const k = SAMPLE[s.kind];
    let grasp: Vec3 = { x: 0, y: 0, z: 0 }, roll = 0;
    return [
      () => {
        this.gripTarget = ARM.open; // the fingers open on the way, like a hand opening as it reaches
        grasp = { x: s.p.x, y: s.p.y + gripAbove(s.kind), z: s.p.z };
        // Turn the fingers to face the block's flat sides with the smallest twist; round things need no twist.
        roll = k.sym ? nearest(Math.atan2(grasp.x, grasp.z) - s.yaw, this.q.roll, k.sym) : this.q.roll;
        this.status = "MOVING";
        return jointMove(this.q, inverse({ ...grasp, y: grasp.y + APPROACH }, roll).joints);
      },
      () => ((this.status = "APPROACH"), lineMove(forward(this.q).grip, grasp, roll, 0.32)),
      () => ((this.status = "GRIPPING"), { kind: "grip", close: true }),
      () => (this.held ? this.set("GRIPPED", true) : this.abort(s)),
      () => ({ kind: "wait", T: 0.12, t: 0 }),
      () => ((this.status = "LIFT"), lineMove(grasp, { ...grasp, y: CARRY_Y }, this.q.roll, 0.4)),
      () => {
        this.carryBeta = s.yaw;
        this.grabbing = null;
        return this.set(this.dropAt ? "CARRY" : "HOLDING");
      },
    ];
  }

  /** Carry to `where`, lower it all the way down, let go and lift clear. */
  private putDown(s: Sample, where: () => Vec3, yaw: number, home: boolean): Step[] {
    const k = SAMPLE[s.kind];
    let dest: Vec3 = { x: 0, y: 0, z: 0 };
    return [
      () => {
        dest = where();
        const above = { x: dest.x, y: CARRY_Y, z: dest.z };
        const r = k.sym ? nearest(Math.atan2(above.x, above.z) + s.rel - yaw, this.q.roll, k.sym) : this.q.roll;
        this.status = "CARRY";
        return jointMove(this.q, inverse(above, r).joints);
      },
      ...this.lower(s, () => dest),
      () => (home && !this.picks.length ? jointMove(this.q, inverse(READY, nearest(0, this.q.roll, k.sym || Math.PI)).joints) : { kind: "done" }),
      () => this.set("READY"),
    ];
  }

  /** The last part of every put-down: straight down slowly, open, wait a beat, straight back up. */
  private lower(s: Sample, where: () => Vec3): Step[] {
    const k = SAMPLE[s.kind];
    return [
      () => {
        const d = where();
        const floor = inTray(d) ? TRAY.foam : this.topUnder(s, d);
        this.status = "PLACING";
        return lineMove(forward(this.q).grip, { x: d.x, y: floor + k.h - s.off.y + 0.003, z: d.z }, this.q.roll, 0.26);
      },
      () => ((this.status = "RELEASE"), { kind: "grip", close: false }),
      () => this.set(inTray(s.p) ? "PLACED IN TRAY" : "PLACED", true),
      () => ({ kind: "wait", T: 0.1, t: 0 }),
      () => {
        const g = forward(this.q).grip;
        return lineMove(g, { ...g, y: Math.max(g.y + 0.06, 0.15) }, this.q.roll, 0.35);
      },
    ];
  }

  private topUnder(s: Sample, p: { x: number; z: number }) {
    let floor = 0;
    for (const o of this.samples)
      if (o !== s && !o.broken && Math.hypot(o.p.x - p.x, o.p.z - p.z) < SAMPLE[o.kind].foot + SAMPLE[s.kind].foot) floor = Math.max(floor, o.p.y + SAMPLE[o.kind].h);
    return floor;
  }

  /** The fingers closed on nothing: open up, back off, and carry on with the queue. */
  private abort(s: Sample): Seg {
    s.queued = false;
    this.grabbing = null;
    this.gripTarget = ARM.open;
    this.dropAt = null;
    this.current = [
      () => {
        const g = forward(this.q).grip;
        return lineMove(g, { ...g, y: Math.max(g.y, 0.12) + 0.04 }, this.q.roll, 0.3);
      },
      () => this.set("READY"),
    ];
    return this.set("MISSED", true);
  }

  /** Advance the whole world by `dt` seconds, in small fixed steps. */
  step(dt: number) {
    const h = 1 / 240;
    for (let t = 0; t < dt - 1e-9; t += h) this.tick(Math.min(h, dt - t));
  }

  private tick(dt: number) {
    const before = { ...this.q };
    if (this.busy) this.runPlan(dt);
    else if (this.mode === "manual") this.runJog(dt);
    else if (this.held) this.runCarry(dt);
    else this.seg = null;
    this.moveFingers(dt);
    const g = forward(this.q).grip;
    this.gripVel = { x: (g.x - this.gripPos.x) / dt, y: (g.y - this.gripPos.y) / dt, z: (g.z - this.gripPos.z) / dt };
    this.gripPos = g;
    this.follow(dt);
    const still = this.physics(dt) && JOINTS.every((k) => Math.abs(this.q[k] - before[k]) < 1e-7) && Math.abs(this.grip - this.gripTarget) < 1e-6;
    this.settled = still && !this.busy ? this.settled + 1 : 0;
  }

  private runPlan(dt: number) {
    let budget = 8; // finish instant steps in the same tick
    while (budget-- > 0) {
      if (!this.seg || this.seg.kind === "done") {
        if (!this.current?.length) this.current = this.picks.shift() ?? null;
        const next = this.current?.shift();
        if (!next) {
          this.seg = null;
          this.current = null;
          this.carryP = forward(this.q).grip; // carrying picks up smoothly from wherever the plan left the arm
          this.carryV = { x: 0, y: 0, z: 0 };
          return;
        }
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
      } else if (s.kind === "line") {
        s.t = Math.min(s.T, s.t + dt);
        const e = minJerk(s.t / s.T);
        this.q = inverse({ x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e, z: s.from.z + (s.to.z - s.from.z) * e }, s.roll).joints;
      } else if (s.kind === "wait") {
        s.t += dt;
      } else if (s.kind === "grip") {
        s.to ??= s.close ? this.closeTarget() : ARM.open;
        this.gripTarget = s.to;
        if (Math.abs(this.grip - s.to) < 1e-5) this.seg = { kind: "done" };
        return;
      }
      if ("T" in s && s.t >= s.T) this.seg = { kind: "done" };
      return;
    }
  }

  /**
   * Carrying: the grip point glides towards the aim at a steady height. Speed builds up at a limited rate and tapers
   * off near the spot, so the arm eases in and out instead of chasing every twitch of the pointer.
   */
  private runCarry(dt: number) {
    const s = this.held!;
    const t = { x: this.aim.x, y: CARRY_Y, z: this.aim.z };
    const P = this.carryP, V = this.carryV;
    const dx = t.x - P.x, dy = t.y - P.y, dz = t.z - P.z, d = Math.hypot(dx, dy, dz);
    // Close to the base the same speed would swing the base round too fast, so it slows down there, like a real cobot.
    const top = Math.min(CARRY.speed, 1.9 * Math.hypot(P.x, P.z));
    const want = d > 1e-6 ? Math.min(top, Math.sqrt(2 * CARRY.brake * d), CARRY.settle * d) / d : 0;
    const ax = dx * want - V.x, ay = dy * want - V.y, az = dz * want - V.z, a = Math.hypot(ax, ay, az);
    const lim = a > CARRY.accel * dt ? (CARRY.accel * dt) / a : 1;
    V.x += ax * lim;
    V.y += ay * lim;
    V.z += az * lim;
    P.x += V.x * dt;
    P.y += V.y * dt;
    P.z += V.z * dt;
    const roll = nearest(Math.atan2(P.x, P.z) + s.rel - this.carryBeta, this.q.roll, SAMPLE[s.kind].sym || TAU);
    const want2 = inverse(P, roll).joints;
    want2.yaw = this.q.yaw + wrap(want2.yaw - this.q.yaw);
    for (const k of JOINTS) this.q[k] += clamp(want2[k] - this.q[k], -MAX_SPEED[k] * dt, MAX_SPEED[k] * dt);
    this.status = this.dropAt ? "CARRY" : "HOLDING";
    const drop = this.dropAt;
    if (drop && Math.hypot(P.x - drop.x, P.z - drop.z) < 0.002 && Math.abs(P.y - CARRY_Y) < 0.002 && Math.hypot(V.x, V.y, V.z) < 0.01) {
      this.dropAt = null;
      this.picks.push([...this.lower(s, () => ({ x: drop.x, y: 0, z: drop.z })), () => this.set("READY")]);
    }
  }

  /**
   * Manual jogging. The buttons set a direction; the grip point speeds up and slows down at a limited rate, so it starts
   * and stops smoothly. It will not go through the bench, the tray walls or another sample.
   */
  private runJog(dt: number) {
    const P = this.carryP, V = this.carryV, c = this.jogCmd;
    const want = { x: c.x * JOG.speed, y: c.y * JOG.lift, z: c.z * JOG.speed };
    // Limit the change in velocity as a whole vector, so it always pushes the way you pressed, never off at an angle.
    const dx = want.x - V.x, dy = want.y - V.y, dz = want.z - V.z, dv = Math.hypot(dx, dy, dz);
    const k = dv > JOG.accel * dt ? (JOG.accel * dt) / dv : 1;
    for (const [a, d] of [["x", dx], ["y", dy], ["z", dz]] as const) {
      V[a] += d * k;
      P[a] += V[a] * dt;
    }
    // At the edge of reach (or right by the base) it slides along the edge instead of sticking to it.
    const r = reachable(P.x, P.z);
    const nx = r.x - P.x, nz = r.z - P.z, n = Math.hypot(nx, nz);
    if (n > 1e-9) {
      const into = (V.x * nx + V.z * nz) / n;
      if (into < 0) {
        V.x -= (into * nx) / n;
        V.z -= (into * nz) / n;
      }
      P.x = r.x;
      P.z = r.z;
    }
    const lo = this.lowestGrip(P);
    if (P.y < lo) {
      P.y = lo;
      V.y = Math.max(0, V.y);
    }
    if (P.y > JOG.top) {
      P.y = JOG.top;
      V.y = Math.min(0, V.y);
    }
    const h = this.held;
    if (!h) {
      // Over the rubber block, the wrist turns the fingers to face its flat sides.
      const under = this.samples.find((o) => !o.broken && SAMPLE[o.kind].sym && Math.hypot(o.p.x - P.x, o.p.z - P.z) < capture(o.kind));
      if (under) this.jogBeta = under.yaw;
    }
    const period = h ? SAMPLE[h.kind].sym || TAU : SAMPLE.rubber.sym;
    const roll = nearest(Math.atan2(P.x, P.z) + (h?.rel ?? 0) - this.jogBeta, this.q.roll, period);
    const want2 = inverse(P, roll).joints;
    want2.yaw = this.q.yaw + wrap(want2.yaw - this.q.yaw);
    for (const k of JOINTS) this.q[k] += clamp(want2[k] - this.q[k], -MAX_SPEED[k] * dt, MAX_SPEED[k] * dt);
    if (this.closing && Math.abs(this.grip - this.gripTarget) < 1e-5) {
      this.closing = false;
      this.status = this.held ? "GRIPPED" : "MISSED";
      if (this.held) {
        this.jogBeta = this.held.yaw;
        this.said.push("GRIPPED");
      }
    }
  }

  /** How low the grip point may go here without the fingers, or what they hold, hitting something. */
  private lowestGrip(P: Vec3) {
    const h = this.held;
    const over = (r: number) => (inTray(P, r) ? TRAY.foam : inTray(P, -r) ? TRAY.rim : 0);
    if (h) {
      const k = SAMPLE[h.kind];
      let floor = over(k.foot);
      for (const o of this.samples)
        if (o !== h && !o.broken && Math.hypot(o.p.x - P.x, o.p.z - P.z) < k.foot + SAMPLE[o.kind].foot) floor = Math.max(floor, o.p.y + SAMPLE[o.kind].h);
      return floor + k.h - h.off.y + 0.002; // off.y: how far the sample sits below the grip point
    }
    const span = this.grip + 0.008; // how far the fingers reach out to each side
    let lo = over(span) + ARM.fingerLen / 2 + 0.004;
    for (const o of this.samples) {
      if (o.broken) continue;
      const d = Math.hypot(o.p.x - P.x, o.p.z - P.z);
      if (d < capture(o.kind)) continue; // centred: the open fingers go down either side of it
      if (d < SAMPLE[o.kind].foot + span) lo = Math.max(lo, o.p.y + SAMPLE[o.kind].h + ARM.fingerLen / 2 + 0.004);
    }
    return lo;
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
      // The fingers meet the sample: it is held from here on, and it slides to the middle of the jaws.
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
      held.v = { ...this.gripVel }; // let go while moving and it keeps going
      this.held = null;
      this.squeeze = null;
    }
  }

  /** The held sample moves with the fingers. */
  private follow(dt: number) {
    const s = this.held;
    if (!s) return;
    const k = Math.exp(-dt / 0.05);
    s.off.x *= k;
    s.off.z *= k;
    s.p = { x: this.gripPos.x + s.off.x, y: this.gripPos.y + s.off.y, z: this.gripPos.z + s.off.z };
    s.yaw = this.q.yaw - this.q.roll + s.rel;
    s.v = { ...this.gripVel };
  }

  private surface(s: Sample) {
    let floor = inTray(s.p) ? TRAY.foam : 0;
    let foam = inTray(s.p);
    const k = SAMPLE[s.kind];
    for (const o of this.samples) {
      if (o === s || o.held || o.broken) continue;
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

  /** Gravity, bounce and friction for whatever is not in the fingers. Returns true when nothing is moving. */
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
        } else {
          s.p.z = TRAY.z + Math.sign(dz || 1) * oz;
          s.v.z *= -0.3;
        }
      }
    }
  }

  private separate() {
    const loose = this.samples.filter((s) => !s.held && !s.broken);
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
      }
  }
}
