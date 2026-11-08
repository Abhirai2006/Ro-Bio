import { useEffect, useRef, useState } from "react";
import { squadFx, type SquadSlug } from "@/lib/squad-fx";
import { SQUAD_FPS, squadLoops } from "@/lib/squad-loops";
import "./squad-fx.css";

const ART = "/team/art";

/** What each picture shows, for screen readers. */
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

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * A squad's picture, brought to life: the server sends the still poster, and in the browser the squad's
 * animated loop fades in over it, with the light layer on top (src/lib/squad-fx.ts). Effects on things
 * that move in the clip follow them frame by frame. The loop plays muted, pauses when it is off screen
 * or the tab is hidden, and has Pause and Sound buttons. Reduced motion keeps the still poster only.
 */
export function SquadArt({
  slug,
  priority = false,
  className = "",
}: {
  slug: SquadSlug;
  priority?: boolean;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<FrameVideo>(null);
  const layer = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<960 | 1600 | null>(null);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const held = useRef(false); // paused by the visitor, not by scrolling away

  // Pick the clip size once we know the box, and only if the visitor is fine with motion.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const pick = () => {
      if (mq?.matches) return setSize(null);
      const px = (wrap.current?.clientWidth ?? 0) * Math.min(window.devicePixelRatio || 1, 2);
      setSize(px > 1000 ? 1600 : 960);
    };
    pick();
    mq?.addEventListener?.("change", pick);
    return () => mq?.removeEventListener?.("change", pick);
  }, []);

  // Play while on screen and the tab is visible; follow the clip with the tracked effects.
  useEffect(() => {
    const v = video.current;
    const el = wrap.current;
    if (!v || !el || !size) return;
    v.muted = true;
    let onScreen = false;
    const sync = () => {
      if (onScreen && !held.current && document.visibilityState === "visible")
        void v.play().catch(() => undefined);
      else v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = !!e?.isIntersecting;
        sync();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    const loop = squadLoops[slug];
    const parts = Object.entries(loop.tracks).map(
      ([id, xy]) => [layer.current?.querySelector(`[data-track="${id}"]`), xy] as const,
    );
    let raf = 0;
    let vfc = 0;
    const place = (time: number) => {
      const f = Math.floor(time * SQUAD_FPS + 0.001) % loop.frames;
      for (const [node, xy] of parts)
        node?.setAttribute("transform", `translate(${xy[2 * f]} ${xy[2 * f + 1]})`);
    };
    const tick = () => {
      place(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      place(meta.mediaTime);
      vfc = v.requestVideoFrameCallback!(onFrame);
    };
    if (parts.length) {
      if (v.requestVideoFrameCallback) vfc = v.requestVideoFrameCallback(onFrame);
      else raf = requestAnimationFrame(tick);
    }
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
      if (vfc) v.cancelVideoFrameCallback?.(vfc);
    };
  }, [size, slug]);

  const togglePause = () => {
    const v = video.current;
    if (!v) return;
    held.current = !held.current;
    setPaused(held.current);
    if (held.current) v.pause();
    else void v.play().catch(() => undefined);
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    v.volume = 0.8;
    setMuted(v.muted);
    if (!v.muted && held.current) togglePause();
  };

  const poster = (w: number) => `${ART}/${slug}-poster-${w}.webp`;
  return (
    <div ref={wrap} className={`relative aspect-[16/9] overflow-hidden bg-secondary ${className}`}>
      <img
        src={poster(1600)}
        srcSet={`${poster(960)} 960w, ${poster(1600)} 1600w`}
        sizes="(min-width: 1152px) 1120px, 100vw"
        width={1600}
        height={900}
        alt={squadArtAlt[slug]}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {size && (
        <video
          ref={video}
          aria-hidden="true"
          tabIndex={-1}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          poster={poster(size)}
          onPlaying={() => setLive(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"}`}
        >
          <source src={`${ART}/${slug}-${size}.webm`} type="video/webm" />
          <source src={`${ART}/${slug}-${size}.mp4`} type="video/mp4" />
        </video>
      )}
      {size && (
        <svg
          ref={layer}
          className={`sfx-layer pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"} ${paused ? "sfx-paused" : ""}`}
          viewBox="0 0 1600 900"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: squadFx(slug, { art: `${ART}/${slug}-${size}.webp` }),
          }}
        />
      )}
      {size && live && (
        <div className="absolute right-2 bottom-2 flex gap-2">
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={paused}
            className="sq-ctl"
            aria-label={paused ? "Play the animation" : "Pause the animation"}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              {paused ? (
                <path d="M4 2l10 6-10 6z" fill="currentColor" />
              ) : (
                <path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor" />
              )}
            </svg>
            <span className="sq-ctl-word">{paused ? "PLAY" : "PAUSE"}</span>
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            className="sq-ctl"
            aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" />
              {muted ? (
                <path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="1.8" />
              ) : (
                <path
                  d="M11 5.5c1.3 1.4 1.3 3.6 0 5M13 3.5c2.4 2.5 2.4 6.5 0 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              )}
            </svg>
            <span className="sq-ctl-word">{muted ? "SOUND OFF" : "SOUND ON"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
