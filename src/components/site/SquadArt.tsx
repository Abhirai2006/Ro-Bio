import { useEffect, useRef, useState } from "react";
import { squadFx, type SquadSlug } from "@/lib/squad-fx";
import { squadRigs } from "@/lib/squad-rigs";
import { startPuppet, type Puppet } from "@/lib/puppet-gl";
import { H, W } from "@/lib/puppet";
import "./squad-fx.css";

const ART = "/team/art";

/** What each illustration shows, for screen readers. */
const squadArtAlt: Record<SquadSlug, string> = {
  projects:
    "Drawing: a student presents robot sketches on a whiteboard, a sensor array, a battery module, a 3 DoF joint arm and a legged robot.",
  events:
    "Drawing: four students plan an event at a table, with an event layout on the board from the entrance to the stage.",
  technical:
    "Drawing: students build and debug in a lab lit by RGB strips, with a laptop, a circuit board and a gaming PC.",
  "social-media":
    "Drawing: students hand out QR code flyers on a street, one shouts into a megaphone and one films on a phone.",
  design:
    "Drawing: a design studio where students sketch on a tablet, lay out a poster on a monitor, pin sketches to a board and 3D print a figure.",
};

/**
 * A squad's illustration. With `fx`, the picture comes alive once the page is running in the browser
 * (and only if the visitor has not asked for reduced motion): the people move (src/lib/squad-rigs.ts)
 * and the light effects play over them (src/lib/squad-fx.ts). The server and the browser render the
 * same still picture first, and the moving one fades in over it. With `interactive`, tapping a person
 * makes them act it out more. `name` lets the picture glide from the team page into the squad page.
 */
export function SquadArt({
  slug,
  fx = false,
  interactive = false,
  priority = false,
  className = "",
}: {
  slug: SquadSlug;
  fx?: boolean;
  interactive?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<SVGSVGElement>(null);
  const pup = useRef<Puppet | null>(null);
  const [motion, setMotion] = useState(false);
  const [moving, setMoving] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    if (!fx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setMotion(true);
  }, [fx]);

  useEffect(() => {
    const rig = squadRigs[slug];
    const el = canvas.current;
    if (!motion) return;
    if (!rig || !el) {
      setNoGl(true);
      return;
    }
    const big = (wrap.current?.clientWidth ?? 0) * Math.min(window.devicePixelRatio || 1, 2) > 1000;
    const p = startPuppet(el, rig, {
      base: slug,
      art: (n) =>
        rig.layers?.includes(n) ? `${ART}/${n}.webp` : `${ART}/${n}-${big ? 1600 : 960}.webp`,
      step: big ? 6 : 10,
      onReady: () => setMoving(true),
      onTrack: (id, dx, dy) =>
        layer.current
          ?.querySelector(`[data-track="${id}"]`)
          ?.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`),
    });
    if (!p) setNoGl(true);
    pup.current = p;
    return () => {
      p?.stop();
      pup.current = null;
      setMoving(false);
    };
  }, [motion, slug]);

  const at = (e: React.PointerEvent): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  // Without WebGL the pencil still redraws the whiteboard, so the picture under it loses the sketches.
  const base = motion && noGl && slug === "projects" ? `${slug}-clean` : slug;
  const showFx = motion && (moving || noGl);
  return (
    <div
      ref={wrap}
      className={`relative aspect-[16/9] overflow-hidden bg-secondary ${className}`}
      style={{ viewTransitionName: `squad-art-${slug}` }}
      onPointerEnter={() => pup.current?.hover(true)}
      onPointerLeave={() => pup.current?.hover(false)}
      onPointerMove={
        interactive
          ? (e) => {
              e.currentTarget.style.cursor = pup.current?.over(at(e)) ? "pointer" : "";
            }
          : undefined
      }
      onPointerDown={
        interactive
          ? (e) => {
              if (pup.current?.poke(at(e))) setTapped(true);
            }
          : undefined
      }
    >
      <img
        src={`${ART}/${base}-1600.webp`}
        srcSet={`${ART}/${base}-960.webp 960w, ${ART}/${base}-1600.webp 1600w`}
        sizes="(min-width: 1152px) 1120px, 100vw"
        width={1600}
        height={900}
        alt={squadArtAlt[slug]}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {motion && !noGl && (
        <canvas
          ref={canvas}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${moving ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {showFx && (
        <svg
          ref={layer}
          className="sfx-layer pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1600 900"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: squadFx(slug, {
              ink: `${ART}/projects-ink.webp`,
              art: `${ART}/${slug}-${(wrap.current?.clientWidth ?? 0) > 700 ? 1600 : 960}.webp`,
            }),
          }}
        />
      )}
      {interactive && moving && !tapped && (
        <p className="pointer-events-none absolute right-2 bottom-2 border-2 border-border bg-card px-2 py-1 font-pixel text-[10px] shadow-hard">
          TAP SOMEONE IN THE PICTURE
        </p>
      )}
    </div>
  );
}
