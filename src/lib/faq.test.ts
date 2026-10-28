import { describe, expect, it } from "vitest";
import { buildFaqs } from "./faq-build";
import { coreTeamSize, events, formatDate, site } from "./site";

describe("faq", () => {
  const faqs = buildFaqs(site, events, formatDate, coreTeamSize);
  it("has complete questions and answers", () => {
    expect(faqs.length).toBeGreaterThanOrEqual(8);
    for (const f of faqs) { expect(f.q.endsWith("?")).toBe(true); expect(f.a.length).toBeGreaterThan(20); }
  });
  it("never invents registration details", () => {
    const reg = faqs.find((f) => f.q.includes("register"))!.a.toLowerCase();
    expect(reg).toContain("coming soon");
    expect(reg).not.toMatch(/₹|rs\.|fee of|deadline is/);
  });
  it("uses the correct branch name", () => {
    expect(faqs.map((f) => f.a).join(" ")).not.toMatch(/Robotics Engineering/);
  });
});
