import { describe, expect, it } from "vitest";
import {
  NUMBER_STYLES,
  cleanName,
  cleanNumber,
  cleanText,
  isColour,
  isKind,
  isStyle,
  pieceLikes,
  swatch,
} from "@/lib/merch";
import { merch } from "@/lib/site";

describe("merch page", () => {
  it("cleans names into printable capitals", () => {
    expect(cleanName("thushar  k l")).toBe("THUSHAR K L");
    expect(cleanName("  <script>")).toBe("SCRIPT");
    expect(cleanName("a".repeat(40))).toHaveLength(16);
  });

  it("keeps numbers to two digits", () => {
    expect(cleanNumber("7")).toBe("7");
    expect(cleanNumber("a1b23")).toBe("12");
  });

  it("keeps notes as plain, short text", () => {
    expect(cleanText("  hi\u0007 there\n\n\n\nok ", 100)).toBe("hi there\n\nok");
    expect(cleanText(42, 10)).toBe("");
    expect(cleanText("x".repeat(50), 10)).toHaveLength(10);
  });

  it("knows the pieces and colours", () => {
    expect(isKind("jacket")).toBe(true);
    expect(isKind("socks")).toBe(false);
    expect(isKind("hoodie")).toBe(false);
    expect(isColour("grey")).toBe(true);
    expect(isColour("lilac")).toBe(false);
  });

  it("comes in the producer's grey only, with its size chart", () => {
    expect(merch.colours.map((c) => c.id)).toEqual(["grey"]);
    expect(swatch("grey")).toBe("#a3a5a7");
    expect(merch.sizes.map((s) => [s.size, s.width])).toEqual([
      ["S", 20],
      ["M", 21],
      ["L", 22],
      ["XL", 23],
      ["XXL", 24],
    ]);
  });

  it("offers the three number styles the club picked and the design team's pixel style", () => {
    expect(NUMBER_STYLES.map((s) => s.id)).toEqual(["plate", "ink", "kanji", "pixel"]);
    expect(isStyle("kanji")).toBe(true);
    expect(isStyle("pixel")).toBe(true);
    expect(isStyle("chip")).toBe(false);
  });

  it("adds a piece's likes across colours", () => {
    expect(
      pieceLikes(
        { counts: { "jacket:grey": 2, "jacket:lilac": 3, "tee:black": 9 }, mine: [] },
        "jacket",
      ),
    ).toBe(2);
  });

  it("is the one club jacket at the price the club set", () => {
    expect(merch.products.map((p) => [p.kind, p.name, p.price])).toEqual([
      ["jacket", "Club Jacket", 570],
    ]);
    expect(merch.draft).toBe(false);
  });
});
