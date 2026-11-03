import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BRANCHES,
  certApi,
  COORDINATOR_ROLE,
  formRowsToCerts,
  mailMergeCsv,
  MAX_ROWS,
  MAX_TEAM,
  readFormCsv,
  type AdminCert,
  type FormRow,
  type NewCert,
} from "@/lib/certificates";
import { Window } from "@/components/site/parts";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates admin | RO-BIO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const KEY = "robio-cert-admin";
const readPass = () => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const savePass = (p: string) => {
  try {
    if (p) sessionStorage.setItem(KEY, p);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* fine */
  }
};

type Note = { kind: "ok" | "err"; text: string } | null;

function NoteBox({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p
      role={note.kind === "err" ? "alert" : "status"}
      className={`mt-4 border-2 p-3 text-sm font-bold ${note.kind === "err" ? "border-destructive bg-destructive/10" : "border-border bg-secondary"}`}
    >
      {note.text}
    </p>
  );
}

const input = "mt-1 block w-full border-2 border-border bg-background px-3 py-2";
const primary =
  "border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard disabled:opacity-60";
const plain = "border-2 border-border bg-card px-3 py-1.5 text-sm font-bold disabled:opacity-60";

function AdminPage() {
  const [pass, setPass] = useState<string | null>(null);
  useEffect(() => setPass(readPass()), []);
  if (pass === null)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 font-pixel text-sm text-primary">LOADING…</div>
    );
  if (!pass)
    return (
      <Gate
        onIn={(p) => {
          savePass(p);
          setPass(p);
        }}
      />
    );
  return (
    <Admin
      pass={pass}
      onOut={() => {
        savePass("");
        setPass("");
      }}
    />
  );
}

function Gate({ onIn }: { onIn: (p: string) => void }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setReady(true), []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const p = String(new FormData(e.currentTarget).get("passcode") ?? "").trim();
    if (!p) return setError("Type the passcode.");
    setBusy(true);
    setError("");
    try {
      await certApi("admin/check", { passcode: p });
      onIn(p);
    } catch (err) {
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <p className="font-pixel text-xs text-primary">ROBO SPARK / ORGANISERS ONLY</p>
      <h1 className="mt-3 text-4xl font-black">Certificates admin</h1>
      <p className="mt-3 text-muted-foreground">
        Enter the admin passcode. It stays in this tab only, until you close it.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 border-2 border-border bg-card p-5 shadow-hard"
      >
        <label className="block">
          <span className="font-bold">Admin passcode</span>
          <input
            name="passcode"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 block w-full border-2 border-border bg-background px-3 py-3 text-lg"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold"
          >
            {error}
          </p>
        )}
        <button
          disabled={!ready || busy}
          className="w-full border-2 border-border bg-primary px-4 py-3 text-lg font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Checking…" : "Open"}
        </button>
      </form>
    </section>
  );
}

function Admin({ pass, onOut }: { pass: string; onOut: () => void }) {
  const [certs, setCerts] = useState<AdminCert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<Note>(null);

  const call = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      try {
        return await certApi<T>(path, { ...init, passcode: pass });
      } catch (err) {
        if (/passcode/i.test((err as Error).message)) onOut();
        throw err;
      }
    },
    [pass, onOut],
  );

  const refresh = useCallback(async () => {
    try {
      const { certs } = await call<{ certs: AdminCert[] }>("admin/list");
      setCerts(certs);
      setLoaded(true);
    } catch (err) {
      setNote({ kind: "err", text: `Could not load the certificates: ${(err as Error).message}` });
    }
  }, [call]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byEmail = useMemo(
    () => new Map(certs.map((c) => [`${c.kind} ${c.email.toLowerCase()}`, c])),
    [certs],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-pixel text-xs text-primary">ROBO SPARK / CERTIFICATES ADMIN</p>
        <p className="text-sm">
          {loaded ? `${certs.length} certificates published.` : "Loading…"}{" "}
          <button type="button" className="text-primary underline" onClick={onOut}>
            Log out
          </button>
        </p>
      </div>
      <h1 className="mt-3 text-4xl font-black">Certificates</h1>
      <NoteBox note={note} />
      <div className="mt-8 space-y-10">
        <Upload call={call} byEmail={byEmail} onDone={refresh} />
        <AddCoordinator call={call} onDone={refresh} />
        <AllCerts certs={certs} call={call} onChange={refresh} />
      </div>
    </div>
  );
}

type Call = <T>(path: string, init?: RequestInit) => Promise<T>;

