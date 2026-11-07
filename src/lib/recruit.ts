// Core member recruitment, November 2026: the rules shared by the admin page, the judge page and the server.
// The squads, rooms and days must match recruitment/form/Code.gs (a test checks this).
import {
  BRANCHES,
  cleanEmail,
  cleanPersonName,
  isEmail,
  parseCsv,
  tidyNameCase,
} from "@/lib/certificates";
import { cleanName } from "@/lib/judging";

export const SQUADS = [
  "Projects",
  "Events",
  "Technical",
  "Social Media and Outreach",
  "Design",
] as const;
export type Squad = (typeof SQUADS)[number];

/** Where each squad's panel sits, in the Second year block. */
export const ROOMS: Record<Squad, "G-07" | "G-09"> = {
  Projects: "G-07",
  Technical: "G-07",
  Design: "G-07",
  Events: "G-09",
  "Social Media and Outreach": "G-09",
};

export const DAYS = ["Wed 11 Nov", "Thu 12 Nov"] as const;
export type Day = (typeof DAYS)[number];

/** About this many core members in total. The admin page turns the counter red above it. */
export const CORE_CAP = 15;
export const MAX_NOTE = 280;
export const MAX_ROWS = 2000;

export type CriterionKey = "communication" | "teamwork" | "commitment" | "skill" | "attitude";
export type Criterion = {
  key: CriterionKey;
  title: string;
  weight: number;
  low: string;
  mid: string;
  high: string;
};

/** The five things every judge marks from 1 to 5, in this order. Weights add up to 20, so all fives make 100. */
export const CRITERIA: Criterion[] = [
  {
    key: "communication",
    title: "Communication",
    weight: 4,
    low: "Hard to follow, or barely speaks",
    mid: "Clear but short, needs prompting",
    high: "Clear, organised, confident, answers what was asked",
  },
  {
    key: "teamwork",
    title: "Teamwork in the group question",
    weight: 4,
    low: "Silent, or talks over others",
    mid: "Makes their own point, ignores others",
    high: "Builds on others, brings in quiet people, helps the group conclude",
  },
  {
    key: "commitment",
    title: "Interest and commitment",
    weight: 4,
    low: "Vague reason, cannot give time",
    mid: "Interested, partly available",
    high: "Specific reasons, clear about time for Saturday sessions and events, has already tried something related",
  },
  {
    key: "skill",
    title: "Squad skill",
    weight: 6,
    low: "No real attempt",
    mid: "A reasonable but ordinary answer",
    high: "Original, practical, well explained",
  },
  {
    key: "attitude",
    title: "Attitude and learning",
    weight: 2,
    low: "Defensive or uninterested",
    mid: "Polite, open",
    high: "Curious, takes a hint or feedback and improves the answer on the spot",
  },
];

/** What "squad skill" means for each squad. Judge how they think, not what they already know. */
export const SQUAD_SKILL: Record<Squad, string> = {
  Projects:
    "Turns an idea into steps: what to build first, what parts are needed, what could go wrong",
  Events:
    "Plans and handles problems: running a session, a speaker arriving late, a crowd at registration",
  Technical: "How they approach a problem, and curiosity about how things work",
  "Social Media and Outreach":
    "Writes a short caption or pitch for the club, knows what makes people stop scrolling",
  Design:
    "The design task: a clear idea, readable layout, fits the topic, and how well they explain it",
};

export type Status = "undecided" | "core" | "supporting" | "not-selected";
export const STATUSES: { value: Status; label: string }[] = [
  { value: "undecided", label: "Undecided" },
  { value: "core", label: "Core" },
  { value: "supporting", label: "Supporting" },
  { value: "not-selected", label: "Not selected" },
];

