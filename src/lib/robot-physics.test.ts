import { describe, expect, it } from "vitest";
import { Bodies, Body, Composite, Engine, cpuIntent, makeSample, materialProperties, shouldBreak } from "./robot-physics";

describe("manual lab physics", () => {
  it("falls through mid-air under gravity", () => {
    const engine = Engine.create();
    const sample = makeSample("rubber", 90, 100);
    Composite.add(engine.world, sample);
    for (let i = 0; i < 30; i++) Engine.update(engine, 1000 / 60);
    expect(sample.position.y).toBeGreaterThan(180);
  });
  it("keeps a placed object at the tray rather than returning it", () => {
    const engine = Engine.create();
    const sample = makeSample("glass", 330, 304);
    Composite.add(engine.world, [sample, Bodies.rectangle(210, 330, 440, 24, { isStatic: true })]);
    for (let i = 0; i < 120; i++) Engine.update(engine, 1000 / 60);
    expect(sample.position.x).toBeCloseTo(330, 1);
    expect(sample.position.y).toBeCloseTo(304, 0);
  });
  it("only delicate glass breaks on a hard impact", () => {
    expect(shouldBreak("glass", 6)).toBe(true);
    expect(shouldBreak("glass", 1)).toBe(false);
    expect(shouldBreak("rubber", 6)).toBe(false);
    expect(shouldBreak("ball", 6)).toBe(false);
  });
  it("rugged samples bounce and round samples roll with lower friction", () => {
    expect(materialProperties.rubber.restitution).toBeGreaterThan(0.5);
    expect(materialProperties.ball.friction).toBeLessThan(materialProperties.rubber.friction);
    const engine = Engine.create();
    const ball = makeSample("ball", 100, 306);
    Body.setVelocity(ball, { x: 3, y: 0 });
    Composite.add(engine.world, [ball, Bodies.rectangle(210, 330, 440, 24, { isStatic: true })]);
    for (let i = 0; i < 30; i++) Engine.update(engine, 1000 / 60);
    expect(ball.position.x).toBeGreaterThan(130);
    expect(Math.abs(ball.angle)).toBeGreaterThan(0);
  });
});
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