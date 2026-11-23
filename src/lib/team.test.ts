import { describe, expect, it } from "vitest";
import { coreTeam, coreTeamSize, currentSem, ordinal } from "./site";

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
  it("Abhishek Rai A is Secretary, in the office bearers only, 5th sem AIML", () => {
    const top = coreTeam.find((s) => s.title === "Office Bearers")!;
    const ab = top.members.find((x) => x.name === "Abhishek Rai A")!;
    expect(ab).toMatchObject({ dept: "AIML", role: "Secretary" });
    expect(currentSem(ab.sem)).toBe(5);
    const all = coreTeam.flatMap((s) => s.members.map((x) => x.name));
    expect(all.filter((n) => n === "Abhishek Rai A")).toHaveLength(1);
  });
  it("Deekshitha H and Amina Aslam are no longer on the core team", () => {
    const all = coreTeam.flatMap((s) => s.members.map((x) => x.name));
    expect(all).not.toContain("Deekshitha H");
    expect(all).not.toContain("Amina Aslam");
  });
  it("Thushar K L is president", () => {
    expect(coreTeam[0]!.members[0]!).toMatchObject({ name: "Thushar K L", role: "President" });
  });
});

describe("ordinal", () => {
  it("says 1st, 2nd, 3rd and 4th, not 1th", () => {
    expect([1, 2, 3, 4, 5, 7, 11, 12, 13, 21].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th",
      "7th",
      "11th",
      "12th",
      "13th",
      "21st",
    ]);
  });
});