export type NewCandidate = {
  usn: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  sem: 1 | 3;
  first: Squad;
  second: Squad | null;
  day: Day | null;
  wildcard: boolean;
};
export type Candidate = NewCandidate & { id: number; status: Status; addedAt: number };
/** What a judge sees about a student: no email or phone number. */
export type JudgeView = Pick<Candidate, "id" | "usn" | "name" | "branch" | "sem" | "first" | "day">;
export type JudgeSquad = Squad | "Teacher";
export type Sheet = {
  candidateId: number;
  judge: string;
  squad: JudgeSquad;
  marks: number[];
  note: string;
  updatedAt: number;
};
export type Result = {
  candidate: Candidate;
  judges: number;
  average: number;
  byCriterion: Record<CriterionKey, number>;
  notes: { judge: string; note: string }[];
  fewJudges: boolean;
};

const isSquad = (v: unknown): v is Squad =>
  typeof v === "string" && (SQUADS as readonly string[]).includes(v);
const isDay = (v: unknown): v is Day =>
  typeof v === "string" && (DAYS as readonly string[]).includes(v);
export const isStatus = (v: unknown): v is Status => STATUSES.some((s) => s.value === v);
export const isJudgeSquad = (v: unknown): v is JudgeSquad => v === "Teacher" || isSquad(v);

/** A USN in capitals with no spaces, or "" when it is not 4 to 20 letters and digits. */
export function cleanUsn(raw: unknown): string {
  const usn = typeof raw === "string" ? raw.replace(/\s+/g, "").toUpperCase() : "";
  return /^[A-Z0-9]{4,20}$/.test(usn) ? usn : "";
}

const cleanPhone = (raw: unknown) =>
  typeof raw === "string" ? raw.replace(/[^\d+]/g, "").slice(0, 15) : "";

/** Checks one student, from the CSV import or typed by the admin. */
export function validateCandidate(
  raw: unknown,
): { ok: true; candidate: NewCandidate } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object")
    return { ok: false, error: "Send the student as an object." };
  const b = raw as Record<string, unknown>;
  const usn = cleanUsn(b["usn"]);
  if (!usn) return { ok: false, error: "USN must be 4 to 20 letters and numbers." };
  const name = tidyNameCase(cleanPersonName(b["name"]));
  if (!name) return { ok: false, error: `Type a name for ${usn}.` };
  const email = cleanEmail(b["email"]);
  if (email && !isEmail(email))
    return { ok: false, error: `The email for ${usn} does not look right.` };
  const branch = typeof b["branch"] === "string" ? b["branch"].trim() : "";
  if (!(BRANCHES as readonly string[]).includes(branch))
    return { ok: false, error: `Pick a branch from the list for ${usn}.` };
  const sem = Number(b["sem"]);
  if (sem !== 1 && sem !== 3) return { ok: false, error: `Semester must be 1 or 3 for ${usn}.` };
  if (!isSquad(b["first"])) return { ok: false, error: `Pick a first choice squad for ${usn}.` };
  const first = b["first"];
  const second = isSquad(b["second"]) && b["second"] !== first ? b["second"] : null;
  const day = isDay(b["day"]) ? b["day"] : null;
  return {
    ok: true,
    candidate: {
      usn,
      name,
      email,
      phone: cleanPhone(b["phone"]),
      branch,
      sem,
      first,
      second,
      day,
      wildcard: b["wildcard"] === true,
    },
  };
}

export type CsvRow = NewCandidate & { line: number; problems: string[] };

const COLUMNS = {
  email: "email address",
  name: "full name",
  usn: "usn",
  phone: "whatsapp number",
  branch: "branch",
  sem: "semester",
  first: "first choice squad",
  second: "second choice squad",
  day: "interview day",
} as const;
const heading = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Reads the CSV of the response Sheet (File, Download, Comma separated values). Finds the columns by their
 * headings. Uses "Assigned day" when the form script filled it in, otherwise "Interview day".
 * When the same USN appears more than once, the last line wins and the earlier lines are marked replaced.
 */
