// Bot Forge registration: teams, their members and payments, in one SQLite database inside a Cloudflare
// Durable Object. Cloudflare creates it on the first deploy from the "migrations" entry in wrangler.jsonc.
// Students' details live only here, never in the repo. The admin page can delete all of it after the event.
import { DurableObject } from "cloudflare:workers";
import { teamCode, teamNameKey, type NewTeam, type PayStatus, type Team } from "@/lib/bot-forge";
import { botForgeInfo, contestBySlug, type ContestSlug } from "@/lib/site";

type TeamRow = {
  id: number;
  contest: string;
  num: number;
  code: string;
  name: string;
  members: string;
  phone: string;
  email: string;
  kit: number;
  utr: string | null;
  pay: string;
  added_at: number;
};

const FAIL_WINDOW = 10 * 60000;
const FAIL_LIMIT = 15;
/** Sign-ups from one network in 10 minutes. High on purpose: a whole class can share the college Wi-Fi. */
const SIGNUP_LIMIT = 60;
/** The most teams the public form takes, so a flood cannot fill the database. */
export const TEAM_CAP = 600;

const toTeam = (r: TeamRow): Team => ({
  id: r.id,
  contest: r.contest as ContestSlug,
  code: r.code,
  name: r.name,
  members: JSON.parse(r.members) as Team["members"],
  phone: r.phone,
  email: r.email,
  kit: r.kit === 1,
  utr: r.utr ?? "",
  pay: r.pay as PayStatus,
  addedAt: r.added_at,
});

export type Registered =
  | { team: Team; kitGone: boolean }
  | { taken: "usn"; usn: string }
  | { taken: "name" }
  | { full: true };

export type UtrResult = { team: Team } | { error: "no-team" | "utr-taken" | "already-paid" };

export class BotForgeStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, contest TEXT NOT NULL, num INTEGER NOT NULL, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, members TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, kit INTEGER NOT NULL DEFAULT 0, utr TEXT UNIQUE, pay TEXT NOT NULL DEFAULT 'unpaid', added_at INTEGER NOT NULL)",
      );
      // One row per student with a USN, so nobody can be in two teams.
      sql.exec(
        "CREATE TABLE IF NOT EXISTS students (usn TEXT PRIMARY KEY, team_id INTEGER NOT NULL)",
      );
      sql.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      sql.exec("CREATE TABLE IF NOT EXISTS failures (ip TEXT NOT NULL, at INTEGER NOT NULL)");
      sql.exec("CREATE TABLE IF NOT EXISTS signups (who TEXT NOT NULL, at INTEGER NOT NULL)");
    });
  }

  list(): Team[] {
    return this.ctx.storage.sql
      .exec<TeamRow>("SELECT * FROM teams ORDER BY contest, num")
      .toArray()
      .map(toTeam);
  }

  private row(where: "id" | "code" | "utr", v: string | number): Team | null {
    const r = this.ctx.storage.sql
      .exec<TeamRow>(`SELECT * FROM teams WHERE ${where} = ?`, v)
      .toArray()[0];
    return r ? toTeam(r) : null;
  }

  /** Club kits not yet given out, for each contest that has them. */
  kitsLeft(): Record<string, number> {
    const used = new Map(
      this.ctx.storage.sql
        .exec<{
          contest: string;
          n: number;
        }>("SELECT contest, COUNT(*) AS n FROM teams WHERE kit = 1 GROUP BY contest")
        .toArray()
        .map((r) => [r.contest, r.n]),
    );
    return Object.fromEntries(
      botForgeInfo.contests
        .filter((c) => c.kits > 0)
        .map((c) => [c.slug, Math.max(0, c.kits - (used.get(c.slug) ?? 0))]),
    );
  }

  /**
   * Saves a new team and gives it the next number in its contest. A kit is held for it if it asked and one is
   * left; `kitGone` says it asked but the kits had run out. Refused when a USN is already in a team or the
   * team name is taken.
   */
  register(t: NewTeam): Registered {
    const sql = this.ctx.storage.sql;
    const { n } = sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM teams").one();
    if (n >= TEAM_CAP) return { full: true };
    for (const m of t.members) {
      if (!m.usn) continue;
      if (sql.exec("SELECT usn FROM students WHERE usn = ?", m.usn).toArray().length)
        return { taken: "usn", usn: m.usn };
    }
    const key = teamNameKey(t.name);
    if (sql.exec("SELECT id FROM teams WHERE name_key = ?", key).toArray().length)
      return { taken: "name" };
    const c = contestBySlug(t.contest)!;
    const kit = t.kit && (this.kitsLeft()[c.slug] ?? 0) > 0;
    const { next } = sql
      .exec<{
        next: number;
      }>("SELECT COALESCE(MAX(num), 0) + 1 AS next FROM teams WHERE contest = ?", c.slug)
      .one();
    const code = teamCode(c, next);
    sql.exec(
      "INSERT INTO teams (contest, num, code, name, name_key, members, phone, email, kit, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      c.slug,
      next,
      code,
      t.name,
      key,
      JSON.stringify(t.members),
      t.phone,
      t.email,
      kit ? 1 : 0,
      Date.now(),
    );
    const team = this.row("code", code)!;
    for (const m of t.members)
      if (m.usn) sql.exec("INSERT INTO students (usn, team_id) VALUES (?, ?)", m.usn, team.id);
    return { team, kitGone: t.kit && !kit };
  }

  /**
   * A team sends the UPI transaction number of its fee. The team number and the leader's WhatsApp number must
   * match, so nobody else can change it. A paid team's number stays as the admin checked it.
   */
  sendUtr(code: string, phone: string, utr: string): UtrResult {
    const team = this.row("code", code);
    if (!team || team.phone !== phone) return { error: "no-team" };
    if (team.pay === "paid") return { error: "already-paid" };
    const other = this.row("utr", utr);
    if (other && other.id !== team.id) return { error: "utr-taken" };
    this.ctx.storage.sql.exec("UPDATE teams SET utr = ?, pay = 'sent' WHERE id = ?", utr, team.id);
    return { team: this.row("id", team.id)! };
  }

  setPay(id: number, pay: PayStatus): Team | null {
    this.ctx.storage.sql.exec("UPDATE teams SET pay = ? WHERE id = ?", pay, id);
    return this.row("id", id);
  }

  /** Gives a team a club kit or takes it back. "full" when every kit for that contest is out. */
  setKit(id: number, on: boolean): Team | null | "full" | "none" {
    const team = this.row("id", id);
    if (!team) return null;
    if (!contestBySlug(team.contest)?.kits) return "none";
    if (on && !team.kit && (this.kitsLeft()[team.contest] ?? 0) <= 0) return "full";
    this.ctx.storage.sql.exec("UPDATE teams SET kit = ? WHERE id = ?", on ? 1 : 0, id);
    return this.row("id", id);
  }

  remove(id: number): boolean {
    const sql = this.ctx.storage.sql;
    if (!this.row("id", id)) return false;
    sql.exec("DELETE FROM students WHERE team_id = ?", id);
    sql.exec("DELETE FROM teams WHERE id = ?", id);
    return true;
  }

  wipe(): void {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM students");
    sql.exec("DELETE FROM teams");
  }

  /** True when the admin has paused registration. */
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

  /** Counts a sign-up or payment form sent from one (scrambled) network; true once it has sent too many. */
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

  /** True after too many wrong passcodes, or wrong team number and phone pairs, from one address. */
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
