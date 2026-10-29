import { describe, expect, it } from "vitest";
import { ARM, ArmSim, BREAK_SPEED, JOINTS, MAX_SPEED, SAMPLE, TRAY, forward, inTray, inverse, minJerk, type Joints, type Kind } from "./arm-sim";

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

describe("auto pick and place", () => {
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
      expect(s.broken).toBe(false);
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
    expect(sim.samples.every((s) => inTray(s.p) && !s.broken)).toBe(true);
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

describe("manual mode", () => {
  const grab = (sim: ArmSim, kind: Kind) => {
    settle(sim);
    sim.setMode("manual");
    const s = sim.sample(kind);
    sim.aim(s.p.x, s.p.z);
    run(sim, 1.5);
    sim.press(true);
    run(sim, 2.5);
  };

  it("press and hold picks up the sample under the gripper and lifts it", () => {
    const sim = new ArmSim();
    grab(sim, "rubber");
    expect(sim.status).toBe("GRIPPED");
    expect(sim.sample("rubber").held).toBe(true);
    expect(sim.sample("rubber").p.y).toBeGreaterThan(0.1);
  });

  it("a sample a little off centre still ends up in the middle of the jaws", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.setMode("manual");
    const s = sim.sample("glass");
    sim.aim(s.p.x + 0.015, s.p.z - 0.01);
    run(sim, 1.5);
    sim.press(true);
    run(sim, 2.5);
    expect(sim.status).toBe("GRIPPED");
    const g = forward(sim.q).grip;
    expect(Math.hypot(s.p.x - g.x, s.p.z - g.z)).toBeLessThan(0.001);
  });

  it("stops above a sample it would land on, and does not snap shut", () => {
    const sim = new ArmSim();
    settle(sim);
    sim.setMode("manual");
    const s = sim.sample("rubber");
    sim.aim(s.p.x + 0.045, s.p.z);
    run(sim, 1.5);
    sim.press(true);
    run(sim, 2.5);
    expect(sim.status).toBe("OFF CENTRE");
    expect(sim.grip).toBeCloseTo(ARM.open, 6);
    expect(forward(sim.q).grip.y - ARM.fingerLen / 2).toBeGreaterThan(s.p.y + SAMPLE.rubber.h);
    sim.press(false);
    run(sim, 1);
    expect(sim.status).toBe("MANUAL");
  });

  it("glass dropped on the bare table breaks", () => {
    const sim = new ArmSim();
    grab(sim, "glass");
    sim.aim(0, 0.32);
    run(sim, 1.5);
    sim.press(false);
    run(sim, 1.5);
    expect(sim.sample("glass").broken).toBe(true);
    expect(sim.shards.length).toBeGreaterThan(0);
  });

  it("glass dropped onto the foam in the tray survives", () => {
    const sim = new ArmSim();
    grab(sim, "glass");
    sim.aim(TRAY.x, TRAY.z);
    run(sim, 2);
    sim.press(false);
    run(sim, 2);
    const s = sim.sample("glass");
    expect(s.broken).toBe(false);
    expect(inTray(s.p)).toBe(true);
  });

  it("a ball let go while moving keeps rolling", () => {
    const sim = new ArmSim();
    grab(sim, "ball");
    sim.aim(0.05, 0.3);
    run(sim, 0.35);
    sim.press(false);
    run(sim, 0.4);
    const v = sim.sample("ball").v;
    expect(Math.hypot(v.x, v.z)).toBeGreaterThan(0.03);
  });

  it("rubber does not break however it lands", () => {
    expect(BREAK_SPEED).toBeGreaterThan(0.5);
    const sim = new ArmSim();
    grab(sim, "rubber");
    sim.aim(0, 0.32);
    run(sim, 1.5);
    sim.press(false);
    run(sim, 2);
    expect(sim.sample("rubber").broken).toBe(false);
  });
});
