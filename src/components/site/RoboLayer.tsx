import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { POSES, rigMarkup } from "@/lib/robo-rig";
import { walkMarkup } from "@/lib/robo-walk";
import { startRoam } from "@/lib/robo-roam";

type Pref = "on" | "rest" | "hidden";
const KEY = "robio-robo";
const css = `.rr{position:absolute;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid var(--lens);box-shadow:0 0 14px var(--lens),inset 0 0 14px var(--lens);opacity:0;pointer-events:none}
.rr.go{animation:rrgo .6s ease-out}@keyframes rrgo{0%{opacity:0;transform:scale(.2) rotate(0)}25%{opacity:1}100%{opacity:0;transform:scale(1.5) rotate(160deg)}}
@media (prefers-reduced-motion:reduce){.rr.go{animation:none}}`;

/** Robo lives here: a fixed layer over the whole site, mounted once in the root layout so he travels between pages. */
export function RoboLayer() {
  const [ready, setReady] = useState(false);
  const [pref, setPref] = useState<Pref>("on");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const r = {
    layer: useRef<HTMLDivElement>(null), robo: useRef<HTMLDivElement>(null), puppet: useRef<HTMLDivElement>(null), front: useRef<HTMLDivElement>(null),
    side: useRef<HTMLDivElement>(null), hit: useRef<HTMLButtonElement>(null), bubble: useRef<HTMLDivElement>(null), live: useRef<HTMLParagraphElement>(null),
    scan: useRef<HTMLDivElement>(null), ringA: useRef<HTMLDivElement>(null), ringB: useRef<HTMLDivElement>(null),
  };
  const brain = useRef<ReturnType<typeof startRoam> | null>(null);
  const prefRef = useRef<Pref>("on");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v === "rest" || v === "hidden") { setPref(v); prefRef.current = v; } } catch { /* private mode */ }
    setReady(true);
  }, []);
  const choose = (v: Pref) => { setPref(v); prefRef.current = v; setMenu(null); try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

  const active = ready && pref !== "hidden";
  useEffect(() => {
    if (!active) return;
    const el = (k: keyof typeof r) => r[k].current as HTMLElement | null;
    const dom = { layer: el("layer"), robo: el("robo"), puppet: el("puppet"), front: el("front"), side: el("side"), hit: el("hit"), bubble: el("bubble"), live: el("live"), scan: el("scan"), ringA: el("ringA"), ringB: el("ringB") };
    if (Object.values(dom).some((v) => !v)) return;
    let seen = false;
    try { seen = sessionStorage.getItem("robo-woke") === "1"; } catch { /* private mode */ }
    brain.current = startRoam(dom as Parameters<typeof startRoam>[0], {
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, seen, rest: prefRef.current === "rest",
      onTap: (x, y) => setMenu({ x, y }),
    });
    return () => { brain.current?.stop(); brain.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => { brain.current?.setRest(pref === "rest"); }, [pref]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } brain.current?.onRoute(pathname); }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector("button")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); r.hit.current?.focus(); } };
    const out = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node) && e.target !== r.hit.current) setMenu(null); };
    addEventListener("keydown", esc); addEventListener("pointerdown", out);
    return () => { removeEventListener("keydown", esc); removeEventListener("pointerdown", out); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  if (!ready) return null;
  const item = "block w-full border-b-2 border-border px-3 py-2 text-left text-sm font-bold last:border-b-0 hover:bg-secondary focus-visible:bg-secondary";
  const act = (fn: () => void) => () => { setMenu(null); fn(); };
  return (
    <>
      {active && (
        <div ref={r.layer} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          <style>{css}</style>
          <div ref={r.robo} className="absolute left-0 top-0">
            <div ref={r.puppet} className="relative h-full w-full" style={{ transformOrigin: "50% 93.7%" }}>
              <div ref={r.front} className="absolute inset-0" dangerouslySetInnerHTML={{ __html: rigMarkup(POSES.sleep, false, false) }} />
              <div ref={r.side} className="absolute inset-0" style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: walkMarkup() }} />
              <div ref={r.scan} className="absolute left-[10%] right-[10%] h-[3px] bg-lens opacity-0" style={{ top: "3%", boxShadow: "0 0 10px var(--lens)" }} />
            </div>
            <button
              ref={r.hit} type="button" aria-haspopup="menu" aria-expanded={!!menu}
              aria-label="Robo, the club robot. Press for its menu. You can also drag it around."
              className="pointer-events-auto absolute inset-x-[27%] inset-y-[6%] cursor-grab touch-none rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
            />
          </div>
          <div ref={r.bubble} data-on="false" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[min(260px,70vw)] border-2 border-border bg-paper px-3 py-2 font-pixel text-[10px] leading-4 text-ink opacity-0 shadow-hard transition-opacity data-[on=true]:opacity-100" />
          <div ref={r.ringA} className="rr" /><div ref={r.ringB} className="rr" />
          <p ref={r.live} role="status" className="sr-only" />
          {menu && (
            <div
              ref={menuRef} role="menu" aria-label="Robo's menu"
              style={{ left: Math.min(Math.max(menu.x - 70, 8), innerWidth - 168), top: Math.min(Math.max(menu.y - 190, 80), innerHeight - 230) }}
              className="pointer-events-auto absolute z-20 w-40 border-2 border-border bg-card shadow-hard"
            >
              <button role="menuitem" type="button" className={item} onClick={act(() => brain.current?.emote("xray"))}>X-ray scan</button>
              <button role="menuitem" type="button" className={item} onClick={act(() => brain.current?.emote("wave"))}>Wave</button>
              <button role="menuitem" type="button" className={item} onClick={act(() => brain.current?.emote("poke"))}>Say something</button>
              <button role="menuitem" type="button" className={item} onClick={act(() => choose("rest"))}>Sit and rest</button>
              <button role="menuitem" type="button" className={item} onClick={act(() => choose("hidden"))}>Hide Robo</button>
            </div>
          )}
        </div>
      )}
      <div className="fixed bottom-3 right-3 z-[61] flex border-2 border-border bg-card text-xs font-bold shadow-hard">
        {pref === "hidden" ? (
          <button type="button" className="px-3 py-2" onClick={() => choose("on")}>Show Robo</button>
        ) : (
          <>
            <button type="button" aria-pressed={pref === "rest"} className="px-3 py-2" onClick={() => choose(pref === "rest" ? "on" : "rest")}>
              {pref === "rest" ? "Wake Robo" : "Rest Robo"}
            </button>
            <button type="button" className="border-l-2 border-border px-3 py-2" onClick={() => choose("hidden")}>Hide</button>
          </>
        )}
      </div>
    </>
  );
}
