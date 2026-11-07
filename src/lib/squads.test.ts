import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { coreTeam, faculty, squadPages, teamLinkedIn, teamPhotos } from "./site";
import { squadFx, type SquadSlug } from "./squad-fx";
import { squadRigs } from "./squad-rigs";
import { buildMesh, pose, weight, H, W } from "./puppet";

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

  it("rigs every squad: parts inside the frame, art files present, tracked points on real parts", () => {
    for (const s of slugs) {
      const rig = squadRigs[s];
      expect(rig, s).toBeDefined();
      if (!rig) continue;
      const ids = new Set(rig.parts.map((p) => p.id));
      expect(ids.size, `${s} part ids are unique`).toBe(rig.parts.length);
      for (const p of rig.parts) {
        for (const [x, y] of [...p.poly, p.pivot]) {
          expect(x >= 0 && x <= W && y >= 0 && y <= H, `${s}/${p.id}`).toBe(true);
        }
        for (const w of p.wakes ?? []) expect(ids.has(w), `${s}/${p.id} wakes ${w}`).toBe(true);
        if (p.layer) expect(rig.layers).toContain(p.layer);
      }
      for (const tr of rig.track ?? []) expect(ids.has(tr.part), tr.id).toBe(true);
      for (const l of rig.layers ?? [])
        expect(existsSync(pub(`/team/art/${l}.webp`)), l).toBe(true);
      if (rig.base)
        for (const size of [960, 1600])
          expect(existsSync(pub(`/team/art/${rig.base}-${size}.webp`))).toBe(true);
    }
  });

  it("keeps every motion small and never stops: no part jumps more than a few pixels, and it moves at any time", () => {
    for (const s of slugs) {
      const rig = squadRigs[s]!;
      const mesh = buildMesh(rig, 20);
      const out = new Float32Array(mesh.base.length);
      let moved = 0;
      for (const t of [0.3, 7.7, 61.2, 3600.4]) {
        for (const b of [0, 1]) {
          const boost = Object.fromEntries(rig.parts.map((p) => [p.id, b]));
          pose(mesh, t, boost, out);
          let most = 0;
          for (let i = 0; i < out.length; i++)
            most = Math.max(most, Math.abs(out[i]! - mesh.base[i]!));
          expect(Number.isFinite(most), `${s} at ${t}s`).toBe(true);
          // A cut out layer can swing further than a bend in the picture.
          expect(most, `${s} at ${t}s`).toBeLessThan(rig.layers ? 60 : 32);
          moved = Math.max(moved, most);
        }
      }
      expect(moved, s).toBeGreaterThan(1);
    }
  });

  it("fades a part's pull out over its feather", () => {
    const sq: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(weight([5, 5], sq, 10)).toBe(1);
    expect(weight([30, 5], sq, 10)).toBe(0);
    const mid = weight([15, 5], sq, 10);
    expect(mid > 0 && mid < 1).toBe(true);
  });
});
