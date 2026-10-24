import { describe, expect, it } from "vitest";
import { WALK_FALL, WALK_IDLE, WALK_JUMP, groundShift, walkCycle, walkTransforms } from "./robo-walk";

const soleY = (h: number, k: number, shift: number) => shift + 6 + 46 * Math.cos((h * Math.PI) / 180) + 44 * Math.cos(((h - k) * Math.PI) / 180) + 9;

describe("robo walk cycle", () => {
  it("keeps the lowest foot exactly on the floor line at every point of the cycle", () => {
    for (let i = 0; i < 360; i += 5) {
      const p = walkCycle((i * Math.PI) / 180, i % 2 ? 1 : 1.55), s = groundShift(p);
      expect(Math.max(soleY(p.hN, p.kN, s), soleY(p.hF, p.kF, s))).toBeCloseTo(106, 5);
    }
  });
  it("moves the legs in opposite phase and the arms against the legs", () => {
    const p = walkCycle(1.1);
    expect(p.hN).toBeCloseTo(-p.hF, 6);
    expect(Math.sign(p.sN)).toBe(-Math.sign(p.hN));
  });
  it("bends the knee only on the swing", () => {
    expect(walkCycle(0.2).kN).toBeGreaterThan(walkCycle(0.2).kF);
  });
  it("produces a transform for every joint, including jump and fall", () => {
    for (const p of [WALK_IDLE, WALK_JUMP, WALK_FALL]) {
      const tf = walkTransforms(p, false);
      for (const id of ["root", "torso", "head", "armN", "foreN", "armF", "foreF", "legN", "shinN", "footN", "legF", "shinF", "footF", "lid", "pupil"]) expect(tf[id]).toBeTruthy();
    }
  });
});
