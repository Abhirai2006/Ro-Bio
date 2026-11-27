import { describe, expect, it } from "vitest";
import {
  cleanTeamCode,
  cleanUtr,
  contestRules,
  generalRules,
  teamsSheet,
  upiLink,
  validateTeam,
  type Team,
} from "./bot-forge";
import { botForgeInfo, rupees } from "./site";

const member = (n: number, extra: Record<string, unknown> = {}) => ({
  name: `test student ${n}`,
  usn: `4mu00ts0${n}`,
  branch: "Computer Science & Design",
  sem: 3,
  ...extra,
});
const form = (extra: Record<string, unknown> = {}) => ({
  contest: "robo-sumo",
  name: "  Iron   Bulls ",
  members: [member(1), member(2), member(3)],
  phone: "+91 90000 00000",
  email: "Leader@Example.com",
  kit: true,
  consent: true,
  ...extra,
});
const withFirst = (extra: Record<string, unknown>) =>
  form({ members: [member(1, extra), member(2), member(3)] });

describe("Bot Forge team form", () => {
  it("tidies a good team", () => {
    const v = validateTeam(form());
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.value.name).toBe("Iron Bulls");
    expect(v.value.phone).toBe("9000000000");
    expect(v.value.email).toBe("leader@example.com");
    expect(v.value.members[0]).toEqual({
      name: "Test Student 1",
      usn: "4MU00TS01",
      branch: "Computer Science & Design",
      sem: 3,
    });
    expect(v.value.kit).toBe(true);
  });
  it("never gives a Shark Tank team a kit", () => {
    const v = validateTeam(form({ contest: "shark-tank" }));
    expect(v.ok && v.value.kit).toBe(false);
  });
  it("lets a 1st semester student leave the USN blank, nobody else", () => {
    expect(validateTeam(withFirst({ usn: "", sem: 1 })).ok).toBe(true);
    expect(validateTeam(withFirst({ usn: "" })).ok).toBe(false);
  });
  it("refuses the same USN twice in one team", () => {
    const v = validateTeam(form({ members: [member(1), member(1), member(3)] }));
    expect(!v.ok && v.error).toMatch(/twice/);
  });
  it("needs the consent tick, a real branch and a semester from 1 to 8", () => {
    expect(validateTeam(form({ consent: false })).ok).toBe(false);
    expect(validateTeam(withFirst({ branch: "Arts" })).ok).toBe(false);
    expect(validateTeam(withFirst({ sem: 9 })).ok).toBe(false);
  });
  it("reads team numbers and UTRs however they are typed", () => {
    expect(cleanTeamCode("sumo 7")).toBe("SUMO-07");
    expect(cleanTeamCode("SHARK-12")).toBe("SHARK-12");
    expect(cleanTeamCode("FOO-01")).toBe("");
    expect(cleanUtr("1234 5678 9012")).toBe("123456789012");
    expect(cleanUtr("12345")).toBe("");
  });
});

describe("Bot Forge rules and payment", () => {
  it("takes its numbers from site.ts and uses no em or en dashes", () => {
    const all = [
      ...generalRules(),
      ...botForgeInfo.contests.flatMap((c) =>
        contestRules(c.slug).flatMap((s) => [s.title, ...s.points]),
      ),
    ].join(" ");
    expect(all).not.toMatch(/[\u2013\u2014]/);
    expect(generalRules().join(" ")).toContain(rupees(botForgeInfo.fee));
    const sumo = botForgeInfo.contests.find((c) => c.slug === "robo-sumo")!;
    expect(
      contestRules("robo-sumo")
        .flatMap((s) => s.points)
        .join(" "),
    ).toContain(`${sumo.kits} kits`);
    expect(
      contestRules("shark-tank")
        .flatMap((s) => s.points)
        .join(" "),
    ).toMatch(/5 minutes to pitch, then 2 minutes/);
  });
  it("builds a UPI link with the fee and the team number in the note", () => {
    const link = upiLink("SUMO-07");
    expect(link.startsWith("upi://pay?")).toBe(true);
    expect(link).toContain(`am=${botForgeInfo.fee}.00`);
    expect(link).toContain("tn=Bot%20Forge%20SUMO-07");
  });
  it("puts one team on each row of the Excel file", () => {
    const t: Team = {
      id: 1,
      code: "SUMO-01",
      contest: "robo-sumo",
      name: "Iron Bulls",
      members: [{ name: "Test Student", usn: "", branch: "Computer Science & Design", sem: 1 }],
      phone: "9000000000",
      email: "leader@example.com",
      kit: true,
      utr: "",
      pay: "unpaid",
      addedAt: 0,
    };
    const rows = teamsSheet([t]);
    expect(rows).toHaveLength(2);
    expect(rows[1]![4]).toBe("no USN yet");
  });
});
