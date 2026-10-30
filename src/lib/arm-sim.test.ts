import { describe, expect, it } from "vitest";
import { ARM, ArmSim, CARRY_Y, JOINTS, MAX_SPEED, SAMPLE, TRAY, forward, inTray, inverse, minJerk, type Joints, type Kind } from "./arm-sim";

const run = (sim: ArmSim, seconds: number, each?: (sim: ArmSim) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    sim.step(1 / 60);
    each?.(sim);
  }
};
const settle = (sim: ArmSim, limit = 30) => {
  let t = 0;
  while ((sim.busy || sim.moving) && t < limit) {
    sim.step(1 / 60);
    t += 1 / 60;
  }
  return t;
};

describe("arm kinematics", () => {
  it("reaches every spot on the bench with the gripper pointing straight down and the elbow up", () => {
    for (let x = -0.36; x <= 0.36; x += 0.04)
      for (let z = 0.05; z <= 0.36; z += 0.04)
        for (const y of [0.02, 0.08, 0.17, 0.27]) {
          if (Math.hypot(x, z) < 0.15 || Math.hypot(x, z) > (y > 0.2 ? 0.36 : 0.42)) continue;
          const { joints, reachable } = inverse({ x, y, z }, 0.3);
          expect(reachable).toBe(true);
          const f = forward(joints);
          expect(Math.hypot(f.grip.x - x, f.grip.y - y, f.grip.z - z)).toBeLessThan(1e-6);
          expect(f.pitch).toBeCloseTo(-Math.PI / 2, 6);
          expect(f.elbow.y).toBeGreaterThan(ARM.shoulderY); // elbow above the shoulder: never folds under
        }
  });
  it("says when a spot is out of reach", () => {
    expect(inverse({ x: 0, y: 0.05, z: 0.7 }, 0).reachable).toBe(false);
    expect(inverse({ x: 0, y: 0.05, z: 0.02 }, 0).reachable).toBe(false);
  });
  it("moves on a minimum-jerk curve: starts and stops gently", () => {
    expect(minJerk(0)).toBe(0);
    expect(minJerk(1)).toBe(1);
    expect(minJerk(0.5)).toBeCloseTo(0.5, 9);
    const e = 1e-4;
    expect(minJerk(e) / e).toBeLessThan(1e-3); // no speed at the start
    expect((1 - minJerk(1 - e)) / e).toBeLessThan(1e-3); // and none at the end
    for (let t = 0; t < 1; t += 0.01) expect(minJerk(t + 0.01)).toBeGreaterThanOrEqual(minJerk(t));
  });
});

describe("tray buttons", () => {
  for (const kind of ["glass", "rubber", "ball"] as Kind[])
    it(`puts the ${kind} in the tray smoothly, without hitting anything`, () => {
      const sim = new ArmSim();
      settle(sim);
      expect(sim.pick(kind)).toBe(true);
      let prev: Joints = { ...sim.q }, prevV: Joints | null = null, lowest = Infinity, maxAccel = 0, gripped = false;
      const dt = 1 / 240;
      for (let t = 0; t < 20 && (sim.busy || sim.moving); t += dt) {
        sim.step(dt);
        const f = forward(sim.q);
        lowest = Math.min(lowest, f.grip.y - ARM.fingerLen / 2); // finger tips
        const v = {} as Joints;
        for (const j of JOINTS) {
          v[j] = (sim.q[j] - prev[j]) / dt;
          expect(Math.abs(v[j])).toBeLessThan(MAX_SPEED[j] * 1.05);
          if (prevV) maxAccel = Math.max(maxAccel, Math.abs(v[j] - prevV[j]) / dt);
        }
        prev = { ...sim.q };
        prevV = v;
        if (sim.status === "GRIPPED") gripped = true;
      }
      const s = sim.sample(kind);
      expect(gripped).toBe(true);
      expect(inTray(s.p)).toBe(true);
      expect(s.p.y).toBeCloseTo(TRAY.foam + SAMPLE[kind].h, 3);
      expect(lowest).toBeGreaterThan(-0.001); // the fingers never go through the table
      expect(maxAccel).toBeLessThan(25); // no jolts: joint acceleration stays bounded
      expect(sim.status).toBe("READY");
    });

  it("closes the fingers onto the sample, not through it", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.pick("rubber");
    let widest = 0;
    run(sim, 12, (s) => {
      if (s.status === "GRIPPED" || s.status === "LIFT") widest = Math.max(widest, s.grip);
    });
    expect(widest).toBeCloseTo(SAMPLE.rubber.half, 4);
  });

  it("works through a queue and fills different slots", () => {
    const sim = new ArmSim();
    settle(sim);
    (["glass", "rubber", "ball"] as Kind[]).forEach((k) => sim.pick(k));
    settle(sim, 60);
    const xs = sim.samples.map((s) => s.p.x).sort((a, b) => a - b);
    expect(sim.samples.every((s) => inTray(s.p))).toBe(true);
    expect(xs[1]! - xs[0]!).toBeGreaterThan(0.05);
    expect(xs[2]! - xs[1]!).toBeGreaterThan(0.05);
  });

  it("takes a sample out of the tray and back to where it started", () => {
    const sim = new ArmSim();
    settle(sim);
    const home = { ...sim.sample("ball").p };
    sim.pick("ball");
    settle(sim);
    sim.pick("ball");
    settle(sim);
    const p = sim.sample("ball").p;
    expect(Math.hypot(p.x - home.x, p.z - home.z)).toBeLessThan(0.01);
  });
});

