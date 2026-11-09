// The flat artwork that gets printed on the merch: the name under the back logo and the sleeve number in the
// style each member picks. Drawn on canvases so the 3D models and the print map below them always show the same thing.
import type { ColourId, NumberStyle } from "@/lib/merch";

export const LOGO_SRC = "/merch/robio-print.webp";
export const CREST_SRC = "/merch/muse-crest.webp";

const PAPER = "#fffffa";
const INK = "#201e2d";
const LILAC = "#a979fa";
const VIOLET = "#725dff";

/** Ink colours for each garment colour, picked so every print reads on its fabric. */
export function inks(c: ColourId) {
  if (c === "black")
    return { text: PAPER, sub: LILAC, frame: LILAC, face: PAPER, stroke: LILAC, extrude: VIOLET };
  if (c === "white")
    return { text: INK, sub: VIOLET, frame: INK, face: PAPER, stroke: LILAC, extrude: VIOLET };
  return { text: INK, sub: INK, frame: INK, face: PAPER, stroke: INK, extrude: VIOLET };
}

export async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('italic 900 200px "Tektur"'),
      document.fonts.load('800 200px "Tektur"'),
      document.fonts.load('400 40px "Silkscreen"'),
      document.fonts.load('400 200px "Black Ops One"', "0123456789"),
      document.fonts.load('400 200px "Permanent Marker"', "0123456789"),
      document.fonts.load('400 200px "Potta One"', "0123456789"),
      document.fonts.load('900 60px "Noto Serif JP"', "零一二三四五六七八九十番魂"),
    ]);
  } catch {
    /* the system font is fine if the web font never arrives */
  }
}

/** Text with even letter spacing, drawn one letter at a time so it works in every browser. */
function spaced(g: CanvasRenderingContext2D, text: string, cx: number, y: number, track: number) {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let x = cx - total / 2;
  g.textAlign = "left";
  chars.forEach((ch, i) => {
    g.fillText(ch, x, y);
    x += widths[i]! + track;
  });
  return total;
}

function spacedWidth(g: CanvasRenderingContext2D, text: string, track: number) {
  const chars = [...text];
  return chars.reduce((w, ch) => w + g.measureText(ch).width, 0) + track * (chars.length - 1);
}

export const NAMEPLATE = { w: 1600, h: 360 };

/** The name block that sits under the back logo: the name, set wide, and a small pixel line under it. */
export function drawNameplate(cv: HTMLCanvasElement, name: string, c: ColourId) {
  cv.width = NAMEPLATE.w;
  cv.height = NAMEPLATE.h;
  const g = cv.getContext("2d")!;
  const ink = inks(c);
  g.clearRect(0, 0, cv.width, cv.height);
  const text = name.trim();
  g.textBaseline = "alphabetic";
  if (text) {
    let size = 190;
    const track = () => size * 0.16;
    g.font = `800 ${size}px "Tektur", "Arial Black", sans-serif`;
    while (spacedWidth(g, text, track()) > cv.width - 80 && size > 60) {
      size -= 4;
      g.font = `800 ${size}px "Tektur", "Arial Black", sans-serif`;
    }
    g.fillStyle = ink.text;
    spaced(g, text, cv.width / 2, 200, track());
  }
  // The pixel line: two small squares either side, like the corner marks on a blueprint.
  g.font = `400 58px "Silkscreen", monospace`;
  g.fillStyle = ink.sub;
  const line = "RO-BIO HUB / MUSE";
  const w = spaced(g, line, cv.width / 2, 318, 12);
  const sq = 20;
  g.fillRect(cv.width / 2 - w / 2 - 56, 318 - 36, sq, sq);
  g.fillRect(cv.width / 2 + w / 2 + 36, 318 - 36, sq, sq);
  return cv;
}

/** The sleeve number art is square; it is drawn on a 420 unit design grid and scaled up. */
export const NUMBER_ART = 840;
const RED = "#e0384f";

