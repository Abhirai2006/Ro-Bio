import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { coreTeam, faculty, squadPages, teamLinkedIn, teamPhotos } from "./site";
import { squadFx, type SquadSlug } from "./squad-fx";
import { squadLoops } from "./squad-loops";
import { BLUEPRINT_LABELS, CODE_LINES } from "./squad-warp";
import { statSync } from "node:fs";

const pub = (p: string) => path.join(__dirname, "../../public", p);
const slugs: SquadSlug[] = ["projects", "events", "technical", "social-media", "design"];

describe("squad pages", () => {
  it("has the five squads, each with a page, in team order, and Office Bearers stays on /team", () => {
    expect(squadPages().map((s) => s.slug)).toEqual(slugs);
    expect(coreTeam.find((s) => s.title === "Office Bearers")?.slug).toBeUndefined();
    for (const s of squadPages()) expect(s.about && s.about.length > 20).toBe(true);
  });

  it("has every picture, poster and clip in both sizes, and each clip stays small", () => {
    for (const s of slugs) {
      for (const size of [1600, 960]) {
        expect(existsSync(pub(`/team/art/${s}-${size}.webp`)), `${s} picture`).toBe(true);
        expect(existsSync(pub(`/team/art/${s}-poster-${size}.webp`)), `${s} poster`).toBe(true);
        for (const ext of ["webm", "mp4"]) {
          const f = pub(`/team/art/${s}-${size}.${ext}`);
          expect(existsSync(f), f).toBe(true);
          expect(statSync(f).size, f).toBeLessThan(size === 1600 ? 2.5e6 : 1.5e6);
        }
      }
    }
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

  it("keeps LinkedIn links clean: https, the /in/ part only, no tracking or trailing slash", () => {
    for (const [name, url] of Object.entries(teamLinkedIn))
      expect(url, name).toMatch(/^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+$/);
  });

  it("gives every squad exactly one head", () => {
    for (const s of squadPages()) expect(s.members.filter((m) => m.head).length, s.title).toBe(1);
  });

  it("builds an effect layer for every squad, with no em or en dashes", () => {
    for (const s of slugs) {
      const svg = squadFx(s, { art: `/team/art/${s}-1600.webp` });
      expect(svg.length).toBeGreaterThan(200);
      expect(svg).not.toMatch(/[\u2013\u2014]/);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it("follows the clips: one offset pair per frame for every tracked effect, on a group that exists", () => {
    for (const s of slugs) {
      const loop = squadLoops[s];
      // seven to ten seconds at 24 frames a second
      expect(loop.frames, s).toBeGreaterThanOrEqual(168);
      expect(loop.frames, s).toBeLessThanOrEqual(240);
      const svg = squadFx(s);
      for (const [id, xy] of Object.entries(loop.tracks)) {
        expect(xy.length, `${s}/${id}`).toBe(loop.frames * 2);
        expect(
          xy.every((v) => Number.isFinite(v) && Math.abs(v) < 320),
          `${s}/${id}`,
        ).toBe(true);
        expect(svg, `${s}/${id}`).toContain(`data-track="${id}"`);
      }
      // a clip framed tighter than its picture moves the effects onto it
      if (loop.frame) expect(svg.startsWith('<g transform="matrix(')).toBe(true);
    }
  });

  it("keeps the words in the squad jumps free of em and en dashes", () => {
    for (const line of [...CODE_LINES, ...BLUEPRINT_LABELS])
      expect(line).not.toMatch(/[\u2013\u2014]/);
  });
});
