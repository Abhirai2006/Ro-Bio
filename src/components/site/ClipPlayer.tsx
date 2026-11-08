import { useEffect, useRef, useState } from "react";
import "./squad-fx.css";

/**
 * A short clip that plays once, muted, the first time it is on screen, pauses when it scrolls away, and
 * stops on its last frame with a Replay button. Sound and Pause buttons sit on top. For people who ask for
 * reduced motion it never starts by itself: the poster shows with a Play button instead.
 */
export function ClipPlayer({
  src,
  poster,
  label,
  className = "",
}: {
  /** the .mp4 file (H.264 plays in every browser) */
  src: string;
  poster?: string | undefined;
  /** what the clip shows, for screen readers */
  label: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "ended">("idle");
  const [muted, setMuted] = useState(true);
  const held = useRef(false); // paused by the visitor or played to the end
  const auto = useRef(false);

  useEffect(() => {
    const v = video.current;
    const el = wrap.current;
    if (!v || !el) return;
    auto.current = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!auto.current) held.current = true;
    let onScreen = false;
    const sync = () => {
      if (onScreen && !held.current && document.visibilityState === "visible")
        void v.play().catch(() => undefined);
      else if (!v.paused) v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = !!e?.isIntersecting;
        sync();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    const onPlay = () => setState("playing");
    const onPause = () => setState((s) => (s === "ended" ? s : held.current ? "paused" : "idle"));
    const onEnd = () => {
      held.current = true;
      setState("ended");
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnd);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnd);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [src]);

  const play = (fromStart = false) => {
    const v = video.current;
    if (!v) return;
    held.current = false;
    if (fromStart) v.currentTime = 0;
    void v.play().catch(() => undefined);
  };
  const pause = () => {
    held.current = true;
    video.current?.pause();
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div
      ref={wrap}
      data-robo-quiet
      data-robo-avoid
      className={`relative overflow-hidden bg-secondary ${className}`}
    >
      <video
        ref={video}
        aria-label={label}
        muted
        playsInline
        preload="metadata"
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="absolute right-2 bottom-2 flex gap-2">
        {state === "ended" ? (
          <button
            type="button"
            onClick={() => play(true)}
            className="sq-ctl sq-replay"
            aria-label="Play the clip again"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M2 1.5v4h4" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="sq-ctl-word">REPLAY</span>
          </button>
        ) : state === "playing" ? (
          <button type="button" onClick={pause} className="sq-ctl" aria-label="Pause the clip">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor" />
            </svg>
            <span className="sq-ctl-word">PAUSE</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => play()}
            className="sq-ctl"
            aria-label="Play the clip"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2l10 6-10 6z" fill="currentColor" />
            </svg>
            <span className="sq-ctl-word">PLAY</span>
          </button>
        )}
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
    </div>
  );
}
