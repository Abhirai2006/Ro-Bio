import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { coreTeam, faculty, squadPages, teamLinkedIn, teamPhotos } from "./site";
import { squadFx, type SquadSlug } from "./squad-fx";

const pub = (p: string) => path.join(__dirname, "../../public", p);
const slugs: SquadSlug[] = ["projects", "events", "technical", "social-media", "design"];

describe("squad pages", () => {
  it("has the five squads, each with a page, in team order, and Office Bearers stays on /team", () => {
    expect(squadPages().map((s) => s.slug)).toEqual(slugs);
    expect(coreTeam.find((s) => s.title === "Office Bearers")?.slug).toBeUndefined();
    for (const s of squadPages()) expect(s.about && s.about.length > 20).toBe(true);
  });

  it("has every illustration in both sizes, and the whiteboard layers for Projects", () => {
    for (const s of slugs) {
      expect(existsSync(pub(`/team/art/${s}-1600.webp`))).toBe(true);
      expect(existsSync(pub(`/team/art/${s}-960.webp`))).toBe(true);
    }
    for (const f of ["projects-clean-1600.webp", "projects-clean-960.webp", "projects-ink.webp"])
      expect(existsSync(pub(`/team/art/${f}`))).toBe(true);
  });

  it("only has photos and LinkedIn links for real team members or faculty, and every photo file exists", () => {
    const names = new Set([
      ...coreTeam.flatMap((s) => s.members.map((m) => m.name)),
      ...faculty.map((f) => f.name),
    ]);
    for (const [name, file] of Object.entries(teamPhotos)) {
      expect(names.has(name), name).toBe(true);
      expect(existsSync(pub(file)), file).toBe(true);
    }
    for (const [name, url] of Object.entries(teamLinkedIn)) {
      expect(names.has(name), name).toBe(true);
      expect(url).toMatch(/^https:\/\/(www\.)?linkedin\.com\/in\//);
    }
  });

  it("builds an effect layer for every squad, with no em or en dashes", () => {
    for (const s of slugs) {
      const svg = squadFx(s, { ink: "/team/art/projects-ink.webp" });
      expect(svg.length).toBeGreaterThan(200);
      expect(svg).not.toMatch(/[\u2013\u2014]/);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
    expect(squadFx("projects", { ink: "/x.webp" })).toContain("animateMotion");
    expect(squadFx("projects", { ink: "/x.webp", still: true })).not.toContain("animateMotion");
  });
});
