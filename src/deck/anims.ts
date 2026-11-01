// Canvas animations for the Robo Spark deck. Each one starts when its slide is shown and stops when it leaves,
// so only one slide ever draws at a time. They are the same drawings as the first version of the deck.
import { pixelText } from "./pixel";
import type { Countdown } from "./timer";

export type Anim = (X: CanvasRenderingContext2D, W: number, H: number) => () => void;

const C = {
  beige: "#E4DBD4",
  violet: "#6F5DFF",
  ink: "#1E1A3C",
  paper: "#F8F4F0",
  lilac: "#B7ABFF",
  pink: "#FF5CB8",
  yellow: "#FFE066",
  deep: "#4B37D6",
};

/** Runs `frame` every animation frame until the returned function is called. */
function loop(frame: (t: number) => void) {
  let id = 0;
  let on = true;
  const tick = (t: number) => {
    if (!on) return;
    frame(t);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => {
    on = false;
    cancelAnimationFrame(id);
  };
}

type Bit = { x: number; y: number; vx: number; vy: number; l: number; s: number; c: string };

/** Slide 1: sparks and a little lightning zap off the tiny robot in the poster art. */
export const sparks: Anim = (X, W, H) => {
  const ps: Bit[] = [];
  const ox = 230,
    oy = 236;
  const cols = [C.pink, C.paper, C.lilac, C.violet, C.yellow];
  let last = 0,
    zap = 0;
  const add = (n: number, sp: number) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4,
        v = sp * (0.4 + Math.random());
      ps.push({
        x: ox,
        y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        l: 40 + Math.random() * 60,
        s: 4 + Math.floor(Math.random() * 3) * 3,
        c: cols[Math.floor(Math.random() * cols.length)]!,
      });
    }
  };
  return loop((t) => {
    X.clearRect(0, 0, W, H);
    add(2, 5);
    if (t - last > 1800) {
      add(40, 9);
      last = t;
      zap = 10;
    }
    if (zap > 0) {
      zap--;
      X.strokeStyle = C.pink;
      X.lineWidth = 5;
      X.beginPath();
      let x = ox,
        y = oy - 10;
      X.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (Math.random() - 0.5) * 70;
        y -= 24;
        X.lineTo(x, y);
      }
      X.stroke();
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      if (--p.l <= 0) {
        ps.splice(i, 1);
        continue;
      }
      X.globalAlpha = Math.min(1, p.l / 30);
      X.fillStyle = p.c;
      X.fillRect(p.x, p.y, p.s, p.s);
    }
    X.globalAlpha = 1;
  });
};

/** Slide 1: a terminal that types its lines, with a blinking block cursor. */
export const terminal =
  (lines: string[], color = C.deep, cursor = C.violet): Anim =>
  (X, W, H) => {
    const t0 = performance.now();
    return loop((now) => {
      X.clearRect(0, 0, W, H);
      let n = Math.floor(Math.max(0, now - t0 - 700) / 55);
      let y = 8;
      for (let i = 0; i < lines.length; i++) {
        const s = lines[i]!;
        const k = Math.min(s.length, n);
        n -= s.length + 6;
        pixelText(X, s.substring(0, Math.max(0, k)), 0, y, 4, color);
        if (k >= 0 && (s.length > k || i === lines.length - 1) && Math.floor(now / 400) % 2) {
          X.fillStyle = cursor;
          X.fillRect(Math.max(0, k) * 24, y, 20, 28);
        }
        if (s.length > k) break;
        y += 48;
      }
    });
  };

