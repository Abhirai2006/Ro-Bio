import { useEffect, useRef, useState } from "react";

/** Small robot head in the corner whose eyes and head follow the cursor. */
export function RobotFace() {
  const ref = useRef<HTMLButtonElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [happy, setHappy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 300);
      setLook({ x: (dx / d) * k, y: (dy / d) * k });
    };
    window.addEventListener("pointermove", onMove);
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(id);
    };
  }, []);

  if (hidden) return null;
  const ex = look.x * 5;
  const ey = look.y * 4;
  return (
    <div className="fixed bottom-4 right-4 z-50 hidden sm:block">
      <button
        ref={ref}
        type="button"
        onClick={() => {
          setHappy(true);
          window.setTimeout(() => setHappy(false), 1200);
        }}
        aria-label="RO-BIO robot buddy. Click to say hi."
        className="block h-20 w-20 transition-transform hover:scale-105"
        style={{ transform: `rotate(${look.x * 8}deg)` }}
      >
        <svg viewBox="0 0 80 80" className="h-full w-full drop-shadow">
          <line x1="40" y1="12" x2="40" y2="4" className="stroke-ink" strokeWidth="3" />
          <circle cx="40" cy="4" r="3.5" className={happy ? "fill-lens" : "fill-lilac"} />
          <rect x="8" y="12" width="64" height="56" rx="18" className="fill-lilac stroke-ink" strokeWidth="3" />
          <rect x="15" y="22" width="50" height="32" rx="12" className="fill-ink" />
          {happy ? (
            <g className="stroke-lens" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M24 40 q6 -8 12 0" />
              <path d="M44 40 q6 -8 12 0" />
            </g>
          ) : (
            <g className="fill-lens">
              <ellipse cx={30 + ex} cy={38 + ey} rx="5" ry={blink ? 0.8 : 6} />
              <ellipse cx={50 + ex} cy={38 + ey} rx="5" ry={blink ? 0.8 : 6} />
            </g>
          )}
          <rect x="30" y="58" width="20" height="4" rx="2" className={happy ? "fill-lens" : "fill-ink"} />
        </svg>
      </button>
      {happy && (
        <span className="absolute -top-8 right-0 whitespace-nowrap border-2 border-border bg-card px-2 py-1 font-pixel text-[10px]">
          HI, HUMAN!
        </span>
      )}
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="absolute -left-2 -top-2 grid h-5 w-5 place-items-center rounded-full border-2 border-border bg-card text-[10px] leading-none"
        aria-label="Hide robot buddy"
      >
        ×
      </button>
    </div>
  );
}

/** Flip card: front shows initials (photo later), back shows role. */
export function FlipCard({ front, back, label }: { front: React.ReactNode; back: React.ReactNode; label: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped(!flipped)}
      aria-pressed={flipped}
      aria-label={`${label}. Tap to flip.`}
      className="group block h-56 w-full text-left [perspective:900px]"
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div className="absolute inset-0 border-2 border-border bg-card shadow-hard [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 border-2 border-border bg-primary text-primary-foreground shadow-hard [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </button>
  );
}
