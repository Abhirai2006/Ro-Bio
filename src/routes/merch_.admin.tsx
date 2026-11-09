import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { merch } from "@/lib/site";
import {
  NUMBER_STYLES,
  colour,
  likeKey,
  merchApi,
  pieceLikes,
  product,
  styleKey,
  type ColourId,
  type Tally,
} from "@/lib/merch";
import { Window } from "@/components/site/parts";

export const Route = createFileRoute("/merch_/admin")({
  head: () => ({
    meta: [{ title: "Merch feedback | RO-BIO" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

type Note = { id: number; kind: string; colour: string; name: string; text: string; at: number };
type List = Tally & { voters: number; notes: Note[] };

const KEY = "robio-merch-admin";
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

const when = (at: number) =>
  new Date(at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

function AdminPage() {
  const [pass, setPass] = useState("");
  const [typed, setTyped] = useState("");
  const [data, setData] = useState<List | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const call = useCallback(
    <T,>(path: string, init: RequestInit = {}, p = pass) =>
      merchApi<T>(`admin/${path}`, { ...init, headers: { "x-admin-passcode": p } }),
    [pass],
  );
  const load = useCallback(
    async (p = pass) => {
      setError("");
      try {
        setData(await call<List>("list", {}, p));
        setPass(p);
        savePass(p);
      } catch (e) {
        setError((e as Error).message);
        if (!data) savePass("");
      }
    },
    [call, data, pass],
  );
  useEffect(() => {
    const p = readPass();
    if (p) void load(p);
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data)
    return (
      <section className="mx-auto max-w-md px-4 py-16">
        <Window tag="MERCH / ADMIN" title="Merch likes and notes">
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load(typed.trim());
            }}
          >
            <label className="flex flex-col gap-1 text-sm font-bold">
              Admin passcode
              <input
                type="password"
                autoComplete="current-password"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="border-2 border-border bg-background px-2.5 py-2 font-normal"
              />
            </label>
            <button
              type="submit"
              className="border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground"
            >
              Open
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </Window>
      </section>
    );

  const notes = data.notes.filter((n) => filter === "all" || n.kind === filter);
  const total = Object.entries(data.counts)
    .filter(([k]) => !k.startsWith("number:"))
    .reduce((a, [, b]) => a + b, 0);
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-pixel text-xs text-primary">MERCH / ADMIN</p>
          <h1 className="mt-2 text-3xl font-black">What members think</h1>
          <p className="mt-1 text-muted-foreground">
            {total} likes from {data.voters} browsers, {data.notes.length} notes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="border-2 border-border px-3 py-1.5 text-sm font-bold"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              savePass("");
              setPass("");
              setData(null);
            }}
            className="border-2 border-border px-3 py-1.5 text-sm font-bold"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto border-2 border-border shadow-hard">
        <table className="w-full min-w-[520px] border-collapse bg-card text-sm">
          <thead className="bg-secondary">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-pixel text-[10px] font-normal">
                PIECE
              </th>
              {merch.colours.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className="px-3 py-2 text-right font-pixel text-[10px] font-normal"
                >
                  {c.name.toUpperCase()}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-pixel text-[10px] font-normal">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {merch.products.map((p) => (
              <tr key={p.kind} className="border-t border-border/30">
                <th scope="row" className="px-3 py-2 text-left font-bold">
                  {p.name}
                </th>
                {merch.colours.map((c) => (
                  <td key={c.id} className="px-3 py-2 text-right font-mono">
                    {data.counts[likeKey(p.kind, c.id)] ?? 0}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono font-bold">
                  {pieceLikes(data, p.kind)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-black">Sleeve number styles</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {NUMBER_STYLES.map((st) => (
          <li
            key={st.id}
            className="flex items-center justify-between border-2 border-border bg-card px-3 py-2"
          >
            <span className="font-bold">{st.name}</span>
            <span className="font-mono">{data.counts[styleKey(st.id)] ?? 0} votes</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black">Notes</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Show notes about"
          className="border-2 border-border bg-background px-2 py-1 text-sm"
        >
          <option value="all">All pieces</option>
          {merch.products.map((p) => (
            <option key={p.kind} value={p.kind}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {notes.length === 0 ? (
        <p className="mt-3 text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {notes.map((n) => (
            <li key={n.id} className="border-2 border-border bg-card p-3">
              <p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  {colour(n.colour as ColourId)?.name ?? n.colour}{" "}
                  {merch.products.some((p) => p.kind === n.kind)
                    ? product(n.kind as never).name
                    : n.kind}
                </span>
                <span>{when(n.at)}</span>
              </p>
              {/* plain text only: React escapes it, nothing a member types can run as code */}
              <p className="mt-2 whitespace-pre-wrap text-sm">{n.text}</p>
              <p className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{n.name || "No name"}</span>
                <button
                  type="button"
                  className="font-bold text-destructive underline underline-offset-2"
                  onClick={async () => {
                    if (!confirm("Delete this note?")) return;
                    try {
                      await call(`note?id=${n.id}`, { method: "DELETE" });
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Delete
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 border-2 border-dashed border-destructive p-4">
        <p className="font-bold">When the merch is decided</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Removes every like and every note. Type DELETE when asked. This cannot be undone.
        </p>
        <button
          type="button"
          className="mt-3 border-2 border-destructive px-3 py-1.5 text-sm font-bold text-destructive"
          onClick={async () => {
            const typedConfirm = prompt("Type DELETE to remove every like and note.");
            if (typedConfirm !== "DELETE") return;
            try {
              await call("all", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) });
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Delete all likes and notes
        </button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}
