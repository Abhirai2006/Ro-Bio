import { describe, expect, it } from "vitest";
import {
  canJudge,
  coreCount,
  CRITERIA,
  parseSheet,
  rankSquad,
  readRecruitCsv,
  resultsCsv,
  SQUADS,
  summarize,
  toJudgeView,
  validateCandidate,
  weightedTotal,
  cleanUsn,
  studentKey,
  type Candidate,
  type Sheet,
} from "@/lib/recruit";

const cand = (
  id: number,
  first: Candidate["first"],
  extra: Partial<Candidate> = {},
): Candidate => ({
  id,
  usn: `4MU24X${id}`,
  name: `Student ${id}`,
  email: `s${id}@x.in`,
  phone: "9000000000",
  branch: "Computer Science & Design",
  sem: 1,
  first,
  second: null,
  day: "Wed 11 Nov",
  wildcard: false,
  status: "undecided",
  addedAt: 0,
  ...extra,
});
const sheet = (candidateId: number, judge: string, marks: number[], note = ""): Sheet => ({
  candidateId,
  judge,
  squad: "Teacher",
  marks,
  note,
  updatedAt: 0,
});

describe("weightedTotal", () => {
  it("is 100 for all fives and 20 for all ones", () => {
    expect(weightedTotal([5, 5, 5, 5, 5])).toBe(100);
    expect(weightedTotal([1, 1, 1, 1, 1])).toBe(20);
  });
  it("weights squad skill x6 and attitude x2", () => {
    expect(weightedTotal([3, 4, 2, 5, 1])).toBe(68);
  });
});

