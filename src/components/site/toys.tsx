import { useEffect, useRef, useState } from "react";

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
