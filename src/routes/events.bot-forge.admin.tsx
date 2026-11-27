import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { botForgeApi, PAY_LABEL, teamsSheet, type PayStatus, type Team } from "@/lib/bot-forge";
import { xlsxFile } from "@/lib/xlsx";
import { botForgeInfo, contestBySlug, type ContestSlug } from "@/lib/site";

export const Route = createFileRoute("/events/bot-forge/admin")({
  head: () => ({
    meta: [{ title: "Bot Forge admin | RO-BIO" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

const KEY = "robio-botforge-admin";
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

const input = "mt-1 block w-full border-2 border-border bg-background px-3 py-2";
const primary =
  "border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard disabled:opacity-60";
const plain = "border-2 border-border bg-card px-3 py-1.5 text-sm font-bold disabled:opacity-60";
const th =
  "border-b-2 border-border bg-secondary px-2 py-1.5 text-left font-pixel text-[10px] tracking-wider";
const td = "border-b border-input px-2 py-1.5 align-top";

type Note = { kind: "ok" | "err"; text: string } | null;
type List = { teams: Team[]; kits: Record<string, number>; paused: boolean; reason: string };

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const p = String(new FormData(e.currentTarget).get("passcode") ?? "").trim();
    if (!p) return setError("Type the passcode.");
    setBusy(true);
    setError("");
    try {
      await botForgeApi("admin/check", {}, p);
      onIn(p);
    } catch (err) {
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <p className="font-pixel text-xs text-primary">BOT FORGE / ADMIN ONLY</p>
      <h1 className="mt-3 text-4xl font-black">Bot Forge admin</h1>
      <p className="mt-3 text-muted-foreground">
        Enter the admin passcode. It stays in this tab only, until you close it.
      </p>
      <form
        onSubmit={(e) => void submit(e)}
        className="mt-8 space-y-5 border-2 border-border bg-card p-5 shadow-hard"
      >
        <label className="block">
          <span className="font-bold">Passcode</span>
          <input
            name="passcode"
            type="password"
            autoComplete="current-password"
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="font-bold text-destructive">
            {error}
          </p>
        )}
        <button type="submit" className={primary} disabled={busy}>
          {busy ? "Checking..." : "Open"}
        </button>
      </form>
    </section>
  );
}

function download(name: string, data: Uint8Array<ArrayBuffer>) {
  const url = URL.createObjectURL(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Admin({ pass, onOut }: { pass: string; onOut: () => void }) {
  const [list, setList] = useState<List | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [show, setShow] = useState<ContestSlug | "all">("all");
  const [find, setFind] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    <T,>(path: string, init: RequestInit = {}) => botForgeApi<T>(path, init, pass),
    [pass],
  );
  const load = useCallback(async () => {
    try {
      setList(await call<List>("admin/list"));
    } catch (err) {
      const m = (err as Error).message;
      if (/passcode/i.test(m)) onOut();
      setNote({ kind: "err", text: m });
    }
  }, [call, onOut]);
  useEffect(() => void load(), [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      await load();
      setNote({ kind: "ok", text: ok });
    } catch (err) {
      setNote({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const teams = useMemo(() => {
    const q = find.trim().toLowerCase();
    return (list?.teams ?? []).filter(
      (t) =>
        (show === "all" || t.contest === show) &&
        (!q ||
          [t.code, t.name, t.phone, t.email, t.utr, ...t.members.flatMap((m) => [m.name, m.usn])]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [list, show, find]);

  if (!list)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <p className="font-pixel text-sm text-primary">LOADING…</p>
        {note && <p className="mt-4 font-bold text-destructive">{note.text}</p>}
      </div>
    );
  const all = list.teams;
  const count = (f: (t: Team) => boolean) => all.filter(f).length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-pixel text-xs text-primary">BOT FORGE / ADMIN</p>
          <h1 className="mt-2 text-4xl font-black">Teams</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={plain} onClick={() => void load()}>
            Reload
          </button>
          <button type="button" className={plain} onClick={onOut}>
            Lock this tab
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {botForgeInfo.contests.map((c) => (
          <div key={c.slug} className="border-2 border-border bg-card p-4 shadow-hard">
            <p className="font-pixel text-[10px] text-primary">{c.title.toUpperCase()}</p>
            <p className="mt-1 text-3xl font-black">{count((t) => t.contest === c.slug)}</p>
            <p className="text-sm">
              teams, {count((t) => t.contest === c.slug && t.pay === "paid")} paid
              {c.kits > 0 && `, ${list.kits[c.slug] ?? 0} of ${c.kits} kits left`}
            </p>
          </div>
        ))}
        <div className="border-2 border-border bg-card p-4 shadow-hard">
          <p className="font-pixel text-[10px] text-primary">REGISTRATION</p>
          <p className="mt-1 font-bold">
            {list.reason ? list.reason : "Open: the form is taking teams."}
          </p>
          <button
            type="button"
            className={`${plain} mt-2`}
            disabled={busy}
            onClick={() =>
              void act(
                () =>
                  call("admin/signups", {
                    method: "PUT",
                    body: JSON.stringify({ paused: !list.paused }),
                  }),
                list.paused ? "Registration resumed." : "Registration paused.",
              )
            }
          >
            {list.paused ? "Resume registration" : "Pause registration"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-sm font-bold">Contest</span>
          <select
            className={input}
            value={show}
            onChange={(e) => setShow(e.target.value as ContestSlug | "all")}
          >
            <option value="all">All events</option>
            {botForgeInfo.contests.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[14rem] flex-1">
          <span className="text-sm font-bold">Find</span>
          <input
            className={input}
            placeholder="Team, name, USN, phone or UTR"
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={primary}
          disabled={!all.length}
          onClick={() =>
            download(
              "bot-forge-teams.xlsx",
              xlsxFile(
                teamsSheet(all),
                "Bot Forge teams",
                [12, 12, 22, 26, 16, 34, 14, 28, 9, 15, 24, 20],
              ),
            )
          }
        >
          Download Excel
        </button>
        <button
          type="button"
          className={plain}
          disabled={!all.length}
          onClick={() => {
            void navigator.clipboard
              ?.writeText([...new Set(all.map((t) => t.email))].join(", "))
              .then(() => setNote({ kind: "ok", text: "Leaders' emails copied." }));
          }}
        >
          Copy leaders' emails
        </button>
      </div>

      {note && (
        <p
          role={note.kind === "err" ? "alert" : "status"}
          className={`mt-4 border-2 p-3 text-sm font-bold ${note.kind === "err" ? "border-destructive bg-destructive/10" : "border-border bg-secondary"}`}
        >
          {note.text}
        </p>
      )}

      <div className="mt-6 overflow-x-auto border-2 border-border bg-card">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr>
              {["TEAM", "MEMBERS", "LEADER", "KIT", "PAYMENT", ""].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const c = contestBySlug(t.contest);
              return (
                <tr key={t.id}>
                  <td className={td}>
                    <b className="font-mono">{t.code}</b>
                    <span className="block font-bold">{t.name}</span>
                    <span className="block text-muted-foreground">{c?.title}</span>
                  </td>
                  <td className={td}>
                    <ol className="list-decimal pl-4">
                      {t.members.map((m) => (
                        <li key={m.name + m.usn}>
                          {m.name}{" "}
                          <span className="font-mono text-muted-foreground">
                            {m.usn || "no USN yet"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {m.branch}, sem {m.sem}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td className={td}>
                    <a href={`tel:+91${t.phone}`} className="font-mono underline">
                      {t.phone}
                    </a>
                    <span className="block break-all">{t.email}</span>
                  </td>
                  <td className={td}>
                    {c?.kits ? (
                      <button
                        type="button"
                        className={plain}
                        disabled={busy}
                        onClick={() =>
                          void act(
                            () =>
                              call(`admin/kit?id=${t.id}`, {
                                method: "PUT",
                                body: JSON.stringify({ on: !t.kit }),
                              }),
                            t.kit ? `Kit taken back from ${t.code}.` : `Kit given to ${t.code}.`,
                          )
                        }
                      >
                        {t.kit ? "Has a kit: take back" : "No kit: give one"}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">None needed</span>
                    )}
                  </td>
                  <td className={td}>
                    <span className="block font-mono">{t.utr || "no UTR yet"}</span>
                    <select
                      className="mt-1 border-2 border-border bg-background px-2 py-1"
                      value={t.pay}
                      disabled={busy}
                      aria-label={`Payment for ${t.code}`}
                      onChange={(e) =>
                        void act(
                          () =>
                            call(`admin/pay?id=${t.id}`, {
                              method: "PUT",
                              body: JSON.stringify({ pay: e.target.value as PayStatus }),
                            }),
                          `${t.code}: ${PAY_LABEL[e.target.value as PayStatus]}.`,
                        )
                      }
                    >
                      {(Object.keys(PAY_LABEL) as PayStatus[]).map((p) => (
                        <option key={p} value={p}>
                          {PAY_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      className={`${plain} text-destructive`}
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Delete ${t.code} (${t.name})? This cannot be undone.`))
                          return;
                        void act(
                          () => call(`admin/team?id=${t.id}`, { method: "DELETE" }),
                          `${t.code} deleted.`,
                        );
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!teams.length && (
              <tr>
                <td className={td} colSpan={6}>
                  {all.length ? "No team matches." : "No teams yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="mt-10 border-2 border-dashed border-destructive p-4">
        <summary className="cursor-pointer font-bold text-destructive">
          After Bot Forge: delete every team
        </summary>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const confirm = String(new FormData(e.currentTarget).get("confirm") ?? "");
            void act(
              () => call("admin/all", { method: "DELETE", body: JSON.stringify({ confirm }) }),
              "Every team deleted.",
            );
          }}
        >
          <label className="block">
            <span className="text-sm">Download the Excel file first. Then type DELETE:</span>
            <input name="confirm" className={input} autoComplete="off" />
          </label>
          <button type="submit" className={`${plain} text-destructive`} disabled={busy}>
            Delete everything
          </button>
        </form>
      </details>
    </section>
  );
}