/** Today's route: a signal pulse that runs along the dotted line through the stops. */
export const signal =
  (x0: number, x1: number): Anim =>
  (X, W, H) => {
    const yy = H / 2;
    return loop((t) => {
      X.clearRect(0, 0, W, H);
      X.fillStyle = "rgba(30,26,60,0.35)";
      for (let x = x0; x < x1; x += 40) X.fillRect(x, yy - 5, 24, 10);
      const p = (((t / 1000) * 380) % (x1 - x0 + 300)) + x0 - 150;
      for (let k = 0; k < 14; k++) {
        const q = p - k * 22;
        if (q > x0 && q < x1) {
          X.globalAlpha = (1 - k / 14) * 0.9;
          X.fillStyle = C.violet;
          X.fillRect(q - 8, yy - 8, 16, 16);
        }
      }
      X.globalAlpha = 1;
      if (p > x0 && p < x1) {
        const g = X.createRadialGradient(p, yy, 0, p, yy, 70);
        g.addColorStop(0, "rgba(255,92,184,0.9)");
        g.addColorStop(1, "rgba(255,92,184,0)");
        X.fillStyle = g;
        X.fillRect(p - 70, yy - 70, 140, 140);
        X.fillStyle = C.paper;
        X.fillRect(p - 10, yy - 10, 20, 20);
      }
    });
  };

/** What we do: circuit traces with signals running along them. */
export const circuit: Anim = (X, W, H) => {
  let sd = 7;
  const rn = () => ((sd = (sd * 9301 + 49297) % 233280), sd / 233280);
  const g = 40;
  const o = document.createElement("canvas");
  o.width = W;
  o.height = H;
  const Y = o.getContext("2d")!;
  const T: { p: [number, number][]; o: number; L: number }[] = [];
  for (let i = 0; i < 46; i++) {
    let x = Math.floor(rn() * 48) * g,
      y = Math.floor(rn() * 27) * g,
      dir = Math.floor(rn() * 4);
    const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 8; s++) {
      const n = 1 + Math.floor(rn() * 4);
      if (rn() > 0.6) dir = (dir + (rn() > 0.5 ? 1 : 3)) % 4;
      x += [g, 0, -g, 0][dir]! * n;
      y += [0, g, 0, -g][dir]! * n;
      pts.push([x, y]);
    }
    let L = 0;
    for (let k = 1; k < pts.length; k++)
      L += Math.abs(pts[k]![0] - pts[k - 1]![0]) + Math.abs(pts[k]![1] - pts[k - 1]![1]);
    T.push({ p: pts, o: rn(), L });
  }
  Y.strokeStyle = "rgba(111,93,255,0.22)";
  Y.lineWidth = 4;
  Y.fillStyle = "rgba(111,93,255,0.35)";
  for (const t of T) {
    Y.beginPath();
    Y.moveTo(t.p[0]![0], t.p[0]![1]);
    for (const q of t.p) Y.lineTo(q[0], q[1]);
    Y.stroke();
    const e = t.p[t.p.length - 1]!;
    Y.fillRect(e[0] - 7, e[1] - 7, 14, 14);
    Y.fillRect(t.p[0]![0] - 7, t.p[0]![1] - 7, 14, 14);
  }
  const at = (t: (typeof T)[number], dist: number): [number, number] => {
    for (let k = 1; k < t.p.length; k++) {
      const a = t.p[k - 1]!,
        b = t.p[k]!,
        s = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (s >= dist) {
        const f = s ? dist / s : 0;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      dist -= s;
    }
    return t.p[t.p.length - 1]!;
  };
  return loop((tm) => {
    X.clearRect(0, 0, W, H);
    X.drawImage(o, 0, 0);
    X.fillStyle = C.lilac;
    X.shadowColor = "#8F80FF";
    X.shadowBlur = 18;
    for (const t of T) {
      const dist = ((tm / 1000) * 200 + t.o * t.L * 3) % (t.L * 1.6);
      if (dist < t.L) {
        const q = at(t, dist);
        X.fillRect(q[0] - 6, q[1] - 6, 12, 12);
      }
    }
    X.shadowBlur = 0;
  });
};

