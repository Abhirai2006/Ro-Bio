import { describe, expect, it } from "vitest";
import { coreTeam, coreTeamSize, currentSem } from "./site";

describe("core team", () => {
  it("moves everyone up one semester", () => {
    expect(currentSem(4)).toBe(5);
    expect(currentSem(6)).toBe(7);
  });
  it("never shows 9th sem", () => {
    const all = coreTeam.flatMap((s) => s.members);
    expect(Math.max(...all.map((x) => currentSem(x.sem)))).toBeLessThan(9);
  });
  it("has no fundraising squad and counts the team from the list", () => {
    expect(coreTeam.some((s) => s.title === "Fundraising")).toBe(false);
    expect(coreTeamSize).toBe(32);
  });
  it("Abhishek Rai A is on Technical, 5th sem AIML", () => {
    const tech = coreTeam.find((s) => s.title === "Technical")!;
    const ab = tech.members.find((x) => x.name === "Abhishek Rai A")!;
    expect(ab.dept).toBe("AIML");
    expect(currentSem(ab.sem)).toBe(5);
  });
  it("Thushar K L is president", () => {
    expect(coreTeam[0]!.members[0]!).toMatchObject({ name: "Thushar K L", role: "President" });
  });
});
