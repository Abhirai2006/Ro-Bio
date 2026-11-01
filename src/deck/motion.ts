// Motion for the Robo Spark deck: the laser scanner and camera iris transitions, welded titles,
// and objects that fly from one slide to the next. Every effect returns a cancel function, so a fast
// clicker never leaves half an animation on screen.

const C = {
  violet: "#6F5DFF",
  ink: "#1E1A3C",
  paper: "#F8F4F0",
  lilac: "#B7ABFF",
  pink: "#FF5CB8",
  yellow: "#FFE066",
};
const W = 1920;
const H = 1080;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Runs `f(t)` from 0 to 1 over `ms`, then `done`. Returns a cancel function. */
function tween(ms: number, f: (t: number) => void, done?: () => void, delay = 0) {
  let id = 0;
  let live = true;
  const start = performance.now() + delay;
  const tick = (now: number) => {
    if (!live) return;
    const t = clamp01((now - start) / ms);
    if (now >= start) f(t);
    if (t < 1) id = requestAnimationFrame(tick);
    else done?.();
  };
  id = requestAnimationFrame(tick);
  return () => {
    live = false;
    cancelAnimationFrame(id);
  };
}

export type Transition = { cancel: () => void; revealAt: number };

/** Laser scanner: the new slide is printed top to bottom behind a pink laser line. */
export function scanner(fx: HTMLCanvasElement, out: HTMLElement, inn: HTMLElement): Transition {
  const X = fx.getContext("2d")!;
  const ms = 950;
  inn.style.zIndex = "2";
  inn.style.clipPath = "inset(0 0 100% 0)";
  const reset = () => {
    X.clearRect(0, 0, W, H);
    inn.style.clipPath = "";
    inn.style.zIndex = "";
  };
  const stop = tween(
    ms,
    (t) => {
      const y = ease(t) * H;
      inn.style.clipPath = `inset(0 0 ${H - y}px 0)`;
      X.clearRect(0, 0, W, H);
      const g = X.createLinearGradient(0, y - 160, 0, y + 6);
      g.addColorStop(0, "rgba(111,93,255,0)");
      g.addColorStop(1, "rgba(111,93,255,0.42)");
      X.fillStyle = g;
      X.fillRect(0, y - 160, W, 166);
      X.fillStyle = C.pink;
      X.fillRect(0, y - 3, W, 6);
      X.fillStyle = "rgba(255,255,255,0.8)";
      X.fillRect(0, y - 1, W, 2);
      X.font = "700 24px Silkscreen, monospace";
      X.fillStyle = C.paper;
      X.fillText(
        `SCAN ${String(Math.round(t * 100)).padStart(3, "0")}%`,
        W - 230,
        Math.max(36, y - 16),
      );
      for (let i = 0; i < 26; i++) {
        X.fillStyle = i % 3 ? "rgba(255,224,102,0.85)" : "rgba(255,92,184,0.85)";
        X.fillRect(Math.random() * W, y - 9 + Math.random() * 18, 6, 6);
      }
    },
    () => {
      reset();
      out.classList.remove("rsd-on");
    },
  );
  return {
    revealAt: ms * 0.55,
    cancel: () => {
      stop();
      reset();
    },
  };
}

