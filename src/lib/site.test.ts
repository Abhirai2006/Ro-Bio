import { describe, expect, it } from "vitest";
import { daysBetween, eventDate, events, formatDate, todayInIndia } from "./site";

describe("club facts", () => {
  it("Bot Forge has no date yet, with Robo Sumo and Robot Race only", () => {
    const bf = events.find((e) => e.slug === "bot-forge")!;
    expect(bf.date).toBeNull();
    expect(eventDate(bf)).toBe("Date coming soon");
    expect(eventDate({ date: "2026-11-06" })).toContain("6 Nov 2026");
    expect(formatDate("2026-11-06")).toContain("6 Nov 2026");
    expect(bf.activities.map((a) => a.name)).toEqual(["Robo Sumo", "Robot Race"]);
    expect(bf).not.toHaveProperty("previousDates");
  });
  it("counts days from club start", () => {
    expect(daysBetween("2026-05-20", "2026-05-21")).toBe(1);
  });
  it("uses India date", () => {
    expect(todayInIndia(new Date("2026-10-20T20:00:00Z"))).toBe("2026-10-21");
  });
});
