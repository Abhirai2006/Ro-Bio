import { useEffect, useRef, useState } from "react";
import { POSES, rigMarkup } from "@/lib/robo-rig";
import { startRobo } from "@/lib/robo-brain";

export function RoboCompanion() {
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const sr = useRef<HTMLParagraphElement>(null);
  const brain = useRef<ReturnType<typeof startRobo> | null>(null);
  const [label, setLabel] = useState("ASLEEP");
  const [asleep, setAsleep] = useState(true);
  const [xray, setXray] = useState(false);

  useEffect(() => {
    if (!host.current || !bubble.current || !sr.current) return;
    let seen = false;
    try { seen = sessionStorage.getItem("robo-woke") === "1"; } catch { /* private mode */ }
    brain.current = startRobo(host.current, bubble.current, sr.current, {
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      seen,
      onPhase: (l, a) => { setLabel(l); setAsleep(a); },
    });
    return () => brain.current?.stop();
  }, []);

  return (
    <div className="border-2 border-border bg-card shadow-hard">
      <div className="flex items-center justify-between border-b-2 border-border bg-lilac px-3 py-1 font-pixel text-[10px] text-ink">
        <span>ROBO</span>
        <span>{label}</span>
      </div>
      <div className="blueprint relative">
        <div ref={bubble} data-on="false" aria-hidden="true" className="pointer-events-none absolute left-3 top-3 z-10 w-max max-w-[40%] border-2 border-border bg-paper px-3 py-2 font-pixel text-[10px] leading-4 text-ink opacity-0 shadow-hard transition-opacity data-[on=true]:opacity-100" />
        <div ref={host} onClick={() => brain.current?.poke()} className="h-[250px] cursor-pointer sm:h-[290px]" dangerouslySetInnerHTML={{ __html: rigMarkup(POSES.sleep) }} />
        <p ref={sr} role="status" className="sr-only" />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t-2 border-border p-2">
        <button type="button" aria-pressed={xray} onClick={() => { setXray(!xray); brain.current?.xray(!xray); }} className="border-2 border-border bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-hard">
          X-ray {xray ? "on" : "off"}
        </button>
        <button type="button" onClick={() => brain.current?.poke()} className="border-2 border-border bg-card px-3 py-1 text-xs font-bold">
          {asleep ? "Wake it" : "Poke it"}
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">It watches your cursor.</span>
      </div>
    </div>
  );
}
