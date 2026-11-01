// Robo Spark scoring rules, shared by the judge page, the deck and the server.
import { TEAM_COUNT } from "./robo-spark";

export type Score = {
  team: number;
  judge: string;
  ticks: boolean[]; // 10 ticks, in order 1 to 10
  note: string;
  updatedAt: number;
};

export type TeamRank = {
  team: number;
  average: number; // average ticks out of 10, across judges
  judges: number;
  best: number;
  names: string[];
  place: number; // 1 for the top team; teams with the same average share a place
};

export const MAX_NOTE = 280;
export const MAX_NAME = 40;

/** Trims a judge's name to something safe to store and show. */
export function cleanName(name: unknown) {
  return typeof name === "string"
    ? name
        // eslint-disable-next-line no-control-regex -- strips control characters on purpose
        .replace(/[\u0000-\u001f<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_NAME)
    : "";
}

/** Checks a score sent by a judge. Returns the clean score, or a reason it was refused. */
export function parseScore(
  body: unknown,
): { ok: true; score: Omit<Score, "updatedAt"> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send the score as JSON." };
  const b = body as Record<string, unknown>;
  const team = Number(b["team"]);
  if (!Number.isInteger(team) || team < 1 || team > TEAM_COUNT)
    return { ok: false, error: `Team must be a number from 1 to ${TEAM_COUNT}.` };
  const judge = cleanName(b["judge"]);
  if (!judge) return { ok: false, error: "Type your name first." };
  const ticks = b["ticks"];
  if (!Array.isArray(ticks) || ticks.length !== 10 || !ticks.every((t) => typeof t === "boolean"))
    return { ok: false, error: "Ticks must be 10 yes or no answers." };
  const note =
    typeof b["note"] === "string"
      ? // eslint-disable-next-line no-control-regex -- strips control characters on purpose
        b["note"].replace(/[\u0000-\u0008\u000b-\u001f]/g, "").slice(0, MAX_NOTE)
      : "";
  return { ok: true, score: { team, judge, ticks: ticks as boolean[], note } };
}

export const total = (ticks: boolean[]) => ticks.filter(Boolean).length;

/** Ranks teams by their average ticks. Ties are broken by the most judges, then the best single sheet. */
export function rankTeams(scores: Score[]): TeamRank[] {
  const by = new Map<number, Score[]>();
  for (const s of scores) by.set(s.team, [...(by.get(s.team) ?? []), s]);
  const rows = [...by.entries()].map(([team, list]) => {
    const totals = list.map((s) => total(s.ticks));
    return {
      team,
      average: Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10,
      judges: list.length,
      best: Math.max(...totals),
      names: list.map((s) => s.judge).sort(),
      place: 0,
    };
  });
  rows.sort(
    (a, b) => b.average - a.average || b.judges - a.judges || b.best - a.best || a.team - b.team,
  );
  let place = 0;
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (!prev || prev.average !== r.average) place = i + 1;
    r.place = place;
  });
  return rows;
}

/**
 * The teams to call to the stage: the top `n` by average ticks, plus any team tied with the last place,
 * up to `max` teams. Given back in team-number order, so no team learns its rank. `unresolved` is true
 * when even more teams share the last place than fit, so the head judge has to choose.
 */
export function stagePick(scores: Score[], n: number, max = n) {
  const ranks = rankTeams(scores);
  let k = Math.min(n, ranks.length);
  while (k < max && k > 0 && ranks[k] && ranks[k]!.average === ranks[k - 1]!.average) k++;
  const next = ranks[k];
  const unresolved = k > 0 && !!next && next.average === ranks[k - 1]!.average;
  return {
    teams: ranks
      .slice(0, k)
      .map((r) => r.team)
      .sort((a, b) => a - b),
    unresolved,
  };
}

export const stageTeams = (scores: Score[], n: number, max = n) => stagePick(scores, n, max).teams;

/** True when the last stage place is tied with the next team, so the head judge has to choose. */
export function tieAtCutoff(ranks: TeamRank[], n: number) {
  const last = ranks[n - 1];
  const next = ranks[n];
  return !!last && !!next && last.average === next.average;
}

/** Where the judge page keeps the passcode and name in this browser. */
export const JUDGE_KEY = "robo-spark-judge";

export type JudgeLogin = { passcode: string; name: string };

export function readLogin(): JudgeLogin | null {
  try {
    const v = JSON.parse(localStorage.getItem(JUDGE_KEY) ?? "null") as Partial<JudgeLogin> | null;
    return v && typeof v.passcode === "string" && v.passcode
      ? { passcode: v.passcode, name: cleanName(v.name) }
      : null;
  } catch {
    return null;
  }
}

export function saveLogin(l: JudgeLogin | null) {
  try {
    if (l) localStorage.setItem(JUDGE_KEY, JSON.stringify(l));
    else localStorage.removeItem(JUDGE_KEY);
  } catch {
    /* storage blocked: the judge types it again next time */
  }
}

/** Calls the scoring API with the judge passcode. Throws an Error with a readable message on failure. */
export async function judgeApi<T>(
  passcode: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/judge/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-judge-passcode": passcode,
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `The server said ${res.status}.`);
  return data;
}
