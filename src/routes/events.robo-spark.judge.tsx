import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canonical } from "@/lib/seo";
import { scenePen } from "@/art/scenes";
import {
  commonTicks,
  missionByNumber,
  STAGE_TEAMS,
  STAGE_TEAMS_MAX,
  TEAM_COUNT,
} from "@/lib/robo-spark";
import {
  cleanName,
  judgeApi,
  rankTeams,
  readLogin,
  saveLogin,
  stagePick,
  tieAtCutoff,
  total,
  type JudgeLogin,
  type Score,
} from "@/lib/judging";

type Search = { team?: number };

export const Route = createFileRoute("/events/robo-spark/judge")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const n = Number(s["team"]);
    return Number.isInteger(n) && n >= 1 && n <= TEAM_COUNT ? { team: n } : {};
  },
  head: () => ({
    meta: [
      { title: "Robo Spark judge scoring | RO-BIO" },
      { name: "description", content: "Where Robo Spark judges tick the checklist for each team." },
      { name: "robots", content: "noindex" },
    ],
    links: [canonical("/events/robo-spark/judge")],
  }),
  component: JudgePage,
});

const EMPTY = Array.from({ length: 10 }, () => false);
const QUEUE_KEY = "robo-spark-unsent";
type Pending = Omit<Score, "updatedAt">;

const readQueue = (): Pending[] => {
  try {
    const v = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Pending[]) : [];
  } catch {
    return [];
  }
};
const writeQueue = (q: Pending[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* fine */
  }
};

function JudgePage() {
  const [login, setLogin] = useState<JudgeLogin | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setLogin(readLogin());
    setReady(true);
  }, []);

  if (!ready)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 font-pixel text-sm text-primary">LOADING…</div>
    );
  if (!login)
    return (
      <Gate
        onIn={(l) => {
          saveLogin(l);
          setLogin(l);
        }}
      />
    );
  return (
    <Scoring
      login={login}
      onOut={() => {
        saveLogin(null);
        setLogin(null);
      }}
      onRename={(name) => {
        const l = { ...login, name };
        saveLogin(l);
        setLogin(l);
      }}
    />
  );
}

// Drawn once, with fixed ids, so the server and the browser produce exactly the same picture.
const penArt = scenePen("judge-pen");

function Gate({ onIn }: { onIn: (l: JudgeLogin) => void }) {
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = cleanName(name);
    if (!n) return setError("Type your name, so your scores are kept apart from other judges'.");
    setBusy(true);
    setError("");
    try {
      await judgeApi(passcode.trim(), "check");
      onIn({ passcode: passcode.trim(), name: n });
    } catch (err) {
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <div
        className="mx-auto mb-6 h-56 w-40 [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: penArt }}
      />
      <p className="font-pixel text-xs text-primary">ROBO SPARK / JUDGES ONLY</p>
      <h1 className="mt-3 text-4xl font-black">Judge scoring</h1>
      <p className="mt-3 text-muted-foreground">
        Enter the passcode from the head judge and your name. Read the{" "}
        <Link to="/events/robo-spark/missions" className="font-bold text-primary underline">
          judging guide
        </Link>{" "}
        first if you have not.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 border-2 border-border bg-card p-5 shadow-hard"
      >
        <label className="block">
          <span className="font-bold">Judge passcode</span>
          <input
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            className="mt-1 block w-full border-2 border-border bg-background px-3 py-3 text-lg"
          />
        </label>
        <label className="block">
          <span className="font-bold">Your name</span>
          <input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            placeholder="Like Asha K"
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
          disabled={busy}
          className="w-full border-2 border-border bg-primary px-4 py-3 text-lg font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Checking…" : "Start judging"}
        </button>
      </form>
    </section>
  );
}

