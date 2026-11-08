import { describe, expect, it } from "vitest";
import { coreTeam, faculty, squadDuties, squadPages } from "./site";
import { memberThought, narration } from "./robo-talk";

const all = () => [
  "faculty",
  "office",
  ...squadPages().flatMap((s) => [`squad:${s.slug}`, `members:${s.slug}`]),
];

describe("Robo on the team pages", () => {
  it("knows the faculty and the office bearers by name and role", () => {
    const fac = narration("faculty").join(" ");
    for (const f of faculty) expect(fac).toContain(f.name);
    const office = narration("office").join(" ");
    for (const m of coreTeam.find((s) => s.title === "Office Bearers")!.members) {
      expect(office).toContain(m.name);
      expect(office).toContain(m.role!);
    }
  });

  it("says what each squad does and who heads it", () => {
    for (const s of squadPages()) {
      const head = s.members.find((m) => m.head)!;
      const lines = narration(`members:${s.slug}`);
      expect(lines.join(" "), s.slug).toContain(head.name);
      expect(lines.join(" "), s.slug).toContain(squadDuties[s.slug]![0]!);
      expect(narration(`squad:${s.slug}`)[0], s.slug).toContain(s.title);
    }
  });

  it("keeps every line short enough for his bubble, with no em or en dashes", () => {
    for (const key of all()) {
      const lines = narration(key);
      expect(lines.length, key).toBeGreaterThan(0);
      for (const l of lines) {
        expect(l.length, l).toBeLessThan(170);
        expect(l, key).not.toMatch(/[\u2013\u2014]|undefined|NaN/);
      }
    }
    expect(narration("nope")).toEqual([]);
  });

  it("gives squad members with a title of their own a line, like the Lead Video Editor", () => {
    for (const s of squadPages())
      for (const m of s.members.filter((x) => x.role)) {
        expect(narration(`members:${s.slug}`).join(" ")).toContain(
          `${m.name} is the squad's ${m.role}`,
        );
        expect(memberThought(m, s.title)).toContain(`The ${s.title} ${m.role}`);
      }
    const sm = squadPages().find((s) => s.slug === "social-media")!;
    expect(sm.members.find((m) => m.name === "Sumith S")).toMatchObject({
      role: "Lead Video Editor",
      head: false,
    });
  });

  it("describes a member card", () => {
    const sq = squadPages()[0]!;
    const head = sq.members.find((m) => m.head)!;
    expect(memberThought(head, sq.title)).toContain(`Heads the ${sq.title} squad`);
    const pres = coreTeam[0]!.members[0]!;
    expect(memberThought(pres)).toContain(pres.role!);
  });
});
