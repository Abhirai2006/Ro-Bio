// The Shark Tank banner. On computers and capable phones a sheet of glass covers it: a realistic 3D shark hits
// it from behind, cracks it, shatters it into pieces that fall with real physics, bursts out of the hole and then
// swims all over the page. Only on the Shark Tank page. On low-power phones, for people who turn off motion, and
// where 3D does not work, the banner shows a still picture instead (botForgeInfo.shark.still in src/lib/site.ts).
import { useEffect, useRef, useState } from "react";
import { botForgeInfo, contestBySlug, rupees } from "@/lib/site";
import type { SharkWorld } from "./shark-scene";
import "./bot-forge.css";

type Phase = "idle" | "crack" | "burst" | "done" | "still";

/**
 * Where the 3D shark runs: "full" on a computer, "lite" on a phone with enough power, or null where the picture
 * shows instead: motion turned off, Data Saver on, no 3D, or a phone with little memory or few cores.
 */
function power(): "full" | "lite" | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return null;
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") ?? c.getContext("webgl"))) return null;
  } catch {
    return null;
  }
  if (window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) return "full";
  if ((nav.deviceMemory ?? 4) < 4 || (nav.hardwareConcurrency ?? 4) < 4) return null;
  return "lite";
}

export function SharkBurst() {
  const c = contestBySlug("shark-tank")!;
  const stage = useRef<HTMLDivElement>(null);
  const banner = useRef<HTMLDivElement>(null);
  const hole = useRef<SVGSVGElement>(null);
  const world = useRef<SharkWorld | null>(null);
  const timers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"wait" | "3d" | "still">("wait");
  const [hidden, setHidden] = useState(false);
  const credit = botForgeInfo.shark.credit;

  const play = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase("idle");
    world.current?.play();
    import("./shark-scene").then(({ CRACK_AT, SHATTER_AT }) => {
      timers.current = [
        window.setTimeout(() => setPhase("crack"), CRACK_AT * 1000),
        window.setTimeout(() => setPhase("burst"), SHATTER_AT * 1000),
        window.setTimeout(() => setPhase("done"), SHATTER_AT * 1000 + 900),
      ];
    });
  };

  useEffect(() => {
    const still = () => {
      setMode("still");
      setPhase("still");
    };
    const level = power();
    if (!level) return still();
    let cancelled = false;
    let seen: IntersectionObserver | null = null;
    const start = () =>
      import("./shark-scene")
        .then(({ createSharkWorld }) => {
          if (cancelled || !stage.current || !banner.current || !hole.current) return;
          try {
            world.current = createSharkWorld(stage.current, {
              url: botForgeInfo.shark.model,
              fishing: {
                robotUrl: botForgeInfo.shark.fisherRobot,
                rodUrl: botForgeInfo.shark.fishingRod,
                notesUrl: botForgeInfo.shark.rupeeNotes,
              },
              banner: banner.current,
              hole: hole.current as unknown as HTMLElement,
              lite: level === "lite",
              onSlow: () => {
                if (cancelled) return;
                world.current?.dispose();
                world.current = null;
                still();
              },
              onReady: () => {
                if (cancelled) return;
                setMode("3d");
                // Break out once the banner is properly on screen.
                seen = new IntersectionObserver(
                  ([e]) => {
                    if (e?.isIntersecting) {
                      seen?.disconnect();
                      play();
                    }
                  },
                  { threshold: 0.6 },
                );
                if (banner.current) seen.observe(banner.current);
              },
              onFail: () => !cancelled && still(),
            });
          } catch {
            still();
          }
        })
        .catch(() => !cancelled && still());
    const ric = "requestIdleCallback" in window;
    const idle = ric
      ? window.requestIdleCallback(start, { timeout: 1000 })
      : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
      seen?.disconnect();
      timers.current.forEach((t) => window.clearTimeout(t));
      world.current?.dispose();
      world.current = null;
    };
  }, []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    world.current?.setHidden(next);
  };

  return (
    <section className="overflow-x-clip border-b-2 border-border" aria-labelledby="shark-title">
      {/* One see-through layer over the whole window: the glass and the shark live here. */}
      <div
        ref={stage}
        className="pointer-events-none fixed inset-0 z-30"
        aria-hidden="true"
        hidden={mode === "still"}
      />
      {/* Room above the banner for the fisherman, who sits on its top edge. */}
      <div
        className={`mx-auto max-w-6xl px-4 pb-14 md:pb-20 ${mode === "still" ? "pt-16 md:pt-24" : "pt-[190px] md:pt-[250px]"}`}
      >
        {mode === "still" ? (
          // Low-power phones: the Design squad's Shark Tank card, with the live prizes in its empty lower part.
          <div className="relative mx-auto w-full max-w-[440px] [container-type:inline-size]">
            <img
              src={botForgeInfo.shark.still}
              alt="Shark Tank: a shark biting a bundle of notes on a fishing line, above the judges' desk, where two judges raise their hands and say I'm out."
              width={1000}
              height={2000}
              className="block h-auto w-full"
            />
            <div className="absolute inset-x-[9%] top-[70%] bottom-[7%] flex flex-col items-center justify-center gap-[2.5cqw] text-center text-[#2b10ff]">
              <h1 id="shark-title" className="sr-only">
                {c.title}
              </h1>
              <p className="font-pixel text-[2.6cqw] tracking-widest">BOT FORGE</p>
              <p className="text-[4cqw] font-bold leading-snug text-ink">{c.pitch}</p>
              <div className="flex flex-wrap justify-center gap-[2cqw]">
                <span className="border-2 border-[#2b10ff] bg-lilac px-[3cqw] py-[1.2cqw] text-ink">
                  <span className="block font-pixel text-[2.2cqw]">1ST PRIZE</span>
                  <span className="font-display text-[6cqw] font-black">{rupees(c.prizes[0])}</span>
                </span>
                <span className="border-2 border-[#2b10ff] bg-paper px-[3cqw] py-[1.2cqw] text-ink">
                  <span className="block font-pixel text-[2.2cqw]">2ND PRIZE</span>
                  <span className="font-display text-[6cqw] font-black">{rupees(c.prizes[1])}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={banner}
              className="bf-banner relative border-2 border-border bg-ink text-paper shadow-hard-violet"
              data-phase={phase}
            >
              <div className="bf-banner-face blueprint grid items-stretch md:grid-cols-[1.1fr_1fr]">
                <div className="relative z-10 p-6 md:p-10">
                  <p className="font-pixel text-[11px] text-lens">BOT FORGE</p>
                  <h1
                    id="shark-title"
                    className="mt-3 font-display text-5xl font-black leading-none md:text-7xl"
                  >
                    {c.title}
                  </h1>
                  <p className="mt-4 max-w-md text-lg opacity-90">{c.pitch}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="border-2 border-paper/70 bg-lilac px-3 py-2 text-ink">
                      <span className="block font-pixel text-[9px]">1ST PRIZE</span>
                      <span className="font-display text-3xl font-black">
                        {rupees(c.prizes[0])}
                      </span>
                    </span>
                    <span className="border-2 border-paper/70 bg-paper px-3 py-2 text-ink">
                      <span className="block font-pixel text-[9px]">2ND PRIZE</span>
                      <span className="font-display text-3xl font-black">
                        {rupees(c.prizes[1])}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="relative min-h-[260px] md:min-h-[360px]">
                  <svg
                    ref={hole}
                    viewBox="0 0 100 100"
                    className="bf-hole pointer-events-none absolute left-1/2 top-1/2 -ml-[32%] -mt-[32%] w-[64%]"
                    aria-hidden="true"
                  >
                    <defs>
                      <radialGradient id="bf-deep" cx="50%" cy="45%" r="60%">
                        <stop offset="0" stopColor="#1d5a86" />
                        <stop offset="0.55" stopColor="#0b2a45" />
                        <stop offset="1" stopColor="#050d18" />
                      </radialGradient>
                    </defs>
                    <polygon
                      points="50,4 62,16 78,10 80,28 96,36 86,50 98,64 80,72 82,90 64,86 52,98 40,86 22,92 22,74 4,66 14,50 2,36 20,28 18,10 36,16"
                      fill="url(#bf-deep)"
                      stroke="#a979fa"
                      strokeWidth="2"
                      strokeLinejoin="miter"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            3D shark: “
            <a href={credit.url} target="_blank" rel="noreferrer" className="underline">
              {credit.title}
            </a>
            ” by {credit.author}, licensed{" "}
            <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="underline">
              {credit.license}
            </a>
            .
            {botForgeInfo.shark.moreCredits.map((m) => (
              <span key={m.url}>
                {" "}
                {m.what}: “
                <a href={m.url} target="_blank" rel="noreferrer" className="underline">
                  {m.title}
                </a>
                ” by {m.author}, {credit.license}.
              </span>
            ))}
          </p>
          {mode === "3d" && (
            <span className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={play}
                className="border-2 border-border bg-card px-3 py-1.5 font-bold text-foreground"
              >
                Break the glass again
              </button>
            </span>
          )}
          {/* Always in reach, wherever the shark has swum to. */}
          {mode === "3d" && phase !== "idle" && (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={hidden}
              className="fixed bottom-4 left-4 z-40 border-2 border-border bg-card px-3 py-1.5 font-bold text-foreground shadow-hard"
            >
              {hidden ? "Bring the shark back" : "Hide the shark"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
