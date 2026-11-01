import { describe, expect, it } from "vitest";
import { parseScore, rankTeams, stagePick, stageTeams, tieAtCutoff, type Score } from "./judging";
import { missions, TEAM_COUNT } from "./robo-spark";

const sheet = (team: number, judge: string, n: number): Score => ({
  team,
  judge,
  ticks: Array.from({ length: 10 }, (_, k) => k < n),
  note: "",
  updatedAt: 0,
});

describe("Robo Spark missions", () => {
  it("has one mission per team, numbered 1 to 60 with no gaps", () => {
    expect(missions).toHaveLength(TEAM_COUNT);
    expect(missions.map((m) => m.n)).toEqual(Array.from({ length: TEAM_COUNT }, (_, k) => k + 1));
  });
  it("gives every mission four judging points, a card line and a stage question", () => {
    for (const m of missions) {
      expect(m.ticks.every((t) => t.length > 10)).toBe(true);
      expect(m.card.length).toBeGreaterThan(10);
      expect(m.ask.endsWith("?")).toBe(true);
    }
  });
  it("never uses em or en dashes", () => {
    expect(JSON.stringify(missions)).not.toMatch(new RegExp("[\\u2013\\u2014]"));
  });
});

describe("parseScore", () => {
  it("accepts a full sheet and cleans the name", () => {
    const r = parseScore({
      team: 17,
      judge: "  Asha   <b>K ",
      ticks: Array(10).fill(true),
      note: "ok",
    });
    expect(r).toEqual({
      ok: true,
      score: { team: 17, judge: "Asha bK", ticks: Array(10).fill(true), note: "ok" },
    });
  });
  it("refuses teams outside 1 to 60, missing names and short tick lists", () => {
    expect(parseScore({ team: 0, judge: "A", ticks: Array(10).fill(false) }).ok).toBe(false);
    expect(parseScore({ team: 61, judge: "A", ticks: Array(10).fill(false) }).ok).toBe(false);
    expect(parseScore({ team: 5, judge: " ", ticks: Array(10).fill(false) }).ok).toBe(false);
    expect(parseScore({ team: 5, judge: "A", ticks: [true] }).ok).toBe(false);
    expect(parseScore(null).ok).toBe(false);
  });
});

describe("rankTeams", () => {
  it("averages judges, breaks ties by number of judges, and shares places on equal averages", () => {
    const r = rankTeams([
      sheet(4, "A", 8),
      sheet(4, "B", 6),
      sheet(9, "A", 7),
      sheet(2, "A", 9),
      sheet(5, "C", 7),
    ]);
    expect(r.map((x) => [x.team, x.average, x.place])).toEqual([
      [2, 9, 1],
      [4, 7, 2],
      [5, 7, 2],
      [9, 7, 2],
    ]);
  });
  it("calls the top teams in team-number order and adds the team tied with the last place", () => {
    const s = [sheet(30, "A", 9), sheet(3, "A", 8), sheet(12, "A", 7), sheet(50, "A", 7)];
    expect(stageTeams(s, 2)).toEqual([3, 30]);
    expect(stageTeams(s, 3, 4)).toEqual([3, 12, 30, 50]);
    expect(tieAtCutoff(rankTeams(s), 3)).toBe(true);
    expect(tieAtCutoff(rankTeams(s), 2)).toBe(false);
  });
  it("takes 6 teams when 5th and 6th tie, and flags a tie it cannot fit", () => {
    const five = [9, 8, 7, 6, 5].map((n, k) => sheet(k + 1, "A", n));
    expect(stagePick([...five, sheet(20, "A", 4)], 5, 6)).toEqual({
      teams: [1, 2, 3, 4, 5],
      unresolved: false,
    });
    expect(stagePick([...five, sheet(20, "A", 5)], 5, 6)).toEqual({
      teams: [1, 2, 3, 4, 5, 20],
      unresolved: false,
    });
    expect(stagePick([...five, sheet(20, "A", 5), sheet(33, "A", 5)], 5, 6)).toEqual({
      teams: [1, 2, 3, 4, 5, 20],
      unresolved: true,
    });
    expect(stagePick([sheet(7, "A", 3)], 5, 6)).toEqual({ teams: [7], unresolved: false });
    expect(stagePick([], 5, 6)).toEqual({ teams: [], unresolved: false });
  });
});