/** Camera iris: six shutter blades close over the old slide, then open on the new one. */
export function iris(fx: HTMLCanvasElement, out: HTMLElement, inn: HTMLElement): Transition {
  const X = fx.getContext("2d")!;
  const close = 560;
  const open = 680;
  inn.style.visibility = "hidden";
  const draw = (k: number) => {
    X.clearRect(0, 0, W, H);
    if (k <= 0) return;
    const cx = W / 2,
      cy = H / 2,
      R = 1400;
    const hole = (1 - k) * 1200;
    for (let i = 0; i < 6; i++) {
      X.save();
      X.translate(cx, cy);
      X.rotate((i / 6) * Math.PI * 2 + k * 0.95);
      X.beginPath();
      X.moveTo(hole, -R);
      X.lineTo(R * 1.5, -R);
      X.lineTo(R * 1.5, R);
      X.lineTo(hole * 0.5, R * 0.2);
      X.closePath();
      const g = X.createLinearGradient(0, -R, R, R);
      g.addColorStop(0, i % 2 ? "#2a2550" : "#211d42");
      g.addColorStop(1, "#14112b");
      X.fillStyle = g;
      X.fill();
      X.strokeStyle = "rgba(111,93,255,0.9)";
      X.lineWidth = 5;
      X.stroke();
      X.restore();
    }
    if (k > 0.985) {
      X.fillStyle = "#14112b";
      X.fillRect(0, 0, W, H);
    }
    // the lens ring and a glint
    X.strokeStyle = `rgba(183,171,255,${0.8 * k})`;
    X.lineWidth = 8;
    X.beginPath();
    X.arc(cx, cy, 70 + hole * 0.18, 0, Math.PI * 2);
    X.stroke();
    X.fillStyle = `rgba(255,92,184,${0.7 * k})`;
    X.beginPath();
    X.arc(cx + 22, cy - 22, 8, 0, Math.PI * 2);
    X.fill();
  };
  let stopOpen = () => {};
  const reset = () => {
    X.clearRect(0, 0, W, H);
    inn.style.visibility = "";
  };
  const stopClose = tween(
    close,
    (t) => draw(ease(t)),
    () => {
      out.classList.remove("rsd-on");
      inn.style.visibility = "";
      stopOpen = tween(
        open,
        (t) => draw(1 - ease(t)),
        () => X.clearRect(0, 0, W, H),
        90,
      );
    },
  );
  return {
    revealAt: close + 200,
    cancel: () => {
      stopClose();
      stopOpen();
      reset();
    },
  };
}

/** Going back: a quick cross-fade, so the presenter is never slowed down. */
export function fadeBack(out: HTMLElement, inn: HTMLElement): Transition {
  const a = inn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
  a.finished.then(
    () => out.classList.remove("rsd-on"),
    () => {},
  );
  return { revealAt: 0, cancel: () => a.cancel() };
}

/* ---------- welded titles ---------- */

type Run = { el: HTMLElement; hide: HTMLElement; color: string };

/** The text runs to weld on a slide: the big echoed titles and the section headings. */
function runsOf(slide: HTMLElement): Run[] {
  const out: Run[] = [];
  slide.querySelectorAll<HTMLElement>(".rsd-dup").forEach((d) => {
    const main = d.querySelector<HTMLElement>(".rsd-dup-main");
    if (main) out.push({ el: main, hide: d, color: getComputedStyle(main).color });
  });
  slide.querySelectorAll<HTMLElement>(".rsd-h2").forEach((h) => {
    const spans = [...h.querySelectorAll<HTMLElement>(":scope > span")].filter((s) =>
      s.textContent?.trim(),
    );
    for (const s of spans.length ? spans : [h])
      out.push({ el: s, hide: s, color: getComputedStyle(s).color });
  });
  return out;
}

/**
 * Welds the slide's titles: a print head lays each one down in pixel blocks with sparks, then the real,
 * crisp letters take over. The blocks are measured from the real text, so they land exactly where it sits.
 */
