// The Robo Spark presenter. Plain DOM and canvas, no framework, so it runs the same on the website
// and in the offline copy. Slides are drawn at 1920 x 1080 and scaled to fit any screen.
import type { Anim } from "./anims";
import { chime, type Countdown } from "./timer";

export type SlideDef = {
  id: string;
  title: string;
  bg: string;
  transition?: "fade" | "push";
  html: string;
  anims?: Record<string, Anim>;
  timer?: Countdown;
  onEnter?: (el: HTMLElement) => void;
  onLeave?: () => void;
  /** Called after each click reveal, with the step number (1 for the first click). */
  onStep?: (step: number, el: HTMLElement) => void;
};

export type DeckOptions = { exitHref?: string; exitLabel?: string };

const FX: Record<string, string> = {
  fade: "none",
  rise: "translateY(56px)",
  drop: "translateY(-56px)",
  left: "translateX(-80px)",
  right: "translateX(80px)",
  scale: "scale(0.82)",
  pop: "scale(0.4) rotate(-6deg)",
  tilt: "translateY(40px) rotate(4deg)",
};
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const POP_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const HELP: [string, string][] = [
  ["→  Space  PgDn  click", "Next"],
  ["←  PgUp", "Back"],
  ["Home  End", "First or last slide"],
  ["Type a number, then Enter", "Jump to that slide"],
  ["F", "Full screen"],
  ["B", "Black screen (press again to come back)"],
  ["P", "Timer: start or pause"],
  ["R", "Timer: reset"],
  ["+  -", "Timer: add or take away 1 minute"],
  ["M", "Timer chime on or off"],
  ["?", "Show or hide this help"],
];