function Upload({
  call,
  byEmail,
  onDone,
}: {
  call: Call;
  byEmail: Map<string, AdminCert>;
  onDone: () => Promise<void>;
}) {
  const [rows, setRows] = useState<FormRow[] | null>(null);
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const picker = useRef<HTMLInputElement>(null);

  const read = async (f: File | undefined) => {
    setNote(null);
    setRows(null);
    if (!f) return;
    setFile(f.name);
    const { rows, missing } = readFormCsv(await f.text());
    if (missing.length)
      return setNote({
        kind: "err",
        text: `This CSV has no ${missing.join(", ")} column. Download it from the form: Responses, the three dots, Download responses (.csv).`,
      });
    setRows(rows);
  };

  // A file picked while the page was still starting up is read once it has started.
  useEffect(() => {
    const f = picker.current?.files?.[0];
    if (f) void read(f);
  }, []);

  const good = rows ? formRowsToCerts(rows) : [];
  const bad = rows ? rows.filter((r) => r.problems.length).length : 0;

  const publish = async () => {
    if (!good.length) return;
    setBusy(true);
    setNote(null);
    try {
      let added = 0;
      let updated = 0;
      for (let i = 0; i < good.length; i += MAX_ROWS) {
        const r = await call<{ added: number; updated: number }>("admin/add", {
          method: "POST",
          body: JSON.stringify({ rows: good.slice(i, i + MAX_ROWS) }),
        });
        added += r.added;
        updated += r.updated;
      }
      setNote({
        kind: "ok",
        text: `Done: ${added} new certificate${added === 1 ? "" : "s"}, ${updated} updated. Students can now find theirs on /certificates.`,
      });
      setRows(null);
      await onDone();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Window tag="1. STUDENTS" title="Upload the form responses">
      <p className="mt-1 text-sm text-muted-foreground">
        In the Google Form: Responses, the three dots, Download responses (.csv). Only the email,
        name, team and branch are kept; phone numbers and feedback are never sent. Uploading again
        is safe: a student who already has a certificate keeps the same number and gets the new
        details.
      </p>
      <label className="mt-4 block">
        <span className="font-bold">Form responses (.csv)</span>
        <input
          ref={picker}
          type="file"
          name="csv"
          accept=".csv,text/csv"
          onChange={(e) => {
            void read(e.target.files?.[0]);
            // Cleared, so picking the same file again (after fixing it) is read again.
            e.target.value = "";
          }}
          className="mt-1 block w-full text-sm file:mr-3 file:border-2 file:border-border file:bg-secondary file:px-3 file:py-1.5 file:font-bold"
        />
      </label>
      <NoteBox note={note} />
      {rows && (
        <>
          <p className="mt-4 text-sm">
            <b>{file}</b>: {rows.length} rows, <b>{good.length} ready</b>
            {bad > 0 && (
              <>
                , <b className="text-destructive">{bad} with problems</b> (in red, left out; fix
                them in the form or add them by hand)
              </>
            )}
            .
          </p>
          <div className="mt-3 max-h-[28rem] overflow-auto border-2 border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  {["Line", "Name", "Email", "Team", "Branch", "Status"].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-pixel text-[10px]">
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const old = byEmail.get(`student ${r.email}`);
                  return (
                    <tr
                      key={r.line}
                      className={`border-t border-border ${r.problems.length ? "bg-destructive/15 text-destructive" : ""}`}
                    >
                      <td className="px-2 py-1 font-mono">{r.line}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1 font-mono text-xs">{r.email}</td>
                      <td className="px-2 py-1">{r.team ?? ""}</td>
                      <td className="px-2 py-1">{r.branch}</td>
                      <td className="px-2 py-1 font-bold">
                        {r.problems.length
                          ? r.problems.join(", ")
                          : old
                            ? `updates ${old.no}`
                            : "new"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={busy || !good.length}
            onClick={() => void publish()}
            className={`mt-4 ${primary}`}
          >
            {busy
              ? "Publishing…"
              : `Publish ${good.length} certificate${good.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </Window>
  );
}

function AddCoordinator({ call, onDone }: { call: Call; onDone: () => Promise<void> }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setReady(true), []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setNote(null);
    try {
      const row: NewCert = {
        kind: "coordinator",
        name: String(d.get("name") ?? ""),
        email: String(d.get("email") ?? ""),
        role: String(d.get("role") ?? ""),
        team: null,
        branch: "",
      };
      const r = await call<{ added: number; certs: AdminCert[] }>("admin/add", {
        method: "POST",
        body: JSON.stringify({ rows: [row] }),
      });
      const c = r.certs[0];
      setNote({
        kind: "ok",
        text: c ? `${r.added ? "Added" : "Updated"} ${c.name}: ${c.no}.` : "Saved.",
      });
      form.current?.reset();
      await onDone();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Window tag="2. COORDINATORS" title="Add a coordinator">
      <p className="mt-1 text-sm text-muted-foreground">
        Gives a Certificate of Appreciation. The same email again updates that coordinator instead
        of adding a second one.
      </p>
      <form ref={form} onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="font-bold">Name</span>
          <input name="name" required maxLength={60} placeholder="Like Asha K" className={input} />
        </label>
        <label className="block">
          <span className="font-bold">Email</span>
          <input name="email" type="email" required className={input} />
        </label>
        <label className="block">
          <span className="font-bold">Role line</span>
          <input
            name="role"
            required
            maxLength={80}
            defaultValue={COORDINATOR_ROLE}
            className={input}
          />
        </label>
        <div className="md:col-span-3">
          <button disabled={!ready || busy} className={primary}>
            {busy ? "Adding…" : "Add coordinator"}
          </button>
        </div>
      </form>
      <NoteBox note={note} />
    </Window>
  );
}

const download = (text: string, name: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

function AllCerts({
  certs,
  call,
  onChange,
}: {
  certs: AdminCert[];
  call: Call;
  onChange: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return certs;
    return certs.filter((c) =>
      [c.no, c.name, c.email, c.branch, c.role, c.team === null ? "" : `team ${c.team}`]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [certs, q]);

  const remove = async (c: AdminCert) => {
    if (
      !window.confirm(
        `Delete ${c.no} (${c.name})? The QR code on any copy already sent will say "No certificate with this number".`,
      )
    )
      return;
    try {
      await call(`admin/cert?no=${encodeURIComponent(c.no)}`, { method: "DELETE" });
      setNote({ kind: "ok", text: `Deleted ${c.no}.` });
      await onChange();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    }
  };

  return (
    <Window tag="3. ALL CERTIFICATES" title={`All certificates (${certs.length})`}>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block min-w-[14rem] flex-1">
          <span className="font-bold">Search</span>
          <input
            name="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, number or team 17"
            className={input}
          />
        </label>
        <button
          type="button"
          disabled={!certs.length}
          onClick={() => download(mailMergeCsv(certs), "robo-spark-mail-merge.csv")}
          className={primary}
        >
          Download mail merge sheet (.csv)
        </button>
      </div>
      <NoteBox note={note} />
      <div className="mt-4 max-h-[36rem] overflow-auto border-2 border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr>
              {["Number", "Name", "Email", "Team or role", "Branch", ""].map((h) => (
                <th key={h || "do"} className="px-2 py-1.5 font-pixel text-[10px]">
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) =>
              editing === c.no ? (
                <EditRow
                  key={c.no}
                  cert={c}
                  call={call}
                  onDone={async (text) => {
                    setEditing(null);
                    if (text) setNote({ kind: "ok", text });
                    await onChange();
                  }}
                />
              ) : (
                <tr key={c.no} className="border-t border-border align-top">
                  <td className="px-2 py-1.5 font-mono">
                    <Link
                      to="/verify/$no"
                      params={{ no: c.no }}
                      className="text-primary underline"
                      target="_blank"
                    >
                      {c.no}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 font-bold">{c.name}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">{c.email}</td>
                  <td className="px-2 py-1.5">
                    {c.kind === "coordinator" ? c.role : `Team ${c.team}`}
                  </td>
                  <td className="px-2 py-1.5">{c.branch}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <button type="button" className={plain} onClick={() => setEditing(c.no)}>
                      Edit
                    </button>{" "}
                    <button type="button" className={plain} onClick={() => void remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
            {!shown.length && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-muted-foreground">
                  {certs.length ? "Nothing matches that search." : "No certificates yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Window>
  );
}

function EditRow({
  cert,
  call,
  onDone,
}: {
  cert: AdminCert;
  call: Call;
  onDone: (text: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const student = cert.kind === "student";

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await call(`admin/cert?no=${encodeURIComponent(cert.no)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: d.get("name"),
          email: d.get("email"),
          team: student ? Number(d.get("team")) : null,
          branch: d.get("branch") ?? "",
          role: student ? "" : d.get("role"),
        }),
      });
      await onDone(`Saved ${cert.no}. The number stays the same.`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const formId = `edit-${cert.no}`;
  return (
    <tr className="border-t border-border bg-secondary/50 align-top">
      <td className="px-2 py-2 font-mono">
        {cert.no}
        <form id={formId} onSubmit={save} />
      </td>
      <td className="px-2 py-2">
        <input
          form={formId}
          name="name"
          defaultValue={cert.name}
          required
          maxLength={60}
          className={input}
        />
      </td>
      <td className="px-2 py-2">
        <input
          form={formId}
          name="email"
          type="email"
          defaultValue={cert.email}
          required
          className={input}
        />
      </td>
      <td className="px-2 py-2">
        {student ? (
          <input
            form={formId}
            name="team"
            type="number"
            min={1}
            max={MAX_TEAM}
            defaultValue={cert.team ?? ""}
            required
            className={input}
            aria-label="Team"
          />
        ) : (
          <input
            form={formId}
            name="role"
            defaultValue={cert.role}
            required
            className={input}
            aria-label="Role line"
          />
        )}
      </td>
      <td className="px-2 py-2">
        <select
          form={formId}
          name="branch"
          defaultValue={cert.branch}
          className={input}
          aria-label="Branch"
        >
          {!student && <option value="">(none)</option>}
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <button form={formId} disabled={busy} className={plain}>
          {busy ? "Saving…" : "Save"}
        </button>{" "}
        <button type="button" className={plain} onClick={() => void onDone("")}>
          Cancel
        </button>
        {error && (
          <p className="mt-1 max-w-[14rem] whitespace-normal text-xs font-bold text-destructive">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
