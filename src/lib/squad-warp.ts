// The themed jump from a squad link on /team into that squad's page. A full screen canvas plays the
// squad's own theme from where the visitor clicked (circuits and code for Technical, pencils and crayons
// for Design, a blueprint for Projects, confetti and spotlights for Events, chat bubbles and megaphone
// rings for Social Media), the next page opens underneath once the screen is covered, and an iris opens
// onto it. Nothing here runs for people who ask for reduced motion: the link just opens the page.
import type { SquadSlug } from "./squad-fx";

const PAPER = "#fffffa";
const INK = "#201e2d";
const LENS = "#6294ff";
const LILAC = "#a979fa";
const VIOLET = "#725dff";
const PINK = "#ff5cb8";
const SUN = "#ffd166";
const BLUEPRINT = "#2f45b5";

/** Lines of code that type themselves in on the Technical jump. Real code, the kind the squad writes. */
export const CODE_LINES = [
  "servo.write(90);",
  "if (bug) fix(bug);",
  "led.glow(VIOLET);",
  "while (alive) build();",
  "const bpm = heart.read();",
  "motor.speed = 0.8;",
  "#include <Servo.h>",
  "await sensor.ready();",
  "pwm(PIN_9, 128);",
  "for (const s of squad) s.ship();",
  "volts = adc.read() * 5.0;",
  "robot.arm.home();",
  "delay(16); // one frame",
  "ping('muse.local');",
];

/** The labels drawn on the Projects blueprint. */
export const BLUEPRINT_LABELS = ["3 DoF", "R 24", "120 mm", "JOINT ARM v2.1"];

/** Timings in milliseconds: the screen is covered at COVER, the iris takes OPEN to show the new page. */
export const COVER = 620;
export const OPEN = 460;

type Ctx = CanvasRenderingContext2D;
type Scene = { w: number; h: number; x: number; y: number; diag: number; rnd: () => number };
type Theme = {
  bg: string;
  ink: string;
  title: string;
  /** where the squad name sits, from the top, as a share of the screen height (default the middle) */
  titleAt?: number;
  draw: (c: Ctx, t: number, s: Scene) => void;
};