/** Step the world while checking that every joint moves smoothly: no speed over the limit and no sudden jolts. */
const smoothRun = (sim: ArmSim, seconds: number) => {
  const dt = 1 / 240;
  let prev: Joints = { ...sim.q }, prevV: Joints | null = null, maxAccel = 0, lowest = Infinity;
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    const v = {} as Joints;
    for (const j of JOINTS) {
      v[j] = (sim.q[j] - prev[j]) / dt;
      expect(Math.abs(v[j])).toBeLessThan(MAX_SPEED[j] * 1.05);
      if (prevV) maxAccel = Math.max(maxAccel, Math.abs(v[j] - prevV[j]) / dt);
    }
    lowest = Math.min(lowest, forward(sim.q).grip.y - ARM.fingerLen / 2);
    prev = { ...sim.q };
    prevV = v;
  }
  return { maxAccel, lowest };
};

describe("tap to pick, tap to place", () => {
  it("a tap picks the sample up and holds it above the bench", () => {
    const sim = new ArmSim();
    settle(sim);
    expect(sim.grab("rubber")).toBe(true);
    settle(sim);
    expect(sim.holding).toBe(true);
    expect(sim.status).toBe("HOLDING");
    expect(sim.sample("rubber").p.y).toBeGreaterThan(0.1);
  });

  it("a second tap puts it down gently at that spot", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("glass");
    settle(sim);
    sim.place(0.05, 0.32);
    const { maxAccel, lowest } = smoothRun(sim, 8);
    const s = sim.sample("glass");
    expect(s.held).toBe(false);
    expect(Math.hypot(s.p.x - 0.05, s.p.z - 0.32)).toBeLessThan(0.004);
    expect(s.p.y).toBeCloseTo(SAMPLE.glass.h, 3); // resting on the bench, not dropped from a height
    expect(maxAccel).toBeLessThan(25);
    expect(lowest).toBeGreaterThan(-0.001);
    expect(sim.status).toBe("READY");
  });

  it("tapping the tray puts it on the foam, inside the walls", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("ball");
    settle(sim);
    sim.place(TRAY.x + TRAY.w / 2 + 0.01, TRAY.z); // a little past the tray edge still counts
    settle(sim);
    const s = sim.sample("ball");
    expect(inTray(s.p, SAMPLE.ball.foot)).toBe(true);
    expect(s.p.y).toBeCloseTo(TRAY.foam + SAMPLE.ball.h, 3);
  });

  it("never puts one sample on top of another", () => {
    const sim = new ArmSim();
    settle(sim);
    const glass = { ...sim.sample("glass").p };
    sim.grab("ball");
    settle(sim);
    sim.place(glass.x, glass.z);
    settle(sim);
    const b = sim.sample("ball").p;
    expect(Math.hypot(b.x - glass.x, b.z - glass.z)).toBeGreaterThan(SAMPLE.ball.foot + SAMPLE.glass.foot);
    expect(b.y).toBeCloseTo(SAMPLE.ball.h, 3);
  });

  it("can be told where to put it before the pick-up has even finished", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("rubber");
    run(sim, 0.5);
    expect(sim.place(0.1, 0.3)).toBe(true);
    settle(sim);
    const s = sim.sample("rubber").p;
    expect(Math.hypot(s.x - 0.1, s.z - 0.3)).toBeLessThan(0.004);
  });

  it("the tray buttons wait while something is being held", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("rubber");
    expect(sim.pick("ball")).toBe(false);
  });
});

