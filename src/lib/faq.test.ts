import { describe, expect, it } from "vitest";
import { buildFaqs } from "./faq-build";
import { botForgeInfo, coreTeamSize, events, formatDate, rupees, site } from "./site";

describe("faq", () => {
  const faqs = buildFaqs(site, events, formatDate, coreTeamSize, botForgeInfo);
  it("has complete questions and answers", () => {
    expect(faqs.length).toBeGreaterThanOrEqual(8);
    for (const f of faqs) {
      expect(f.q.endsWith("?")).toBe(true);
      expect(f.a.length).toBeGreaterThan(20);
    }
  });
  it("takes the registration details from site.ts", () => {
    const reg = faqs.find((f) => f.q.includes("register"))!.a;
    expect(reg).toContain(rupees(botForgeInfo.fee));
    expect(reg).toContain(botForgeInfo.closesLabel);
    expect(reg).toContain(botForgeInfo.openTo);
    for (const c of botForgeInfo.contests) expect(reg).toContain(`${c.team[0]} to ${c.team[1]}`);
  });
  it("never uses em or en dashes", () => {
    expect(faqs.map((f) => f.q + f.a).join(" ")).not.toMatch(/[\u2013\u2014]/);
  });
  it("uses the correct branch name", () => {
    expect(faqs.map((f) => f.a).join(" ")).not.toMatch(/Robotics Engineering/);
  });
});