export function weldTitles(slide: HTMLElement, delay: number, long = false): () => void {
  const runs = runsOf(slide).filter((r) => r.el.offsetParent !== null);
  if (!runs.length) return () => {};
  for (const r of runs) r.hide.style.visibility = "hidden";
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  cv.className = "rsd-weld";
  cv.setAttribute("aria-hidden", "true");
  slide.appendChild(cv);
  const X = cv.getContext("2d")!;
  const sRect = slide.getBoundingClientRect();
  const k = sRect.width / W || 1;

  // Rasterise every run into one mask, using the run's own font, spacing and line height.
  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const M = mask.getContext("2d", { willReadFrequently: true })!;
  type Block = { x: number; y: number; c: string };
  const blocks: Block[] = [];
  let B = 10;
  runs.forEach((r) => {
    const cs = getComputedStyle(r.el);
    const size = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) || size * 1.1;
    B = Math.max(B, Math.round(size / 14));
    const rect = r.el.getBoundingClientRect();
    const left = (rect.left - sRect.left) / k;
    const top = (rect.top - sRect.top) / k;
    M.clearRect(0, 0, W, H);
    M.fillStyle = "#000";
    M.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    (M as unknown as { letterSpacing: string }).letterSpacing =
      cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    M.textBaseline = "alphabetic";
    const m = M.measureText("ROBO");
    const asc = m.fontBoundingBoxAscent || size * 0.8;
    const desc = m.fontBoundingBoxDescent || size * 0.2;
    const lines = r.el.innerHTML
      .split(/<br\s*\/?>/i)
      .map((l) => l.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&"));
    lines.forEach((line, i) =>
      M.fillText(line, left, top + i * lh + (lh - (asc + desc)) / 2 + asc),
    );
    const x0 = Math.max(0, Math.floor(left) - 4),
      y0 = Math.max(0, Math.floor(top) - 4);
    const x1 = Math.min(W, Math.ceil(left + rect.width / k) + 8),
      y1 = Math.min(H, Math.ceil(top + rect.height / k) + 8);
    if (x1 <= x0 || y1 <= y0) return;
    const data = M.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const bw = x1 - x0;
    for (let y = 0; y + B <= y1 - y0; y += B)
      for (let x = 0; x + B <= bw; x += B)
        if ((data[((y + (B >> 1)) * bw + x + (B >> 1)) * 4 + 3] ?? 0) > 120)
          blocks.push({ x: x0 + x, y: y0 + y, c: r.color });
  });
  // Lay the blocks line by line, left to right, like a printer.
  const band = B * 7;
  blocks.sort((a, b) => Math.floor(a.y / band) - Math.floor(b.y / band) || a.x - b.x || a.y - b.y);
  const ms = long ? 1900 : Math.max(650, Math.min(1500, blocks.length * 0.9));
  const sparks: { x: number; y: number; vx: number; vy: number; l: number }[] = [];

  const reveal = () => {
    for (const r of runs) {
      r.hide.style.visibility = "";
      r.hide.animate(
        [
          { opacity: 0, filter: "blur(10px)" },
          { opacity: 1, filter: "blur(0px)" },
        ],
        { duration: 420, easing: "ease-out" },
      );
    }
    cv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" }).finished.then(
      () => cv.remove(),
      () => cv.remove(),
    );
  };
  if (!blocks.length) {
    reveal();
    return () => {};
  }
  const stop = tween(
    ms,
    (t) => {
      const n = Math.floor(blocks.length * t);
      X.clearRect(0, 0, W, H);
      for (let i = 0; i < n; i++) {
        const b = blocks[i]!;
        const age = n - i;
        X.fillStyle = age < 30 ? C.pink : age < 90 ? C.lilac : b.c;
        X.fillRect(b.x + 1, b.y + 1, B - 2, B - 2);
      }
      const head = blocks[Math.min(Math.max(0, n), blocks.length - 1)]!;
      if (t < 1) {
        for (let j = 0; j < 5; j++)
          sparks.push({
            x: head.x + B / 2,
            y: head.y + B / 2,
            vx: (Math.random() - 0.5) * 11,
            vy: -Math.random() * 8,
            l: 24,
          });
        // the gantry rail and the print head
        X.fillStyle = "rgba(30,26,60,0.28)";
        X.fillRect(0, head.y - 128, W, 7);
        X.fillStyle = C.ink;
        X.fillRect(head.x - 22, head.y - 118, 60, 84);
        X.fillRect(head.x - 2, head.y - 34, 20, 26);
        X.fillStyle = C.yellow;
        X.fillRect(head.x - 10, head.y - 98, 36, 10);
        X.fillStyle = C.violet;
        X.fillRect(head.x - 22, head.y - 60, 60, 6);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.6;
        if (--p.l <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        X.fillStyle = p.l > 12 ? C.yellow : C.pink;
        X.fillRect(p.x, p.y, 6, 6);
      }
    },
    reveal,
    delay,
  );
  return () => {
    stop();
    cv.remove();
    for (const r of runs) r.hide.style.visibility = "";
  };
}

