import { useEffect, useRef, useState } from "react";
import { merch } from "@/lib/site";
import { colour, product, rupees, swatch, type Pick } from "@/lib/merch";
import type { MerchScene, View } from "@/components/site/merch/garment-scene";
import {
  CREST_SRC,
  MONO_ASPECT,
  MONO_SRC,
  POSTER_SRC,
  STARS_ASPECT,
  STARS_SRC,
} from "@/components/site/merch/art";

/** The studio backdrop: light enough that the grey cloth and its indigo prints both read. */
const STAGE = "radial-gradient(120% 90% at 50% 38%, #f4f2f7 0%, #dedbe6 55%, #c6c2d2 100%)";

const VIEWS: { id: View; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "right", label: "Right arm" },
  { id: "left", label: "Left arm" },
];

export function MerchStudio() {
  const item = merch.products[0]!;
  const pick: Pick = { kind: item.kind, colour: merch.colours[0]!.id };
  const [phase, setPhase] = useState<"loading" | "ready" | "nogl">("loading");
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(false);
  const [view, setView] = useState<View | null>("front");
  const [zip, setZip] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<MerchScene | null>(null);
  const first = useRef(pick);

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

  const moveZip = (v: number) => {
    setZip(v);
    scene.current?.zip(v);
  };
  const goView = (v: View) => {
    setView(v);
    setSpin(false);
    scene.current?.view(v);
  };
  const label = `${colour(pick.colour).name} ${product(pick.kind).name}`;

  return (
    <section aria-label="Merch studio" className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <div
            className="relative overflow-hidden border-2 border-border shadow-hard"
            style={{ background: STAGE }}
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
            <div className="pointer-events-none absolute right-3 top-3">
              <span className="border-2 border-ink bg-paper px-2.5 py-1 font-mono text-sm font-semibold text-ink shadow-[3px_3px_0_0_var(--ink)]">
                {rupees(item.price)}
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
          <p className="mt-3 text-sm text-muted-foreground">
            Drag to turn it. Tap X, Y or Z on the gizmo to look along that axis. Pinch, use the
            buttons, or hold Ctrl and scroll to zoom. Double tap to face the front again.
          </p>
        </div>

        <JacketPanel />
      </div>

      <PrintMap />
    </section>
  );
}

/** The jacket itself: price, colour, what it has, and the producer's size chart. */
function JacketPanel() {
  const item = merch.products[0]!;
  const c = merch.colours[0]!;
  return (
    <div className="flex flex-col gap-5 border-2 border-border bg-card p-4 shadow-hard md:p-5">
      <div>
        <p className="font-pixel text-[10px] text-primary">THE CLUB JACKET</p>
        <p className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-display text-2xl font-black">{item.name}</span>
          <span className="font-mono text-xl font-semibold">{rupees(item.price)}</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="h-5 w-5 border-2 border-ink"
            style={{ background: swatch(c.id) }}
          />
          {c.name}
        </p>
      </div>
      <ul className="grid gap-1.5 border-t-2 border-border pt-4 text-sm">
        {item.details.map((d) => (
          <li key={d} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              +
            </span>
            {d}
          </li>
        ))}
      </ul>
      <div className="border-t-2 border-border pt-4">
        <p className="font-pixel text-[10px] text-primary">SIZES</p>
        <table className="mt-2 w-full border-collapse text-sm">
          <caption className="sr-only">Chest width for each size, in inches</caption>
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th scope="col" className="py-1 font-bold">
                Size
              </th>
              <th scope="col" className="py-1 text-right font-bold">
                Chest width
              </th>
            </tr>
          </thead>
          <tbody>
            {merch.sizes.map((s) => (
              <tr key={s.size} className="border-b border-border/30 last:border-b-0">
                <th scope="row" className="py-1 text-left font-mono font-semibold">
                  {s.size}
                </th>
                <td className="py-1 text-right font-mono">{s.width} in</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Chest width measured across the front, from the producer's size chart.
        </p>
      </div>
    </div>
  );
}

/** The same artwork the 3D jacket wears, laid flat on the grey. */
function PrintMap() {
  const grey = merch.colours[0]!.hex;
  const tiles = [
    {
      tag: "FRONT",
      title: "Mono and the stars",
      body: (
        <div className="flex h-full w-full items-center justify-between gap-[6%] px-[8%]">
          <img
            src={STARS_SRC}
            alt=""
            className="w-[44%]"
            style={{ aspectRatio: String(1 / STARS_ASPECT) }}
          />
          <img
            src={MONO_SRC}
            alt=""
            className="w-[40%]"
            style={{ aspectRatio: String(1 / MONO_ASPECT) }}
          />
        </div>
      ),
      note: "The stars on the right chest, Mono on the left, as worn.",
    },
    {
      tag: "BACK",
      title: "Define the Future",
      body: (
        <div className="flex h-full w-full items-center justify-center p-[6%]">
          <img src={POSTER_SRC} alt="" className="max-h-full max-w-full" />
        </div>
      ),
      note: "The design team's poster with the RO-BIO HUB mark, across the back.",
    },
    {
      tag: "RIGHT SLEEVE",
      title: "College crest sticker",
      body: (
        <div className="grid h-full w-full place-items-center">
          <img src={CREST_SRC} alt="" className="h-[58%] w-auto" />
        </div>
      ),
      note: "The Mysore University School of Engineering crest. It comes as a peel-off sticker.",
    },
  ];

  return (
    <div className="mt-16">
      <p className="font-pixel text-xs text-primary">PRINT MAP</p>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">Where everything goes</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The same artwork the 3D jacket wears, laid flat on the grey. Artwork by our design team.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 md:gap-4">
        {tiles.map((t) => (
          <figure
            key={t.tag}
            data-robo-perch
            className="flex flex-col border-2 border-border bg-card shadow-hard"
          >
            <div className="border-b-2 border-border bg-secondary px-2 py-1">
              <span className="font-pixel text-[10px] tracking-wider">{t.tag}</span>
            </div>
            <div className="aspect-square overflow-hidden" style={{ background: grey }}>
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