describe("carrying", () => {
  it("the held sample glides after the pointer, speeding up and slowing down smoothly", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("ball");
    settle(sim);
    // a jumpy pointer: big jumps every few frames
    let peak = 0;
    for (const [x, z] of [[0.1, 0.32], [-0.2, 0.3], [0.2, 0.25], [0.3, 0.05], [0, 0.35]] as const) {
      sim.carry(x, z);
      const { maxAccel } = smoothRun(sim, 0.4);
      peak = Math.max(peak, maxAccel);
      const g = forward(sim.q).grip;
      expect(Math.abs(g.y - CARRY_Y)).toBeLessThan(0.01); // stays at carrying height
    }
    expect(peak).toBeLessThan(25);
    run(sim, 2.5);
    const g = forward(sim.q).grip;
    expect(Math.hypot(g.x - 0, g.z - 0.35)).toBeLessThan(0.003); // and settles exactly on the last spot
  });

  it("keeps the block facing the same way while the base turns", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("rubber");
    settle(sim);
    const before = sim.sample("rubber").yaw;
    sim.carry(0.25, 0.1);
    run(sim, 3);
    const turned = sim.sample("rubber").yaw - before;
    expect(Math.abs(Math.sin(2 * turned))).toBeLessThan(0.02); // same, or a quarter turn, which looks the same on a square block
  });

  it("pointing at a spot that is out of reach stops at the edge of reach", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.grab("ball");
    settle(sim);
    sim.carry(0.5, 0.5);
    run(sim, 3);
    const g = forward(sim.q).grip;
    expect(Math.hypot(g.x, g.z)).toBeLessThanOrEqual(0.4201);
  });
});

describe("responsiveness", () => {
  it("is ready the moment it appears, with nothing to wait for", () => {
    const sim = new ArmSim();
    expect(sim.busy).toBe(false);
    expect(sim.grab("ball")).toBe(true);
  });
  it("a tap during another move is not ignored: it runs straight after", () => {
    const sim = new ArmSim();
    sim.pick("glass");
    run(sim, 0.5);
    expect(sim.grab("ball")).toBe(true);
    settle(sim, 30);
    expect(sim.holding).toBe(true);
    expect(sim.heldKind).toBe("ball");
    expect(inTray(sim.sample("glass").p)).toBe(true);
  });
});

