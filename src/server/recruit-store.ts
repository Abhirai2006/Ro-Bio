// Core member recruitment: applicants and judges' marks, in one SQLite database inside a Cloudflare Durable Object.
// Cloudflare creates it on the first deploy from the "migrations" entry in wrangler.jsonc. Nothing to set up by hand.
// Applicants' details live only here, never in the repo. The admin page can delete all of it after recruitment.
import { DurableObject } from "cloudflare:workers";
import type { Candidate, NewCandidate, Sheet, Status } from "@/lib/recruit";

type CandidateRow = {
  id: number;
  usn: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  sem: number;
  first: string;
  second: string | null;
  day: string | null;
  wildcard: number;
  status: string;
  added_at: number;
};
type SheetRow = {
  candidate_id: number;
  judge: string;
  squad: string;
  marks: string;
  note: string;
  updated_at: number;
};

const FAIL_WINDOW = 10 * 60000;
const FAIL_LIMIT = 15;

const toCandidate = (r: CandidateRow): Candidate => ({
  id: r.id,
  usn: r.usn,
  name: r.name,
  email: r.email,
  phone: r.phone,
  branch: r.branch,
  sem: r.sem === 3 ? 3 : 1,
  first: r.first as Candidate["first"],
  second: (r.second ?? null) as Candidate["second"],
  day: (r.day ?? null) as Candidate["day"],
  wildcard: r.wildcard === 1,
  status: r.status as Status,
  addedAt: r.added_at,
});
const toSheet = (r: SheetRow): Sheet => ({
  candidateId: r.candidate_id,
  judge: r.judge,
  squad: r.squad as Sheet["squad"],
  marks: JSON.parse(r.marks) as number[],
  note: r.note,
  updatedAt: r.updated_at,
});

export class RecruitStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, usn TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', branch TEXT NOT NULL, sem INTEGER NOT NULL, first TEXT NOT NULL, second TEXT, day TEXT, wildcard INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'undecided', added_at INTEGER NOT NULL)",
      );
      sql.exec(
        "CREATE TABLE IF NOT EXISTS sheets (candidate_id INTEGER NOT NULL, judge TEXT NOT NULL COLLATE NOCASE, squad TEXT NOT NULL, marks TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY (candidate_id, judge))",
      );
      sql.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      sql.exec("CREATE TABLE IF NOT EXISTS failures (ip TEXT NOT NULL, at INTEGER NOT NULL)");
    });
  }

  list(): Candidate[] {
    return this.ctx.storage.sql
      .exec<CandidateRow>("SELECT * FROM candidates ORDER BY first, name")
      .toArray()
      .map(toCandidate);
  }

  get(id: number): Candidate | null {
    const rows = this.ctx.storage.sql
      .exec<CandidateRow>("SELECT * FROM candidates WHERE id = ?", id)
      .toArray();
    return rows[0] ? toCandidate(rows[0]) : null;
  }

  /** Adds students, or updates the form fields of students already here (matched by USN). Status is kept. */
  add(rows: NewCandidate[]): { added: number; updated: number } {
    const sql = this.ctx.storage.sql;
    let added = 0;
    let updated = 0;
    const now = Date.now();
    for (const c of rows) {
      const known =
        sql.exec<{ id: number }>("SELECT id FROM candidates WHERE usn = ?", c.usn).toArray()
          .length > 0;
      sql.exec(
        "INSERT INTO candidates (usn, name, email, phone, branch, sem, first, second, day, wildcard, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (usn) DO UPDATE SET name = excluded.name, email = excluded.email, phone = excluded.phone, branch = excluded.branch, sem = excluded.sem, first = excluded.first, second = excluded.second, day = excluded.day, wildcard = MAX(candidates.wildcard, excluded.wildcard)",
        c.usn,
        c.name,
        c.email,
        c.phone,
        c.branch,
        c.sem,
        c.first,
        c.second,
        c.day,
        c.wildcard ? 1 : 0,
        now,
      );
      if (known) updated++;
      else added++;
    }
    return { added, updated };
  }

  /** Changes one student's details. Returns null when there is no such student. Throws if the USN is taken. */
  edit(id: number, c: NewCandidate): Candidate | null {
    const n = this.ctx.storage.sql.exec(
      "UPDATE candidates SET usn = ?, name = ?, email = ?, phone = ?, branch = ?, sem = ?, first = ?, second = ?, day = ?, wildcard = ? WHERE id = ?",
      c.usn,
      c.name,
      c.email,
      c.phone,
      c.branch,
      c.sem,
      c.first,
      c.second,
      c.day,
      c.wildcard ? 1 : 0,
      id,
    ).rowsWritten;
    return n ? this.get(id) : null;
  }

  /** Removes a student and every judge's marks for them. */
  remove(id: number): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM sheets WHERE candidate_id = ?", id);
    return sql.exec("DELETE FROM candidates WHERE id = ?", id).rowsWritten > 0;
  }

  setStatus(id: number, status: Status): boolean {
    return (
      this.ctx.storage.sql.exec("UPDATE candidates SET status = ? WHERE id = ?", status, id)
        .rowsWritten > 0
    );
  }

  sheets(): Sheet[] {
    return this.ctx.storage.sql
      .exec<SheetRow>("SELECT * FROM sheets ORDER BY candidate_id, judge")
      .toArray()
      .map(toSheet);
  }

  /** One judge's own sheets. The name is matched without caring about capitals. */
  sheetsBy(judge: string): Sheet[] {
    return this.ctx.storage.sql
      .exec<SheetRow>("SELECT * FROM sheets WHERE judge = ? ORDER BY candidate_id", judge)
      .toArray()
      .map(toSheet);
  }

  /** Saves one judge's marks for one student, replacing that judge's earlier marks for them. */
  saveSheet(s: Omit<Sheet, "updatedAt">): Sheet {
    const at = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO sheets (candidate_id, judge, squad, marks, note, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (candidate_id, judge) DO UPDATE SET judge = excluded.judge, squad = excluded.squad, marks = excluded.marks, note = excluded.note, updated_at = excluded.updated_at",
      s.candidateId,
      s.judge,
      s.squad,
      JSON.stringify(s.marks),
      s.note,
      at,
    );
    return { ...s, updatedAt: at };
  }

  isLocked(): boolean {
    return (
      this.ctx.storage.sql
        .exec<{ value: string }>("SELECT value FROM settings WHERE key = 'locked'")
        .toArray()[0]?.value === "1"
    );
  }

  setLocked(locked: boolean): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO settings (key, value) VALUES ('locked', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      locked ? "1" : "0",
    );
  }

  /** Deletes every applicant, every mark and the lock. For after recruitment ends. */
  wipe(): void {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM sheets");
    sql.exec("DELETE FROM candidates");
    sql.exec("DELETE FROM settings");
  }

  /** True when this address got a passcode wrong too often in the last 10 minutes. */
  limited(ip: string): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM failures WHERE at < ?", Date.now() - FAIL_WINDOW);
    const { n } = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM failures WHERE ip = ?", ip)
      .one();
    return n >= FAIL_LIMIT;
  }

  hit(ip: string): void {
    this.ctx.storage.sql.exec("INSERT INTO failures (ip, at) VALUES (?, ?)", ip, Date.now());
  }
}
