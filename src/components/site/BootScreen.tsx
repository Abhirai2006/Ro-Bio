import { useEffect, useRef, useState } from "react";
import { POSES, rigMarkup } from "@/lib/robo-rig";

// Runs before the intro is parsed. Skips it on repeat visits in this tab and for reduced motion.
// It only ever adds a <style> to <head>, so React's hydration never sees a difference.
const skip = `(function(){try{var s=function(){var e=document.createElement("style");e.id="boot-skip";e.textContent=".boot{display:none!important}";document.head.appendChild(e)};
if(sessionStorage.getItem("robio-boot")||matchMedia("(prefers-reduced-motion: reduce)").matches)return s();sessionStorage.setItem("robio-boot","1")}catch(e){}})();`;

// Robo, standing, with his ids renamed so they never clash with the Robo who roams the site.
const robo = rigMarkup({ ...POSES.stand }, false, false)
  .replace(/id="rb-/g, 'id="bt-')
  .replace('<rect class="shell" x="-25" y="-9"', '<rect class="shell bt-pelvis" x="-25" y="-9"');

const LOG = [
  [0.2, "Unpacking Robo..."],
  [0.9, "Fitting servos 6/6"],
  [1.7, "Head on. Eyes on."],
  [2.6, "X-ray: bones, lungs, heart"],
  [3.5, "Heartbeat found"],
  [4.3, "RO-BIO is awake. Let's build!"],
] as const;

// Where the parts snap together, as a share of his box: hips, shoulders, neck. Third value: when.
const SPARKS = [
  [50, 58, 0.62],
  [38.5, 31, 1.18],
  [61.5, 31, 1.32],
  [50, 24, 1.62],
] as const;

// One heartbeat, 150 units wide. Four of them scroll by 300 units, so the strip loops without a seam.
const BEAT = "h34 l6 -5 l6 5 h10 l5 7 l8 -34 l9 44 l6 -17 h14 l9 -8 l9 8 h34";

const TAP_LINES = ["Again!", "Ooh, that tickles.", "My heart is racing!", "Faster, faster!", "Okay okay, I'm awake!"];

/** First-visit intro: Robo gets built, X-rayed and switched on. Times itself in CSS, so it hides even without JavaScript. */
export function BootScreen() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false); // once you start playing, it waits for you
  const [bpm, setBpm] = useState(72);
  const [taps, setTaps] = useState(0);
  const idle = useRef(0);
  const body = useRef<HTMLSpanElement>(null);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => setGone(true), 650);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") leave();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  // The heart settles back down when you stop tapping.
  useEffect(() => {
    if (!held || leaving) return;
    const calm = window.setInterval(() => setBpm((b) => Math.max(72, b - 3)), 400);
    return () => window.clearInterval(calm);
  }, [held, leaving]);

  useEffect(() => () => window.clearTimeout(idle.current), []);

  const tap = () => {
    if (leaving) return;
    setHeld(true);
    setTaps((t) => t + 1);
    setBpm((b) => Math.min(180, b + 14));
    // a squash each time you tap him (re-mounting him would replay the whole assembly)
    body.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.06, 0.94)" }, { transform: "scale(1)" }], { duration: 280, easing: "ease-out" });
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(leave, 7000); // let them go once they stop playing
  };

  if (gone) return null;
  const line = taps ? TAP_LINES[Math.min(TAP_LINES.length - 1, Math.floor((bpm - 72) / 24))]! : "Tap me. My heart speeds up.";

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: skip }} />
      <div
        className={`boot${held ? " boot-held" : ""}${leaving ? " boot-leave" : ""}`}
        style={{ "--bpm": bpm } as React.CSSProperties}
        role="dialog"
        aria-label="RO-BIO intro"
      >
        <div className="boot-door boot-door-top" aria-hidden="true" />
        <div className="boot-door boot-door-bottom" aria-hidden="true" />
        <button type="button" className="boot-skip" onClick={leave}>
          Skip intro
        </button>
        <div className="boot-stage">
          <p className="boot-title" aria-hidden="true">
            RO-BIO <span>/ assembly bench</span>
          </p>

          <div className="boot-bench">
            <button type="button" className="boot-robo-hit" onClick={tap} aria-label={`Tap Robo to speed up his heart. ${bpm} beats per minute.`}>
              <span ref={body} className="boot-robo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: robo }} />
              <span className="boot-scan" aria-hidden="true" />
              {SPARKS.map(([x, y, t]) => (
                <span key={t} className="boot-spark" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${t}s` }} />
              ))}
            </button>
            <p className="boot-say boot-say-hi" aria-hidden="true">
              Hi! I'm Robo.
            </p>
            <p className={`boot-say boot-say-tap${taps ? " boot-say-live" : ""}`} aria-live="polite">
              {line}
            </p>
            <p className="boot-xray-note" aria-hidden="true">
              Robot outside. <em>Biology inside.</em>
            </p>
          </div>

          <div className="boot-ecg" aria-hidden="true">
            <span className="boot-bpm">
              <b key={taps}>♥</b> {bpm} BPM
            </span>
            <svg viewBox="0 0 300 60" preserveAspectRatio="none">
              <path className="boot-ecg-run" d={`M0 36 ${BEAT} ${BEAT} ${BEAT} ${BEAT}`} />
            </svg>
            <span className="boot-servo">SERVOS 6/6</span>
          </div>

          <ol className="boot-log" aria-hidden="true">
            {LOG.map(([t, l]) => (
              <li key={l} style={{ animationDelay: `${t}s` }}>
                <span>&gt;</span> {l}
              </li>
            ))}
          </ol>
          <div className="boot-bar" aria-hidden="true">
            <div />
          </div>
          <button type="button" className="boot-enter" onClick={leave}>
            Enter RO-BIO →
          </button>
        </div>
      </div>
    </>
  );
}