/** Keeps a point out of the band in the middle where the squad name is written. */
const clearOfTitle = (x: number, y: number, s: Scene) => {
  const band = Math.max(70, s.h * 0.14);
  if (Math.abs(x - s.w / 2) > Math.min(s.w * 0.42, 460) || Math.abs(y - s.h / 2) > band) return y;
  return y < s.h / 2 ? s.h / 2 - band : s.h / 2 + band;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const easeOut = (p: number) => 1 - (1 - p) ** 3;
/** A pop with a little overshoot, for things that spring into place. */
const pop = (p: number) => {
  const q = clamp(p);
  return 1 + 2.4 * (q - 1) ** 3 + 1.4 * (q - 1) ** 2;
};

/** Seeded random numbers, so a squad's jump looks the same every time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The background floods out from the click as a circle. */
function flood(c: Ctx, t: number, s: Scene, color: string, start = 60, dur = COVER - 60) {
  const r = easeInOut(clamp((t - start) / dur)) * s.diag;
  if (r <= 0) return;
  c.fillStyle = color;
  c.beginPath();
  c.arc(s.x, s.y, r, 0, Math.PI * 2);
  c.fill();
}

/* ---------- TECHNICAL: circuit traces race out from the click, then code types itself in ---------- */
type Trace = {
  pts: [number, number][];
  len: number[];
  delay: number;
  speed: number;
  color: string;
};
function traces(s: Scene): Trace[] {
  const step = 26;
  const out: Trace[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    let dir = Math.round(((i / n) * 8 + s.rnd() * 0.6) % 8);
    let x = Math.round(s.x / step) * step;
    let y = Math.round(s.y / step) * step;
    const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 40 && x > -80 && y > -80 && x < s.w + 80 && y < s.h + 80; k++) {
      const segs = 2 + Math.floor(s.rnd() * 5);
      const a = (dir * Math.PI) / 4;
      x += Math.round(Math.cos(a)) * step * segs;
      y += Math.round(Math.sin(a)) * step * segs;
      pts.push([x, y]);
      const turn = s.rnd();
      if (turn < 0.33) dir = (dir + 1) % 8;
      else if (turn < 0.66) dir = (dir + 7) % 8;
    }
    const len = [0];
    for (let k = 1; k < pts.length; k++)
      len.push(len[k - 1]! + Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]));
    out.push({
      pts,
      len,
      delay: s.rnd() * 120,
      speed: (s.diag / 520) * (0.8 + s.rnd() * 0.5),
      color: i % 3 === 0 ? LILAC : LENS,
    });
  }
  return out;
}
function drawTrace(c: Ctx, tr: Trace, t: number) {
  const d = (t - tr.delay) * tr.speed;
  if (d <= 0) return;
  c.beginPath();
  c.moveTo(tr.pts[0]![0], tr.pts[0]![1]);
  let head: [number, number] = tr.pts[0]!;
  const pads: [number, number][] = [];
  for (let k = 1; k < tr.pts.length; k++) {
    const [ax, ay] = tr.pts[k - 1]!;
    const [bx, by] = tr.pts[k]!;
    const l0 = tr.len[k - 1]!;
    const l1 = tr.len[k]!;
    if (d >= l1) {
      c.lineTo(bx, by);
      pads.push([bx, by]);
      head = [bx, by];
    } else {
      const f = (d - l0) / (l1 - l0);
      head = [ax + (bx - ax) * f, ay + (by - ay) * f];
      c.lineTo(head[0], head[1]);
      break;
    }
  }
  c.strokeStyle = tr.color;
  c.globalAlpha = 0.28;
  c.lineWidth = 9;
  c.stroke();
  c.globalAlpha = 1;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = INK;
  for (const [px, py] of pads) {
    c.beginPath();
    c.arc(px, py, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = tr.color;
    c.lineWidth = 2.5;
    c.stroke();
  }
  // the bright tip where the signal is right now
  c.fillStyle = PAPER;
  c.beginPath();
  c.arc(head[0], head[1], 4, 0, Math.PI * 2);
  c.fill();
}
function technical(): Theme {
  let tr: Trace[] | null = null;
  let rows: { x: number; y: number; text: string; at: number }[] = [];
  return {
    bg: INK,
    ink: LENS,
    title: PAPER,
    draw(c, t, s) {
      if (!tr) {
        tr = traces(s);
        const lh = 34;
        rows = [];
        for (let y = 60, i = 0; y < s.h; y += lh * (1.5 + s.rnd() * 1.5), i++)
          if (Math.abs(y - s.h / 2) > Math.max(56, s.h * 0.09))
            rows.push({
              x: 24 + s.rnd() * Math.max(40, s.w - 360),
              y,
              text: CODE_LINES[i % CODE_LINES.length]!,
              at: 220 + s.rnd() * 260,
            });
      }
      flood(c, t, s, INK, 140, COVER - 140);
      c.lineCap = "round";
      c.lineJoin = "round";
      for (const one of tr) drawTrace(c, one, t);
      c.font = `600 ${Math.max(14, Math.min(20, s.w / 60))}px "JetBrains Mono", ui-monospace, monospace`;
      c.textBaseline = "middle";
      for (const r of rows) {
        const n = Math.floor((t - r.at) / 22);
        if (n <= 0) continue;
        const shown = r.text.slice(0, n);
        c.fillStyle = PAPER;
        c.globalAlpha = 0.7;
        c.fillText(shown, r.x, r.y - (t - r.at) * 0.03);
        if (n < r.text.length) {
          // the cursor block while it types
          const wdt = c.measureText(shown).width;
          c.fillStyle = LENS;
          c.globalAlpha = 1;
          c.fillRect(r.x + wdt + 2, r.y - 9 - (t - r.at) * 0.03, 9, 18);
        }
        c.globalAlpha = 1;
      }
    },
  };
}

/* ---------- DESIGN: pencils and crayons pop out of the click, crayon strokes colour the screen ---------- */
type Tool = {
  kind: "pencil" | "crayon" | "stylus";
  color: string;
  tx: number;
  ty: number;
  rot: number;
  spin: number;
  at: number;
  size: number;
};
function drawPencil(c: Ctx, color: string, size: number) {
  const L = size;
  const Wd = size * 0.16;
  c.lineWidth = Math.max(2, size * 0.025);
  c.strokeStyle = INK;
  c.lineJoin = "round";
  // body
  c.fillStyle = color;
  c.fillRect(-L / 2, -Wd / 2, L * 0.7, Wd);
  c.strokeRect(-L / 2, -Wd / 2, L * 0.7, Wd);
  c.beginPath();
  c.moveTo(-L / 2, 0);
  c.lineTo(-L / 2 + L * 0.7, 0);
  c.globalAlpha = 0.35;
  c.stroke();
  c.globalAlpha = 1;
  // wood and lead
  c.fillStyle = "#f3d9b1";
  c.beginPath();
  c.moveTo(L * 0.2, -Wd / 2);
  c.lineTo(L / 2, 0);
  c.lineTo(L * 0.2, Wd / 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.beginPath();
  c.moveTo(L * 0.41, -Wd * 0.16);
  c.lineTo(L / 2, 0);
  c.lineTo(L * 0.41, Wd * 0.16);
  c.closePath();
  c.fill();
  // ferrule and eraser
  c.fillStyle = "#c9c9d6";
  c.fillRect(-L / 2 - L * 0.08, -Wd / 2, L * 0.08, Wd);
  c.strokeRect(-L / 2 - L * 0.08, -Wd / 2, L * 0.08, Wd);
  c.fillStyle = PINK;
  c.beginPath();
  c.roundRect(-L / 2 - L * 0.16, -Wd / 2, L * 0.08, Wd, [Wd * 0.3, 0, 0, Wd * 0.3]);
  c.fill();
  c.stroke();
}
function drawCrayon(c: Ctx, color: string, size: number) {
  const L = size * 0.62;
  const Wd = size * 0.2;
  c.lineWidth = Math.max(2, size * 0.025);
  c.strokeStyle = INK;
  c.lineJoin = "round";
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(-L / 2, -Wd / 2, L * 0.8, Wd, Wd * 0.2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-L / 2 + L * 0.8, -Wd * 0.42);
  c.lineTo(L / 2, -Wd * 0.12);
  c.lineTo(L / 2, Wd * 0.12);
  c.lineTo(-L / 2 + L * 0.8, Wd * 0.42);
  c.closePath();
  c.fill();
  c.stroke();
  // the paper wrapper
  c.fillStyle = PAPER;
  c.fillRect(-L * 0.28, -Wd / 2, L * 0.46, Wd);
  c.strokeRect(-L * 0.28, -Wd / 2, L * 0.46, Wd);
  c.strokeStyle = color;
  c.lineWidth = Math.max(1.5, size * 0.018);
  for (const f of [0.34, 0.66]) {
    c.beginPath();
    c.moveTo(-L * 0.28 + L * 0.46 * f, -Wd * 0.3);
    c.lineTo(-L * 0.28 + L * 0.46 * f, Wd * 0.3);
    c.stroke();
  }
}
/** A tablet stylus: slim barrel, a side button, a rounded end and a fine nib. */
function drawStylus(c: Ctx, color: string, size: number) {
  const L = size * 0.95;
  const Wd = size * 0.09;
  c.lineWidth = Math.max(2, size * 0.022);
  c.strokeStyle = INK;
  c.lineJoin = "round";
  c.fillStyle = "#e9e7f2";
  c.beginPath();
  c.roundRect(-L / 2, -Wd / 2, L * 0.82, Wd, [Wd / 2, 0, 0, Wd / 2]);
  c.fill();
  c.stroke();
  // grip band in the squad colour, and the side button
  c.fillStyle = color;
  c.fillRect(L * 0.08, -Wd / 2, L * 0.16, Wd);
  c.strokeRect(L * 0.08, -Wd / 2, L * 0.16, Wd);
  c.fillStyle = INK;
  c.beginPath();
  c.roundRect(-L * 0.08, -Wd / 2 - Wd * 0.35, L * 0.1, Wd * 0.4, Wd * 0.15);
  c.fill();
  // cone and nib
  c.fillStyle = "#c9c9d6";
  c.beginPath();
  c.moveTo(L * 0.32, -Wd / 2);
  c.lineTo(L / 2 - Wd * 0.3, -Wd * 0.12);
  c.lineTo(L / 2 - Wd * 0.3, Wd * 0.12);
  c.lineTo(L * 0.32, Wd / 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.fillRect(L / 2 - Wd * 0.3, -Wd * 0.08, Wd * 0.3, Wd * 0.16);
}

/** Where the hero stylus is at time t on its underline stroke below the squad name. */
function stylusPath(s: Scene, p: number): [number, number] {
  const w = Math.min(s.w * 0.62, 620);
  const x = s.w / 2 - w / 2 + w * p;
  const y = s.h / 2 + Math.max(64, s.h * 0.105) + Math.sin(p * Math.PI * 3) * 10;
  return [x, y];
}

function design(): Theme {
  let tools: Tool[] | null = null;
  let strokes: { y: number; at: number; color: string; wob: number }[] = [];
  const colors = [VIOLET, LENS, PINK, SUN, LILAC, "#38c6a0"];
  return {
    bg: PAPER,
    ink: VIOLET,
    title: INK,
    draw(c, t, s) {
      if (!tools) {
        tools = [];
        const n = 16;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + s.rnd() * 0.3;
          const r = (0.26 + s.rnd() * 0.3) * Math.min(s.w, s.h) + 40;
          tools.push({
            kind: i % 3 === 2 ? "stylus" : i % 2 ? "crayon" : "pencil",
            color: colors[i % colors.length]!,
            tx: s.w / 2 + Math.cos(a) * r * (s.w / Math.min(s.w, s.h)) * 0.75,
            ty: s.h / 2 + Math.sin(a) * r,
            rot: a + (s.rnd() - 0.5) * 1.2,
            spin: (s.rnd() - 0.5) * 0.0016,
            at: 40 + i * 14,
            size: Math.max(90, Math.min(170, s.w / 9)) * (0.8 + s.rnd() * 0.4),
          });
        }
        const bands = 7;
        strokes = Array.from({ length: bands }, (_, i) => ({
          y: ((i + 0.5) / bands) * s.h,
          at: 120 + i * 50,
          color: i % 2 ? LILAC : "#efeafe",
          wob: s.rnd() * 6,
        }));
      }
      // crayon strokes swipe across, one band after another, until the page is coloured in
      const bh = s.h / strokes.length;
      for (const st of strokes) {
        const p = easeOut(clamp((t - st.at) / 260));
        if (p <= 0) continue;
        c.strokeStyle = st.color;
        c.lineCap = "round";
        c.lineWidth = bh * 1.5;
        c.beginPath();
        const x1 = -bh + (s.w + 2 * bh) * p;
        c.moveTo(-bh, st.y);
        for (let x = -bh; x <= x1; x += 40)
          c.lineTo(x, st.y + Math.sin(x / 90 + st.wob) * bh * 0.12);
        c.stroke();
        // waxy texture: thin lighter streaks along the stroke
        c.strokeStyle = PAPER;
        c.globalAlpha = 0.25;
        c.lineWidth = 2;
        for (let k = -2; k <= 2; k++) {
          c.beginPath();
          c.moveTo(-bh, st.y + k * bh * 0.18);
          c.lineTo(x1, st.y + k * bh * 0.18 + Math.sin(k + st.wob) * 4);
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      for (const tl of tools) {
        const p = clamp((t - tl.at) / 360);
        if (p <= 0) continue;
        const e = easeOut(p);
        const x = s.x + (tl.tx - s.x) * e;
        const y = s.y + (tl.ty - s.y) * e;
        c.save();
        c.translate(x, y);
        c.rotate(tl.rot * e + tl.spin * t);
        const k = pop(p);
        c.scale(k, k);
        if (tl.kind === "pencil") drawPencil(c, tl.color, tl.size);
        else if (tl.kind === "stylus") drawStylus(c, tl.color, tl.size);
        else drawCrayon(c, tl.color, tl.size);
        c.restore();
      }
      // the hero stylus glides in and writes a glowing line under the squad name
      const hp = clamp((t - 300) / 420);
      if (hp > 0) {
        const steps = Math.max(2, Math.round(hp * 60));
        c.lineCap = "round";
        c.lineJoin = "round";
        for (const [w, col, a] of [
          [14, LILAC, 0.35],
          [5, VIOLET, 1],
        ] as const) {
          c.beginPath();
          for (let i = 0; i <= steps; i++) {
            const [x, y] = stylusPath(s, (i / steps) * hp);
            if (i) c.lineTo(x, y);
            else c.moveTo(x, y);
          }
          c.strokeStyle = col;
          c.globalAlpha = a;
          c.lineWidth = w;
          c.stroke();
        }
        c.globalAlpha = 1;
        const [x, y] = stylusPath(s, hp);
        const size = Math.max(150, Math.min(240, s.w / 6));
        c.save();
        // nib on the line, barrel up and to the right like a hand holds it
        c.translate(x, y);
        c.rotate(2.65 + Math.sin(t / 120) * 0.04);
        c.translate(-size * 0.47, 0);
        drawStylus(c, PINK, size);
        c.restore();
        // a spark at the nib
        c.fillStyle = PAPER;
        c.beginPath();
        c.arc(x, y, 4 + Math.sin(t / 40) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    },
  };
}

/* ---------- PROJECTS: a blueprint grid, then a robot arm and a gear draw themselves ---------- */
function gearPath(c: Ctx, cx: number, cy: number, r: number, teeth: number, rot: number) {
  c.beginPath();
  for (let i = 0; i <= teeth * 4; i++) {
    const a = rot + (i / (teeth * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r * 0.82;
    c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
}
/** Strokes a path drawn so far: p goes from 0 (nothing) to 1 (all of it). */
function drawn(c: Ctx, p: number, total: number) {
  if (p <= 0) return;
  c.setLineDash([total * p, total]);
  c.stroke();
  c.setLineDash([]);
}
function projects(): Theme {
  return {
    bg: BLUEPRINT,
    ink: PAPER,
    title: PAPER,
    titleAt: 0.2,
    draw(c, t, s) {
      flood(c, t, s, BLUEPRINT, 0, COVER - 80);
      // the grid fans out from the click
      const g = 32;
      const reach = easeOut(clamp((t - 80) / 520)) * s.diag;
      c.lineWidth = 1;
      for (let x = (s.x % g) - g; x < s.w + g; x += g) {
        const major = Math.round((x - s.x) / g) % 4 === 0;
        c.strokeStyle = PAPER;
        c.globalAlpha = major ? 0.32 : 0.13;
        const dx = Math.abs(x - s.x);
        if (dx > reach) continue;
        const half = Math.sqrt(Math.max(0, reach * reach - dx * dx));
        c.beginPath();
        c.moveTo(x, s.y - half);
        c.lineTo(x, s.y + half);
        c.stroke();
      }
      for (let y = (s.y % g) - g; y < s.h + g; y += g) {
        const major = Math.round((y - s.y) / g) % 4 === 0;
        c.strokeStyle = PAPER;
        c.globalAlpha = major ? 0.32 : 0.13;
        const dy = Math.abs(y - s.y);
        if (dy > reach) continue;
        const half = Math.sqrt(Math.max(0, reach * reach - dy * dy));
        c.beginPath();
        c.moveTo(s.x - half, y);
        c.lineTo(s.x + half, y);
        c.stroke();
      }
      c.globalAlpha = 1;
      // the drawing, scaled to the screen
      const u = Math.min(s.w, s.h) / 9;
      // below the squad name, which sits high on this one
      const ox = s.w / 2 - u * 2.2;
      const oy = s.h * 0.4 + u * 3.6;
      const p = clamp((t - 220) / 560);
      c.strokeStyle = PAPER;
      c.lineWidth = 3;
      c.lineCap = "round";
      c.lineJoin = "round";
      // base, two links and a gripper
      const j0: [number, number] = [ox, oy];
      const j1: [number, number] = [ox + u * 1.1, oy - u * 2.4];
      const j2: [number, number] = [ox + u * 3.4, oy - u * 3.0];
      c.beginPath();
      c.moveTo(ox - u * 1.1, oy + u * 0.5);
      c.lineTo(ox + u * 1.1, oy + u * 0.5);
      c.lineTo(ox + u * 0.6, oy - u * 0.1);
      c.lineTo(ox - u * 0.6, oy - u * 0.1);
      c.closePath();
      drawn(c, p * 3, u * 5);
      for (const [a, b] of [
        [j0, j1],
        [j1, j2],
      ] as const) {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const nx = -Math.sin(ang) * u * 0.28;
        const ny = Math.cos(ang) * u * 0.28;
        c.beginPath();
        c.moveTo(a[0] + nx, a[1] + ny);
        c.lineTo(b[0] + nx, b[1] + ny);
        c.moveTo(a[0] - nx, a[1] - ny);
        c.lineTo(b[0] - nx, b[1] - ny);
        drawn(c, p * 2 - 0.2, Math.hypot(b[0] - a[0], b[1] - a[1]) * 2.2);
      }
      for (const [jx, jy] of [j0, j1, j2]) {
        c.beginPath();
        c.arc(jx, jy, u * 0.36, 0, Math.PI * 2);
        drawn(c, p * 2.4 - 0.5, u * 2.4);
        c.beginPath();
        c.arc(jx, jy, u * 0.1, 0, Math.PI * 2);
        drawn(c, p * 2.4 - 0.6, u);
      }
      c.beginPath();
      c.moveTo(j2[0] + u * 0.3, j2[1] - u * 0.2);
      c.lineTo(j2[0] + u * 0.9, j2[1] - u * 0.45);
      c.moveTo(j2[0] + u * 0.3, j2[1] + u * 0.2);
      c.lineTo(j2[0] + u * 0.9, j2[1] + u * 0.45);
      drawn(c, p * 2 - 0.9, u * 1.4);
      // a turning gear
      const gx = ox + u * 4.6;
      const gy = oy - u * 0.6;
      gearPath(c, gx, gy, u * 1.1, 10, t / 900);
      drawn(c, p * 1.6 - 0.3, u * 8);
      c.beginPath();
      c.arc(gx, gy, u * 0.32, 0, Math.PI * 2);
      drawn(c, p * 1.6 - 0.5, u * 2.1);
      // dimension line with arrows and labels
      const q = clamp((t - 520) / 260);
      if (q > 0) {
        c.globalAlpha = q;
        c.lineWidth = 1.5;
        c.setLineDash([6, 6]);
        c.beginPath();
        c.moveTo(j0[0], oy + u * 1.1);
        c.lineTo(j2[0], oy + u * 1.1);
        c.stroke();
        c.setLineDash([]);
        c.font = `700 ${Math.round(u * 0.3)}px "JetBrains Mono", ui-monospace, monospace`;
        c.fillStyle = PAPER;
        c.textAlign = "center";
        c.fillText(BLUEPRINT_LABELS[2]!, (j0[0] + j2[0]) / 2, oy + u * 1.5);
        c.fillText(BLUEPRINT_LABELS[0]!, j1[0] - u * 0.9, j1[1]);
        c.fillText(BLUEPRINT_LABELS[1]!, gx, gy + u * 1.55);
        c.textAlign = "start";
        c.globalAlpha = 1;
      }
    },
  };
}

/* ---------- EVENTS: spotlights sweep the stage and confetti bursts from the click ---------- */
type Bit = { vx: number; vy: number; rot: number; vr: number; color: string; w: number; h: number };
function events(): Theme {
  let bits: Bit[] | null = null;
  return {
    bg: VIOLET,
    ink: PAPER,
    title: PAPER,
    draw(c, t, s) {
      if (!bits) {
        const cols = [PAPER, LENS, LILAC, PINK, SUN, INK];
        bits = Array.from({ length: 150 }, (_, i) => {
          const a = s.rnd() * Math.PI * 2;
          const v = (0.6 + s.rnd() * 1.1) * (s.diag / 900);
          return {
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - 0.5 * (s.diag / 900),
            rot: s.rnd() * 6,
            vr: (s.rnd() - 0.5) * 0.02,
            color: cols[i % cols.length]!,
            w: 6 + s.rnd() * 10,
            h: 4 + s.rnd() * 6,
          };
        });
      }
      flood(c, t, s, VIOLET, 80, COVER - 80);
      // three spotlights from the bottom edge, swinging
      const lt = clamp((t - 160) / 300);
      if (lt > 0)
        for (let i = 0; i < 3; i++) {
          const bx = s.w * (0.2 + i * 0.3);
          const ang = -Math.PI / 2 + Math.sin(t / 380 + i * 2) * 0.5;
          const len = s.diag;
          const spread = 0.16;
          const grd = c.createRadialGradient(bx, s.h, 0, bx, s.h, len);
          grd.addColorStop(0, "rgba(255,255,250,0.55)");
          grd.addColorStop(1, "rgba(255,255,250,0)");
          c.fillStyle = grd;
          c.globalAlpha = lt;
          c.beginPath();
          c.moveTo(bx, s.h);
          c.lineTo(bx + Math.cos(ang - spread) * len, s.h + Math.sin(ang - spread) * len);
          c.lineTo(bx + Math.cos(ang + spread) * len, s.h + Math.sin(ang + spread) * len);
          c.closePath();
          c.fill();
          c.globalAlpha = 1;
        }
      for (const b of bits) {
        const tt = Math.max(0, t - 20);
        const x = s.x + b.vx * tt;
        const y = s.y + b.vy * tt + 0.0009 * tt * tt * (s.diag / 900);
        c.save();
        c.translate(x, y);
        c.rotate(b.rot + b.vr * tt);
        c.scale(1, Math.cos(tt / 90 + b.rot));
        c.fillStyle = b.color;
        c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        c.restore();
      }
    },
  };
}

/* ---------- SOCIAL MEDIA: megaphone rings, and bubbles, hearts, @ and # pop up and float ---------- */
type Pop = {
  kind: "bubble" | "heart" | "at" | "hash" | "qr";
  x: number;
  y: number;
  at: number;
  size: number;
  color: string;
  drift: number;
};
function heart(c: Ctx, r: number) {
  c.beginPath();
  c.moveTo(0, r * 0.35);
  c.bezierCurveTo(-r * 1.1, -r * 0.35, -r * 0.5, -r * 1.05, 0, -r * 0.45);
  c.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.1, -r * 0.35, 0, r * 0.35);
  c.closePath();
}
function social(): Theme {
  let pops: Pop[] | null = null;
  return {
    bg: LILAC,
    ink: INK,
    title: INK,
    draw(c, t, s) {
      if (!pops) {
        const kinds: Pop["kind"][] = ["bubble", "heart", "at", "bubble", "hash", "heart", "qr"];
        pops = Array.from({ length: 22 }, (_, i) => {
          const x = s.w * (0.06 + s.rnd() * 0.88);
          return {
            kind: kinds[i % kinds.length]!,
            x,
            // nothing pops up over the squad name
            y: clearOfTitle(x, s.h * (0.12 + s.rnd() * 0.8), s),
            at: 80 + s.rnd() * 420,
            size: Math.max(26, Math.min(56, s.w / 26)) * (0.8 + s.rnd() * 0.5),
            color: [PAPER, PINK, LENS, SUN][i % 4]!,
            drift: 0.03 + s.rnd() * 0.05,
          };
        });
      }
      flood(c, t, s, LILAC, 40, COVER - 40);
      // megaphone rings
      for (let i = 0; i < 5; i++) {
        const tt = t - i * 90;
        if (tt <= 0) continue;
        const r = easeOut(clamp(tt / 700)) * s.diag * 0.8;
        c.strokeStyle = i % 2 ? PAPER : INK;
        c.globalAlpha = 0.55 * (1 - clamp(tt / 900));
        c.lineWidth = 6;
        c.beginPath();
        c.arc(s.x, s.y, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
      c.lineJoin = "round";
      for (const p of pops) {
        const q = clamp((t - p.at) / 300);
        if (q <= 0) continue;
        const k = pop(q);
        const fy = p.y - (t - p.at) * p.drift;
        c.save();
        c.translate(p.x, fy);
        c.scale(k, k);
        c.lineWidth = 3;
        c.strokeStyle = INK;
        c.fillStyle = p.color;
        const r = p.size;
        if (p.kind === "bubble") {
          c.beginPath();
          c.roundRect(-r, -r * 0.62, r * 2, r * 1.24, r * 0.3);
          c.moveTo(-r * 0.4, r * 0.62);
          c.lineTo(-r * 0.7, r * 1.05);
          c.lineTo(-r * 0.05, r * 0.62);
          c.fill();
          c.stroke();
          c.fillStyle = INK;
          for (const dx of [-0.45, 0, 0.45]) {
            c.beginPath();
            c.arc(dx * r, 0, r * 0.12, 0, Math.PI * 2);
            c.fill();
          }
        } else if (p.kind === "heart") {
          c.fillStyle = PINK;
          heart(c, r);
          c.fill();
          c.stroke();
        } else if (p.kind === "qr") {
          c.fillStyle = PAPER;
          c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
          c.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
          c.fillStyle = INK;
          const cell = (r * 1.2) / 5;
          for (let gy = 0; gy < 5; gy++)
            for (let gx = 0; gx < 5; gx++)
              if ((gx * 7 + gy * 3 + Math.round(p.x)) % 3 !== 0 || (gx < 2 && gy < 2))
                c.fillRect(-r * 0.6 + gx * cell, -r * 0.6 + gy * cell, cell * 0.9, cell * 0.9);
        } else {
          c.font = `900 ${Math.round(r * 1.5)}px "Tektur", system-ui, sans-serif`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.lineWidth = 6;
          c.strokeText(p.kind === "at" ? "@" : "#", 0, 0);
          c.fillStyle = p.color === PAPER ? LENS : p.color;
          c.fillText(p.kind === "at" ? "@" : "#", 0, 0);
        }
        c.restore();
      }
    },
  };
}

const THEMES: Record<SquadSlug, () => Theme> = {
  technical,
  design,
  projects,
  events,
  "social-media": social,
};
const SEEDS: Record<SquadSlug, number> = {
  projects: 11,
  events: 23,
  technical: 37,
  "social-media": 41,
  design: 53,
};

let busy = false;

/** True when the visitor wants things kept still; the link then just opens the page. */
export const prefersStill = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays the jump for one squad from the point x, y (in CSS pixels), calls `go` to open the page once
 * the screen is covered, waits for it, then opens an iris onto the new page and cleans up.
 */
export async function playWarp(
  slug: SquadSlug,
  x: number,
  y: number,
  title: string,
  go: () => Promise<unknown> | void,
): Promise<void> {
  if (busy) return;
  busy = true;
  const theme = THEMES[slug]();
  const wrap = document.createElement("div");
  wrap.className = "squad-warp";
  wrap.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  const label = document.createElement("div");
  label.className = "squad-warp-title";
  label.style.color = theme.title;
  if (theme.titleAt) label.style.top = `${theme.titleAt * 100}%`;
  const small = document.createElement("span");
  small.textContent = "SQUAD";
  const big = document.createElement("strong");
  big.textContent = title;
  label.append(small, big);
  wrap.append(canvas, label);
  document.body.appendChild(wrap);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext("2d");
  const scene: Scene = {
    w,
    h,
    x,
    y,
    diag: Math.hypot(Math.max(x, w - x), Math.max(y, h - y)),
    rnd: seeded(SEEDS[slug]),
  };
  let opened = -1;
  let ready = false;
  let gone = false;
  const t0 = performance.now();

  const finish = () => {
    if (gone) return;
    gone = true;
    wrap.remove();
    busy = false;
  };
  // never leave the overlay up, whatever happens
  const guard = window.setTimeout(finish, 6000);

  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      if (gone) return resolve();
      const t = now - t0;
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        theme.draw(c, t, scene);
        if (opened >= 0) {
          // the iris: a growing hole in the overlay that shows the new page
          const p = easeInOut(clamp((now - opened) / OPEN));
          c.globalCompositeOperation = "destination-out";
          c.beginPath();
          c.arc(w / 2, h / 2, p * Math.hypot(w, h) * 0.55, 0, Math.PI * 2);
          c.fill();
          c.globalCompositeOperation = "source-over";
          label.style.opacity = String(1 - clamp(p * 2));
        }
      }
      if (t > 260 && !label.classList.contains("on")) label.classList.add("on");
      if (t >= COVER && !ready && opened < 0) {
        ready = true;
        Promise.resolve(go())
          .catch(() => undefined)
          .then(
            () =>
              new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
              ),
          )
          .then(() => {
            opened = performance.now() + 140;
          });
      }
      if (opened >= 0 && now - opened >= OPEN) {
        window.clearTimeout(guard);
        finish();
        return resolve();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
