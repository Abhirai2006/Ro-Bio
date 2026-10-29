import { describe, expect, it } from "vitest";
import { Bodies, Body, cpuIntent } from "./robot-physics";

describe("sumo CPU", () => {
  it("steers inward and brakes when pushed towards the rim", () => {
    const cpu = Bodies.circle(260, 160, 18), player = Bodies.circle(280, 160, 18);
    Body.setVelocity(cpu, { x: 3, y: 0 });
    const intent = cpuIntent(cpu, player, 0, true);
    expect(intent.tactic).toBe("RECOVER");
    expect(intent.x).toBeLessThan(-0.9);
  });
  it("changes from forward drive to reverse during sustained contact", () => {
    const cpu = Bodies.circle(200, 160, 18), player = Bodies.circle(160, 160, 18);
    expect(cpuIntent(cpu, player, 0, true).x).toBeLessThan(0);
    expect(cpuIntent(cpu, player, 2300, true).x).toBeGreaterThan(0);
  });
  it("uses a flank instead of always chasing", () => {
    const cpu = Bodies.circle(190, 160, 18), player = Bodies.circle(120, 190, 18);
    expect(cpuIntent(cpu, player, 1600, false).tactic).toBe("FLANK");
  });
});