function Scoring({
  login,
  onOut,
  onRename,
}: {
  login: JudgeLogin;
  onOut: () => void;
  onRename: (n: string) => void;
}) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<"score" | "rank">("score");
  const [team, setTeam] = useState<number>(search.team ?? 1);
  const [scores, setScores] = useState<Score[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>(EMPTY);
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const sending = useRef(false);

  const me = login.name.toLowerCase();
  const mine = useCallback(
    (t: number) => scores.find((s) => s.team === t && s.judge.toLowerCase() === me),
    [scores, me],
  );
  const mission = missionByNumber(team);

  const refresh = useCallback(async () => {
    try {
      const { scores } = await judgeApi<{ scores: Score[] }>(login.passcode, "scores");
      setScores(scores);
      setLoaded(true);
      setFetchedAt(Date.now());
    } catch (err) {
      const msg = (err as Error).message;
      if (/passcode/i.test(msg)) onOut();
      else setStatus({ kind: "warn", text: `Could not load scores: ${msg}` });
    }
  }, [login.passcode, onOut]);

  // Sends anything saved while the network was down. Runs on load, every 15 seconds and when the phone comes back online.
  const flush = useCallback(async () => {
    if (sending.current) return;
    const q = readQueue();
    if (!q.length) return;
    sending.current = true;
    const left: Pending[] = [];
    for (const item of q) {
      try {
        const { score } = await judgeApi<{ score: Score }>(login.passcode, "scores", {
          method: "PUT",
          body: JSON.stringify(item),
        });
        setScores((all) => [
          ...all.filter(
            (s) => !(s.team === score.team && s.judge.toLowerCase() === score.judge.toLowerCase()),
          ),
          score,
        ]);
      } catch {
        left.push(item);
      }
    }
    writeQueue(left);
    setQueue(left);
    sending.current = false;
    if (!left.length && q.length)
      setStatus({
        kind: "ok",
        text: `Sent ${q.length} saved sheet${q.length > 1 ? "s" : ""} that were waiting for the network.`,
      });
  }, [login.passcode]);

  useEffect(() => {
    setQueue(readQueue());
    void refresh().then(flush);
    const t = window.setInterval(() => {
      void flush();
      void refresh();
    }, 15000);
    const on = () => void flush();
    addEventListener("online", on);
    return () => {
      clearInterval(t);
      removeEventListener("online", on);
    };
  }, [refresh, flush]);

  // Load this judge's sheet whenever the team changes.
  useEffect(() => {
    const waiting = readQueue().find((q) => q.team === team && q.judge.toLowerCase() === me);
    const s = waiting ?? mine(team);
    setTicks(s ? [...s.ticks] : EMPTY);
    setNote(s?.note ?? "");
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, loaded]);

  useEffect(() => {
    if (search.team !== team) void navigate({ search: { team }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const pick = (t: number) => {
    if (
      dirty &&
      !window.confirm(`Team ${team} has changes you have not saved. Leave without saving?`)
    )
      return;
    setTeam(Math.max(1, Math.min(TEAM_COUNT, t)));
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const item: Pending = { team, judge: login.name, ticks, note };
    setStatus({ kind: "warn", text: "Saving…" });
    try {
      const { score } = await judgeApi<{ score: Score }>(login.passcode, "scores", {
        method: "PUT",
        body: JSON.stringify(item),
      });
      setScores((all) => [
        ...all.filter((s) => !(s.team === team && s.judge.toLowerCase() === me)),
        score,
      ]);
      const q = readQueue().filter((x) => !(x.team === team && x.judge.toLowerCase() === me));
      writeQueue(q);
      setQueue(q);
      setDirty(false);
      setStatus({ kind: "ok", text: `Saved team ${team}: ${total(ticks)} out of 10.` });
    } catch (err) {
      const msg = (err as Error).message;
      if (/passcode/i.test(msg)) return setStatus({ kind: "err", text: msg });
      const q = [
        ...readQueue().filter((x) => !(x.team === team && x.judge.toLowerCase() === me)),
        item,
      ];
      writeQueue(q);
      setQueue(q);
      setDirty(false);
      setStatus({
        kind: "warn",
        text: `No network. Team ${team} is kept on this phone and will be sent by itself when the signal is back. Keep this page open.`,
      });
    }
  };

  const waitingHere = queue.some((q) => q.team === team && q.judge.toLowerCase() === me);
  const clear = async () => {
    if ((!mine(team) && !waitingHere) || !window.confirm(`Remove your score for team ${team}?`))
      return;
    // Drop any copy waiting for the network first, so it cannot come back later.
    const q = readQueue().filter((x) => !(x.team === team && x.judge.toLowerCase() === me));
    writeQueue(q);
    setQueue(q);
    try {
      await judgeApi(
        login.passcode,
        `scores?team=${team}&judge=${encodeURIComponent(login.name)}`,
        { method: "DELETE" },
      );
      setScores((all) => all.filter((s) => !(s.team === team && s.judge.toLowerCase() === me)));
      setTicks(EMPTY);
      setNote("");
      setDirty(false);
      setStatus({ kind: "ok", text: `Removed your score for team ${team}.` });
    } catch (err) {
      const msg = (err as Error).message;
      setStatus({
        kind: "err",
        text: /passcode/i.test(msg)
          ? msg
          : `Could not remove team ${team}: no network. Try again when the signal is back.`,
      });
    }
  };

  const toggle = (i: number) => {
    setTicks((t) => t.map((v, k) => (k === i ? !v : v)));
    setDirty(true);
  };

  const scoredByMe = new Set(scores.filter((s) => s.judge.toLowerCase() === me).map((s) => s.team));
  const scoredByAnyone = new Set(scores.map((s) => s.team));
  const labels = [...commonTicks.map((t) => t.tick), ...(mission?.ticks ?? ["", "", "", ""])];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-pixel text-xs text-primary">ROBO SPARK / JUDGE</p>
        <p className="text-sm">
          Judging as <b>{login.name}</b>.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => {
              const n = cleanName(
                window.prompt(
                  "Your name, as other judges should see it. Scores you already saved stay under your old name.",
                  login.name,
                ),
              );
              if (n) onRename(n);
            }}
          >
            Change name
          </button>{" "}
          ·{" "}
          <button type="button" className="text-primary underline" onClick={onOut}>
            Log out
          </button>
        </p>
      </div>

      <div role="tablist" className="mt-4 grid grid-cols-2 border-2 border-border">
        {(["score", "rank"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-lg font-bold ${tab === t ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {t === "score" ? "Score a team" : "Ranking"}
          </button>
        ))}
      </div>

      {queue.length > 0 && (
        <p
          role="status"
          className="mt-4 border-2 border-border bg-yellow-100 p-3 text-sm font-bold text-ink"
        >
          {queue.length} sheet{queue.length > 1 ? "s are" : " is"} waiting for the network (team{" "}
          {queue.map((q) => q.team).join(", ")}). Keep this page open.{" "}
          <button type="button" className="underline" onClick={() => void flush()}>
            Try now
          </button>
        </p>
      )}

      {tab === "score" ? (
        <>
          <div className="mt-6 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => pick(team - 1)}
              disabled={team <= 1}
              aria-label="Previous team"
              className="border-2 border-border bg-card px-4 text-2xl font-black disabled:opacity-40"
            >
              ‹
            </button>
            <label className="flex flex-1 items-center gap-3 border-2 border-border bg-card px-4 py-2">
              <span className="font-pixel text-xs text-primary">TEAM</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={TEAM_COUNT}
                value={team}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 1 && n <= TEAM_COUNT) pick(n);
                }}
                className="w-24 bg-transparent font-display text-4xl font-black"
                aria-label="Team number"
              />
              <span className="ml-auto text-right text-sm text-muted-foreground">
                {scoredByMe.has(team) ? "You scored this team" : "Not scored by you yet"}
              </span>
            </label>
            <button
              type="button"
              onClick={() => pick(team + 1)}
              disabled={team >= TEAM_COUNT}
              aria-label="Next team"
              className="border-2 border-border bg-card px-4 text-2xl font-black disabled:opacity-40"
            >
              ›
            </button>
          </div>

          {mission && (
            <div className="mt-4 border-2 border-border bg-secondary p-4">
              <p className="font-pixel text-[10px] text-primary">
                MISSION {mission.n} · {mission.title.toUpperCase()}
              </p>
              <p className="mt-1 text-lg font-bold">{mission.card}</p>
              <p className="mt-1 text-sm text-muted-foreground">{mission.means}</p>
            </div>
          )}

          <fieldset className="mt-5">
            <legend className="sr-only">Ticks for team {team}</legend>
            <ol className="space-y-2">
              {labels.map((label, i) => (
                <li key={i}>
                  <label
                    className={`flex cursor-pointer items-start gap-4 border-2 p-4 ${ticks[i] ? "border-primary bg-primary/10" : "border-border bg-card"} ${i === 6 ? "mt-5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!ticks[i]}
                      onChange={() => toggle(i)}
                      className="mt-1 h-7 w-7 shrink-0 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="mr-2 font-mono font-bold text-primary">{i + 1}.</span>
                      {i === 9 && <span className="font-bold">Trap avoided: </span>}
                      {label}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </fieldset>

          <label className="mt-5 block">
            <span className="font-bold">Note for the head judge (optional)</span>
            <textarea
              value={note}
              maxLength={280}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
              rows={2}
              placeholder="Like: great drawing, only two people spoke"
              className="mt-1 block w-full border-2 border-border bg-card px-3 py-2"
            />
          </label>

          {(mine(team) || waitingHere) && (
            <button
              type="button"
              onClick={() => void clear()}
              className="mt-3 text-sm text-destructive underline"
            >
              Remove my score for team {team}
            </button>
          )}

          <h2 className="mt-10 font-pixel text-xs text-primary">JUMP TO A TEAM</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filled: you scored it. Outlined in colour: another judge did.
          </p>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: TEAM_COUNT }, (_, k) => k + 1).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pick(t)}
                aria-label={`Team ${t}${scoredByMe.has(t) ? ", scored by you" : ""}`}
                className={`border-2 py-2 font-mono font-bold ${t === team ? "ring-4 ring-ink" : ""} ${scoredByMe.has(t) ? "border-primary bg-primary text-primary-foreground" : scoredByAnyone.has(t) ? "border-primary bg-card text-primary" : "border-border bg-card"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-black">
                  {total(ticks)}{" "}
                  <span className="text-base font-bold text-muted-foreground">
                    / 10 · team {team}
                  </span>
                </p>
                {status && (
                  <p
                    role="status"
                    className={`truncate text-sm font-bold ${status.kind === "ok" ? "text-green-700" : status.kind === "err" ? "text-destructive" : "text-amber-700"}`}
                  >
                    {status.text}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void save()}
                className={`shrink-0 border-2 border-border px-6 py-3 text-lg font-bold ${dirty ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                {dirty ? "Save" : "Saved"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <Ranking
          scores={scores}
          fetchedAt={fetchedAt}
          onRefresh={() => void refresh()}
          onPick={(t) => {
            setTab("score");
            pick(t);
          }}
        />
      )}
    </div>
  );
}

function Ranking({
  scores,
  fetchedAt,
  onRefresh,
  onPick,
}: {
  scores: Score[];
  fetchedAt: number;
  onRefresh: () => void;
  onPick: (t: number) => void;
}) {
  const ranks = useMemo(() => rankTeams(scores), [scores]);
  const pick = useMemo(() => stagePick(scores, STAGE_TEAMS, STAGE_TEAMS_MAX), [scores]);
  const stage = pick.teams;
  const onStage = new Set(stage);
  const tiedForFifth = tieAtCutoff(ranks, STAGE_TEAMS) && stage.length > STAGE_TEAMS;
  const missing = Array.from({ length: TEAM_COUNT }, (_, k) => k + 1).filter(
    (t) => !ranks.some((r) => r.team === t),
  );
  const judges = new Set(scores.map((s) => s.judge.toLowerCase())).size;

  return (
    <div className="mt-6">
      <div className="border-2 border-border bg-ink p-5 text-paper shadow-hard-violet">
        <p className="font-pixel text-[11px] text-lilac">TEAMS FOR THE STAGE (BY TEAM NUMBER)</p>
        <p className="mt-2 font-display text-4xl font-black">
          {stage.length ? stage.join(" · ") : "No scores yet"}
        </p>
        {tiedForFifth && !pick.unresolved && (
          <p className="mt-3 border-2 border-lilac p-2 text-sm font-bold">
            5th and 6th place have the same score, so both teams go on stage: {stage.length} teams.
          </p>
        )}
        {pick.unresolved && (
          <p className="mt-3 border-2 border-yellow-300 p-2 text-sm font-bold text-yellow-200">
            More teams share the last place than fit on the stage. Head judge: pick using the tie
            rule in the guide, then type the teams on the slide with &quot;Set teams&quot;.
          </p>
        )}
        <p className="mt-3 text-sm opacity-80">
          The &quot;Teams on stage&quot; slide shows these by itself and checks again every 10
          seconds, as long as the presenter laptop has logged in on this page once. To override
          them, press &quot;Set teams&quot; on that slide.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          {ranks.length} of {TEAM_COUNT} teams scored by {judges} judge{judges === 1 ? "" : "s"}.
          Updated{" "}
          {fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })
            : "never"}
          .
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="border-2 border-border bg-card px-3 py-1.5 font-bold"
        >
          Refresh
        </button>
      </div>

      <div className="mt-3 overflow-x-auto border-2 border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-border bg-secondary font-pixel text-[10px]">
            <tr>
              <th className="px-3 py-2">PLACE</th>
              <th className="px-3 py-2">TEAM</th>
              <th className="px-3 py-2">MISSION</th>
              <th className="px-3 py-2">AVG /10</th>
              <th className="px-3 py-2">JUDGES</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((r) => (
              <tr
                key={r.team}
                className={`border-b border-border last:border-0 ${onStage.has(r.team) ? "bg-primary/10 font-bold" : ""}`}
              >
                <td className="px-3 py-2 font-mono">{r.place}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="font-mono font-bold text-primary underline"
                    onClick={() => onPick(r.team)}
                  >
                    {r.team}
                  </button>
                </td>
                <td className="px-3 py-2">{missionByNumber(r.team)?.title}</td>
                <td className="px-3 py-2 font-mono">{r.average.toFixed(1)}</td>
                <td className="px-3 py-2">{r.names.join(", ")}</td>
              </tr>
            ))}
            {!ranks.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No team has been scored yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {missing.length > 0 && ranks.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          <b>Not scored yet:</b> {missing.join(", ")}
        </p>
      )}

      <details className="mt-6 border-2 border-border bg-card p-4">
        <summary className="cursor-pointer font-bold">Notes from judges</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {scores
            .filter((s) => s.note.trim())
            .sort((a, b) => a.team - b.team)
            .map((s) => (
              <li key={`${s.team}-${s.judge}`}>
                <b>Team {s.team}</b> ({s.judge}, {total(s.ticks)}/10): {s.note}
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