export function readRecruitCsv(text: string): { rows: CsvRow[]; missing: string[] } {
  const all = parseCsv(text);
  const head = (all[0] ?? []).map(heading);
  const find = (want: string) => {
    const exact = head.indexOf(want);
    return exact >= 0 ? exact : head.findIndex((h) => h.startsWith(want));
  };
  const at = Object.fromEntries(Object.entries(COLUMNS).map(([k, v]) => [k, find(v)])) as Record<
    keyof typeof COLUMNS,
    number
  >;
  const assigned = find("assigned day");
  const missing = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[])
    .filter((k) => at[k] < 0 && k !== "second" && k !== "phone")
    .map((k) => COLUMNS[k]);
  if (missing.length) return { rows: [], missing };

  const branchByKey = new Map(BRANCHES.map((b) => [heading(b), b as string]));
  const cell = (cells: string[], i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
  const rows = all.slice(1).map((cells, i): CsvRow => {
    const line = i + 2;
    const typedUsn = cell(cells, at.usn);
    const usn = cleanUsn(typedUsn);
    const name = tidyNameCase(cleanPersonName(cell(cells, at.name)));
    const email = cleanEmail(cell(cells, at.email));
    const branchText = cell(cells, at.branch);
    const branch = branchByKey.get(heading(branchText)) ?? "";
    const semDigit = /^([13])/.exec(cell(cells, at.sem))?.[1];
    const firstText = cell(cells, at.first);
    const secondText = cell(cells, at.second);
    const dayText = cell(cells, assigned) || cell(cells, at.day);
    const first = isSquad(firstText) ? firstText : null;
    const second = isSquad(secondText) && secondText !== firstText ? secondText : null;
    const day = isDay(dayText) ? dayText : null;
    const problems: string[] = [];
    if (!usn) problems.push(typedUsn ? `USN "${typedUsn}" is not letters and numbers` : "no USN");
    if (!name) problems.push("no name");
    if (email && !isEmail(email)) problems.push("email does not look right");
    if (!branch) problems.push("branch not in the list");
    if (!semDigit) problems.push("semester not 1st or 3rd");
    if (!first) problems.push("no first choice squad");
    if (!day) problems.push("no day yet");
    return {
      usn,
      name,
      email,
      phone: cleanPhone(cell(cells, at.phone)),
      branch: branch || branchText,
      sem: semDigit === "3" ? 3 : 1,
      first: first ?? "Projects",
      second,
      day,
      wildcard: false,
      line,
      problems,
    };
  });
  const lastLine = new Map<string, number>();
  for (const r of rows) if (r.usn) lastLine.set(r.usn, r.line);
  for (const r of rows) {
    const last = r.usn ? lastLine.get(r.usn) : undefined;
    if (last !== undefined && last !== r.line) r.problems.push(`replaced by line ${last}`);
  }
  return { rows, missing: [] };
}

/** Problems that stop a row from being imported. "No day yet" is only a warning. */
export const blocking = (r: CsvRow) => r.problems.filter((p) => p !== "no day yet");

/** Checks one judge's marks for one student. */
export function parseSheet(
  raw: unknown,
): { ok: true; sheet: Omit<Sheet, "updatedAt"> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Send the marks as JSON." };
  const b = raw as Record<string, unknown>;
  const candidateId = Number(b["candidateId"]);
  if (!Number.isInteger(candidateId) || candidateId < 1)
    return { ok: false, error: "Say which student." };
  const judge = cleanName(b["judge"]);
  if (!judge) return { ok: false, error: "Type your name first." };
  if (!isJudgeSquad(b["squad"])) return { ok: false, error: "Pick your squad." };
  const marks = b["marks"];
  if (
    !Array.isArray(marks) ||
    marks.length !== CRITERIA.length ||
    !marks.every((m) => Number.isInteger(m) && m >= 1 && m <= 5)
  )
    return { ok: false, error: `Give all ${CRITERIA.length} marks, each from 1 to 5.` };
  const note =
    typeof b["note"] === "string"
      ? b["note"]
          // eslint-disable-next-line no-control-regex -- strips control characters on purpose
          .replace(/[\u0000-\u0008\u000b-\u001f]/g, "")
          .trim()
          .slice(0, MAX_NOTE)
      : "";
  return {
    ok: true,
    sheet: { candidateId, judge, squad: b["squad"], marks: marks as number[], note },
  };
}

