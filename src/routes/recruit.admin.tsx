import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BRANCHES } from "@/lib/certificates";
import {
  blocking,
  CORE_CAP,
  coreCount,
  CRITERIA,
  DAYS,
  MAX_ROWS,
  rankSquad,
  readRecruitCsv,
  recruitApi,
  resultsCsv,
  ROOMS,
  SQUADS,
  STATUSES,
  summarize,
  type Candidate,
  type CsvRow,
  type NewCandidate,
  type Sheet,
  type Squad,
  type Status,
} from "@/lib/recruit";
import { Window } from "@/components/site/parts";

export const Route = createFileRoute("/recruit/admin")({
  head: () => ({
    meta: [
      { title: "Recruitment admin | RO-BIO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const KEY = "robio-recruit-admin";
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
    /* storage blocked: the admin types it again next time */
  }
};

type Note = { kind: "ok" | "err"; text: string } | null;
type Call = <T>(path: string, init?: RequestInit) => Promise<T>;

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
const th =
  "border-b-2 border-border bg-secondary px-2 py-1.5 text-left font-pixel text-[10px] tracking-wider";
const td = "border-b border-input px-2 py-1.5 align-top";

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
      await recruitApi("admin", p, "check");
      onIn(p);
    } catch (err) {
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <p className="font-pixel text-xs text-primary">CORE RECRUITMENT / ADMIN ONLY</p>
      <h1 className="mt-3 text-4xl font-black">Recruitment admin</h1>
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
            id="admin-passcode"
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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [editing, setEditing] = useState<Candidate | null>(null);

  const call: Call = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      try {
        return await recruitApi<T>("admin", pass, path, init);
      } catch (err) {
        if (/passcode/i.test((err as Error).message)) onOut();
        throw err;
      }
    },
    [pass, onOut],
  );

  const refresh = useCallback(async () => {
    try {
      const r = await call<{ candidates: Candidate[]; sheets: Sheet[]; locked: boolean }>("list");
      setCandidates(r.candidates);
      setSheets(r.sheets);
      setLocked(r.locked);
      setLoaded(true);
    } catch (err) {
      setNote({ kind: "err", text: `Could not load the students: ${(err as Error).message}` });
    }
  }, [call]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const results = useMemo(() => summarize(candidates, sheets), [candidates, sheets]);
  const known = useMemo(() => new Set(candidates.map((c) => c.usn)), [candidates]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-pixel text-xs text-primary">CORE RECRUITMENT / ADMIN</p>
        <p className="text-sm">
          {loaded ? `${candidates.length} students, ${sheets.length} marks sheets.` : "Loading…"}{" "}
          <button type="button" className="text-primary underline" onClick={() => void refresh()}>
            Refresh
          </button>{" "}
          <button type="button" className="text-primary underline" onClick={onOut}>
            Log out
          </button>
        </p>
      </div>
      <h1 className="mt-3 text-4xl font-black">Recruitment</h1>
      <NoteBox note={note} />
      <div className="mt-8 space-y-10">
        <Import call={call} known={known} onDone={refresh} />
        <StudentForm
          key={editing?.id ?? "new"}
          call={call}
          editing={editing}
          onDone={async () => {
            setEditing(null);
            await refresh();
          }}
        />
        <Counts candidates={candidates} />
        <Results results={results} candidates={candidates} call={call} onChange={refresh} />
        <AllStudents
          candidates={candidates}
          results={results}
          call={call}
          onEdit={(c) => {
            setEditing(c);
            document.getElementById("student-form")?.scrollIntoView({ behavior: "smooth" });
          }}
          onChange={refresh}
        />
        <Finish results={results} locked={locked} call={call} onChange={refresh} />
      </div>
    </div>
  );
}

function Import({
  call,
  known,
  onDone,
}: {
  call: Call;
  known: Set<string>;
  onDone: () => Promise<void>;
}) {
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  const read = async (f: File | undefined) => {
    setNote(null);
    setRows(null);
    if (!f) return;
    setFile(f.name);
    const { rows, missing } = readRecruitCsv(await f.text());
    if (missing.length)
      return setNote({
        kind: "err",
        text: `This CSV has no ${missing.map((m) => `"${m}"`).join(", ")} column. Download the Form Responses 1 tab: File, Download, Comma separated values.`,
      });
    setRows(rows);
  };

  const good = rows ? rows.filter((r) => !blocking(r).length) : [];
  const bad = rows ? rows.length - good.length : 0;
  const fresh = good.filter((r) => !known.has(r.usn)).length;

  const add = async () => {
    if (!good.length) return;
    setBusy(true);
    setNote(null);
    try {
      let added = 0;
      let updated = 0;
      const clean: NewCandidate[] = good.map(({ line: _line, problems: _problems, ...c }) => c);
      for (let i = 0; i < clean.length; i += MAX_ROWS) {
        const r = await call<{ added: number; updated: number }>("add", {
          method: "POST",
          body: JSON.stringify({ rows: clean.slice(i, i + MAX_ROWS) }),
        });
        added += r.added;
        updated += r.updated;
      }
      setNote({
        kind: "ok",
        text: `Done: ${added} new student${added === 1 ? "" : "s"}, ${updated} updated.`,
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
    <Window tag="1. IMPORT" title="Add the form responses">
      <p className="mt-1 text-sm text-muted-foreground">
        In the response Sheet, open the Form Responses 1 tab, then File, Download, Comma separated
        values (.csv). Importing again is safe: students are matched by USN, their details are
        updated, and their status and marks are kept. If a student sent the form twice, their last
        answers count.
      </p>
      <label className="mt-4 block">
        <span className="font-bold">Form responses (.csv)</span>
        <input
          id="recruit-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            void read(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-1 block w-full text-sm file:mr-3 file:border-2 file:border-border file:bg-secondary file:px-3 file:py-1.5 file:font-bold"
        />
      </label>
      <NoteBox note={note} />
      {rows && (
        <>
          <p className="mt-4 text-sm">
            <b>{file}</b>: {rows.length} rows, <b>{good.length} ready</b> ({fresh} new)
            {bad > 0 && (
              <>
                , <b className="text-destructive">{bad} left out</b> (in red; fix them in the Sheet
                or add them by hand)
              </>
            )}
            .
          </p>
          <div className="mt-3 max-h-[28rem] overflow-auto border-2 border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  {["Line", "Name", "USN", "Branch", "Sem", "First choice", "Day", "Problems"].map(
                    (h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const stop = blocking(r).length > 0;
                  return (
                    <tr key={r.line} className={stop ? "bg-destructive/10" : ""}>
                      <td className={td}>{r.line}</td>
                      <td className={td}>{r.name}</td>
                      <td className={`${td} font-mono`}>{r.usn}</td>
                      <td className={td}>{r.branch}</td>
                      <td className={td}>{r.sem}</td>
                      <td className={td}>{r.first}</td>
                      <td className={td}>{r.day ?? "?"}</td>
                      <td
                        className={`${td} ${stop ? "font-bold text-destructive" : "text-muted-foreground"}`}
                      >
                        {r.problems.join("; ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className={`${primary} mt-4`}
            disabled={busy || !good.length}
            onClick={() => void add()}
          >
            {busy ? "Adding…" : `Add ${good.length} student${good.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </Window>
  );
}

const blank = {
  usn: "",
  name: "",
  email: "",
  phone: "",
  branch: "",
  sem: "1",
  first: "",
  second: "",
  day: "",
  wildcard: true,
};

function StudentForm({
  call,
  editing,
  onDone,
}: {
  call: Call;
  editing: Candidate | null;
  onDone: () => Promise<void>;
}) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          usn: editing.usn,
          name: editing.name,
          email: editing.email,
          phone: editing.phone,
          branch: editing.branch,
          sem: String(editing.sem),
          first: editing.first,
          second: editing.second ?? "",
          day: editing.day ?? "",
          wildcard: editing.wildcard,
        }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const body = {
      ...form,
      sem: Number(form.sem),
      second: form.second || null,
      day: form.day || null,
    };
    try {
      if (editing)
        await call(`candidate?id=${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await call("add", { method: "POST", body: JSON.stringify({ rows: [body] }) });
      setNote({ kind: "ok", text: editing ? `Saved ${form.name}.` : `Added ${form.name}.` });
      if (!editing) setForm(blank);
      await onDone();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message.replace(/^Row 1: /, "") });
    } finally {
      setBusy(false);
    }
  };

  const id = (k: string) => `student-${k}`;
  return (
    <div id="student-form">
      <Window
        tag={editing ? "2. EDIT STUDENT" : "2. ADD ONE STUDENT"}
        title={editing ? `Edit ${editing.name}` : "Add a wildcard entry"}
      >
        <p className="mt-1 text-sm text-muted-foreground">
          {editing
            ? "To move a student to their second choice squad, change their first choice here. Marks already given stay with them."
            : "For anyone who did not fill in the form. They are marked as a wildcard."}
        </p>
        <form onSubmit={(e) => void save(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="font-bold">Full name</span>
            <input
              id={id("name")}
              required
              className={input}
              value={form.name}
              onChange={set("name")}
            />
          </label>
          <label>
            <span className="font-bold">USN</span>
            <input
              id={id("usn")}
              required
              className={`${input} font-mono uppercase`}
              value={form.usn}
              onChange={set("usn")}
            />
          </label>
          <label>
            <span className="font-bold">Branch</span>
            <select
              id={id("branch")}
              required
              className={input}
              value={form.branch}
              onChange={set("branch")}
            >
              <option value="">Pick one</option>
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-bold">Semester</span>
            <select id={id("sem")} className={input} value={form.sem} onChange={set("sem")}>
              <option value="1">1st</option>
              <option value="3">3rd</option>
            </select>
          </label>
          <label>
            <span className="font-bold">First choice squad</span>
            <select
              id={id("first")}
              required
              className={input}
              value={form.first}
              onChange={set("first")}
            >
              <option value="">Pick one</option>
              {SQUADS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-bold">Second choice (optional)</span>
            <select
              id={id("second")}
              className={input}
              value={form.second}
              onChange={set("second")}
            >
              <option value="">None</option>
              {SQUADS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-bold">Interview day</span>
            <select id={id("day")} className={input} value={form.day} onChange={set("day")}>
              <option value="">Not decided</option>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-bold">WhatsApp number (optional)</span>
            <input
              id={id("phone")}
              inputMode="tel"
              className={input}
              value={form.phone}
              onChange={set("phone")}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="font-bold">Email (optional)</span>
            <input
              id={id("email")}
              type="email"
              className={input}
              value={form.email}
              onChange={set("email")}
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button className={primary} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add student"}
            </button>
            {editing && (
              <button type="button" className={plain} onClick={() => void onDone()}>
                Cancel
              </button>
            )}
          </div>
        </form>
        <NoteBox note={note} />
      </Window>
    </div>
  );
}

function Counts({ candidates }: { candidates: Candidate[] }) {
  const count = (s: Squad, d: string | null) =>
    candidates.filter((c) => c.first === s && c.day === d).length;
  return (
    <Window tag="3. NUMBERS" title="Students per squad and day">
      <p className="mt-1 text-sm text-muted-foreground">
        A panel sees about 16 to 20 students in one hour. Above 20 on a day, split that squad into
        two panels or make groups of 5.
      </p>
      <div className="mt-4 overflow-x-auto border-2 border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr>
              <th className={th}>Squad</th>
              <th className={th}>Room</th>
              {DAYS.map((d) => (
                <th key={d} className={th}>
                  {d}
                </th>
              ))}
              <th className={th}>No day</th>
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {SQUADS.map((s) => (
              <tr key={s}>
                <td className={`${td} font-bold`}>{s}</td>
                <td className={td}>{ROOMS[s]}</td>
                {DAYS.map((d) => {
                  const n = count(s, d);
                  return (
                    <td
                      key={d}
                      className={`${td} tabular-nums ${n > 20 ? "font-bold text-destructive" : ""}`}
                    >
                      {n}
                    </td>
                  );
                })}
                <td className={`${td} tabular-nums`}>{count(s, null)}</td>
                <td className={`${td} tabular-nums font-bold`}>
                  {candidates.filter((c) => c.first === s).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Window>
  );
}

function Results({
  results,
  candidates,
  call,
  onChange,
}: {
  results: ReturnType<typeof summarize>;
  candidates: Candidate[];
  call: Call;
  onChange: () => Promise<void>;
}) {
  const [squad, setSquad] = useState<Squad>(SQUADS[0]);
  const [note, setNote] = useState<Note>(null);
  const core = coreCount(candidates);
  const ranked = rankSquad(results, squad);

  const setStatus = async (id: number, status: Status) => {
    setNote(null);
    try {
      await call(`status?id=${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      await onChange();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    }
  };

  return (
    <Window tag="4. RESULTS" title="Results by squad">
      <p
        className={`mt-2 inline-block border-2 px-3 py-1 font-pixel text-xs ${core > CORE_CAP ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-secondary"}`}
        aria-live="polite"
      >
        CORE: {core} OF {CORE_CAP}
      </p>
      <div role="tablist" aria-label="Squad" className="mt-4 flex flex-wrap gap-2">
        {SQUADS.map((s) => (
          <button
            key={s}
            role="tab"
            type="button"
            aria-selected={s === squad}
            className={`${plain} ${s === squad ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setSquad(s)}
          >
            {s} ({results.filter((r) => r.candidate.first === s).length})
          </button>
        ))}
      </div>
      <NoteBox note={note} />
      <p className="mt-3 text-sm text-muted-foreground">
        Sorted by average out of 100. Ties: squad skill, then commitment. Criteria columns are
        averages from 1 to 5: {CRITERIA.map((c) => `${c.title.charAt(0)} = ${c.title}`).join(", ")}.
      </p>
      <div className="mt-3 overflow-x-auto border-2 border-border">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr>
              {[
                "#",
                "Name",
                "Branch",
                "Sem",
                "Day",
                "Average",
                "Judges",
                ...CRITERIA.map((c) => c.title.charAt(0)),
                "Notes",
                "Status",
              ].map((h, i) => (
                <th key={`${h}${i}`} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.length === 0 && (
              <tr>
                <td className={td} colSpan={14}>
                  No students in this squad yet.
                </td>
              </tr>
            )}
            {ranked.map((r, i) => {
              const c = r.candidate;
              return (
                <tr key={c.id} className={c.status === "core" ? "bg-secondary" : ""}>
                  <td className={`${td} tabular-nums`}>{i + 1}</td>
                  <td className={td}>
                    <b>{c.name}</b>
                    <span className="block font-mono text-xs text-muted-foreground">{c.usn}</span>
                    {c.wildcard && (
                      <span className="font-pixel text-[10px] text-primary">WILDCARD</span>
                    )}
                  </td>
                  <td className={td}>{c.branch}</td>
                  <td className={td}>{c.sem}</td>
                  <td className={td}>{c.day ?? "?"}</td>
                  <td className={`${td} text-lg font-bold tabular-nums`}>
                    {r.judges ? r.average : "-"}
                  </td>
                  <td
                    className={`${td} tabular-nums ${r.fewJudges ? "font-bold text-destructive" : ""}`}
                  >
                    {r.judges}
                    {r.fewJudges && <span className="block text-xs">needs 2</span>}
                  </td>
                  {CRITERIA.map((k) => (
                    <td key={k.key} className={`${td} tabular-nums`}>
                      {r.judges ? r.byCriterion[k.key] : "-"}
                    </td>
                  ))}
                  <td className={`${td} max-w-[16rem] text-xs`}>
                    {r.notes.map((n) => (
                      <p key={n.judge}>
                        <b>{n.judge}:</b> {n.note}
                      </p>
                    ))}
                  </td>
                  <td className={td}>
                    <select
                      id={`status-${c.id}`}
                      aria-label={`Status for ${c.name}`}
                      className="border-2 border-border bg-background px-2 py-1"
                      value={c.status}
                      onChange={(e) => void setStatus(c.id, e.target.value as Status)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {c.second && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        2nd: {c.second}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Window>
  );
}

function AllStudents({
  candidates,
  results,
  call,
  onEdit,
  onChange,
}: {
  candidates: Candidate[];
  results: ReturnType<typeof summarize>;
  call: Call;
  onEdit: (c: Candidate) => void;
  onChange: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [sure, setSure] = useState<number | null>(null);
  const [note, setNote] = useState<Note>(null);
  const judges = new Map(results.map((r) => [r.candidate.id, r.judges]));
  const needle = q.trim().toLowerCase();
  const shown = candidates.filter(
    (c) => !needle || c.name.toLowerCase().includes(needle) || c.usn.toLowerCase().includes(needle),
  );

  const remove = async (c: Candidate) => {
    setNote(null);
    try {
      await call(`candidate?id=${c.id}`, { method: "DELETE" });
      setSure(null);
      setNote({ kind: "ok", text: `Removed ${c.name} and their marks.` });
      await onChange();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    }
  };

  return (
    <Window tag="5. EVERY STUDENT" title="Find, edit or remove a student">
      <label className="mt-3 block max-w-sm">
        <span className="font-bold">Search by name or USN</span>
        <input
          id="student-search"
          className={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <NoteBox note={note} />
      <div className="mt-3 max-h-[32rem] overflow-auto border-2 border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              {["Name", "USN", "Branch", "Sem", "First choice", "Day", "WhatsApp", "Marks", ""].map(
                (h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id}>
                <td className={td}>
                  {c.name}
                  {c.wildcard && (
                    <span className="ml-1 font-pixel text-[10px] text-primary">WILDCARD</span>
                  )}
                </td>
                <td className={`${td} font-mono`}>{c.usn}</td>
                <td className={td}>{c.branch}</td>
                <td className={td}>{c.sem}</td>
                <td className={td}>{c.first}</td>
                <td className={td}>{c.day ?? "?"}</td>
                <td className={`${td} font-mono`}>{c.phone}</td>
                <td className={`${td} tabular-nums`}>{judges.get(c.id) ?? 0}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <button type="button" className={plain} onClick={() => onEdit(c)}>
                    Edit
                  </button>{" "}
                  {sure === c.id ? (
                    <button
                      type="button"
                      className={`${plain} border-destructive text-destructive`}
                      onClick={() => void remove(c)}
                    >
                      Yes, remove
                    </button>
                  ) : (
                    <button type="button" className={plain} onClick={() => setSure(c.id)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Window>
  );
}

function Finish({
  results,
  locked,
  call,
  onChange,
}: {
  results: ReturnType<typeof summarize>;
  locked: boolean;
  call: Call;
  onChange: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setNote({ kind: "ok", text: done });
      await onChange();
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const blob = new Blob([resultsCsv(results)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "robio-recruitment-results.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Window tag="6. WHEN YOU ARE DONE" title="Lock, export and clean up">
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className={plain}
          disabled={busy}
          onClick={() =>
            void run(
              () => call("lock", { method: "PUT", body: JSON.stringify({ locked: !locked }) }),
              locked
                ? "Marking is open again."
                : "Marking is locked. Judges can no longer change marks.",
            )
          }
        >
          {locked ? "Open marking again" : "Lock marking"}
        </button>
        <button type="button" className={plain} onClick={download}>
          Download results (.csv)
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Marking is {locked ? <b>locked</b> : <b>open</b>}. The results file lists every squad,
        ranked, with each student's status and the judges' notes.
      </p>
      <div className="mt-6 border-2 border-destructive p-4">
        <p className="font-bold">Delete all recruitment data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The form promised students their details are deleted after recruitment. Download the
          results first. This removes every student and every mark, and cannot be undone.
        </p>
        <label className="mt-3 block max-w-xs">
          <span className="text-sm font-bold">Type DELETE to confirm</span>
          <input
            id="delete-confirm"
            className={input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${plain} mt-3 border-destructive text-destructive`}
          disabled={busy || confirm !== "DELETE"}
          onClick={() =>
            void run(async () => {
              await call("all", { method: "DELETE", body: JSON.stringify({ confirm }) });
              setConfirm("");
            }, "All recruitment data is deleted.")
          }
        >
          Delete everything
        </button>
      </div>
      <NoteBox note={note} />
    </Window>
  );
}
