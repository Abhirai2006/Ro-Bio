// The Shark Tank banner: it shakes, cracks and breaks open, and a realistic 3D shark rushes out of the hole at
// you, then hovers there biting. Only on the Shark Tank page. On phones, for people who turn off motion, and
// where 3D does not work, the banner shows a still picture of the shark already out of the hole.
import { useEffect, useRef, useState } from "react";
import { botForgeInfo, contestBySlug, rupees } from "@/lib/site";
import type { SharkScene } from "./shark-scene";
import "./bot-forge.css";

type Phase = "idle" | "crack" | "burst" | "done" | "still";

// Pieces of the banner thrown out from the hole: where each one flies to and how much it spins.
const SHARDS = [
  { dx: "-150px", dy: "-90px", rot: "-160deg", clip: "polygon(0 0, 100% 20%, 30% 100%)" },
  { dx: "120px", dy: "-120px", rot: "140deg", clip: "polygon(10% 0, 100% 40%, 0 100%)" },
  { dx: "170px", dy: "30px", rot: "210deg", clip: "polygon(0 30%, 100% 0, 70% 100%)" },
  { dx: "-190px", dy: "40px", rot: "-220deg", clip: "polygon(20% 0, 100% 100%, 0 70%)" },
  { dx: "-60px", dy: "150px", rot: "120deg", clip: "polygon(0 0, 100% 0, 50% 100%)" },
  { dx: "80px", dy: "160px", rot: "-140deg", clip: "polygon(50% 0, 100% 100%, 0 80%)" },
  { dx: "-20px", dy: "-170px", rot: "90deg", clip: "polygon(0 100%, 40% 0, 100% 60%)" },
  { dx: "210px", dy: "-40px", rot: "-100deg", clip: "polygon(0 0, 100% 50%, 0 100%)" },
];

/** True where the 3D shark should run: a computer with a mouse, motion allowed. */
const wants3d = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 768px) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SharkBurst() {
  const c = contestBySlug("shark-tank")!;
  const view = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const scene = useRef<SharkScene | null>(null);
  const timers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"wait" | "3d" | "still">("wait");
  const credit = botForgeInfo.shark.credit;

  const play = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase("crack");
    scene.current?.play();
    timers.current = [
      window.setTimeout(() => setPhase("burst"), 650),
      window.setTimeout(() => setPhase("done"), 1500),
    ];
  };

  useEffect(() => {
    if (!wants3d()) {
      setMode("still");
      setPhase("still");
      return;
    }
    let cancelled = false;
    let seen: IntersectionObserver | null = null;
    const start = () =>
      import("./shark-scene")
        .then(({ createSharkScene }) => {
          if (cancelled || !view.current) return;
          try {
            scene.current = createSharkScene(
              view.current,
              botForgeInfo.shark.model,
              () => {
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
                  { threshold: 0.5 },
                );
                if (area.current) seen.observe(area.current);
              },
              () => {
                if (cancelled) return;
                setMode("still");
                setPhase("still");
              },
            );
          } catch {
            setMode("still");
            setPhase("still");
          }
        })
        .catch(() => {
          if (cancelled) return;
          setMode("still");
          setPhase("still");
        });
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
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  return (
    <section className="overflow-x-clip border-b-2 border-border" aria-labelledby="shark-title">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="relative">
          <div
            className="bf-banner relative border-2 border-border bg-ink text-paper shadow-hard-violet"
            data-phase={phase}
          >
            <div className="bf-banner-face blueprint grid items-stretch md:grid-cols-[1.1fr_1fr]">
              <div className="relative z-10 p-6 md:p-10">
                <p className="font-pixel text-[11px] text-lens">BOT FORGE / CONTEST</p>
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
                    <span className="font-display text-3xl font-black">{rupees(c.prizes[0])}</span>
                  </span>
                  <span className="border-2 border-paper/70 bg-paper px-3 py-2 text-ink">
                    <span className="block font-pixel text-[9px]">2ND PRIZE</span>
                    <span className="font-display text-3xl font-black">{rupees(c.prizes[1])}</span>
                  </span>
                </div>
              </div>
              <div ref={area} className="relative min-h-[260px] md:min-h-[360px]">
                {/* The cracks spread from the hole, then the hole opens onto dark water. */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <svg
                    viewBox="0 0 200 200"
                    className="bf-cracks absolute left-1/2 top-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    {[
                      "M100 100 L70 82 L52 86 L20 60",
                      "M100 100 L118 70 L112 48 L136 14",
                      "M100 100 L140 106 L160 96 L196 112",
                      "M100 100 L92 136 L104 160 L88 196",
                      "M100 100 L66 120 L40 116 L8 150",
                      "M100 100 L130 134 L152 150 L170 186",
                    ].map((d) => (
                      <path
                        key={d}
                        d={d}
                        fill="none"
                        stroke="#fffffa"
                        strokeWidth="1.6"
                        strokeLinejoin="bevel"
                      />
                    ))}
                  </svg>
                </div>
                <svg
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
                {SHARDS.map((s, i) => (
                  <span
                    key={i}
                    className="bf-shard left-1/2 top-1/2"
                    style={
                      {
                        "--dx": s.dx,
                        "--dy": s.dy,
                        "--rot": s.rot,
                        clipPath: s.clip,
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
          {/* The shark, drawn over the banner and past its edges. Clipped to the hole until it breaks open. */}
          <div
            ref={view}
            className="bf-shark-view pointer-events-none absolute right-[-18%] top-[-55%] z-20 h-[210%] w-[84%] max-md:bottom-[-4%] max-md:right-[-5%] max-md:top-auto max-md:h-[40%] max-md:w-[110%]"
            aria-hidden="true"
          >
            {mode === "still" && (
              <img
                src={botForgeInfo.shark.still}
                alt=""
                width={1413}
                height={1149}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </div>
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
          </p>
          {mode === "3d" && (
            <button
              type="button"
              onClick={play}
              className="border-2 border-border bg-card px-3 py-1.5 font-bold text-foreground"
            >
              Watch the shark again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
