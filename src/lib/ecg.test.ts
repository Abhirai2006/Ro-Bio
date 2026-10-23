import { describe, expect, it } from "vitest";
import { beatShape } from "./ecg";

const peak = (from: number, to: number, rr: number) => {
  let best = -9, at = from;
  for (let t = from; t <= to; t += 0.002) { const v = beatShape(t, rr); if (v > best) { best = v; at = t; } }
  return { v: best, at };
};

describe("ecg beat", () => {
  it("has the R peak tallest, with P before it and T after it", () => {
    const rr = 60 / 72, p = peak(-0.3, -0.08, rr), t = peak(0.1, 0.5, rr);
    expect(beatShape(0, rr)).toBeGreaterThan(0.95);
    expect(p.at).toBeLessThan(0);
    expect(t.at).toBeGreaterThan(0.2);
    expect(beatShape(0, rr)).toBeGreaterThan(t.v);
    expect(t.v).toBeGreaterThan(p.v);
  });

  it("shortens the R to T gap as the heart speeds up", () => {
    const slow = peak(0.1, 0.5, 60 / 72).at, fast = peak(0.1, 0.4, 60 / 140).at;
    expect(fast).toBeLessThan(slow);
  });
});
