import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * When the page is opened at a person's anchor (from a blog post, say), scrolls their card into view and lights it
 * up for a few seconds, so it is clear who was meant.
 */
export function useHashSpotlight() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // wait for the cards to rise into place first
    const on = window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
      el.setAttribute("data-spotlight", "");
    }, 400);
    const off = window.setTimeout(() => el.removeAttribute("data-spotlight"), 5000);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
      el.removeAttribute("data-spotlight");
    };
  }, [hash]);
}