export function mountDeck(root: HTMLElement, slides: SlideDef[], opts: DeckOptions = {}) {
  const reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("rsd");
  root.tabIndex = -1;
  root.innerHTML = `
    <div class="rsd-stage">${slides.map((s, i) => `<section class="rsd-slide rsd-s-${s.id}" data-i="${i}" aria-label="${s.title}" style="background:${s.bg}">${s.html}</section>`).join("")}</div>
    <div class="rsd-black" hidden></div>
    <div class="rsd-jump" hidden></div>
    <div class="rsd-bar" role="toolbar" aria-label="Presenter controls">
      <button type="button" data-act="prev" aria-label="Previous">&#8249;</button>
      <span class="rsd-count" aria-live="polite"></span>
      <button type="button" data-act="next" aria-label="Next">&#8250;</button>
      <span class="rsd-timer-ctl">
        <span class="rsd-sep"></span>
        <button type="button" data-act="toggle" class="rsd-wide">Start / pause <kbd>P</kbd></button>
        <button type="button" data-act="minus" aria-label="Take away 1 minute">-1 min</button>
        <button type="button" data-act="plus" aria-label="Add 1 minute">+1 min</button>
        <button type="button" data-act="reset">Reset <kbd>R</kbd></button>
        <button type="button" data-act="sound" class="rsd-sound"></button>
      </span>
      <span class="rsd-sep"></span>
      <button type="button" data-act="full">Full screen <kbd>F</kbd></button>
      <button type="button" data-act="help" aria-label="Keyboard help">?</button>
      ${opts.exitHref ? `<a href="${opts.exitHref}" class="rsd-exit">${opts.exitLabel ?? "Exit"}</a>` : ""}
    </div>
    <div class="rsd-help" hidden><div><p class="rsd-help-title">PRESENTER KEYS</p><dl>${HELP.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl><p class="rsd-help-foot">Clickers work too: they send PgDn and PgUp.</p></div></div>`;

  const stage = root.querySelector<HTMLElement>(".rsd-stage")!;
  const els = [...root.querySelectorAll<HTMLElement>(".rsd-slide")];
  const bar = root.querySelector<HTMLElement>(".rsd-bar")!;
  const count = root.querySelector<HTMLElement>(".rsd-count")!;
  const help = root.querySelector<HTMLElement>(".rsd-help")!;
  const black = root.querySelector<HTMLElement>(".rsd-black")!;
  const jumpBox = root.querySelector<HTMLElement>(".rsd-jump")!;
  const soundBtn = root.querySelector<HTMLElement>(".rsd-sound")!;
  const clicksOf = (i: number) =>
    Math.max(
      0,
      ...[...els[i]!.querySelectorAll<HTMLElement>("[data-click]")].map((e) =>
        Number(e.dataset["click"]),
      ),
    );

  let index = -1;
  let step = 0;
  let stops: (() => void)[] = [];
  let running: Animation[] = [];
  let sound = true;
  try {
    sound = localStorage.getItem("robo-spark-sound") !== "off";
  } catch {
    /* default on */
  }
  const paintSound = () => (soundBtn.textContent = sound ? "Chime: on" : "Chime: off");
  paintSound();

  const fit = () => {
    const s = Math.min(root.clientWidth / 1920, root.clientHeight / 1080) || 1;
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  fit();
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
  ro?.observe(root);
  addEventListener("resize", fit);

  const animateIn = (el: HTMLElement, delay: number) => {
    if (reduced || typeof el.animate !== "function") return;
    const fx = el.dataset["fx"] ?? "rise";
    const base = el.style.transform || "";
    const from = `${base} ${FX[fx] ?? FX["rise"]}`.trim().replace(/^none$/, "");
    running.push(
      el.animate(
        [
          { opacity: 0, transform: from || "none" },
          { opacity: 1, transform: base || "none" },
        ],
        {
          duration: fx === "pop" ? 620 : 520,
          delay,
          easing: fx === "pop" ? POP_EASE : EASE,
          fill: "backwards",
        },
      ),
    );
  };

  const setClicks = (i: number, upTo: number) => {
    for (const e of els[i]!.querySelectorAll<HTMLElement>("[data-click]"))
      e.classList.toggle("rsd-shown", Number(e.dataset["click"]) <= upTo);
  };

  const startAnims = (i: number) => {
    for (const f of stops) f();
    stops = [];
    const def = slides[i]!;
    for (const c of els[i]!.querySelectorAll<HTMLCanvasElement>("canvas[data-anim]")) {
      const fn = def.anims?.[c.dataset["anim"] ?? ""];
      const X = c.getContext("2d");
      if (fn && X) stops.push(fn(X, c.width, c.height));
    }
  };

  const paintCount = () => {
    count.textContent = `${index + 1} / ${slides.length}`;
    root.classList.toggle("rsd-has-timer", !!slides[index]?.timer);
  };

  const show = (i: number, toStep: number, dir: number) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = index;
    for (const a of running) a.cancel();
    running = [];
    if (prev >= 0 && prev !== i) slides[prev]!.onLeave?.();
    index = i;
    step = Math.min(toStep, clicksOf(i));
    const el = els[i]!;
    setClicks(i, step);
    for (const e of els)
      e.classList.toggle("rsd-on", e === el || (e === els[prev] && prev !== i && !reduced));
    root.style.background = slides[i]!.bg;

    if (prev >= 0 && prev !== i && !reduced) {
      const out = els[prev]!;
      const kind = slides[i]!.transition ?? "push";
      const d = dir >= 0 ? 1 : -1;
      const opt = {
        duration: kind === "fade" ? 420 : 560,
        easing: "cubic-bezier(0.33, 0.01, 0.2, 1)",
      };
      const a1 =
        kind === "fade"
          ? el.animate([{ opacity: 0 }, { opacity: 1 }], opt)
          : el.animate([{ transform: `translateX(${d * 100}%)` }, { transform: "none" }], opt);
      const a2 =
        kind === "fade"
          ? out.animate([{ opacity: 1 }, { opacity: 0 }], opt)
          : out.animate(
              [
                { transform: "none", opacity: 1 },
                { transform: `translateX(${-d * 35}%)`, opacity: 0.4 },
              ],
              opt,
            );
      a2.finished.then(
        () => out !== els[index] && out.classList.remove("rsd-on"),
        () => {},
      );
      void a1;
    }
    if (prev !== i) {
      const lead = prev >= 0 && !reduced ? 260 : 120;
      for (const e of el.querySelectorAll<HTMLElement>("[data-in]"))
        animateIn(e, lead + Number(e.dataset["in"]) * 150);
      startAnims(i);
      slides[i]!.onEnter?.(el);
      const t = slides[i]!.timer;
      if (t && !t.started) t.autoStart();
    }
    try {
      history.replaceState(null, "", `#${i + 1}`);
    } catch {
      /* file:// or sandboxed */
    }
    paintCount();
  };

  const next = () => {
    if (step < clicksOf(index)) {
      step++;
      const el = els[index]!;
      setClicks(index, step);
      [...el.querySelectorAll<HTMLElement>(`[data-click="${step}"]`)].forEach((e, k) =>
        animateIn(e, k * 120),
      );
      slides[index]!.onStep?.(step, el);
    } else if (index < slides.length - 1) show(index + 1, 0, 1);
  };
  const back = () => {
    if (step > 0) {
      step--;
      setClicks(index, step);
    } else if (index > 0) show(index - 1, 99, -1);
  };

  // The bar and the cursor hide when the mouse rests, so nothing sits on top of the slide.
  let idle = 0;
  const wake = () => {
    root.classList.add("rsd-awake");
    clearTimeout(idle);
    idle = window.setTimeout(() => root.classList.remove("rsd-awake"), 2600);
  };

  const full = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void (root.requestFullscreen?.() ?? document.documentElement.requestFullscreen());
    } catch {
      /* not allowed here */
    }
  };

  const timer = () => slides[index]?.timer;
  const act = (a: string) => {
    const t = timer();
    if (a === "prev") back();
    else if (a === "next") next();
    else if (a === "full") full();
    else if (a === "help") help.hidden = !help.hidden;
    else if (a === "sound") {
      sound = !sound;
      try {
        localStorage.setItem("robo-spark-sound", sound ? "on" : "off");
      } catch {
        /* fine */
      }
      paintSound();
      if (sound) chime();
    } else if (t && a === "toggle") t.toggle();
    else if (t && a === "reset") t.reset();
    else if (t && a === "plus") t.add(60000);
    else if (t && a === "minus") t.add(-60000);
  };

  bar.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!b) return;
    e.stopPropagation();
    act(b.dataset["act"]!);
    root.focus();
  });

  let typed = "";
  let typedAt = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      if (Date.now() - typedAt > 2500) typed = "";
      typed += k;
      typedAt = Date.now();
      jumpBox.textContent = `Go to slide ${typed}`;
      jumpBox.hidden = false;
      return;
    }
    if (k === "Enter" && typed) {
      const n = Number(typed);
      typed = "";
      jumpBox.hidden = true;
      if (n >= 1 && n <= slides.length) show(n - 1, 0, n - 1 >= index ? 1 : -1);
      e.preventDefault();
      return;
    }
    jumpBox.hidden = true;
    typed = "";
    const t = timer();
    if (k === "ArrowRight" || k === " " || k === "PageDown" || k === "Enter" || k === "ArrowDown")
      next();
    else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace" || k === "ArrowUp") back();
    else if (k === "Home") show(0, 0, -1);
    else if (k === "End") show(slides.length - 1, 0, 1);
    else if (k === "f" || k === "F") full();
    else if (k === "b" || k === "B" || k === ".") black.hidden = !black.hidden;
    else if (k === "?" || k === "h" || k === "H") help.hidden = !help.hidden;
    else if (k === "Escape") {
      help.hidden = true;
      black.hidden = true;
      return;
    } else if (k === "m" || k === "M") act("sound");
    else if (t && (k === "p" || k === "P")) t.toggle();
    else if (t && (k === "r" || k === "R")) t.reset();
    else if (t && (k === "+" || k === "=")) t.add(60000);
    else if (t && (k === "-" || k === "_")) t.add(-60000);
    else return;
    e.preventDefault();
  };
  document.addEventListener("keydown", onKey);

  // A click on the slide goes forward, except on anything the slide made clickable itself.
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, .rsd-bar, .rsd-help")) return;
    if (!help.hidden) {
      help.hidden = true;
      return;
    }
    if (!black.hidden) {
      black.hidden = true;
      return;
    }
    if (e.clientX < root.clientWidth * 0.12) back();
    else next();
  };
  root.addEventListener("click", onClick);
  root.addEventListener("mousemove", wake);

  let tx = 0;
  let ty = 0;
  root.addEventListener(
    "touchstart",
    (e) => {
      tx = e.touches[0]?.clientX ?? 0;
      ty = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  root.addEventListener("touchend", (e) => {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - tx;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else back();
    }
  });

  // Chimes at 5 minutes, 1 minute and zero, whichever slide is showing.
  const timers = [...new Set(slides.map((s) => s.timer).filter((t): t is Countdown => !!t))];
  const tick = window.setInterval(() => {
    for (const t of timers) {
      const marks = t.crossed();
      if (marks.length && sound) chime(marks.includes(0) ? 3 : 1);
    }
  }, 250);

  // Keep the laptop screen awake while presenting.
  let lock: { release: () => Promise<void> } | null = null;
  const keepAwake = async () => {
    try {
      const wl = (
        navigator as unknown as {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        }
      ).wakeLock;
      if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
    } catch {
      /* not supported */
    }
  };
  void keepAwake();
  const onVis = () => void (document.visibilityState === "visible" && keepAwake());
  document.addEventListener("visibilitychange", onVis);

  const fromHash = () => {
    const n = Number(location.hash.replace("#", ""));
    return n >= 1 && n <= slides.length ? n - 1 : 0;
  };
  show(fromHash(), 0, 0);
  root.focus();
  wake();

  return () => {
    for (const f of stops) f();
    for (const a of running) a.cancel();
    clearInterval(tick);
    clearTimeout(idle);
    ro?.disconnect();
    removeEventListener("resize", fit);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
    void lock?.release().catch(() => {});
    root.innerHTML = "";
  };
}