/** One judge's total for one student, out of 100. */
export function weightedTotal(marks: number[]): number {
  return CRITERIA.reduce((sum, c, i) => sum + (marks[i] ?? 0) * c.weight, 0);
}

/** Squad seniors judge only students whose first choice is their squad. Teachers judge everyone. */
export function canJudge(squad: JudgeSquad, c: Pick<Candidate, "first">): boolean {
  return squad === "Teacher" || c.first === squad;
}

export function toJudgeView(c: Candidate): JudgeView {
  return {
    id: c.id,
    usn: c.usn,
    name: c.name,
    branch: c.branch,
    sem: c.sem,
    first: c.first,
    day: c.day,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Each student's average over all their judges, with a per-criterion average and the notes. */
export function summarize(candidates: Candidate[], sheets: Sheet[]): Result[] {
  const by = new Map<number, Sheet[]>();
  for (const s of sheets) by.set(s.candidateId, [...(by.get(s.candidateId) ?? []), s]);
  return candidates.map((candidate) => {
    const list = by.get(candidate.id) ?? [];
    const mean = (f: (s: Sheet) => number) =>
      list.length ? round1(list.reduce((a, s) => a + f(s), 0) / list.length) : 0;
    const byCriterion = Object.fromEntries(
      CRITERIA.map((c, i) => [c.key, mean((s) => s.marks[i] ?? 0)]),
    ) as Record<CriterionKey, number>;
    return {
      candidate,
      judges: list.length,
      average: mean((s) => weightedTotal(s.marks)),
      byCriterion,
      notes: list.filter((s) => s.note).map((s) => ({ judge: s.judge, note: s.note })),
      fewJudges: list.length < 2,
    };
  });
}

/** A squad's students, best first. Ties: squad skill, then commitment, then name. */
export function rankSquad(results: Result[], squad: Squad): Result[] {
  return results
    .filter((r) => r.candidate.first === squad)
    .sort(
      (a, b) =>
        b.average - a.average ||
        b.byCriterion.skill - a.byCriterion.skill ||
        b.byCriterion.commitment - a.byCriterion.commitment ||
        a.candidate.name.localeCompare(b.candidate.name),
    );
}

export function coreCount(candidates: Pick<Candidate, "status">[]): number {
  return candidates.filter((c) => c.status === "core").length;
}

/** A CSV cell: quoted when needed, and never starting with a character a spreadsheet would run as a formula. */
function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Every squad's ranked list, for the announcement and the Team page. */
export function resultsCsv(results: Result[]): string {
  const label = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;
  const lines = [
    ["Squad", "Rank", "Name", "USN", "Branch", "Sem", "Average", "Judges", "Status", "Notes"].join(
      ",",
    ),
  ];
  for (const squad of SQUADS)
    rankSquad(results, squad).forEach((r, i) => {
      const c = r.candidate;
      lines.push(
        [
          squad,
          i + 1,
          c.name,
          c.usn,
          c.branch,
          c.sem,
          r.average,
          r.judges,
          label(c.status),
          r.notes.map((n) => `${n.judge}: ${n.note}`).join("; "),
        ]
          .map(csvCell)
          .join(","),
      );
    });
  return lines.join("\n") + "\n";
}

/** Calls /api/recruit/<role>/<path> with the passcode. Throws an Error with a readable message on failure. */
export async function recruitApi<T>(
  role: "admin" | "judge",
  passcode: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/recruit/${role}/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      [`x-${role}-passcode`]: passcode,
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `The server said ${res.status}.`);
  return data;
}