describe("manual jogging", () => {
  /** Hold a jog direction until the grip point is over (x, z), like a person pressing arrow buttons. */
  const jogTo = (sim: ArmSim, x: number, z: number) => {
    for (let i = 0; i < 2000; i++) {
      const g = forward(sim.q).grip;
      const dx = x - g.x, dz = z - g.z;
      if (Math.hypot(dx, dz) < 0.004) break;
      sim.jog(Math.abs(dx) > 0.004 ? Math.sign(dx) * Math.min(1, Math.abs(dx) * 20) : 0, 0, Math.abs(dz) > 0.004 ? Math.sign(dz) * Math.min(1, Math.abs(dz) * 20) : 0);
      sim.step(1 / 120);
    }
    sim.jog(0, 0, 0);
    run(sim, 0.5);
  };
  const lower = (sim: ArmSim, seconds = 2.5) => {
    sim.jog(0, -1, 0);
    run(sim, seconds);
    sim.jog(0, 0, 0);
    run(sim, 0.3);
  };
  const raise = (sim: ArmSim, seconds = 1.5) => {
    sim.jog(0, 1, 0);
    run(sim, seconds);
    sim.jog(0, 0, 0);
    run(sim, 0.5);
  };
  const grabWithJog = (sim: ArmSim, kind: Kind) => {
    expect(sim.setMode("manual")).toBe(true);
    const s = sim.sample(kind);
    jogTo(sim, s.p.x, s.p.z);
    lower(sim);
    sim.toggleGrip();
    run(sim, 0.6);
  };

  it("move over a sample, lower, grip, lift: it comes up with the arm", () => {
    const sim = new ArmSim();
    grabWithJog(sim, "rubber");
    expect(sim.status).toBe("GRIPPED");
    raise(sim);
    expect(sim.sample("rubber").p.y).toBeGreaterThan(0.1);
  });

  it("holding left goes left, sliding round the front of the base, never behind it", () => {
    const sim = new ArmSim();
    sim.setMode("manual");
    sim.jog(-0.976, 0, -0.21); // "left" as seen from the camera
    let minZ = Infinity;
    for (let t = 0; t < 5; t += 1 / 60) {
      sim.step(1 / 60);
      minZ = Math.min(minZ, forward(sim.q).grip.z);
    }
    const g = forward(sim.q).grip;
    expect(g.x).toBeLessThan(-0.2);
    expect(minZ).toBeGreaterThan(0);
  });

  it("jogging starts and stops smoothly", () => {
    const sim = new ArmSim();
    sim.setMode("manual");
    sim.jog(1, 0, 0);
    const a = smoothRun(sim, 0.6);
    sim.jog(0, 0, 0);
    const b = smoothRun(sim, 0.6);
    expect(Math.max(a.maxAccel, b.maxAccel)).toBeLessThan(25);
  });

  it("lowering stops above a sample the fingers would land on", () => {
    const sim = new ArmSim();
    sim.setMode("manual");
    const s = sim.sample("rubber");
    jogTo(sim, s.p.x + 0.045, s.p.z);
    lower(sim, 4);
    expect(forward(sim.q).grip.y - ARM.fingerLen / 2).toBeGreaterThan(s.p.y + SAMPLE.rubber.h);
  });

  it("never goes through the bench", () => {
    const sim = new ArmSim();
    sim.setMode("manual");
    jogTo(sim, 0.05, 0.3);
    const { lowest } = (() => {
      sim.jog(0, -1, 0);
      return smoothRun(sim, 4);
    })();
    expect(lowest).toBeGreaterThan(0);
  });

  it("glass let go high above the bench breaks", () => {
    const sim = new ArmSim();
    grabWithJog(sim, "glass");
    raise(sim, 2);
    jogTo(sim, 0.05, 0.32);
    sim.toggleGrip();
    run(sim, 1.5);
    expect(sim.sample("glass").broken).toBe(true);
    expect(sim.shards.length).toBeGreaterThan(0);
    expect(sim.status).toBe("GLASS BROKEN");
  });

  it("glass let go over the foam survives", () => {
    const sim = new ArmSim();
    grabWithJog(sim, "glass");
    raise(sim, 2);
    jogTo(sim, TRAY.x, TRAY.z);
    sim.toggleGrip();
    run(sim, 2);
    const s = sim.sample("glass");
    expect(s.broken).toBe(false);
    expect(inTray(s.p)).toBe(true);
  });

  it("reset brings back a whole vial", () => {
    const sim = new ArmSim();
    grabWithJog(sim, "glass");
    raise(sim, 2);
    jogTo(sim, 0.05, 0.32);
    sim.toggleGrip();
    run(sim, 1.5);
    sim.reset();
    expect(sim.sample("glass").broken).toBe(false);
    expect(sim.shards.length).toBe(0);
  });

  it("switching back to tap mode keeps holding the sample", () => {
    const sim = new ArmSim();
    grabWithJog(sim, "ball");
    raise(sim);
    expect(sim.setMode("tap")).toBe(true);
    expect(sim.holding).toBe(true);
    sim.place(0.05, 0.32);
    settle(sim);
    expect(Math.hypot(sim.sample("ball").p.x - 0.05, sim.sample("ball").p.z - 0.32)).toBeLessThan(0.004);
  });
});
