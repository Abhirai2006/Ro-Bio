import { logoUrl } from "@/components/site/parts";

// Runs before the boot screen is parsed. Skips it on repeat visits in this tab, for reduced motion, and on any tap or key.
// It only ever adds a <style> to <head>, so React's hydration never sees a difference.
const skip = `(function(){try{var h=document.head,s=function(){if(!document.getElementById("boot-skip")){var e=document.createElement("style");e.id="boot-skip";e.textContent=".boot{display:none!important}";h.appendChild(e)}};
if(sessionStorage.getItem("robio-boot")||matchMedia("(prefers-reduced-motion: reduce)").matches)return s();sessionStorage.setItem("robio-boot","1");
addEventListener("pointerdown",s,{once:true});addEventListener("keydown",s,{once:true})}catch(e){}})();`;

// A heartbeat that turns into a circuit trace: the club in one line. Drawn in a 320 x 60 box.
const TRACE = "M0 34 H70 L80 34 L86 28 L92 34 L104 34 L110 40 L120 6 L132 56 L140 34 L156 34 L166 24 L176 34 H206 V18 H246 V44 H284 V30 H312";

const LOG = ["POWER ON", "SENSORS OK", "HEARTBEAT FOUND", "RO-BIO READY"];

/** First-visit boot screen. Pure CSS timing, so it hides itself even if JavaScript never runs. */
export function BootScreen() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: skip }} />
      <div className="boot" aria-hidden="true">
        <div className="boot-door boot-door-top" />
        <div className="boot-door boot-door-bottom" />
        <div className="boot-stage">
          <div className="boot-dial">
            <svg viewBox="0 0 120 120" className="boot-ring">
              {Array.from({ length: 24 }, (_, i) => (
                <line key={i} x1="60" y1="4" x2="60" y2={i % 6 ? "9" : "13"} transform={`rotate(${i * 15} 60 60)`} />
              ))}
              <circle cx="60" cy="60" r="47" className="boot-arc" />
            </svg>
            <img src={logoUrl} alt="" width={112} height={112} className="boot-logo" />
          </div>
          <svg viewBox="0 0 320 80" className="boot-trace">
            <defs>
              <linearGradient id="boot-grad" x1="0" x2="320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0.35" stopColor="#f3a9c0" />
                <stop offset="0.62" stopColor="#6294ff" />
              </linearGradient>
            </defs>
            <path d={TRACE} className="boot-trace-dim" />
            <path d={TRACE} className="boot-trace-live" />
            <circle cx="312" cy="30" r="5" className="boot-pad" />
            <text x="88" y="76" className="boot-label boot-label-bio">BIO</text>
            <text x="246" y="76" className="boot-label boot-label-robo">ROBOTICS</text>
          </svg>
          <ol className="boot-log">
            {LOG.map((l, i) => (
              <li key={l} style={{ animationDelay: `${0.15 + i * 0.25}s` }}>
                <span>&gt;</span> {l}
              </li>
            ))}
          </ol>
          <div className="boot-bar">
            <div />
          </div>
          <p className="boot-tag">Biomedical and Robotic Engineering / MUSE</p>
        </div>
      </div>
    </>
  );
}
