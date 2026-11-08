import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { coreTeam, coreTeamSize, gallery, recruitment, teamPhotos } from "./site";
import { sectionLine } from "./robo-talk";

const pub = (p: string) => path.join(__dirname, "../../public", p);

describe("gallery and recruitment in site.ts", () => {
  it("lists only gallery files that exist, each with words for screen readers", () => {
    for (const g of gallery) {
      expect(existsSync(pub(g.src)), g.src).toBe(true);
      expect(g.alt.trim().length, g.src).toBeGreaterThan(5);
      expect(g.caption.trim().length, g.src).toBeGreaterThan(0);
      if (g.kind === "clip") {
        expect(g.src, g.src).toMatch(/\.mp4$/);
        if (g.poster) expect(existsSync(pub(g.poster)), g.poster).toBe(true);
      }
      expect(`${g.alt} ${g.caption} ${g.event ?? ""}`).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("has a form link whenever recruitment is open", () => {
    expect(["soon", "open", "closed"]).toContain(recruitment.status);
    if (recruitment.status === "open") expect(recruitment.formUrl).toMatch(/^https:\/\//);
  });

  it("lets Robo count the team photos from site.ts instead of saying they are missing", () => {
    const line = sectionLine("The core team");
    const withPhoto = coreTeam.flatMap((s) => s.members).filter((m) => teamPhotos[m.name]).length;
    expect(line).not.toMatch(/not loaded/i);
    if (line.includes("photos so far"))
      expect(line).toContain(`${coreTeamSize} humans found, ${withPhoto} photos`);
  });
});
