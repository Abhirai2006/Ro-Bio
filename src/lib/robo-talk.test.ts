import { describe, expect, it } from "vitest";
import { GREET, sectionLine } from "./robo-talk";
import { coreTeamSize, events } from "./site";

describe("robo talk", () => {
  it("talks about the section by name", () => {
    expect(sectionLine("Robo Sumo")).toMatch(/Robo Sumo/);
    expect(sectionLine("Line Follower")).toMatch(/Line Follower/);
    expect(sectionLine("Sense, decide, act, feed back.")).toMatch(/loop|Sense/i);
  });
  it("counts the core team from the real list", () => {
    expect(GREET["/team"]).toContain(String(coreTeamSize));
    expect(sectionLine("Core team")).toMatch(new RegExp(`${coreTeamSize}|core team`, "i"));
  });
  it("greets the event page with its own facts", () => {
    expect(GREET[`/events/${events[0]!.slug}`]).toContain(events[0]!.title);
  });
  it("reads out unknown headings instead of making things up", () => {
    expect(sectionLine("Some new heading")).toContain("Some new heading");
  });
  it("never uses em or en dashes", () => {
    const all = [...Object.values(GREET), ...["Robo Sumo", "Bot Forge", "Core team", "x"].map(sectionLine)].join(" ");
    expect(all).not.toMatch(/[–—]/);
  });
});
