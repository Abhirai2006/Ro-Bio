// Robo Spark certificates: the data, the numbering, the form CSV reader and the mail merge sheet.
// The certificate pictures are drawn by certificate-svg.ts. Student names and emails never live in
// this repo: they are kept in the CertStore Durable Object (src/server/cert-store.ts).
import { site } from "@/lib/site";

export type CertKind = "student" | "coordinator";

/** What anyone with the certificate number can see. Never includes the email. */
export type Cert = {
  no: string;
  kind: CertKind;
  name: string;
  /** The Robo Spark team (1 to MAX_TEAM). Null for coordinators. */
  team: number | null;
  branch: string;
  /** The role line on a coordinator certificate. Empty for students. */
  role: string;
};

/** What the admin page sees: the public part plus the email and the dates. */
export type AdminCert = Cert & { email: string; createdAt: number; updatedAt: number };

/** One certificate to add. The number is given by the store. */
export type NewCert = Omit<Cert, "no"> & { email: string };

/** The branches as the Google Form lists them. Spelt exactly like the form, do not change. */
export const BRANCHES = [
  "Biomedical and Robotic Engineering",
  "Artificial Intelligence & Data Science",
  "Artificial Intelligence & Machine Learning",
  "Electronics and Communication Engineering",
  "Civil Environmental Engineering",
  "Computer Science & Design",
  "Computer Science & Engineering",
] as const;

export const COORDINATOR_ROLE = "Student Coordinator, Robo Spark";
export const MAX_TEAM = 60;
export const MAX_ROWS = 2000;
export const NAME_MAX = 60;

/**
 * The e-signature pictures, as file names in public/certificates/ (for example "sign-archana.png").
 * Null shows an empty space above the line. A transparent PNG about 4.4 times as wide as it is tall
 * fits best; any size works, it is scaled to fit and sits on the line.
 */
export const SIGNATURES: { left: string | null; centre: string | null; right: string | null } = {
  left: "sign-archana.png",
  centre: "sign-nithin.png",
  right: "sign-kumara.png",
};

/** The three people who sign every certificate, left to right. */
export const SIGNERS = [
  { slot: "left", name: "ARCHANA G", role: ["Faculty Coordinator,", "RO-BIO"] },
  {
    slot: "centre",
    name: "DR. NITHIN S K",
    role: ["Head of Department,", "Biomedical and Robotic Engineering"],
  },
  {
    slot: "right",
    name: "PROF. H S KUMARA",
    role: ["Director,", "Mysore University School of Engineering"],
  },
] as const;

/** RS26-017-0042 for a student in team 17, RS26-C00-0003 for a coordinator. */
export function certNumber(kind: CertKind, team: number | null, serial: number): string {
  const s = String(serial).padStart(4, "0");
  if (kind === "coordinator") return `RS26-C00-${s}`;
  return `RS26-${String(team ?? 0).padStart(3, "0")}-${s}`;
}

export const CERT_NO = /^RS26-(\d{3}|C00)-\d{4}$/;

/** Accepts what people type or copy, like "No. rs26-017-0042", and gives RS26-017-0042 or null. */
export function cleanCertNo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .trim()
    .toUpperCase()
    .replace(/^NO\.?\s*/, "")
    .replace(/\s+/g, "");
  return CERT_NO.test(s) ? s : null;
}

export function cleanEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function isEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i.test(email);
}

