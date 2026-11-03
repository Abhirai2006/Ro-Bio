// The Robo Spark certificates: one SQLite database inside a Cloudflare Durable Object.
// Names and emails live only here, never in the public repo. Cloudflare creates the database on the
// first deploy from the "migrations" entry in wrangler.jsonc. Nothing to set up by hand.
import { DurableObject } from "cloudflare:workers";
import {
  certNumber,
  type AdminCert,
  type Cert,
  type CertKind,
  type NewCert,
} from "@/lib/certificates";

type Row = {
  no: string;
  kind: string;
  serial: number;
  name: string;
  team: number | null;
  branch: string;
  role: string;
  email: string;
  created_at: number;
  updated_at: number;
};

const WINDOW = 10 * 60000;
/** Per address, per 10 minutes. */
export const LIMITS = { passcode: 15, lookup: 30 } as const;
export type LimitKind = keyof typeof LIMITS;

const COLS = "no, kind, serial, name, team, branch, role, email, created_at, updated_at";

const toCert = (r: Row): Cert => ({
  no: r.no,
  kind: r.kind as CertKind,
  name: r.name,
  team: r.team,
  branch: r.branch,
  role: r.role,
});
const toAdmin = (r: Row): AdminCert => ({
  ...toCert(r),
  email: r.email,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export class CertStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS certs (no TEXT PRIMARY KEY, kind TEXT NOT NULL, serial INTEGER NOT NULL, name TEXT NOT NULL, team INTEGER, branch TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', email TEXT NOT NULL COLLATE NOCASE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
      );
      sql.exec("CREATE INDEX IF NOT EXISTS certs_email ON certs (email)");
      sql.exec(
        "CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL)",
      );
    });
  }

  private rows(query: string, ...bind: unknown[]): Row[] {
    return this.ctx.storage.sql.exec<Row>(query, ...bind).toArray();
  }

  /** The public part of one certificate, or null. */
  get(no: string): Cert | null {
    const r = this.rows(`SELECT ${COLS} FROM certs WHERE no = ?`, no)[0];
    return r ? toCert(r) : null;
  }

  /** Every certificate for this email (a person can have a student and a coordinator one). */
  byEmail(email: string): Cert[] {
    return this.rows(
      `SELECT ${COLS} FROM certs WHERE email = ? ORDER BY kind DESC, serial`,
      email,
    ).map(toCert);
  }

  list(): AdminCert[] {
    return this.rows(`SELECT ${COLS} FROM certs ORDER BY kind DESC, serial`).map(toAdmin);
  }

  /**
   * Adds certificates in the order given. When the same email already has a certificate of the same
   * kind, that one is updated instead (its number stays), so uploading the CSV again is safe.
   */
  add(certs: NewCert[]): { added: number; updated: number; certs: AdminCert[] } {
    const sql = this.ctx.storage.sql;
    let added = 0;
    let updated = 0;
    const out: AdminCert[] = [];
    for (const c of certs) {
      const at = Date.now();
      const old = this.rows(
        `SELECT ${COLS} FROM certs WHERE email = ? AND kind = ?`,
        c.email,
        c.kind,
      )[0];
      if (old) {
        sql.exec(
          "UPDATE certs SET name = ?, team = ?, branch = ?, role = ?, updated_at = ? WHERE no = ?",
          c.name,
          c.team,
          c.branch,
          c.role,
          at,
          old.no,
        );
        updated++;
        out.push(
          toAdmin({
            ...old,
            name: c.name,
            team: c.team,
            branch: c.branch,
            role: c.role,
            updated_at: at,
          }),
        );
        continue;
      }
      const { top } = sql
        .exec<{ top: number | null }>("SELECT MAX(serial) AS top FROM certs WHERE kind = ?", c.kind)
        .one();
      const serial = (top ?? 0) + 1;
      const no = certNumber(c.kind, c.team, serial);
      sql.exec(
        `INSERT INTO certs (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        no,
        c.kind,
        serial,
        c.name,
        c.team,
        c.branch,
        c.role,
        c.email,
        at,
        at,
      );
      added++;
      out.push(toAdmin({ ...c, no, serial, created_at: at, updated_at: at }));
    }
    return { added, updated, certs: out };
  }

  /** Changes the details. The number never changes, even when the team does. */
  edit(no: string, c: NewCert): AdminCert | "missing" | "taken" {
    const old = this.rows(`SELECT ${COLS} FROM certs WHERE no = ?`, no)[0];
    if (!old) return "missing";
    if (old.kind !== c.kind) return "missing";
    const clash = this.rows(
      `SELECT ${COLS} FROM certs WHERE email = ? AND kind = ? AND no != ?`,
      c.email,
      c.kind,
      no,
    )[0];
    if (clash) return "taken";
    const at = Date.now();
    this.ctx.storage.sql.exec(
      "UPDATE certs SET name = ?, team = ?, branch = ?, role = ?, email = ?, updated_at = ? WHERE no = ?",
      c.name,
      c.team,
      c.branch,
      c.role,
      c.email,
      at,
      no,
    );
    return toAdmin({ ...old, ...c, no, updated_at: at });
  }

  remove(no: string): boolean {
    return this.ctx.storage.sql.exec("DELETE FROM certs WHERE no = ?", no).rowsWritten > 0;
  }

  /** True when this address already used up its tries of this kind in the last 10 minutes. */
  limited(ip: string, kind: LimitKind): boolean {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM hits WHERE at < ?", Date.now() - WINDOW);
    const { n } = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND kind = ?", ip, kind)
      .one();
    return n >= LIMITS[kind];
  }

  hit(ip: string, kind: LimitKind) {
    this.ctx.storage.sql.exec(
      "INSERT INTO hits (ip, kind, at) VALUES (?, ?, ?)",
      ip,
      kind,
      Date.now(),
    );
  }
}
