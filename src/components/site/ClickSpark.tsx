import { useEffect } from "react";

/**
 * A small pixel spark where you click, like the sparkle on the Robo Spark poster. It is a few spans that remove
 * themselves after half a second. Never in text fields, never more than a handful at once, and off entirely for
 * people who ask for reduced motion (the CSS hides it in high contrast mode too).
 */
export function ClickSpark() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let live = 0;
    const onDown = (e: PointerEvent) => {
      if (reduce.matches || !e.isPrimary || e.button > 0 || live >= 6) return;
      if (
        (e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true']")
      )
        return;
      const burst = document.createElement("span");
      burst.className = "click-spark";
      burst.setAttribute("aria-hidden", "true");
      burst.style.left = `${e.clientX}px`;
      burst.style.top = `${e.clientY}px`;
      for (let i = 0; i < 6; i++) {
        const bit = document.createElement("span");
        const a = (i / 6) * Math.PI * 2 + 0.3;
        bit.style.setProperty("--dx", `${Math.round(Math.cos(a) * 18)}px`);
        bit.style.setProperty("--dy", `${Math.round(Math.sin(a) * 18)}px`);
        burst.appendChild(bit);
      }
      document.body.appendChild(burst);
      live++;
      window.setTimeout(() => {
        burst.remove();
        live--;
      }, 520);
    };
    addEventListener("pointerdown", onDown, { passive: true });
    return () => removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