/** Single spaces, a space after each initial ("K.S. Rao" becomes "K. S. Rao"), at most 60 letters. */
export function cleanPersonName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return [...raw]
    .map((ch) => (ch < " " || ch === "\u007f" || ch === "<" || ch === ">" ? " " : ch))
    .join("")
    .replace(/\.(?=\S)/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

/**
 * A name typed all in capitals (or all in small letters) becomes Title Case: "NISHANTH SAUKAR M"
 * becomes "Nishanth Saukar M". Initials stay capitals ("HK", "K. S."), and a name that already
 * mixes capitals and small letters is kept exactly as typed.
 */
export function tidyNameCase(name: string): string {
  if (/[a-z]/.test(name) && /[A-Z]/.test(name)) return name;
  return name
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split(/([-'])/)
        .map((part) => {
          const letters = part.replace(/[^a-z]/g, "");
          if (letters.length <= 1 || !/[aeiouy]/.test(letters)) return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(""),
    )
    .join(" ");
}

/** The page that proves a certificate is real. Its QR code opens this. */
export function verifyUrl(no: string): string {
  return `${site.url}/verify/${no}`;
}

/** A file name like RS26-017-0042_Asha_K.pdf. */
export function certFileName(cert: Pick<Cert, "no" | "name">, ext = "pdf"): string {
  const name = cert.name
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${cert.no}${name ? `_${name}` : ""}.${ext}`;
}

/** Reads CSV text into rows of cells. Handles quotes, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** One student row from the form, with anything wrong listed in `problems`. */
export type FormRow = {
  kind: CertKind;
  /** The row number as the spreadsheet shows it (the heading is row 1). */
  line: number;
  email: string;
  name: string;
  /** The name as it was typed, when it was changed to Title Case. */
  typed?: string;
  team: number | null;
  branch: string;
  problems: string[];
};

const COLUMNS = {
  email: "email address",
  name: "full name",
  team: "team number",
  branch: "branch",
} as const;

const heading = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Reads the CSV that Google Forms gives (Responses, Download responses). Finds the columns by their
 * heading and keeps only email, name, team and branch. The phone number and the feedback are dropped.
 * Names typed all in capitals are put in Title Case (see tidyNameCase).
 * With kind "coordinator" it reads the coordinator form instead: no team, and the role line is
 * COORDINATOR_ROLE. It refuses a sheet with a team column, so the student form cannot be
 * published as coordinators by mistake.
 */
export function readFormCsv(
  text: string,
  branches: readonly string[] = BRANCHES,
  kind: CertKind = "student",
): { rows: FormRow[]; missing: string[]; wrongForm?: string } {
  const all = parseCsv(text);
  const head = (all[0] ?? []).map(heading);
  const find = (want: string) => {
    const exact = head.indexOf(want);
    return exact >= 0 ? exact : head.findIndex((h) => h.startsWith(want));
  };
  const at = {
    email: find(COLUMNS.email),
    name: find(COLUMNS.name),
    team: find(COLUMNS.team),
    branch: find(COLUMNS.branch),
  };
  const coord = kind === "coordinator";
  if (coord && at.team >= 0)
    return {
      rows: [],
      missing: [],
      wrongForm: "This is the student form (it has a Team number column). Upload it in box 1.",
    };
  const missing = Object.entries(at)
    .filter(([k, i]) => i < 0 && !(coord && k === "team"))
    .map(([k]) => `"${COLUMNS[k as keyof typeof COLUMNS]}"`);
  if (missing.length) return { rows: [], missing };

  const branchByKey = new Map(branches.map((b) => [heading(b), b]));
  const seen = new Map<string, number>();
  const rows = all.slice(1).map((cells, i): FormRow => {
    const line = i + 2;
    const email = cleanEmail(cells[at.email]);
    const typed = cleanPersonName(cells[at.name]);
    const name = tidyNameCase(typed);
    const teamText = (cells[at.team] ?? "").trim();
    const teamDigits = /^(?:team\s*)?(\d{1,3})$/i.exec(teamText)?.[1];
    const teamNo = teamDigits ? Number(teamDigits) : NaN;
    const team = teamNo >= 1 && teamNo <= MAX_TEAM ? teamNo : null;
    const branchText = (cells[at.branch] ?? "").trim();
    const branch = branchByKey.get(heading(branchText)) ?? "";
    const problems: string[] = [];
    if (!isEmail(email)) problems.push("no valid email");
    if (!name) problems.push("no name");
    if (!coord && team === null) problems.push(`team not 1 to ${MAX_TEAM}`);
    if (!branch) problems.push("branch not in the list");
    const first = isEmail(email) ? seen.get(email) : undefined;
    if (first !== undefined) problems.push(`same email as line ${first}`);
    else if (isEmail(email)) seen.set(email, line);
    return {
      kind,
      line,
      email,
      name,
      ...(name !== typed ? { typed } : {}),
      team: coord ? null : team,
      branch: branch || branchText,
      problems,
    };
  });
  return { rows, missing: [] };
}

/** The good rows of a form CSV as certificates to add. */
export function formRowsToCerts(rows: FormRow[]): NewCert[] {
  return rows
    .filter((r) => !r.problems.length)
    .map((r) => ({
      kind: r.kind,
      name: r.name,
      team: r.kind === "student" ? r.team : null,
      branch: r.branch,
      role: r.kind === "coordinator" ? COORDINATOR_ROLE : "",
      email: r.email,
    }));
}

/** Checks one certificate sent to the admin API. Used by the server for every row. */
export function validateCert(
  raw: unknown,
  branches: readonly string[] = BRANCHES,
): { ok: true; cert: NewCert } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a certificate." };
  const r = raw as Record<string, unknown>;
  const kind = r["kind"];
  if (kind !== "student" && kind !== "coordinator")
    return { ok: false, error: 'Kind must be "student" or "coordinator".' };
  const name = cleanPersonName(r["name"]);
  if (!name) return { ok: false, error: "Type the name." };
  const email = cleanEmail(r["email"]);
  if (!isEmail(email)) return { ok: false, error: `"${email}" is not an email address.` };
  if (kind === "student") {
    const team = Number(r["team"]);
    if (!Number.isInteger(team) || team < 1 || team > MAX_TEAM)
      return { ok: false, error: `The team number must be 1 to ${MAX_TEAM}.` };
    const branch = typeof r["branch"] === "string" ? r["branch"].trim() : "";
    if (!branches.includes(branch)) return { ok: false, error: "Pick a branch from the list." };
    return { ok: true, cert: { kind, name, team, branch, role: "", email } };
  }
  const role =
    typeof r["role"] === "string" ? r["role"].replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (!role) return { ok: false, error: "Type the role line." };
  const branch = typeof r["branch"] === "string" ? r["branch"].trim() : "";
  if (branch && !branches.includes(branch))
    return { ok: false, error: "Pick a branch from the list, or leave it empty." };
  return { ok: true, cert: { kind, name, team: null, branch, role, email } };
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  // A leading = + - @ makes spreadsheets run the cell as a formula, so it gets a quote mark first.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** The sheet for a Gmail or Word mail merge: one row per certificate, with its link. */
export function mailMergeCsv(certs: AdminCert[]): string {
  const head = [
    "Email",
    "Name",
    "Kind",
    "Team",
    "Branch",
    "Role",
    "Certificate number",
    "Certificate link",
  ];
  const lines = certs.map((c) =>
    [c.email, c.name, c.kind, c.team, c.branch, c.role, c.no, verifyUrl(c.no)]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}

/** What the banner on the verify page says under the name. */
export function certSummary(c: Cert): string {
  if (c.kind === "coordinator") return c.role || COORDINATOR_ROLE;
  return [`Team ${c.team}`, c.branch].filter(Boolean).join(", ");
}

/** Calls /api/certificates/... and throws the server's message when it says no. */
export async function certApi<T>(
  path: string,
  init: RequestInit & { passcode?: string } = {},
): Promise<T> {
  const { passcode, headers, ...rest } = init;
  const res = await fetch(`/api/certificates/${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(passcode ? { "x-admin-passcode": passcode } : {}),
      ...(headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `The server said ${res.status}.`);
  return data;
}
