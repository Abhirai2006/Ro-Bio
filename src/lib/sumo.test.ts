import { describe, expect, it } from "vitest";
import { RING, contactOf, controlFromInput, makeMatch, radiusOf, step } from "./sumo";
// @ts-expect-error plain JS helper that plays scripted matches
import { rates } from "../../scripts/sumo-sim.mjs";

describe("sumo physics", () => {
  it("starts with two robots apart and inside the ring", () => {
    const m = makeMatch(1);
    expect(contactOf(m.bots[0], m.bots[1])).toBeNull();
    expect(m.bots.every((b) => radiusOf(b) < RING.radius)).toBe(true);
  });

  it("detects overlap with a normal pointing from the first robot to the second", () => {
    const m = makeMatch(1);
    m.bots[1].x = m.bots[0].x + 30;
    const c = contactOf(m.bots[0], m.bots[1]);
    expect(c).not.toBeNull();
    expect(c!.n.x).toBeGreaterThan(0.9);
  });

  it("stays numerically stable over ten simulated seconds", () => {
    const m = makeMatch(7);
    for (let i = 0; i < 1200 && !m.over; i++) step(m, controlFromInput(m.bots[0], 1, 0), 1 / 120);
    for (const b of m.bots) { expect(Number.isFinite(b.x)).toBe(true); expect(Math.hypot(b.vx, b.vy)).toBeLessThan(600); }
  });

  it("ends the round when a robot is driven out of the ring", () => {
    const m = makeMatch(3);
    m.bots[1].x = RING.cx + 400; // the CPU is already well outside
    step(m, null, 1 / 120);
    expect(m.over).toBe("you");
  });

  it("lights the edge sensors near the rim", () => {
    const m = makeMatch(2);
    m.bots[1].x = RING.cx + RING.radius - 14; m.bots[1].y = RING.cy; m.bots[1].h = 0;
    step(m, null, 1 / 120);
    expect(m.bots[1].sensors.some(Boolean)).toBe(true);
  });
});

describe("sumo difficulty", () => {
  it("is hard to beat by charging, and beatable by a player who positions well", { timeout: 90000 }, () => {
    const charger = rates("charger", 60), skilled = rates("flanker", 60);
    expect(charger.win).toBeLessThan(30);
    expect(skilled.win).toBeGreaterThan(25);
    expect(skilled.win).toBeLessThan(70);
    expect(charger.time).toBeLessThan(10);
  });
});