/* ---------- objects that fly from one slide to the next ---------- */

/** Size and centre of an element in stage pixels, ignoring its own rotation. */
function box(el: HTMLElement, stage: HTMLElement) {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const k = s.width / W || 1;
  return {
    cx: (r.left + r.width / 2 - s.left) / k,
    cy: (r.top + r.height / 2 - s.top) / k,
    w: el.offsetWidth,
    h: el.offsetHeight,
  };
}

/**
 * Elements marked data-morph="name" on two slides in a row fly from the old place to the new one:
 * an arc with a spin, growing or shrinking on the way, landing with a pulse.
 */
export function morph(
  stage: HTMLElement,
  out: HTMLElement,
  inn: HTMLElement,
  delay: number,
): () => void {
  const stops: (() => void)[] = [];
  const pairs = [...out.querySelectorAll<HTMLElement>("[data-morph]")]
    .map((a) => ({ a, b: inn.querySelector<HTMLElement>(`[data-morph="${a.dataset["morph"]}"]`) }))
    .filter((p): p is { a: HTMLElement; b: HTMLElement } => !!p.b);
  for (const { a, b } of pairs) {
    const from = box(a, stage);
    const to = box(b, stage);
    const fly = a.cloneNode(true) as HTMLElement;
    fly.removeAttribute("data-morph");
    fly.removeAttribute("data-in");
    fly.classList.add("rsd-flyer");
    Object.assign(fly.style, {
      position: "absolute",
      left: `${from.cx - from.w / 2}px`,
      top: `${from.cy - from.h / 2}px`,
      width: `${from.w}px`,
      height: `${from.h}px`,
      margin: "0",
      transform: "none",
      zIndex: "8",
    });
    stage.appendChild(fly);
    b.style.visibility = "hidden";
    const rot0 = /rotate\((-?[\d.]+)deg\)/.exec(a.style.transform)?.[1] ?? "0";
    const rot1 = /rotate\((-?[\d.]+)deg\)/.exec(b.style.transform)?.[1] ?? "0";
    const dx = to.cx - from.cx,
      dy = to.cy - from.cy,
      sc = to.w / from.w;
    const lift = -Math.min(320, 120 + Math.hypot(dx, dy) * 0.25);
    const anim = fly.animate(
      [
        { transform: `translate(0,0) rotate(${rot0}deg) scale(1)` },
        {
          offset: 0.45,
          transform: `translate(${dx * 0.4}px,${dy * 0.4 + lift}px) rotate(${Number(rot0) + 200}deg) scale(${(1 + sc) / 2 + 0.25})`,
        },
        { transform: `translate(${dx}px,${dy}px) rotate(${Number(rot1) + 360}deg) scale(${sc})` },
      ],
      { duration: 1100, delay, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" },
    );
    const land = () => {
      fly.remove();
      b.style.visibility = "";
      b.animate(
        [
          { boxShadow: "0 0 0 0 rgba(255,92,184,.9)" },
          { boxShadow: "0 0 0 60px rgba(255,92,184,0)" },
        ],
        { duration: 700 },
      );
    };
    anim.finished.then(land, () => {});
    stops.push(() => {
      anim.cancel();
      fly.remove();
      b.style.visibility = "";
    });
  }
  return () => stops.forEach((f) => f());
}
