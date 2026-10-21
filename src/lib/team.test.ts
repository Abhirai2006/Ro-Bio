import { describe, expect, it } from "vitest";
import { coreTeam, currentSem } from "./site";

describe("core team", () => {
  it("moves everyone up one semester", () => {
    expect(currentSem(4)).toBe(5);
    expect(currentSem(6)).toBe(7);
  });
  it("never shows 9th sem", () => {
    const all = coreTeam.flatMap((s) => s.members);
    expect(Math.max(...all.map((x) => currentSem(x.sem)))).toBeLessThan(9);
  });
  it("Thushar K L is president", () => {
    expect(coreTeam[0]!.members[0]!).toMatchObject({ name: "Thushar K L", role: "President" });
  });
});