const KANJI = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
/** A number in Japanese numerals, like 七 for 7 or 二十三 for 23. */
export function kanjiNumber(n: number) {
  if (n < 10) return KANJI[n]!;
  const tens = Math.floor(n / 10),
    ones = n % 10;
  return `${tens > 1 ? KANJI[tens] : ""}十${ones ? KANJI[ones] : ""}`;
}

/** A small seeded random, so the brush marks come out the same on every screen and on the print. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Paints into a layer, then eats it away with dry brush streaks, like ink dragged across cloth. */
function dryBrush(
  g: CanvasRenderingContext2D,
  rnd: () => number,
  paint: (l: CanvasRenderingContext2D) => void,
  angle: number,
  amount: number,
) {
  const S = 420;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const l = c.getContext("2d")!;
  paint(l);
  l.globalCompositeOperation = "destination-out";
  l.save();
  l.translate(S / 2, S / 2);
  l.rotate(angle);
  for (let i = 0; i < 260 * amount; i++) {
    const y = (rnd() - 0.5) * S * 1.4,
      x = (rnd() - 0.5) * S * 1.4,
      len = 20 + rnd() * 160;
    l.globalAlpha = 0.25 + rnd() * 0.6;
    l.lineWidth = 0.6 + rnd() * 2.2;
    l.beginPath();
    l.moveTo(x, y);
    l.lineTo(x + len, y + (rnd() - 0.5) * 3);
    l.stroke();
  }
  l.restore();
  l.globalAlpha = 1;
  for (let i = 0; i < 900 * amount; i++) {
    l.beginPath();
    l.arc(rnd() * S, rnd() * S, rnd() * 1.6, 0, 7);
    l.fill();
  }
  g.drawImage(c, 0, 0);
}

function splatter(
  g: CanvasRenderingContext2D,
  rnd: () => number,
  cx: number,
  cy: number,
  r: number,
  col: string,
) {
  g.fillStyle = col;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 7,
      d = r * (0.3 + rnd());
    g.beginPath();
    g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd() * 4 + 0.6, 0, 7);
    g.fill();
  }
}

/** The ink for the digits on each colour: white on black, ink on the light colours. */
const digitInk = (c: ColourId) => (c === "black" ? PAPER : INK);

/** Fits text into a width by shrinking the font from `size` down. */
function fit(
  g: CanvasRenderingContext2D,
  text: string,
  font: (s: number) => string,
  size: number,
  max: number,
) {
  let s = size;
  g.font = font(s);
  while (g.measureText(text).width > max && s > 60) {
    s -= 6;
    g.font = font(s);
  }
  return s;
}

/**
 * The sleeve number in one of three styles the members liked: an armour plate from a robot anime, a dry brush
 * number with a red slash, and a brush number with its name in Japanese down the side.
 */