/** Bot Forge: two pixel sumo robots pushing each other in the ring. */
export const sumo: Anim = (X, W, H) => {
  const bot = (
    x: number,
    y: number,
    body: string,
    dark: string,
    face: boolean,
    spin: number,
    flip: number,
  ) => {
    X.save();
    X.translate(x, y);
    X.scale(flip * 1.55, 1.55);
    X.fillStyle = dark;
    X.fillRect(-70, -96, 140, 86);
    X.fillStyle = body;
    X.fillRect(-64, -90, 128, 74);
    X.fillStyle = dark;
    X.fillRect(-30, -70, 16, 16);
    X.fillRect(14, -70, 16, 16);
    if (face) X.fillRect(-20, -40, 40, 8);
    X.fillRect(56, -36, 34, 20);
    X.fillStyle = C.yellow;
    X.fillRect(60, -32, 26, 12);
    for (let w = -1; w < 2; w += 2) {
      X.save();
      X.translate(w * 40, -4);
      X.rotate(spin);
      X.fillStyle = dark;
      X.beginPath();
      X.arc(0, 0, 22, 0, 7);
      X.fill();
      X.fillStyle = body;
      X.fillRect(-3, -18, 6, 36);
      X.restore();
    }
    X.fillStyle = dark;
    X.fillRect(-4, -126, 8, 30);
    X.fillStyle = C.pink;
    X.fillRect(-10, -138, 20, 16);
    X.restore();
  };
  let px = 0;
  const ps: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
  return loop((tm) => {
    const t = tm / 1000;
    X.clearRect(0, 0, W, H);
    X.fillStyle = "rgba(30,26,60,0.45)";
    X.beginPath();
    X.ellipse(420, 270, 380, 46, 0, 0, 7);
    X.fill();
    X.strokeStyle = C.beige;
    X.lineWidth = 6;
    X.beginPath();
    X.ellipse(420, 262, 330, 34, 0, 0, 7);
    X.stroke();
    const s = Math.sin(t * 1.3) * 80 + Math.sin(t * 3.3) * 14,
      ds = s - px;
    px = s;
    const cx = 420 + s;
    bot(cx - 140, 262, C.beige, C.ink, true, -t * ds * 2, 1);
    bot(cx + 140, 262, C.lilac, C.ink, false, t * ds * 2, -1);
    if (Math.random() > 0.55)
      for (let i = 0; i < 3; i++)
        ps.push({
          x: cx,
          y: 200,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 7 - 2,
          l: 24,
        });
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      if (--p.l <= 0) {
        ps.splice(i, 1);
        continue;
      }
      X.fillStyle = p.l > 12 ? C.yellow : C.pink;
      X.fillRect(p.x, p.y, 6, 6);
    }
  });
};

/** Diagonal stripes filling a progress bar, clipped to `w`. */
function stripeBar(
  X: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step: number,
) {
  X.save();
  X.beginPath();
  X.rect(x, y, w, h);
  X.clip();
  X.fillStyle = color;
  for (let q = x - 80; q < x + Math.max(w, 1) + 80; q += step) {
    X.beginPath();
    X.moveTo(q, y + h);
    X.lineTo(q + step / 2, y + h);
    X.lineTo(q + step / 2 + h, y);
    X.lineTo(q + h, y);
    X.closePath();
    X.fill();
  }
  X.restore();
}

const clock = (ms: number, blink: boolean) => {
  const s = Math.ceil(ms / 1000),
    m = Math.floor(s / 60),
    r = s % 60;
  return `${m > 9 ? "" : "0"}${m}${blink ? " " : ":"}${r > 9 ? "" : "0"}${r}`;
};

