import type { CSSProperties } from "react";

// A real P-QRS-T shape that settles into a flat wire.
const ECG = "M0 24 H96 C102 14 114 14 120 24 H150 L156 29 L166 3 L176 42 L182 24 H222 C232 10 252 10 262 24 H600";

function Line({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 600 48" preserveAspectRatio="none" aria-hidden="true">
      <path d={ECG} pathLength={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const HeroPulse = () => <Line className="hero-pulse" />;
export const PulseDivider = () => <Line className="divider" />;

// Splits a word into letters that rise one by one. Screen readers get the label from the heading.
export function SplitWord({ text }: { text: string }) {
  return (
    <span className="split" aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties}>{ch}</span>
      ))}
    </span>
  );
}
