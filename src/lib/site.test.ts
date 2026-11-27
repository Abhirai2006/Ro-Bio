import { describe, expect, it } from "vitest";
import {
  botForge,
  botForgeInfo,
  botForgePrizeTotal,
  daysBetween,
  eventDate,
  events,
  formatDate,
  nextEvent,
  pastEvents,
  registrationNow,
  rupees,
  todayInIndia,
  upcomingEvents,
} from "./site";

describe("club facts", () => {
  it("Bot Forge is on 8 Dec 2026, with three contests", () => {
    const bf = events.find((e) => e.slug === "bot-forge")!;
    expect(bf.date).toBe("2026-12-08");
    expect(eventDate(bf)).toContain("8 Dec 2026");
    expect(eventDate({ date: null })).toBe("Date coming soon");
    expect(eventDate({ date: "2026-11-06" })).toContain("6 Nov 2026");
    expect(formatDate("2026-11-06")).toContain("6 Nov 2026");
    expect(bf.activities.map((a) => a.name)).toEqual(["Robo Sumo", "Robo Race", "Shark Tank"]);
    expect(bf).not.toHaveProperty("previousDates");
  });
  it("adds up the Bot Forge prizes: 3,000 and 2,000 in each of three contests", () => {
    expect(botForgePrizeTotal).toBe(15000);
    expect(rupees(botForgePrizeTotal)).toBe("₹15,000");
    expect(botForgeInfo.contests.map((c) => c.team)).toEqual([
      [3, 5],
      [3, 5],
      [3, 4],
    ]);
  });
  it("opens Bot Forge registration at 10 am on 30 Nov and closes it at midnight after 6 Dec", () => {
    const at = (iso: string) => registrationNow(botForge, Date.parse(iso));
    expect(at("2026-11-30T09:59:00+05:30")).toBe("coming-soon");
    expect(at("2026-11-30T10:00:00+05:30")).toBe("open");
    expect(at("2026-12-06T23:59:00+05:30")).toBe("open");
    expect(at("2026-12-07T00:00:00+05:30")).toBe("closed");
    expect(registrationNow({ registration: "none" })).toBe("none");
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
