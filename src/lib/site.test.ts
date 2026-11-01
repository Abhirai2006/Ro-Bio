import { describe, expect, it } from "vitest";
import { botForge, daysBetween, eventDate, events, formatDate, nextEvent, pastEvents, todayInIndia, upcomingEvents } from "./site";

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
  it("Robo Spark leads until its day, then moves to Past events and Bot Forge takes over", () => {
    const spark = events.find((e) => e.slug === "robo-spark")!;
    expect(spark.date).toBe("2026-11-03");
    expect(nextEvent("2026-11-01").slug).toBe("robo-spark");
    expect(nextEvent("2026-11-03").slug).toBe("robo-spark"); // still "next" on the day itself
    expect(upcomingEvents("2026-11-01").map((e) => e.slug)).toEqual(["robo-spark", "bot-forge"]);
    expect(nextEvent("2026-11-04")).toBe(botForge);
    expect(pastEvents("2026-11-04").map((e) => e.slug)).toEqual(["robo-spark"]);
    expect(pastEvents("2026-11-01")).toEqual([]);
  });
});
