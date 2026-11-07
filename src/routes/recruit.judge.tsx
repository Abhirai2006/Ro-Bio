import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanName } from "@/lib/judging";
import {
  CRITERIA,
  DAYS,
  ROOMS,
  SQUAD_SKILL,
  SQUADS,
  recruitApi,
  weightedTotal,
  type JudgeSquad,
  type JudgeView,
  type Sheet,
} from "@/lib/recruit";

export const Route = createFileRoute("/recruit/judge")({
  head: () => ({
    meta: [
      { title: "Recruitment judging | RO-BIO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: JudgePage,
});

const GROUP_MAX = 4;
const LOGIN_KEY = "robio-recruit-judge";
const DRAFT_KEY = "robio-recruit-drafts";

type Login = { passcode: string; name: string; squad: JudgeSquad };
type Draft = { marks: (number | null)[]; note: string };

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: marks still save to the server */
  }
}

const primary =
  "border-2 border-border bg-primary px-4 py-3 font-bold text-primary-foreground shadow-hard disabled:opacity-60";
const plain = "border-2 border-border bg-card px-3 py-2 text-sm font-bold disabled:opacity-60";
const input = "mt-1 block w-full border-2 border-border bg-background px-3 py-3 text-lg";

function JudgePage() {
  const [login, setLogin] = useState<Login | null | undefined>(undefined);
  useEffect(() => {
    const l = readJson<Login | null>(LOGIN_KEY, null);
    setLogin(l && l.passcode && l.name && l.squad ? l : null);
  }, []);
  if (login === undefined)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 font-pixel text-sm text-primary">LOADING…</div>
    );
  if (!login)
    return (
      <Gate
        onIn={(l) => {
          writeJson(LOGIN_KEY, l);
          setLogin(l);
        }}
      />
    );
  return (
    <Judging
      login={login}
      onOut={() => {
        writeJson(LOGIN_KEY, null);
        setLogin(null);
      }}
    />
  );
}

function Gate({ onIn }: { onIn: (l: Login) => void }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setReady(true), []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const passcode = String(f.get("passcode") ?? "").trim();
    const name = cleanName(f.get("name"));
    const squad = String(f.get("squad") ?? "") as JudgeSquad;
    if (!passcode || !name || !squad) return setError("Fill in all three.");
    setBusy(true);
    setError("");
    try {
      await recruitApi("judge", passcode, "check");
      onIn({ passcode, name, squad });
    } catch (err) {
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <p className="font-pixel text-xs text-primary">CORE RECRUITMENT / JUDGES</p>
      <h1 className="mt-3 text-4xl font-black">Judge sign in</h1>
      <p className="mt-3 text-muted-foreground">
        Type your name the same way on both days, so your marks stay together.
      </p>
      <form
        onSubmit={(e) => void submit(e)}
        className="mt-6 space-y-5 border-2 border-border bg-card p-5 shadow-hard"
      >
        <label className="block">
          <span className="font-bold">Judge passcode</span>
          <input
            id="judge-passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            required
            className={input}
          />
        </label>
        <label className="block">
          <span className="font-bold">Your name</span>
          <input
            id="judge-name"
            name="name"
            autoComplete="name"
            required
            maxLength={40}
            className={input}
          />
        </label>
        <label className="block">
          <span className="font-bold">Your squad</span>
          <select id="judge-squad" name="squad" required defaultValue="" className={input}>
            <option value="" disabled>
              Pick one
            </option>
            {SQUADS.map((s) => (
              <option key={s} value={s}>
                {s} (room {ROOMS[s]})
              </option>
            ))}
            <option value="Teacher">Teacher (all squads)</option>
          </select>
        </label>
        {error && (
          <p
            role="alert"
            className="border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold"
          >
            {error}
          </p>
        )}
        <button disabled={!ready || busy} className={`${primary} w-full text-lg`}>
          {busy ? "Checking…" : "Start judging"}
        </button>
      </form>
    </section>
  );
}

function Judging({ login, onOut }: { login: Login; onOut: () => void }) {
  const [students, setStudents] = useState<JudgeView[]>([]);
  const [mine, setMine] = useState<Sheet[]>([]);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [day, setDay] = useState<string>(() => (new Date().getDate() === 12 ? DAYS[1] : DAYS[0]));
  const [squadFilter, setSquadFilter] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [marking, setMarking] = useState(false);
  const teacher = login.squad === "Teacher";

  const load = useCallback(async () => {
    try {
      const r = await recruitApi<{ candidates: JudgeView[]; mine: Sheet[]; locked: boolean }>(
        "judge",
        login.passcode,
        `candidates?squad=${encodeURIComponent(login.squad)}&judge=${encodeURIComponent(login.name)}`,
      );
      setStudents(r.candidates);
      setMine(r.mine);
      setLocked(r.locked);
      setLoaded(true);
      setError("");
    } catch (err) {
      if (/passcode/i.test((err as Error).message)) onOut();
      setError((err as Error).message);
    }
  }, [login, onOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = useMemo(() => new Map(mine.map((s) => [s.candidateId, s])), [mine]);
  const needle = q.trim().toLowerCase();
  const shown = students
    .filter((s) => !day || s.day === day || (day === "none" && !s.day))
    .filter((s) => !squadFilter || s.first === squadFilter)
    .filter(
      (s) =>
        !needle || s.name.toLowerCase().includes(needle) || s.usn.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const group = picked
    .map((id) => students.find((s) => s.id === id))
    .filter((s): s is JudgeView => !!s);

  const toggle = (id: number) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < GROUP_MAX ? [...p, id] : p,
    );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-pixel text-xs text-primary">CORE RECRUITMENT / JUDGING</p>
        <p className="text-sm">
          <b>{login.name}</b>,{" "}
          {teacher
            ? "Teacher (all squads)"
            : `${login.squad} squad, room ${ROOMS[login.squad as keyof typeof ROOMS]}`}
          .{" "}
          <button type="button" className="text-primary underline" onClick={onOut}>
            Change
          </button>
        </p>
      </div>
      {locked && (
        <p
          role="status"
          className="mt-4 border-2 border-destructive bg-destructive/10 p-3 font-bold"
        >
          Marking is locked by the admin. You can see your marks but not change them.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold"
        >
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {!marking ? (
        <>
          <h1 className="mt-3 text-3xl font-black">Who is in front of you?</h1>
          <p className="mt-2 text-muted-foreground">
            Tick up to {GROUP_MAX} students, then mark them. {mine.length} marked by you so far.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Interview day">
            {[...DAYS, ""].map((d) => (
              <button
                key={d || "all"}
                type="button"
                aria-pressed={day === d}
                className={`${plain} ${day === d ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setDay(d)}
              >
                {d || "All days"}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-bold">Search name or USN</span>
              <input
                id="judge-search"
                className="mt-1 block w-full border-2 border-border bg-background px-3 py-2"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {teacher && (
              <label className="block">
                <span className="font-bold">Squad</span>
                <select
                  id="judge-squad-filter"
                  className="mt-1 block w-full border-2 border-border bg-background px-3 py-2"
                  value={squadFilter}
                  onChange={(e) => setSquadFilter(e.target.value)}
                >
                  <option value="">All squads</option>
                  {SQUADS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <ul className="mt-4 grid gap-2">
            {!loaded && <li className="font-pixel text-sm text-primary">LOADING…</li>}
            {loaded && shown.length === 0 && (
              <li className="border-2 border-border bg-card p-3 text-muted-foreground">
                No students here. Try another day or clear the search.
              </li>
            )}
            {shown.map((s) => {
              const on = picked.includes(s.id);
              const mark = done.get(s.id);
              return (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 border-2 p-3 ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <input
                      id={`pick-${s.id}`}
                      type="checkbox"
                      className="h-6 w-6 shrink-0 accent-[var(--primary)]"
                      checked={on}
                      disabled={!on && picked.length >= GROUP_MAX}
                      onChange={() => toggle(s.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <b className="block">{s.name}</b>
                      <span className="block text-sm text-muted-foreground">
                        <span className="font-mono">{s.usn}</span>, {s.branch}, sem {s.sem}
                        {teacher ? `, ${s.first}` : ""}
                      </span>
                    </span>
                    {mark && (
                      <span className="shrink-0 border-2 border-border bg-secondary px-2 py-1 font-pixel text-[10px]">
                        ✓ {weightedTotal(mark.marks)}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          <div
            className="sticky bottom-0 mt-4 border-t-2 border-border bg-background py-3"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
          >
            <button
              type="button"
              className={`${primary} w-full`}
              disabled={!picked.length}
              onClick={() => setMarking(true)}
            >
              Mark this group ({picked.length})
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black">Mark the group</h1>
            <button
              type="button"
              className={plain}
              onClick={() => {
                setMarking(false);
                void load();
              }}
            >
              Back to the list
            </button>
          </div>
          {!teacher && (
            <p className="mt-2 text-sm text-muted-foreground">
              Squad skill for {login.squad}: {SQUAD_SKILL[login.squad as keyof typeof SQUAD_SKILL]}.
            </p>
          )}
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {group.map((s) => (
              <MarkCard
                key={s.id}
                student={s}
                login={login}
                saved={done.get(s.id) ?? null}
                locked={locked}
                onSaved={(sheet) =>
                  setMine((m) => [...m.filter((x) => x.candidateId !== sheet.candidateId), sheet])
                }
              />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={primary}
              onClick={() => {
                setPicked([]);
                setMarking(false);
                void load();
              }}
            >
              Next group
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MarkCard({
  student,
  login,
  saved,
  locked,
  onSaved,
}: {
  student: JudgeView;
  login: Login;
  saved: Sheet | null;
  locked: boolean;
  onSaved: (s: Sheet) => void;
}) {
  const draftFor = () =>
    readJson<Record<string, Draft>>(DRAFT_KEY, {})[`${login.name}:${student.id}`];
  const [draft, setDraft] = useState<Draft>(
    () =>
      draftFor() ?? {
        marks: saved ? [...saved.marks] : CRITERIA.map(() => null),
        note: saved?.note ?? "",
      },
  );
  const [help, setHelp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(
    saved ? { kind: "ok", text: "Saved earlier." } : null,
  );

  const keep = (d: Draft) => {
    setDraft(d);
    setStatus(null);
    const all = readJson<Record<string, Draft>>(DRAFT_KEY, {});
    all[`${login.name}:${student.id}`] = d;
    writeJson(DRAFT_KEY, all);
  };
  const complete = draft.marks.every((m) => m !== null);
  const total = complete ? weightedTotal(draft.marks as number[]) : null;

  const save = async () => {
    if (!complete) return;
    setBusy(true);
    try {
      const { sheet } = await recruitApi<{ sheet: Sheet }>("judge", login.passcode, "sheet", {
        method: "PUT",
        body: JSON.stringify({
          candidateId: student.id,
          judge: login.name,
          squad: login.squad,
          marks: draft.marks,
          note: draft.note,
        }),
      });
      const all = readJson<Record<string, Draft>>(DRAFT_KEY, {});
      delete all[`${login.name}:${student.id}`];
      writeJson(DRAFT_KEY, all);
      onSaved(sheet);
      setStatus({ kind: "ok", text: `Saved: ${weightedTotal(sheet.marks)} out of 100.` });
    } catch (err) {
      setStatus({
        kind: "err",
        text: `Not saved: ${(err as Error).message} Your marks are kept on this phone.`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="border-2 border-border bg-card p-4 shadow-hard"
      aria-label={`Marks for ${student.name}`}
    >
      <h2 className="text-xl font-black">{student.name}</h2>
      <p className="text-sm text-muted-foreground">
        <span className="font-mono">{student.usn}</span>, {student.branch}, sem {student.sem}
      </p>
      <div className="mt-4 grid gap-4">
        {CRITERIA.map((c, i) => {
          const key = `${student.id}-${c.key}`;
          return (
            <div key={c.key}>
              <button
                type="button"
                className="text-left font-bold underline decoration-dotted underline-offset-4"
                aria-expanded={help === key}
                aria-controls={`help-${key}`}
                onClick={() => setHelp(help === key ? null : key)}
              >
                {c.title}{" "}
                <span className="font-pixel text-[10px] text-muted-foreground">x{c.weight}</span>
              </button>
              {help === key && (
                <dl
                  id={`help-${key}`}
                  className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 border-l-4 border-primary bg-secondary p-2 text-sm"
                >
                  <dt className="font-bold">1</dt>
                  <dd>{c.low}</dd>
                  <dt className="font-bold">3</dt>
                  <dd>{c.mid}</dd>
                  <dt className="font-bold">5</dt>
                  <dd>{c.high}</dd>
                </dl>
              )}
              <div
                className="mt-2 grid grid-cols-5 gap-2"
                role="group"
                aria-label={`${c.title} for ${student.name}`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={locked}
                    aria-pressed={draft.marks[i] === n}
                    className={`min-h-11 border-2 border-border text-lg font-bold ${draft.marks[i] === n ? "bg-primary text-primary-foreground" : "bg-background"} disabled:opacity-60`}
                    onClick={() =>
                      keep({ ...draft, marks: draft.marks.map((m, j) => (j === i ? n : m)) })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <label className="block">
          <span className="font-bold">Note (optional)</span>
          <textarea
            id={`note-${student.id}`}
            rows={2}
            maxLength={280}
            disabled={locked}
            className="mt-1 block w-full border-2 border-border bg-background px-3 py-2"
            value={draft.note}
            onChange={(e) => keep({ ...draft, note: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={primary}
          disabled={locked || busy || !complete}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <p className="font-pixel text-sm tabular-nums" aria-live="polite">
          {total === null
            ? `${draft.marks.filter((m) => m !== null).length} OF 5 MARKED`
            : `${total} / 100`}
        </p>
      </div>
      {status && (
        <p
          role={status.kind === "err" ? "alert" : "status"}
          className={`mt-3 border-2 p-2 text-sm font-bold ${status.kind === "err" ? "border-destructive bg-destructive/10" : "border-border bg-secondary"}`}
        >
          {status.text}
        </p>
      )}
    </article>
  );
}