describe("criteria", () => {
  it("are the five from the handbook, in order, with weights adding to 20", () => {
    expect(CRITERIA.map((c) => c.key)).toEqual([
      "communication",
      "teamwork",
      "commitment",
      "skill",
      "attitude",
    ]);
    expect(CRITERIA.map((c) => c.weight)).toEqual([4, 4, 4, 6, 2]);
  });
  it("use no long dashes", () => {
    expect(JSON.stringify(CRITERIA)).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("summarize and rankSquad", () => {
  it("averages judges' totals and flags students with fewer than 2 sheets", () => {
    const [a, b] = summarize(
      [cand(1, "Events"), cand(2, "Events")],
      [
        sheet(1, "A", [3, 4, 2, 5, 1]),
        sheet(1, "B", [4, 4, 4, 4, 4]),
        sheet(2, "A", [5, 5, 5, 5, 5]),
      ],
    );
    expect(a!.average).toBe(74);
    expect(a!.judges).toBe(2);
    expect(a!.fewJudges).toBe(false);
    expect(b!.fewJudges).toBe(true);
  });
  it("gives a student with no sheets an average of 0", () => {
    const [r] = summarize([cand(1, "Design")], []);
    expect(r).toMatchObject({ average: 0, judges: 0, fewJudges: true });
  });
  it("breaks a tie on average by the squad skill average", () => {
    const lowSkill = [4, 3, 3, 3, 2]; // 16+12+12+18+4 = 62, skill 3
    const highSkill = [3, 3, 3, 4, 1]; // 12+12+12+24+2 = 62, skill 4
    expect(weightedTotal(lowSkill)).toBe(weightedTotal(highSkill));
    const results = summarize(
      [cand(1, "Projects", { name: "Anu" }), cand(2, "Projects", { name: "Zed" })],
      [sheet(1, "J", lowSkill), sheet(2, "J", highSkill)],
    );
    expect(rankSquad(results, "Projects").map((r) => r.candidate.id)).toEqual([2, 1]);
  });
  it("leaves out students whose first choice is another squad", () => {
    const results = summarize([cand(1, "Projects"), cand(2, "Events")], []);
    expect(rankSquad(results, "Projects").map((r) => r.candidate.id)).toEqual([1]);
  });
});

describe("who may judge whom", () => {
  it("lets seniors judge only their squad and teachers judge everyone", () => {
    expect(canJudge("Design", { first: "Events" })).toBe(false);
    expect(canJudge("Events", { first: "Events" })).toBe(true);
    expect(canJudge("Teacher", { first: "Events" })).toBe(true);
  });
  it("never gives judges a student's email or phone", () => {
    const v = toJudgeView(cand(1, "Events"));
    expect(v).not.toHaveProperty("email");
    expect(v).not.toHaveProperty("phone");
    expect(v).toMatchObject({ id: 1, name: "Student 1", first: "Events" });
  });
});

describe("parseSheet", () => {
  const good = {
    candidateId: 3,
    judge: "  Brunda ",
    squad: "Technical",
    marks: [1, 2, 3, 4, 5],
    note: "Good",
  };
  it("accepts five marks from 1 to 5 and cleans the judge name", () => {
    const r = parseSheet(good);
    expect(r.ok && r.sheet).toMatchObject({
      judge: "Brunda",
      squad: "Technical",
      marks: [1, 2, 3, 4, 5],
    });
  });
  it("refuses marks outside 1 to 5, the wrong count, or a blank judge", () => {
    expect(parseSheet({ ...good, marks: [0, 1, 2, 3, 4] }).ok).toBe(false);
    expect(parseSheet({ ...good, marks: [1, 2, 3, 4] }).ok).toBe(false);
    expect(parseSheet({ ...good, marks: [1, 2, 3, 4, 2.5] }).ok).toBe(false);
    expect(parseSheet({ ...good, judge: "   " }).ok).toBe(false);
    expect(parseSheet({ ...good, squad: "Office Bearers" }).ok).toBe(false);
  });
  it("cuts long notes to 280 characters", () => {
    const r = parseSheet({ ...good, note: "x".repeat(400) });
    expect(r.ok && r.sheet.note.length).toBe(280);
  });
});

describe("cleanUsn and validateCandidate", () => {
  it("upper-cases and removes spaces from a USN", () => {
    expect(cleanUsn(" 4mu24 bm001 ")).toBe("4MU24BM001");
    expect(cleanUsn("ab")).toBe("");
    expect(cleanUsn("4MU24-BM001")).toBe("");
  });
  it("accepts a wildcard student typed by the admin", () => {
    const r = validateCandidate({
      usn: "4mu25cv010",
      name: "RAVI KUMAR",
      email: "",
      phone: "",
      branch: "Civil Environmental Engineering",
      sem: 3,
      first: "Events",
      second: "Events",
      day: "Thu 12 Nov",
      wildcard: true,
    });
    expect(r.ok && r.candidate).toMatchObject({
      usn: "4MU25CV010",
      name: "Ravi Kumar",
      second: null,
      wildcard: true,
    });
  });
  it("refuses an unknown squad, branch or semester", () => {
    const base = {
      usn: "4MU25CV010",
      name: "Ravi",
      branch: "Computer Science & Design",
      sem: 1,
      first: "Events",
    };
    expect(validateCandidate({ ...base, first: "Office Bearers" }).ok).toBe(false);
    expect(validateCandidate({ ...base, branch: "Mechanical" }).ok).toBe(false);
    expect(validateCandidate({ ...base, sem: 5 }).ok).toBe(false);
    expect(validateCandidate({ ...base, usn: "" }).ok).toBe(false);
  });
});

describe("students without a USN yet", () => {
  const base = { name: "Asha", branch: "Computer Science & Design", sem: 1, first: "Events" };
  it("accepts a student with no USN when there is an email", () => {
    const r = validateCandidate({ ...base, usn: "", email: "asha@x.in" });
    expect(r.ok && r.candidate).toMatchObject({ usn: "", email: "asha@x.in" });
  });
  it("accepts a wildcard with only a WhatsApp number", () => {
    expect(validateCandidate({ ...base, phone: "90000 00001" }).ok).toBe(true);
  });
  it("refuses a student with no USN, email or phone, since they could not be told apart", () => {
    const r = validateCandidate({ ...base });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/USN, email or WhatsApp/);
  });
  it("still refuses a USN that is typed wrong", () => {
    expect(validateCandidate({ ...base, usn: "4MU-24", email: "asha@x.in" }).ok).toBe(false);
  });
  it("keys a student by USN, then email, then phone", () => {
    expect(studentKey({ usn: "4MU1", email: "a@x.in", phone: "9" })).toBe("usn:4MU1");
    expect(studentKey({ usn: "", email: "A@x.in", phone: "9" })).toBe("email:a@x.in");
    expect(studentKey({ usn: "", email: "", phone: "9000000001" })).toBe("phone:9000000001");
  });
});

describe("readRecruitCsv", () => {
  const head =
    "Timestamp,Email address,Full name,USN,WhatsApp number,Branch,Semester,First choice squad,Second choice squad,Interview day,Consent,Assigned day";
  const row = (usn: string, name: string, extra = "") =>
    `11/8/2026 10:00:00,${name.toLowerCase()}@x.in,${name},${usn},9000000000,Computer Science & Design,3rd,Design,No second choice,Either day is fine,Yes,${extra}`;
  const csv = [
    head,
    row("4mu24cs001", "Asha", "Thu 12 Nov"),
    row("4MU24CS002", "Ben", "Wed 11 Nov"),
    row("4MU24CS003", "Chandra", ""),
    row("4MU24CS001", "Asha", "Wed 11 Nov"),
  ].join("\n");

  it("reads the form's columns and prefers Assigned day", () => {
    const { rows, missing } = readRecruitCsv(csv);
    expect(missing).toEqual([]);
    expect(rows[1]).toMatchObject({
      usn: "4MU24CS002",
      sem: 3,
      first: "Design",
      second: null,
      day: "Wed 11 Nov",
      line: 3,
    });
  });
  it("upper-cases USNs and keeps the last line for a repeated USN", () => {
    const { rows } = readRecruitCsv(csv);
    expect(rows[0]!.problems).toContain("replaced by line 5");
    expect(rows[3]).toMatchObject({ usn: "4MU24CS001", day: "Wed 11 Nov", problems: [] });
  });
  it("warns when an either-day student has no day yet but keeps the row usable", () => {
    const { rows } = readRecruitCsv(csv);
    expect(rows[2]).toMatchObject({ day: null, problems: ["no day yet"] });
  });
  it("imports a 1st semester student with a blank USN, and spots their repeat by email", () => {
    const text = [
      head,
      row("", "Gita", "Wed 11 Nov"),
      row("", "Hari", "Wed 11 Nov"),
      row("", "Gita", "Thu 12 Nov"),
    ].join("\n");
    const { rows } = readRecruitCsv(text);
    expect(rows[1]).toMatchObject({ usn: "", name: "Hari", problems: [] });
    expect(rows[0]!.problems).toEqual(["replaced by line 4"]);
    expect(rows[2]).toMatchObject({ day: "Thu 12 Nov", problems: [] });
  });
  it("leaves out a row with no USN, email or WhatsApp number", () => {
    const text = [
      head,
      "11/8/2026 10:00:00,,Ivy,,,Computer Science & Design,1st,Design,No second choice,Wed 11 Nov,Yes,Wed 11 Nov",
    ].join("\n");
    const [r] = readRecruitCsv(text).rows;
    expect(r!.problems).toContain("no USN, email or WhatsApp number");
  });
  it("names a missing column", () => {
    const { missing } = readRecruitCsv("Email address,Full name\nx@x.in,X");
    expect(missing).toContain("usn");
  });
});

describe("coreCount and resultsCsv", () => {
  it("counts only core members", () => {
    expect(coreCount([{ status: "core" }, { status: "supporting" }, { status: "core" }])).toBe(2);
  });
  it("quotes notes that contain commas", () => {
    const results = summarize([cand(1, "Events")], [sheet(1, "A", [5, 5, 5, 5, 5], "calm, clear")]);
    const text = resultsCsv(results);
    expect(text.split("\n")[0]).toBe("Squad,Rank,Name,USN,Branch,Sem,Average,Judges,Status,Notes");
    expect(text).toContain('"A: calm, clear"');
  });
});
