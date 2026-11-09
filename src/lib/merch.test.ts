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
    expect(isColour("lilac")).toBe(true);
    expect(isColour("red")).toBe(false);
  });

  it("offers the three number styles the club picked", () => {
    expect(NUMBER_STYLES.map((s) => s.id)).toEqual(["plate", "ink", "kanji"]);
    expect(isStyle("kanji")).toBe(true);
    expect(isStyle("chip")).toBe(false);
  });

  it("adds a piece's likes across colours", () => {
    expect(
      pieceLikes(
        { counts: { "jacket:black": 2, "jacket:lilac": 3, "tee:black": 9 }, mine: [] },
        "jacket",
      ),
    ).toBe(5);
  });

  it("has every price the club set, zip jacket and hoodie first", () => {
    expect(merch.products.map((p) => [p.kind, p.price])).toEqual([
      ["jacket", 580],
      ["hoodie", 550],
      ["tee", 300],
      ["polo", 380],
    ]);
  });
});