/** Meet your group: the 5-minute icebreaker clock with a striped bar. */
export const icebreaker =
  (timer: Countdown): Anim =>
  (X, W, H) =>
    loop(() => {
      const rem = timer.remaining();
      X.clearRect(0, 0, W, H);
      const fg = rem === 0 ? C.pink : C.ink;
      pixelText(
        X,
        timer.paused && timer.started ? "ICE BREAKER · PAUSED" : "ICE BREAKER",
        0,
        0,
        4,
        C.deep,
      );
      pixelText(X, clock(rem, false), 0, 50, 22, fg);
      X.fillStyle = C.ink;
      X.fillRect(0, 226, 742, 44);
      X.fillStyle = C.beige;
      X.fillRect(6, 232, 730, 32);
      stripeBar(X, 6, 232, (730 * rem) / timer.duration, 32, C.violet, 28);
      pixelText(
        X,
        rem === 0 ? "TIME'S UP" : rem <= 60000 ? "1 MINUTE LEFT" : "SAY HI · PICK ROLES",
        0,
        292,
        4,
        C.deep,
      );
    });

/** Clock time like "12:28" for a moment `ms` from now. */
const wallClock = (at: number) => {
  const d = new Date(at);
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** The big 20-minute discussion timer. Colours change at 5 minutes, 1 minute and zero. */
export const bigTimer =
  (timer: Countdown, title: string): Anim =>
  (X, W, H) => {
    const P = {
      normal: [C.beige, C.ink, C.violet],
      warn: [C.violet, C.paper, C.beige],
      fin: [C.ink, C.paper, C.pink],
      done: [C.pink, C.ink, C.ink],
    } as const;
    const stripes = (x: number, col: string, bg: string) => {
      X.fillStyle = bg;
      X.fillRect(x, 0, 64, H);
      X.save();
      X.beginPath();
      X.rect(x, 0, 64, H);
      X.clip();
      X.fillStyle = col;
      for (let y = -80; y < H + 80; y += 72) {
        X.beginPath();
        X.moveTo(x, y);
        X.lineTo(x + 64, y - 64);
        X.lineTo(x + 64, y - 28);
        X.lineTo(x, y + 36);
        X.closePath();
        X.fill();
      }
      X.restore();
    };
    return loop(() => {
      const now = Date.now();
      const rem = timer.remaining();
      const st = rem === 0 ? "done" : rem <= 60000 ? "fin" : rem <= 300000 ? "warn" : "normal";
      const [bg0, fg, ac] = P[st];
      let bg: string = bg0;
      if (st === "done" && timer.endedAt && now - timer.endedAt < 6000)
        bg = Math.floor((now - timer.endedAt) / 333) % 2 ? C.paper : C.pink;
      X.fillStyle = bg;
      X.fillRect(0, 0, W, H);
      stripes(40, ac, bg);
      stripes(1816, ac, bg);
      pixelText(X, title, 168, 96, 5, ac);
      const right = !timer.started
        ? "PRESS P TO START"
        : timer.paused
          ? "PAUSED · PRESS P"
          : rem === 0
            ? "CARDS IN NOW"
            : `CARDS IN AT ${wallClock(now + rem)}`;
      pixelText(X, right, 1752, 96, 5, ac, "r");
      const blink =
        (st === "fin" || st === "done" || timer.paused) && Math.floor(now / 500) % 2 === 1;
      pixelText(X, clock(rem, blink), 960, 250, 50, fg, "c");
      const bx = 168,
        bw = 1584,
        by = 700,
        bh = 56;
      X.fillStyle = fg;
      X.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
      X.fillStyle = bg;
      X.fillRect(bx, by, bw, bh);
      stripeBar(X, bx, by, (bw * rem) / timer.duration, bh, ac, 36);
      const marks = [5, 1].filter((m) => m * 60000 < timer.duration);
      for (const mk of marks) {
        const mx = bx + (bw * mk * 60000) / timer.duration;
        X.fillStyle = fg;
        X.fillRect(mx - 3, by - 24, 6, bh + 48);
        pixelText(X, `${mk} MIN`, mx, 790, 4, fg, "c");
      }
      const msg = !timer.started
        ? "READY"
        : timer.paused
          ? "PAUSED"
          : {
              normal: "DISCUSS · WRITE ON YOUR CARD",
              warn: "5 MINUTES LEFT",
              fin: "1 MINUTE · FINISH WRITING",
              done: "TIME'S UP · PENS DOWN",
            }[st];
      pixelText(X, msg, 960, 880, 8, fg, "c");
    });
  };

/** Ready, set, go: a big confetti burst, then smaller ones. */
export const burst: Anim = (X, W, H) => {
  const ps: Bit[] = [];
  const cols = [C.pink, C.paper, C.yellow, C.ink, C.lilac];
  const pop = (x: number, y: number, n: number, sp: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7,
        v = sp * (0.3 + Math.random());
      ps.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 3,
        l: 80 + Math.random() * 80,
        s: 6 + Math.floor(Math.random() * 3) * 4,
        c: cols[Math.floor(Math.random() * cols.length)]!,
      });
    }
  };
  let last = performance.now();
  pop(960, 470, 280, 20);
  return loop((tm) => {
    X.clearRect(0, 0, W, H);
    if (tm - last > 2200) {
      pop(560 + Math.random() * 800, 300 + Math.random() * 350, 70, 11);
      last = tm;
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.16;
      if (--p.l <= 0) {
        ps.splice(i, 1);
        continue;
      }
      X.globalAlpha = Math.min(1, p.l / 40);
      X.fillStyle = p.c;
      X.fillRect(p.x, p.y, p.s, p.s);
    }
    X.globalAlpha = 1;
  });
};

