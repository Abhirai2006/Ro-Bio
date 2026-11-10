import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { merch } from "@/lib/site";
import { STARS_SRC, monoSrc, nameLines, posterSrc } from "./art";

describe("merch print art", () => {
  it("puts the design team's art for each fabric on every colour, and every file is there", () => {
    expect(posterSrc("black")).toBe("/merch/art/poster.webp");
    expect(posterSrc("white")).toBe("/merch/art/poster.webp");
    expect(posterSrc("lilac")).toBe("/merch/art/poster-lilac.webp");
    expect(posterSrc("duo")).toBe("/merch/art/poster-lilac.webp");
    // the light Mono, blue on a white disc, goes on every colour
    for (const c of merch.colours) expect(monoSrc(c.id)).toBe("/merch/art/mono-light.webp");
    for (const c of merch.colours)
      for (const src of [posterSrc(c.id), monoSrc(c.id), STARS_SRC])
        expect(existsSync(resolve("public", src.slice(1)))).toBe(true);
  });

  it("breaks a long name after its first word on the hoodie chest, never on the tee", () => {
    expect(nameLines("ABHIRAI", "patch")).toEqual(["ABHIRAI"]);
    expect(nameLines("VIREN BIDDAPPA K.A.", "patch")).toEqual(["VIREN", "BIDDAPPA K.A."]);
    expect(nameLines("VIREN BIDDAPPA K.A.", "line")).toEqual(["VIREN BIDDAPPA K.A."]);
    expect(nameLines("  ", "patch")).toEqual([]);
  });
});
