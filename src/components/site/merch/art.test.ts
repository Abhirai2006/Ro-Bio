import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CREST_SRC, MONO_SRC, POSTER_SRC, STARS_SRC } from "./art";

describe("merch print art", () => {
  it("has every print file the jacket wears", () => {
    for (const src of [POSTER_SRC, MONO_SRC, STARS_SRC, CREST_SRC])
      expect(existsSync(resolve("public", src.slice(1))), src).toBe(true);
  });

  it("has the 3D jacket and its texture", () => {
    for (const f of ["jacket.gltf", "jacket.bin", "jacket-normal.webp"])
      expect(existsSync(resolve("public/merch/models/jacket", f)), f).toBe(true);
  });
});
