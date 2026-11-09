// Merch likes and feedback, in one SQLite database inside a Cloudflare Durable Object.
// Cloudflare creates it on the first deploy from the "migrations" entry in wrangler.jsonc. Nothing to set up by hand.
// A "voter" is a random id kept in a cookie in each browser, never a name or an account. Addresses are kept only
// as salted hashes, and only to slow down anyone hammering the buttons.
import { DurableObject } from "cloudflare:workers";

export type NoteRow = {
  id: number;
  kind: string;
  colour: string;
  name: string;
  text: string;
  at: number;
};

const WINDOW = 10 * 60000;
const WRITE_LIMIT = 80; // likes and notes from one address in 10 minutes (a whole class on campus wifi fits)
const NOTE_LIMIT = 5; // notes from one browser in a day
const FAIL_LIMIT = 15; // wrong admin passcodes from one address in 10 minutes

export class MerchStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS likes (voter TEXT NOT NULL, kind TEXT NOT NULL, colour TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (voter, kind, colour))",
      );
      sql.exec(
        "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, voter TEXT NOT NULL, kind TEXT NOT NULL, colour TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL, at INTEGER NOT NULL)",
      );
      sql.exec("CREATE TABLE IF NOT EXISTS writes (ip TEXT NOT NULL, at INTEGER NOT NULL)");
      sql.exec("CREATE TABLE IF NOT EXISTS failures (ip TEXT NOT NULL, at INTEGER NOT NULL)");
    });
  }

  /** Likes per "kind:colour", and which of them this browser has liked. */
  tally(voter: string | null): { counts: Record<string, number>; mine: string[] } {
    const sql = this.ctx.storage.sql;
    const counts: Record<string, number> = {};
    for (const r of sql.exec<{ kind: string; colour: string; n: number }>(
      "SELECT kind, colour, COUNT(*) AS n FROM likes GROUP BY kind, colour",
    ))
      counts[`${r.kind}:${r.colour}`] = r.n;
    const mine = voter
      ? sql
          .exec<{
            kind: string;
            colour: string;
          }>("SELECT kind, colour FROM likes WHERE voter = ?", voter)
          .toArray()
          .map((r) => `${r.kind}:${r.colour}`)
      : [];
    return { counts, mine };
  }

  /** One like per browser per piece and colour: liking twice changes nothing, and it can be taken back. */
  setLike(voter: string, kind: string, colour: string, liked: boolean) {
    const sql = this.ctx.storage.sql;
    if (liked)
      sql.exec(
        "INSERT OR IGNORE INTO likes (voter, kind, colour, at) VALUES (?, ?, ?, ?)",
        voter,
        kind,
        colour,
        Date.now(),
      );
    else
      sql.exec(
        "DELETE FROM likes WHERE voter = ? AND kind = ? AND colour = ?",
        voter,
        kind,
        colour,
      );
    return this.tally(voter);
  }

  /** False when this browser has already sent its share of notes today. */
  addNote(voter: string, note: Omit<NoteRow, "id" | "at">): boolean {
    const sql = this.ctx.storage.sql;
    const { n } = sql
      .exec<{
        n: number;
      }>("SELECT COUNT(*) AS n FROM notes WHERE voter = ? AND at > ?", voter, Date.now() - 86400000)
      .one();
    if (n >= NOTE_LIMIT) return false;
    sql.exec(
      "INSERT INTO notes (voter, kind, colour, name, text, at) VALUES (?, ?, ?, ?, ?, ?)",
      voter,
      note.kind,
      note.colour,
      note.name,
      note.text,
      Date.now(),
    );
    return true;
  }

  notes(): NoteRow[] {
    return this.ctx.storage.sql
      .exec<NoteRow>("SELECT id, kind, colour, name, text, at FROM notes ORDER BY at DESC")
      .toArray();
  }

  voters(): number {
    return this.ctx.storage.sql
      .exec<{ n: number }>("SELECT COUNT(DISTINCT voter) AS n FROM likes")
      .one().n;
  }

  removeNote(id: number): boolean {
    return this.ctx.storage.sql.exec("DELETE FROM notes WHERE id = ?", id).rowsWritten > 0;
  }

  wipe(): void {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM likes");
    sql.exec("DELETE FROM notes");
  }

  /** Counts a like or a note from this address. True when it has sent too many lately. */
  busy(ip: string): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM writes WHERE at < ?", Date.now() - WINDOW);
    const { n } = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM writes WHERE ip = ?", ip)
      .one();
    if (n >= WRITE_LIMIT) return true;
    sql.exec("INSERT INTO writes (ip, at) VALUES (?, ?)", ip, Date.now());
    return false;
  }

  /** True when this address got the admin passcode wrong too often in the last 10 minutes. */
  limited(ip: string): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM failures WHERE at < ?", Date.now() - WINDOW);
    const { n } = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM failures WHERE ip = ?", ip)
      .one();
    return n >= FAIL_LIMIT;
  }

  hit(ip: string): void {
    this.ctx.storage.sql.exec("INSERT INTO failures (ip, at) VALUES (?, ?)", ip, Date.now());
  }
}
