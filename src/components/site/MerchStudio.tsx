import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { merch, type MerchKind } from "@/lib/site";
import {
  AUTHOR_MAX,
  NAME_MAX,
  NOTE_MAX,
  cleanName,
  cleanNumber,
  colour,
  likeKey,
  merchApi,
  NUMBER_STYLES,
  styleKey,
  type NumberStyle,
  pieceLikes,
  product,
  rupees,
  type ColourId,
  type Pick,
  type Tally,
} from "@/lib/merch";
import type { MerchScene, View } from "@/components/site/merch/garment-scene";
import {
  CREST_SRC,
  LOGO_SRC,
  drawNameplate,
  drawNumber,
  fontsReady,
  loadImage,
} from "@/components/site/merch/art";

/** The studio backdrop behind each colour: light enough for black, deep enough for white. */
const STAGE: Record<ColourId, string> = {
  black: "radial-gradient(120% 90% at 50% 38%, #f4f2f7 0%, #dedbe6 55%, #c6c2d2 100%)",
  white: "radial-gradient(120% 90% at 50% 38%, #cfcdd8 0%, #b3b0c1 55%, #9895a9 100%)",
  lilac: "radial-gradient(120% 90% at 50% 38%, #f6f4fa 0%, #e2deec 55%, #c9c4d8 100%)",
};

const VIEWS: { id: View; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "right", label: "Right arm" },
  { id: "left", label: "Left arm" },
];

const LIKED_KEY = "robio-merch-liked";
const readLiked = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};
const saveLiked = (v: string[]) => {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(v));
  } catch {
    /* storage blocked: the server still remembers this browser through its cookie */
  }
};

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t-2 border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="flex items-baseline gap-2">
        <span className="font-pixel text-[10px] text-primary">{n}</span>
        <span className="font-display text-sm font-bold uppercase tracking-wider">{title}</span>
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function useTally() {
  const [tally, setTally] = useState<Tally>({ counts: {}, mine: [] });
  const [state, setState] = useState<"loading" | "ready" | "offline">("loading");
  useEffect(() => {
    let live = true;
    const local = readLiked();
    if (local.length) setTally((t) => ({ ...t, mine: local }));
    merchApi<Tally>("tally")
      .then((t) => {
        if (!live) return;
        setTally(t);
        saveLiked(t.mine);
        setState("ready");
      })
      .catch(() => live && setState("offline"));
    return () => {
      live = false;
    };
  }, []);
  const toggle = useCallback(
    async (kind: string, c: string) => {
      const k = `${kind}:${c}`;
      const liked = !tally.mine.includes(k);
      const before = tally;
      // show it at once, then settle on what the server says
      setTally({
        counts: { ...tally.counts, [k]: Math.max(0, (tally.counts[k] ?? 0) + (liked ? 1 : -1)) },
        mine: liked ? [...tally.mine, k] : tally.mine.filter((x) => x !== k),
      });
      try {
        const t = await merchApi<Tally>("like", {
          method: "POST",
          body: JSON.stringify({ kind, colour: c, liked }),
        });
        setTally(t);
        saveLiked(t.mine);
        return null;
      } catch (e) {
        setTally(before);
        return (e as Error).message;
      }
    },
    [tally],
  );
  return { tally, state, toggle };
}

