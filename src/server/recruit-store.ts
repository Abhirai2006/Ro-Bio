// Core member recruitment: applicants and judges' marks, in one SQLite database inside a Cloudflare Durable Object.
// Cloudflare creates it on the first deploy from the "migrations" entry in wrangler.jsonc. Nothing to set up by hand.
// Applicants' details live only here, never in the repo. The admin page can delete all of it after recruitment.
import { DurableObject } from "cloudflare:workers";
import {
  moveToSecond,
  type Candidate,
  type NewCandidate,
  type Sheet,
  type Status,
} from "@/lib/recruit";

type CandidateRow = {
  id: number;
  usn: string | null;
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
  moved_from?: string | null;
  also_with?: string | null;
  placed_in?: string | null;
};
type SheetRow = {
  candidate_id: number;
  judge: string;
  squad: string;
  panel?: string | null;
  marks: string;
  note: string;
  updated_at: number;
};

const FAIL_WINDOW = 10 * 60000;
const FAIL_LIMIT = 15;
/** Sign-ups from one network in 10 minutes. High on purpose: a whole class can share the college Wi-Fi. */
const SIGNUP_LIMIT = 60;
/** The most students the list takes from the public form, so a flood cannot fill the database. */
export const SIGNUP_CAP = 1000;

const toCandidate = (r: CandidateRow): Candidate => ({
  id: r.id,
  usn: r.usn ?? "",
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
  movedFrom: (r.moved_from ?? null) as Candidate["movedFrom"],
  alsoWith: (r.also_with ?? null) as Candidate["alsoWith"],
  placedIn: (r.placed_in ?? null) as Candidate["placedIn"],
});
const toSheet = (r: SheetRow): Sheet => ({
  candidateId: r.candidate_id,
  judge: r.judge,
  squad: r.squad as Sheet["squad"],
  ...(r.panel ? { panel: r.panel as NonNullable<Sheet["panel"]> } : {}),
  marks: JSON.parse(r.marks) as number[],
  note: r.note,
  updatedAt: r.updated_at,
});

// One row per applicant. The USN may be empty (NULL): 1st semester students often have none yet.
const APPLICANTS =
  "CREATE TABLE IF NOT EXISTS applicants (id INTEGER PRIMARY KEY AUTOINCREMENT, usn TEXT UNIQUE, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', branch TEXT NOT NULL, sem INTEGER NOT NULL, first TEXT NOT NULL, second TEXT, day TEXT, wildcard INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'undecided', added_at INTEGER NOT NULL)";
// One row per judge, student and interview.
const SHEETS =
  "CREATE TABLE IF NOT EXISTS sheets (candidate_id INTEGER NOT NULL, judge TEXT NOT NULL COLLATE NOCASE, squad TEXT NOT NULL, panel TEXT NOT NULL, marks TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY (candidate_id, judge, panel))";
const COLUMNS =
  "id, usn, name, email, phone, branch, sem, first, second, day, wildcard, status, added_at";