export function drawNumber(cv: HTMLCanvasElement, num: string, c: ColourId, style: NumberStyle) {
  cv.width = cv.height = NUMBER_ART;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, NUMBER_ART, NUMBER_ART);
  g.save();
  g.scale(NUMBER_ART / 420, NUMBER_ART / 420);
  const W = 420;
  const N = num || "0";
  const n = parseInt(N, 10) || 0;
  g.textAlign = "center";

  if (style === "plate") {
    // the plate is its own dark patch, so it reads on every colour
    const pl = [
      [70, 80],
      [330, 80],
      [372, 122],
      [372, 300],
      [330, 342],
      [92, 342],
      [48, 298],
      [48, 104],
    ];
    g.beginPath();
    pl.forEach(([a, b], i) => (i ? g.lineTo(a!, b!) : g.moveTo(a!, b!)));
    g.closePath();
    g.fillStyle = "#2a2a31";
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = LILAC;
    g.stroke();
    g.strokeStyle = "rgba(169,121,250,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(48, 262);
    g.lineTo(120, 262);
    g.lineTo(140, 274);
    g.lineTo(372, 274);
    g.stroke();
    g.beginPath();
    g.moveTo(300, 80);
    g.lineTo(300, 120);
    g.lineTo(372, 120);
    g.stroke();
    for (const [a, b] of [
      [70, 100],
      [352, 102],
      [70, 322],
      [352, 322],
    ]) {
      g.beginPath();
      g.arc(a!, b!, 5, 0, 7);
      g.fillStyle = "#4a4a54";
      g.fill();
    }
    g.textBaseline = "alphabetic";
    fit(g, N, (s) => `${s}px "Black Ops One", "Arial Black", sans-serif`, 190, 290);
    g.fillStyle = VIOLET;
    g.fillText(N, W / 2 + 6, 254);
    g.fillStyle = PAPER;
    g.fillText(N, W / 2, 248);
    // caution stripes
    g.save();
    g.beginPath();
    g.rect(150, 284, 200, 18);
    g.clip();
    for (let i = -20; i < 40; i++) {
      g.fillStyle = i % 2 ? LILAC : "#2a2a31";
      g.beginPath();
      g.moveTo(150 + i * 16, 302);
      g.lineTo(150 + i * 16 + 18, 284);
      g.lineTo(150 + i * 16 + 34, 284);
      g.lineTo(150 + i * 16 + 16, 302);
      g.fill();
    }
    g.restore();
    g.font = '400 15px "Silkscreen", monospace';
    g.textAlign = "left";
    g.fillStyle = PAPER;
    g.fillText(`RB-${N}`, 66, 300);
    g.fillStyle = LILAC;
    g.fillText("RO-BIO", 304, 112);
  } else if (style === "ink") {
    const rnd = seeded(11);
    dryBrush(
      g,
      rnd,
      (l) => {
        l.save();
        l.translate(W / 2, 200);
        l.rotate(-0.22);
        l.fillStyle = RED;
        l.beginPath();
        l.moveTo(-185, 46);
        l.quadraticCurveTo(10, -6, 190, -50);
        l.lineTo(186, -30);
        l.quadraticCurveTo(0, 16, -180, 62);
        l.fill();
        l.restore();
      },
      -0.22,
      0.5,
    );
    dryBrush(
      g,
      rnd,
      (l) => {
        l.textAlign = "center";
        l.textBaseline = "middle";
        l.fillStyle = digitInk(c);
        fit(l, N, (s) => `${s}px "Permanent Marker", "Arial Black", sans-serif`, 230, 330);
        l.save();
        l.translate(W / 2, 196);
        l.transform(1, 0, -0.12, 1, 0, 0);
        l.fillText(N, 0, 0);
        l.restore();
      },
      -0.1,
      1,
    );
    splatter(g, rnd, 312, 300, 34, digitInk(c));
    splatter(g, rnd, 96, 112, 22, RED);
  } else {
    const rnd = seeded(23);
    dryBrush(
      g,
      rnd,
      (l) => {
        l.textAlign = "center";
        l.textBaseline = "middle";
        l.fillStyle = digitInk(c);
        fit(l, N, (s) => `${s}px "Potta One", "Arial Black", sans-serif`, 210, 270);
        l.fillText(N, W / 2 - 36, 200);
      },
      -0.05,
      0.8,
    );
    const side = [...`${kanjiNumber(n)}番`];
    const step = side.length > 3 ? 48 : 60;
    g.font = `900 ${side.length > 3 ? 44 : 54}px "Noto Serif JP", serif`;
    g.textBaseline = "middle";
    g.fillStyle = c === "lilac" ? INK : LILAC;
    side.forEach((ch, i) => g.fillText(ch, 352, 200 - ((side.length - 1) * step) / 2 + i * step));
    g.fillStyle = RED;
    g.fillRect(330, 330, 44, 44);
    g.fillStyle = c === "black" ? "#1f1f23" : PAPER;
    g.font = '900 26px "Noto Serif JP", serif';
    g.fillText("魂", 352, 353);
  }
  g.restore();
  return cv;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