export function MerchStudio() {
  const [pick, setPick] = useState<Pick>({
    kind: merch.products[0]!.kind,
    colour: "black",
    name: cleanName(merch.demoName),
    number: merch.demoNumber,
    style: "plate",
  });
  const [phase, setPhase] = useState<"loading" | "ready" | "nogl">("loading");
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(false);
  const [view, setView] = useState<View | null>("front");
  const [likeError, setLikeError] = useState("");
  const [zip, setZip] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<MerchScene | null>(null);
  const first = useRef(pick);
  const { tally, state, toggle } = useTally();

  useEffect(() => {
    let cancelled = false;
    const el = host.current;
    if (!el) return;
    // Scrolling the page over the model should scroll the page. Zoom is on pinch, the buttons, or Ctrl + scroll.
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
    };
    el.addEventListener("wheel", wheel, { capture: true });
    import("@/components/site/merch/garment-scene")
      .then(({ createMerchScene }) => {
        if (cancelled || !host.current) return;
        try {
          scene.current = createMerchScene(host.current, first.current, {
            ready: () => setPhase("ready"),
            loading: setBusy,
            zip: setZip,
            error: () => setPhase("nogl"),
            spin: (on) => {
              setSpin(on);
              setView(null);
            },
          });
        } catch (err) {
          console.error(err);
          setPhase("nogl");
        }
      })
      .catch(() => !cancelled && setPhase("nogl"));
    return () => {
      cancelled = true;
      el.removeEventListener("wheel", wheel, { capture: true });
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.set(pick);
  }, [pick]);

  const item = product(pick.kind);
  const set = <K extends keyof Pick>(k: K, v: Pick[K]) => setPick((p) => ({ ...p, [k]: v }));
  const moveZip = (v: number) => {
    setZip(v);
    scene.current?.zip(v);
  };
  // a fresh look at the zip hoodie starts zipped up
  useEffect(() => {
    if (pick.kind !== "jacket") setZip(0);
  }, [pick.kind]);
  const goView = (v: View) => {
    setView(v);
    setSpin(false);
    scene.current?.view(v);
  };
  const key = likeKey(pick.kind, pick.colour);
  const liked = tally.mine.includes(key);
  const likes = tally.counts[key] ?? 0;
  const onLike = async () => {
    setLikeError("");
    const err = await toggle(pick.kind, pick.colour);
    if (err) setLikeError(err);
  };
  const label = `${colour(pick.colour).name} ${item.name}`;

  return (
    <section aria-label="Merch studio" className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {merch.draft && (
        <p className="mb-6 flex flex-wrap items-center gap-2 border-2 border-dashed border-border bg-muted px-3 py-2 text-sm">
          <span className="bg-ink px-1.5 py-0.5 font-pixel text-[10px] text-paper dark:bg-lilac dark:text-ink">
            DRAFT
          </span>
          {merch.draftNote}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <div
            className="relative overflow-hidden border-2 border-border shadow-hard"
            style={{ background: STAGE[pick.colour], transition: "background 400ms ease" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[24%] bottom-[4%] h-10 rounded-[50%] bg-ink/20 blur-2xl"
            />
            <div
              ref={host}
              data-merch-stage
              className="relative h-[min(66vh,560px)] min-h-[400px] w-full cursor-grab active:cursor-grabbing md:h-[min(74vh,640px)]"
              role="img"
              aria-label={`3D model of the ${label}. Drag to turn it.`}
            />
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col">
              <span className="font-pixel text-[10px] tracking-wider text-ink/70">
                RO-BIO KIT / {merch.drop.toUpperCase()}
              </span>
              <span className="font-display text-xl font-black italic text-ink md:text-2xl">
                {item.name}
              </span>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1">
              <span className="border-2 border-ink bg-paper px-2.5 py-1 font-mono text-sm font-semibold text-ink shadow-[3px_3px_0_0_var(--ink)]">
                {rupees(item.price)}
              </span>
              <span className="bg-paper/85 px-1.5 font-pixel text-[9px] text-ink">
                {merch.priceNote.toUpperCase()}
              </span>
            </div>
            <div className="absolute left-3 top-20 flex flex-col gap-1.5">
              {(
                [
                  ["+", "Zoom in", 0.8],
                  ["−", "Zoom out", 1.25],
                ] as const
              ).map(([sym, lbl, k]) => (
                <button
                  key={lbl}
                  type="button"
                  aria-label={lbl}
                  onClick={() => scene.current?.zoom(k)}
                  className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper/90 font-mono text-base font-bold text-ink hover:bg-paper"
                >
                  {sym}
                </button>
              ))}
            </div>
            {(phase !== "ready" || busy) && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                <p className="border-2 border-ink bg-paper px-3 py-2 text-center font-pixel text-[11px] text-ink">
                  {phase === "nogl" ? (
                    "THE 3D VIEW DID NOT LOAD. THE PRINT MAP BELOW SHOWS EVERY PRINT."
                  ) : (
                    <>
                      LOADING THE {item.name.toUpperCase()}
                      <span className="blink">_</span>
                    </>
                  )}
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Camera">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={view === v.id}
                    onClick={() => goView(v.id)}
                    className={`border-2 border-ink px-2.5 py-1 text-xs font-bold transition-colors ${
                      view === v.id ? "bg-ink text-paper" : "bg-paper/90 text-ink hover:bg-paper"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={spin}
                onClick={() => {
                  const next = !spin;
                  setSpin(next);
                  if (next) setView(null);
                  scene.current?.spin(next);
                }}
                className={`flex items-center gap-1.5 border-2 border-ink px-2.5 py-1 text-xs font-bold ${
                  spin ? "bg-violet text-paper" : "bg-paper/90 text-ink hover:bg-paper"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={spin ? "inline-block animate-spin" : "inline-block"}
                >
                  {"↻"}
                </span>
                Spin
              </button>
            </div>
          </div>
          {pick.kind === "jacket" && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-2 border-border bg-card px-3 py-2">
              <label htmlFor="zip-range" className="font-pixel text-[10px] text-primary">
                ZIP
              </label>
              <input
                id="zip-range"
                type="range"
                min={0}
                max={100}
                value={Math.round(zip * 100)}
                onChange={(e) => moveZip(Number(e.target.value) / 100)}
                aria-valuetext={
                  zip < 0.02 ? "Zipped up" : zip > 0.98 ? "Open" : `${Math.round(zip * 100)}% open`
                }
                className="h-2 min-w-[140px] flex-1 cursor-pointer accent-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => moveZip(zip > 0.5 ? 0 : 1)}
                className="border-2 border-border px-2.5 py-1 text-xs font-bold hover:bg-muted"
              >
                {zip > 0.5 ? "Zip it up" : "Unzip"}
              </button>
              <span className="w-full text-xs text-muted-foreground">
                Or grab the puller on the model and drag it down.
              </span>
            </div>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Drag to turn it. Tap X, Y or Z on the gizmo to look along that axis. Pinch, use the
            buttons, or hold Ctrl and scroll to zoom. Double tap to face the front again.
          </p>
        </div>

        <div className="flex flex-col gap-5 border-2 border-border bg-card p-4 shadow-hard md:p-5">
          <Step n="01" title="Piece">
            <div className="grid grid-cols-2 gap-2">
              {merch.products.map((p) => {
                const on = pick.kind === p.kind;
                return (
                  <label
                    key={p.kind}
                    className={`relative flex cursor-pointer flex-col border-2 p-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                      on ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="piece"
                      value={p.kind}
                      checked={on}
                      onChange={() => set("kind", p.kind)}
                      className="sr-only"
                    />
                    <span className="text-sm font-bold leading-tight">{p.name}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {p.gsm ? `${p.gsm} GSM ` : ""}
                      {p.fabric.toLowerCase()}
                    </span>
                    <span className="mt-2 flex items-baseline justify-between gap-1">
                      <span className="font-mono text-sm font-semibold">{rupees(p.price)}</span>
                      <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Heart aria-hidden="true" className="h-3 w-3" />
                        {pieceLikes(tally, p.kind)}
                        <span className="sr-only"> likes</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Prices are per piece. {merch.priceNote}.
            </p>
          </Step>

          <Step n="02" title="Colour">
            <div className="flex flex-wrap gap-2">
              {merch.colours.map((c) => {
                const on = pick.colour === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-2 border-2 py-1.5 pl-1.5 pr-3 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                      on ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="colour"
                      value={c.id}
                      checked={on}
                      onChange={() => set("colour", c.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="h-6 w-6 border-2 border-ink"
                      style={{ background: c.hex }}
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </Step>

          <div className="border-2 border-border bg-muted p-3">
            <button
              type="button"
              onClick={onLike}
              aria-pressed={liked}
              disabled={state === "offline"}
              className={`flex w-full items-center justify-center gap-2 border-2 border-border px-4 py-3 font-bold shadow-hard transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 ${
                liked ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              <Heart
                aria-hidden="true"
                className={`h-5 w-5 transition-transform ${liked ? "scale-110 fill-current" : ""}`}
              />
              {liked ? `You like the ${label}` : `Like the ${label}`}
            </button>
            <p className="mt-2 text-center text-sm" aria-live="polite">
              <span className="font-mono font-semibold">{likes}</span>{" "}
              {likes === 1 ? "member likes" : "members like"} this colour
              {state === "offline" && " (likes are offline right now)"}
            </p>
            {likeError && <p className="mt-1 text-center text-sm text-destructive">{likeError}</p>}
            <p className="mt-1 text-center text-xs text-muted-foreground">
              One like per piece and colour from each browser. Tap again to take it back.
            </p>
          </div>

          <Step n="03" title="Try your name and number">
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <label className="flex flex-col gap-1 text-xs font-bold">
                Name on the back
                <input
                  value={pick.name}
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => set("name", cleanName(e.target.value))}
                  className="border-2 border-border bg-background px-2.5 py-2 font-display text-base font-bold uppercase tracking-wider outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                Number
                <input
                  value={pick.number}
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                  onChange={(e) => set("number", cleanNumber(e.target.value))}
                  className="border-2 border-border bg-background px-2.5 py-2 text-center font-display text-base font-black italic outline-none focus:border-primary"
                />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Just a preview, nothing is saved. The number goes on the left sleeve and the college
              crest on the right.
            </p>
            <p className="mt-4 text-xs font-bold">Number style</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {NUMBER_STYLES.map((st) => (
                <StyleCard
                  key={st.id}
                  id={st.id}
                  name={st.name}
                  on={pick.style === st.id}
                  pick={pick}
                  votes={tally.counts[styleKey(st.id)] ?? 0}
                  voted={tally.mine.includes(styleKey(st.id))}
                  onPick={() => set("style", st.id)}
                  onVote={async () => {
                    setLikeError("");
                    const err = await toggle("number", st.id);
                    if (err) setLikeError(err);
                  }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tap a style to see it on the sleeve. Tap its heart to vote for it.
            </p>
          </Step>

          <Feedback kind={pick.kind} c={pick.colour} label={label} />
        </div>
      </div>

      <Board
        tally={tally}
        state={state}
        onPick={(kind, c) => setPick((p) => ({ ...p, kind, colour: c }))}
      />
      <PrintMap pick={pick} />
      <Lineup />
      <Credits />
    </section>
  );
}

/** One number style: a live preview on the fabric colour, and a heart to vote for it. */
function StyleCard({
  id,
  name,
  on,
  pick,
  votes,
  voted,
  onPick,
  onVote,
}: {
  id: NumberStyle;
  name: string;
  on: boolean;
  pick: Pick;
  votes: number;
  voted: boolean;
  onPick: () => void;
  onVote: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fonts, setFonts] = useState(0);
  useEffect(() => {
    let live = true;
    void fontsReady().then(() => live && setFonts((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const art = drawNumber(document.createElement("canvas"), pick.number, pick.colour, id);
    cv.width = cv.height = 220;
    const g = cv.getContext("2d")!;
    g.fillStyle = colour(pick.colour).hex;
    g.fillRect(0, 0, 220, 220);
    g.drawImage(art, 0, 0, 220, 220);
  }, [id, pick.number, pick.colour, fonts]);
  return (
    <div
      className={`flex flex-col border-2 ${on ? "border-primary bg-secondary" : "border-border"}`}
    >
      <button
        type="button"
        onClick={onPick}
        aria-pressed={on}
        aria-label={`Show the ${name} number style`}
        className="block"
      >
        <canvas ref={ref} className="block aspect-square w-full" />
      </button>
      <div className="flex items-center justify-between gap-1 px-1.5 py-1">
        <span className="truncate text-[11px] font-bold leading-tight">{name}</span>
        <button
          type="button"
          onClick={onVote}
          aria-pressed={voted}
          aria-label={`${voted ? "Take back your vote for" : "Vote for"} ${name}`}
          className="flex shrink-0 items-center gap-0.5 font-mono text-[11px]"
        >
          <Heart
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${voted ? "fill-primary text-primary" : ""}`}
          />
          {votes}
        </button>
      </div>
    </div>
  );
}

function Feedback({ kind, c, label }: { kind: MerchKind; c: ColourId; label: string }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSent("sending");
    try {
      await merchApi("note", {
        method: "POST",
        body: JSON.stringify({ kind, colour: c, name, text }),
      });
      setSent("sent");
      setText("");
    } catch (err) {
      setError((err as Error).message);
      setSent("idle");
    }
  };
  return (
    <form
      onSubmit={send}
      className="border-t-2 border-border pt-4"
      aria-label="Tell us what you think"
    >
      <p className="flex items-baseline gap-2">
        <span className="font-pixel text-[10px] text-primary">04</span>
        <span className="font-display text-sm font-bold uppercase tracking-wider">
          Tell us what you think
        </span>
      </p>
      <label className="mt-3 flex flex-col gap-1 text-xs font-bold">
        About the {label}
        <textarea
          value={text}
          maxLength={NOTE_MAX}
          rows={3}
          required
          placeholder="Love the lilac, but the back logo could be a bit smaller."
          onChange={(e) => {
            setText(e.target.value);
            if (sent === "sent") setSent("idle");
          }}
          className="resize-y border-2 border-border bg-background px-2.5 py-2 text-sm font-normal outline-none focus:border-primary"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          maxLength={AUTHOR_MAX}
          autoComplete="name"
          placeholder="Your name (optional)"
          aria-label="Your name, optional"
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 border-2 border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sent === "sending" || text.trim().length < 2}
          className="border-2 border-border bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {sent === "sending" ? "Sending" : "Send"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
        {sent === "sent"
          ? "Thank you! The core team will read it."
          : error || "Only the core team reads these."}
      </p>
    </form>
  );
}

function Board({
  tally,
  state,
  onPick,
}: {
  tally: Tally;
  state: "loading" | "ready" | "offline";
  onPick: (kind: MerchKind, c: ColourId) => void;
}) {
  const rows = merch.products
    .flatMap((p) =>
      merch.colours.map((c) => ({ p, c, n: tally.counts[likeKey(p.kind, c.id)] ?? 0 })),
    )
    .sort((a, b) => b.n - a.n);
  const top = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="mt-16">
      <p className="font-pixel text-xs text-primary">LIKES SO FAR</p>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">What members like</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {state === "offline"
          ? "The likes could not be loaded right now. Try again in a minute."
          : total
            ? `${total} ${total === 1 ? "like" : "likes"} so far. Tap a row to see it in 3D.`
            : "No likes yet. Be the first: pick a piece and a colour above and tap Like."}
      </p>
      <ol className="mt-6 grid gap-2 md:grid-cols-2">
        {rows.map((r, i) => (
          <li key={`${r.p.kind}-${r.c.id}`}>
            <button
              type="button"
              onClick={() => {
                onPick(r.p.kind, r.c.id);
                document
                  .querySelector("[data-merch-stage]")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="flex w-full items-center gap-3 border-2 border-border bg-card px-3 py-2 text-left hover:bg-muted"
            >
              <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 border-2 border-ink"
                style={{ background: r.c.hex }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {r.c.name} {r.p.name}
                </span>
                <span className="mt-1 block h-1.5 bg-muted">
                  <span
                    className="block h-full bg-primary transition-[width] duration-500"
                    style={{ width: `${(r.n / top) * 100}%` }}
                  />
                </span>
              </span>
              <span className="flex items-center gap-1 font-mono text-sm font-semibold">
                <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                {r.n}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PrintMap({ pick }: { pick: Pick }) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const chipRef = useRef<HTMLCanvasElement>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const fabric = colour(pick.colour).hex;

  useEffect(() => {
    let live = true;
    loadImage(LOGO_SRC)
      .then((img) => live && setLogo(img))
      .catch(() => {});
    void fontsReady().then(() => live && setFonts((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const cv = backRef.current;
    if (!cv) return;
    cv.width = cv.height = 800;
    const g = cv.getContext("2d")!;
    g.fillStyle = fabric;
    g.fillRect(0, 0, 800, 800);
    const lw = 500;
    if (logo) g.drawImage(logo, 150, 60, lw, lw);
    const plate = drawNameplate(document.createElement("canvas"), pick.name, pick.colour);
    const pw = lw * 1.02,
      ph = (pw * plate.height) / plate.width;
    g.drawImage(plate, (800 - pw) / 2, 60 + lw + 6, pw, ph);
  }, [logo, pick.name, pick.colour, fabric, fonts]);

  useEffect(() => {
    const cv = chipRef.current;
    if (!cv) return;
    const art = drawNumber(document.createElement("canvas"), pick.number, pick.colour, pick.style);
    const side = art.height;
    cv.width = cv.height = side;
    const g = cv.getContext("2d")!;
    g.fillStyle = fabric;
    g.fillRect(0, 0, side, side);
    g.drawImage(art, 0, 0);
  }, [pick.number, pick.colour, pick.style, fabric, fonts]);

  const long = pick.kind === "hoodie" || pick.kind === "jacket";
  const tiles = [
    {
      tag: "BACK",
      title: "Logo and name",
      size: "about 25 cm wide",
      body: <canvas ref={backRef} className="h-full w-full" />,
      note: "The club logo, die cut with its white outline, and the name set wide under it.",
    },
    {
      tag: "LEFT SLEEVE",
      title: `Number: ${NUMBER_STYLES.find((st) => st.id === pick.style)!.name}`,
      size: `about ${long ? 7.5 : 6.6} cm tall`,
      body: <canvas ref={chipRef} className="h-full w-full" />,
      note: "Pick the style in step 03. Members can vote for the one they like best.",
    },
    {
      tag: "RIGHT SLEEVE",
      title: "College crest",
      size: `about ${long ? 7.5 : 6.6} cm tall`,
      body: (
        <div className="grid h-full w-full place-items-center">
          <img src={CREST_SRC} alt="" className="h-[58%] w-auto" />
        </div>
      ),
      note: "The Mysore University School of Engineering crest, where a kit wears its badge.",
    },
  ];

  return (
    <div className="mt-16">
      <p className="font-pixel text-xs text-primary">PRINT MAP</p>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">Where everything goes</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The same artwork the 3D model wears, laid flat on your colour. The front stays clean.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        {tiles.map((t) => (
          <figure
            key={t.tag}
            data-robo-perch
            className="flex flex-col border-2 border-border bg-card shadow-hard"
          >
            <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-secondary px-2 py-1">
              <span className="font-pixel text-[10px] tracking-wider">{t.tag}</span>
              <span className="font-mono text-[11px]">{t.size}</span>
            </div>
            <div
              className="aspect-square overflow-hidden"
              style={{ background: fabric, transition: "background 300ms ease" }}
            >
              {t.body}
            </div>
            <figcaption className="border-t-2 border-border p-3">
              <p className="font-bold">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.note}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Lineup() {
  const names = merch.colours.map((c) => c.name);
  return (
    <div className="mt-16">
      <p className="font-pixel text-xs text-primary">THE LINE UP</p>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">Four pieces, three colours</h2>
      <div className="mt-6 overflow-x-auto border-2 border-border shadow-hard">
        <table className="w-full min-w-[620px] border-collapse bg-card text-left text-sm">
          <thead className="bg-secondary">
            <tr>
              {["Piece", "Price", "Fabric", "Details"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b-2 border-border px-3 py-2 font-pixel text-[10px] font-normal"
                >
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merch.products.map((p) => (
              <tr key={p.kind} className="border-b border-border/30 last:border-b-0">
                <th scope="row" className="px-3 py-3 font-bold">
                  {p.name}
                </th>
                <td className="px-3 py-3">
                  <span className="font-mono font-semibold">{rupees(p.price)}</span>
                  <span className="block text-xs text-muted-foreground">negotiable</span>
                </td>
                <td className="px-3 py-3">
                  {p.gsm
                    ? `${p.gsm} GSM ${p.fabric.toLowerCase()}`
                    : `${p.fabric}, weight to be confirmed`}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{p.details.join(". ")}.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Every piece comes in {names.slice(0, -1).join(", ")} and {names[names.length - 1]}.
      </p>
    </div>
  );
}

function Credits() {
  return (
    <div className="mt-12 border-t-2 border-dashed border-border pt-4 text-xs text-muted-foreground">
      <p>
        3D garments, free models from Sketchfab under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          CC BY 4.0
        </a>
        , recoloured, with brand marks removed, arms lowered and files made smaller:{" "}
        {merch.models.map((m, i) => (
          <span key={m.kind}>
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {m.title}
            </a>{" "}
            by {m.author}
            {i < merch.models.length - 1 ? "; " : "."}
          </span>
        ))}
      </p>
    </div>
  );
}