export class RecruitStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      const sql = ctx.storage.sql;
      sql.exec(APPLICANTS);
      // The first version kept students in "candidates", where a USN was required. Move anyone saved
      // there into "applicants" with the same ids, so judges' marks stay attached, then drop the old table.
      const old = sql
        .exec<{ n: number }>(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'candidates'",
        )
        .one();
      if (old.n > 0) {
        sql.exec(
          `INSERT OR IGNORE INTO applicants (${COLUMNS}) SELECT id, NULLIF(usn, ''), name, email, phone, branch, sem, first, second, day, wildcard, status, added_at FROM candidates`,
        );
        sql.exec("DROP TABLE candidates");
      }
      // A store made before interviews were tracked keeps its old table here; the upgrade below rebuilds it.
      sql.exec(SHEETS);
      sql.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      sql.exec("CREATE TABLE IF NOT EXISTS failures (ip TEXT NOT NULL, at INTEGER NOT NULL)");
      // Added for moving students to their second choice. Stores made before it get the column here;
      // everyone already signed up keeps their row, with nothing moved.
      // Read from the table's own definition, which works the same here and in tests.
      const defOf = (table: string) =>
        sql
          .exec<{ sql: string }>(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
            table,
          )
          .toArray()[0]?.sql ?? "";
      const has = (table: string, col: string) => new RegExp(`\\b${col}\\b`).test(defOf(table));
      if (!has("applicants", "moved_from"))
        sql.exec("ALTER TABLE applicants ADD COLUMN moved_from TEXT");
      // A second interview with their second choice, and the squad that selected them.
      if (!has("applicants", "also_with"))
        sql.exec("ALTER TABLE applicants ADD COLUMN also_with TEXT");
      if (!has("applicants", "placed_in"))
        sql.exec("ALTER TABLE applicants ADD COLUMN placed_in TEXT");
      // Marks now say which squad's interview they are for, so one person can mark both of a student's
      // interviews. Older marks are copied across under the squad that gave them (a teacher's under the
      // student's first choice), then the old table goes.
      if (!has("sheets", "panel")) {
        sql.exec(SHEETS.replace("sheets (", "sheets_v2 ("));
        sql.exec(
          "INSERT OR IGNORE INTO sheets_v2 (candidate_id, judge, squad, panel, marks, note, updated_at) SELECT s.candidate_id, s.judge, s.squad, CASE WHEN s.squad = 'Teacher' THEN COALESCE(a.first, 'Projects') ELSE s.squad END, s.marks, s.note, s.updated_at FROM sheets s LEFT JOIN applicants a ON a.id = s.candidate_id",
        );
        sql.exec("DROP TABLE sheets");
        sql.exec("ALTER TABLE sheets_v2 RENAME TO sheets");
      }
      // Recent sign-ups by a scrambled code made from the address (never the address), to slow down spam.
      sql.exec("CREATE TABLE IF NOT EXISTS signups (who TEXT NOT NULL, at INTEGER NOT NULL)");
    });
  }

  list(): Candidate[] {
    return this.ctx.storage.sql
      .exec<CandidateRow>("SELECT * FROM applicants ORDER BY first, name")
      .toArray()
      .map(toCandidate);
  }

  get(id: number): Candidate | null {
    const rows = this.ctx.storage.sql
      .exec<CandidateRow>("SELECT * FROM applicants WHERE id = ?", id)
      .toArray();
    return rows[0] ? toCandidate(rows[0]) : null;
  }

  /** The id of a student already here: matched by USN, then by email, then by WhatsApp number. */
  private find(c: NewCandidate): number | null {
    const sql = this.ctx.storage.sql;
    const one = (q: string, v: string) => sql.exec<{ id: number }>(q, v).toArray()[0]?.id ?? null;
    return (
      (c.usn ? one("SELECT id FROM applicants WHERE usn = ?", c.usn) : null) ??
      (c.email
        ? one(
            "SELECT id FROM applicants WHERE lower(email) = lower(?) ORDER BY id LIMIT 1",
            c.email,
          )
        : null) ??
      (c.phone && !c.usn && !c.email
        ? one("SELECT id FROM applicants WHERE phone = ? ORDER BY id LIMIT 1", c.phone)
        : null)
    );
  }

  /**
   * Adds students, or updates the form fields of students already here (see find). Status is kept, and so
   * is a USN already known when the new answers leave it blank. Throws if a USN belongs to someone else.
   */
  add(rows: NewCandidate[]): { added: number; updated: number } {
    const sql = this.ctx.storage.sql;
    let added = 0;
    let updated = 0;
    const now = Date.now();
    for (const c of rows) {
      const id = this.find(c);
      if (id !== null) {
        sql.exec(
          "UPDATE applicants SET usn = COALESCE(?, usn), name = ?, email = ?, phone = ?, branch = ?, sem = ?, first = ?, second = ?, day = ?, wildcard = MAX(wildcard, ?) WHERE id = ?",
          c.usn || null,
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
        );
        updated++;
      } else {
        sql.exec(
          "INSERT INTO applicants (usn, name, email, phone, branch, sem, first, second, day, wildcard, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          c.usn || null,
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
        added++;
      }
    }
    return { added, updated };
  }

  /**
   * Adds one student from the public /join form. Never changes a student already here, so nobody can
   * overwrite someone else's sign-up by typing their USN: a student who needs a change asks the organisers.
   */
  register(c: NewCandidate): { id: number } | { duplicate: true } | { full: true } {
    if (this.find(c) !== null) return { duplicate: true };
    const sql = this.ctx.storage.sql;
    const { n } = sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM applicants").one();
    if (n >= SIGNUP_CAP) return { full: true };
    try {
      this.add([c]);
    } catch {
      return { duplicate: true };
    }
    return { id: this.find(c) ?? 0 };
  }

  /** True when the admin has paused the /join form. */
  isPaused(): boolean {
    return (
      this.ctx.storage.sql
        .exec<{ value: string }>("SELECT value FROM settings WHERE key = 'paused'")
        .toArray()[0]?.value === "1"
    );
  }

  setPaused(paused: boolean): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO settings (key, value) VALUES ('paused', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      paused ? "1" : "0",
    );
  }

  /** Counts one sign-up attempt from `who` and says whether that network has sent too many lately. */
  signupLimited(who: string): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM signups WHERE at < ?", Date.now() - FAIL_WINDOW);
    const { n } = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM signups WHERE who = ?", who)
      .one();
    if (n >= SIGNUP_LIMIT) return true;
    sql.exec("INSERT INTO signups (who, at) VALUES (?, ?)", who, Date.now());
    return false;
  }

  /**
   * Moves a student to their second choice squad: the two choices swap, and the squad they started in is
   * remembered so their new judges can see it. Marks already given stay. Null when there is no such
   * student; "none" when they gave no second choice.
   */
  move(id: number): Candidate | null | "none" {
    const c = this.get(id);
    if (!c) return null;
    const next = moveToSecond(c);
    if (!next) return "none";
    // A move replaces a second interview: the student now has one squad again.
    this.ctx.storage.sql.exec(
      "UPDATE applicants SET first = ?, second = ?, moved_from = ?, also_with = NULL WHERE id = ?",
      next.first,
      next.second,
      next.movedFrom,
      id,
    );
    return this.get(id);
  }

  /** Changes one student's details. Returns null when there is no such student. Throws if the USN is taken. */
  edit(id: number, c: NewCandidate): Candidate | null {
    const n = this.ctx.storage.sql.exec(
      // Editing the first choice back to where a moved student started clears the "moved" mark.
      "UPDATE applicants SET usn = ?, name = ?, email = ?, phone = ?, branch = ?, sem = ?, first = ?, second = ?, day = ?, wildcard = ?, moved_from = CASE WHEN moved_from = ? THEN NULL ELSE moved_from END, also_with = CASE WHEN also_with = ? THEN also_with ELSE NULL END WHERE id = ?",
      c.usn || null,
      c.name,
      c.email,
      c.phone,
      c.branch,
      c.sem,
      c.first,
      c.second,
      c.day,
      c.wildcard ? 1 : 0,
      c.first,
      c.second,
      id,
    ).rowsWritten;
    return n ? this.get(id) : null;
  }

  /** Removes a student and every judge's marks for them. */
  remove(id: number): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM sheets WHERE candidate_id = ?", id);
    return sql.exec("DELETE FROM applicants WHERE id = ?", id).rowsWritten > 0;
  }

  /**
   * Sets a student's result. For core or supporting, `squad` is the squad that picked them (their first
   * choice, or the squad of their second interview); it is kept only when it is not their first choice.
   */
  setStatus(id: number, status: Status, squad?: Candidate["first"]): boolean {
    const c = this.get(id);
    if (!c) return false;
    const placed =
      (status === "core" || status === "supporting") && squad && squad !== c.first ? squad : null;
    return (
      this.ctx.storage.sql.exec(
        "UPDATE applicants SET status = ?, placed_in = ? WHERE id = ?",
        status,
        placed,
        id,
      ).rowsWritten > 0
    );
  }

  /**
   * Gives a student a second interview with their second choice squad (on), or takes it away (off). Marks
   * from that interview stay either way. Null when there is no such student; "none" when they gave no second choice.
   */
  setAlso(id: number, on: boolean): Candidate | null | "none" {
    const c = this.get(id);
    if (!c) return null;
    if (on && !c.second) return "none";
    this.ctx.storage.sql.exec(
      "UPDATE applicants SET also_with = ? WHERE id = ?",
      on ? c.second : null,
      id,
    );
    return this.get(id);
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
  saveSheet(s: Omit<Sheet, "updatedAt"> & { panel: NonNullable<Sheet["panel"]> }): Sheet {
    const at = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO sheets (candidate_id, judge, squad, panel, marks, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (candidate_id, judge, panel) DO UPDATE SET judge = excluded.judge, squad = excluded.squad, marks = excluded.marks, note = excluded.note, updated_at = excluded.updated_at",
      s.candidateId,
      s.judge,
      s.squad,
      s.panel,
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
    sql.exec("DELETE FROM applicants");
    sql.exec("DELETE FROM settings");
    sql.exec("DELETE FROM signups");
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
