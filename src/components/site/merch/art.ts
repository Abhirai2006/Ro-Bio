// The flat artwork that gets printed on the merch: the name under the back logo, the sleeve number and the
// woven neck label. Drawn on canvases so the 3D models and the print map below them always show the same thing.
import type { ColourId } from "@/lib/merch";

export const LOGO_SRC = "/merch/robio-print.webp";
export const CREST_SRC = "/merch/muse-crest.webp";

const PAPER = "#fffffa";
const INK = "#201e2d";
const LILAC = "#a979fa";
const VIOLET = "#725dff";
const LENS = "#6294ff";

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
  const line = "RO-BIO HUB / MUSE / 2026";
  const w = spaced(g, line, cv.width / 2, 318, 12);
  const sq = 20;
  g.fillRect(cv.width / 2 - w / 2 - 56, 318 - 36, sq, sq);
  g.fillRect(cv.width / 2 + w / 2 + 36, 318 - 36, sq, sq);
  return cv;
}

export const CHIP = { w: 640, h: 720 };

/**
 * The sleeve number, set inside a microchip: a nod to what the club builds. The digits copy the logo's own
 * lettering, a white face with a lilac outline over a violet extrusion.
 */
export function drawNumberChip(cv: HTMLCanvasElement, num: string, c: ColourId) {
  cv.width = CHIP.w;
  cv.height = CHIP.h;
  const g = cv.getContext("2d")!;
  const ink = inks(c);
  g.clearRect(0, 0, cv.width, cv.height);

  const x0 = 120,
    y0 = 70,
    x1 = cv.width - 120,
    y1 = cv.height - 70,
    r = 34,
    lw = 16;
  // pins, four a side
  g.fillStyle = ink.frame;
  for (let i = 0; i < 4; i++) {
    const py = y0 + 110 + i * 120;
    g.beginPath();
    g.roundRect(x0 - 78, py, 70, 44, 6);
    g.roundRect(x1 + 8, py, 70, 44, 6);
    g.fill();
  }
  // body outline with the notch at the top
  g.strokeStyle = ink.frame;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(cv.width / 2 - 46, y0);
  g.lineTo(x0 + r, y0);
  g.arcTo(x0, y0, x0, y0 + r, r);
  g.lineTo(x0, y1 - r);
  g.arcTo(x0, y1, x0 + r, y1, r);
  g.lineTo(x1 - r, y1);
  g.arcTo(x1, y1, x1, y1 - r, r);
  g.lineTo(x1, y0 + r);
  g.arcTo(x1, y0, x1 - r, y0, r);
  g.lineTo(cv.width / 2 + 46, y0);
  g.arc(cv.width / 2, y0, 46, 0, Math.PI, false);
  g.stroke();
  // pin one marker and the label
  g.beginPath();
  g.arc(x0 + 46, y0 + 48, 13, 0, Math.PI * 2);
  g.fill();
  g.font = `400 40px "Silkscreen", monospace`;
  g.textBaseline = "alphabetic";
  g.textAlign = "right";
  g.fillText("NO.", x1 - 30, y0 + 64);

  const digits = num || "00";
  let size = digits.length > 1 ? 330 : 380;
  g.font = `italic 900 ${size}px "Tektur", "Arial Black", sans-serif`;
  while (g.measureText(digits).width > x1 - x0 - 90 && size > 120) {
    size -= 6;
    g.font = `italic 900 ${size}px "Tektur", "Arial Black", sans-serif`;
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const cx = cv.width / 2 - 10,
    cy = cv.height / 2 + 34;
  const depth = Math.round(size * 0.07);
  // extrusion: the same digits stepped down and right, outlined so it reads as a solid
  for (let k = depth; k > 0; k--) {
    g.lineWidth = 20;
    g.strokeStyle = ink.extrude;
    g.strokeText(digits, cx + k, cy + k);
    g.fillStyle = ink.extrude;
    g.fillText(digits, cx + k, cy + k);
  }
  g.lineWidth = 20;
  g.strokeStyle = ink.stroke;
  g.strokeText(digits, cx, cy);
  g.fillStyle = ink.face;
  g.fillText(digits, cx, cy);
  // two dashes of the lens blue under the digits, like the logo's visor highlight
  g.globalAlpha = 0.9;
  g.fillStyle = LENS;
  g.fillRect(x0 + 40, y1 - 58, 120, 12);
  g.fillRect(x0 + 172, y1 - 58, 36, 12);
  g.globalAlpha = 1;
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
