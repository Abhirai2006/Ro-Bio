import { describe, expect, it } from "vitest";
import { closestPage, editDistance } from "./closest";

describe("404 suggestions", () => {
  it("counts edits", () => {
    expect(editDistance("team", "tem")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
  });
  it("suggests the page someone nearly typed", () => {
    expect(closestPage("/tem")).toBe("/team");
    expect(closestPage("/Contct")).toBe("/contact");
    expect(closestPage("/event/bot-forge")).toBe("/events/bot-forge");
    expect(closestPage("/gallery/")).toBeNull(); // that is a real page, nothing to suggest
  });
  it("stays quiet when nothing is close", () => {
    expect(closestPage("/wp-admin/setup-config.php")).toBeNull();
  });
});
