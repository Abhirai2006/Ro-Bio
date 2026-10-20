import type { CSSProperties } from "react";

// Splits a word into letters that rise one by one. Screen readers get the label from the heading.
export default function SplitWord({ text }: { text: string }) {
  return (
    <span className="split" aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties}>{ch}</span>
      ))}
    </span>
  );
}