/** A burst on demand, for the team reveal. Returns a function that pops sparks at x, y. */
export function popper(X: CanvasRenderingContext2D, W: number, H: number) {
  const ps: Bit[] = [];
  const cols = [C.pink, C.paper, C.yellow, C.lilac];
  const stop = loop(() => {
    X.clearRect(0, 0, W, H);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 0.22;
      if (--p.l <= 0) {
        ps.splice(i, 1);
        continue;
      }
      X.globalAlpha = Math.min(1, p.l / 30);
      X.fillStyle = p.c;
      X.fillRect(p.x, p.y, p.s, p.s);
    }
    X.globalAlpha = 1;
  });
  const pop = (x: number, y: number) => {
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * 7,
        v = 14 * (0.3 + Math.random());
      ps.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 4,
        l: 50 + Math.random() * 50,
        s: 6 + Math.floor(Math.random() * 3) * 4,
        c: cols[Math.floor(Math.random() * cols.length)]!,
      });
    }
  };
  return { pop, stop };
}

/** Judges at work: a grid with a scanner beam sweeping up and down. */
export const scanner: Anim = (X, W, H) =>
  loop((tm) => {
    const t = tm / 1000;
    X.clearRect(0, 0, W, H);
    X.fillStyle = "rgba(183,171,255,0.07)";
    for (let x = 0; x < W; x += 80) X.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 80) X.fillRect(0, y, W, 2);
    const yy = (Math.sin(t * 0.8) * 0.5 + 0.5) * (H - 40) + 20;
    const g = X.createLinearGradient(0, yy - 160, 0, yy + 160);
    g.addColorStop(0, "rgba(111,93,255,0)");
    g.addColorStop(0.5, "rgba(111,93,255,0.30)");
    g.addColorStop(1, "rgba(111,93,255,0)");
    X.fillStyle = g;
    X.fillRect(0, yy - 160, W, 320);
    X.fillStyle = "#8F80FF";
    X.fillRect(0, yy - 2, W, 4);
    for (let i = 0; i < 24; i++) {
      const bx = (i * 83 + Math.floor(t * 6) * 37) % W;
      X.fillStyle = "rgba(255,92,184,0.55)";
      X.fillRect(bx, yy - 10, 8, 8);
    }
  });

