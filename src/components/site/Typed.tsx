import { useEffect, useState } from "react";

/** Types out one word, deletes it, then the next. Shows the first word and stays still if motion is reduced. */
export function Typed({ words }: { words: string[] }) {
  const key = words.join("|");
  const [text, setText] = useState(words[0] ?? "");

  useEffect(() => {
    if (words.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, n = words[0]!.length, dir = -1, timer = 0;
    const tick = () => {
      const w = words[i]!;
      n += dir;
      setText(w.slice(0, Math.max(0, n)));
      let delay = dir > 0 ? 70 : 38;
      if (dir > 0 && n >= w.length) { dir = -1; delay = 1500; }
      else if (dir < 0 && n <= 0) { dir = 1; i = (i + 1) % words.length; delay = 250; }
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 1800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <span className="font-bold text-foreground" role="text" aria-label={words.join(", ")}>
      <span aria-hidden="true">{text}</span><span aria-hidden="true" className="animate-pulse">▌</span>
    </span>
  );
}
