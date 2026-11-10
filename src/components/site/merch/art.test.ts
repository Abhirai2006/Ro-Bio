import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { merch } from "@/lib/site";
import { monoSrc, nameLines, posterSrc } from "./art";

describe("merch print art", () => {
  it("puts the design team's art for each fabric on every colour, and every file is there", () => {
    expect(posterSrc("black")).toBe("/merch/art/poster.webp");
    expect(posterSrc("white")).toBe("/merch/art/poster.webp");
    expect(posterSrc("lilac")).toBe("/merch/art/poster-lilac.webp");
    expect(posterSrc("duo")).toBe("/merch/art/poster-lilac.webp");
    expect(monoSrc("white")).toBe("/merch/art/mono-line.webp");
    expect(monoSrc("black")).toBe("/merch/art/mono-dark.webp");
    expect(monoSrc("duo")).toBe("/merch/art/mono-dark.webp");
    for (const c of merch.colours)
      for (const src of [posterSrc(c.id), monoSrc(c.id)])
        expect(existsSync(resolve("public", src.slice(1)))).toBe(true);
  });

  it("breaks a long name after its first word on the hoodie chest, never on the tee", () => {
    expect(nameLines("ABHIRAI", "patch")).toEqual(["ABHIRAI"]);
    expect(nameLines("VIREN BIDDAPPA K.A.", "patch")).toEqual(["VIREN", "BIDDAPPA K.A."]);
    expect(nameLines("VIREN BIDDAPPA K.A.", "line")).toEqual(["VIREN BIDDAPPA K.A."]);
    expect(nameLines("  ", "patch")).toEqual([]);
  });
});