/** On stage: three spotlights sweeping across the slide. */
export const spotlights: Anim = (X, W, H) => {
  const cone = (x: number, y: number, a: number, c: number) => {
    X.save();
    X.translate(x, y);
    X.rotate(a);
    const g = X.createLinearGradient(0, 0, 0, 1300);
    g.addColorStop(0, `rgba(248,244,240,${c})`);
    g.addColorStop(1, "rgba(248,244,240,0)");
    X.fillStyle = g;
    X.beginPath();
    X.moveTo(-20, 0);
    X.lineTo(20, 0);
    X.lineTo(260, 1300);
    X.lineTo(-260, 1300);
    X.closePath();
    X.fill();
    X.restore();
  };
  return loop((tm) => {
    const t = tm / 1000;
    X.clearRect(0, 0, W, H);
    X.globalCompositeOperation = "lighter";
    cone(1300, -40, Math.sin(t * 0.55) * 0.45 + 0.25, 0.2);
    cone(1780, -40, Math.sin(t * 0.7 + 2) * 0.4 + 0.45, 0.16);
    cone(260, -40, Math.sin(t * 0.45 + 1) * 0.35 - 0.35, 0.12);
    X.globalCompositeOperation = "source-over";
  });
};

/** Stay in touch: an ECG line with a beating pixel heart. */
export const heartbeat: Anim = (X, W, H) => {
  const M = 60,
    L = 560,
    t0 = performance.now();
  const f = (p: number) => {
    if (p < 0.12) return 0;
    if (p < 0.2) return 0.15 * Math.sin(((p - 0.12) / 0.08) * Math.PI);
    if (p < 0.3) return 0;
    if (p < 0.34) return -0.2 * ((p - 0.3) / 0.04);
    if (p < 0.4) return -0.2 + 1.2 * ((p - 0.34) / 0.06);
    if (p < 0.46) return 1 - 1.5 * ((p - 0.4) / 0.06);
    if (p < 0.5) return -0.5 + 0.5 * ((p - 0.46) / 0.04);
    if (p < 0.62) return 0;
    if (p < 0.78) return 0.3 * Math.sin(((p - 0.62) / 0.16) * Math.PI);
    return 0;
  };
  return loop((now) => {
    const t = (now - t0) / 1000,
      o = t * 240;
    const g = X.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, "rgba(111,93,255,0)");
    g.addColorStop(0.7, "rgba(111,93,255,1)");
    g.addColorStop(1, "rgba(111,93,255,1)");
    X.clearRect(0, 0, W, H);
    X.lineWidth = 6;
    X.lineJoin = "round";
    X.strokeStyle = g;
    X.beginPath();
    for (let i = 0; i <= L; i += 3) {
      const p = ((((i + o) / 200) % 1) + 1) % 1,
        y = M - f(p) * 50;
      if (i) X.lineTo(i, y);
      else X.moveTo(i, y);
    }
    X.stroke();
    const b = (t % 0.833) / 0.833,
      s = 1 + 0.25 * Math.max(0, 1 - b * 4);
    X.save();
    X.translate(650, M);
    X.scale(s, s);
    X.fillStyle = C.pink;
    X.fillRect(-14, -10, 10, 10);
    X.fillRect(4, -10, 10, 10);
    X.fillRect(-18, -4, 36, 10);
    X.fillRect(-12, 6, 24, 8);
    X.fillRect(-4, 14, 8, 6);
    X.restore();
    pixelText(X, "72 BPM", 690, M - 14, 4, C.violet);
  });
};

/** Thank you: pixel confetti drifting upwards. */
export const confetti: Anim = (X, W, H) => {
  const cols = [C.pink, C.violet, C.lilac, C.yellow];
  const ps = Array.from({ length: 70 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    v: 0.4 + Math.random() * 1.2,
    s: 6 + Math.floor(Math.random() * 3) * 4,
    c: cols[i % 4]!,
    p: Math.random() * 7,
  }));
  return loop((tm) => {
    const t = tm / 1000;
    X.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.y -= p.v;
      if (p.y < -20) {
        p.y = H + 10;
        p.x = Math.random() * W;
      }
      X.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + p.p));
      X.fillStyle = p.c;
      X.fillRect(p.x + Math.sin(t + p.p) * 12, p.y, p.s, p.s);
    }
    X.globalAlpha = 1;
  });
};
