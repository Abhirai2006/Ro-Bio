// The Robo Spark score sheet: one SQLite database inside a Cloudflare Durable Object.
// Cloudflare creates it on the first deploy from the "migrations" entry in wrangler.jsonc. Nothing to set up by hand.
import { DurableObject } from "cloudflare:workers";
import type { Score } from "@/lib/judging";

type Row = { team: number; judge: string; ticks: string; note: string; updated_at: number };

const FAIL_WINDOW = 10 * 60000;
const FAIL_LIMIT = 15;

export class JudgeScores extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS scores (team INTEGER NOT NULL, judge TEXT NOT NULL COLLATE NOCASE, ticks TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY (team, judge))",
      );
      sql.exec("CREATE TABLE IF NOT EXISTS failures (ip TEXT NOT NULL, at INTEGER NOT NULL)");
    });
  }

  list(): Score[] {
    return this.ctx.storage.sql
      .exec<Row>("SELECT team, judge, ticks, note, updated_at FROM scores ORDER BY team, judge")
      .toArray()
      .map((r) => ({
        team: r.team,
        judge: r.judge,
        ticks: JSON.parse(r.ticks) as boolean[],
        note: r.note,
        updatedAt: r.updated_at,
      }));
  }

  /** Saves one judge's sheet for one team, replacing that judge's earlier sheet for the team. */
  save(s: Omit<Score, "updatedAt">): Score {
    const at = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO scores (team, judge, ticks, note, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (team, judge) DO UPDATE SET ticks = excluded.ticks, note = excluded.note, updated_at = excluded.updated_at, judge = excluded.judge",
      s.team,
      s.judge,
      JSON.stringify(s.ticks),
      s.note,
      at,
    );
    return { ...s, updatedAt: at };
  }

  remove(team: number, judge: string): boolean {
    return (
      this.ctx.storage.sql.exec("DELETE FROM scores WHERE team = ? AND judge = ?", team, judge)
        .rowsWritten > 0
    );
  }

  /** True when this address got the passcode wrong too often in the last 10 minutes. */
  blocked(ip: string): boolean {
    const since = Date.now() - FAIL_WINDOW;
    this.ctx.storage.sql.exec("DELETE FROM failures WHERE at < ?", since);
    const row = this.ctx.storage.sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM failures WHERE ip = ?", ip)
      .one();
    return row.n >= FAIL_LIMIT;
  }

  failed(ip: string) {
    this.ctx.storage.sql.exec("INSERT INTO failures (ip, at) VALUES (?, ?)", ip, Date.now());
  }
}
