// Light layers drawn over each squad's animated clip on its squad page.
// Every layer uses the same 1600 x 900 frame as the picture, so the effects sit on the real things
// (the LED strip, the megaphone, the whiteboard) at every screen size. Effects on things that move in
// the clip follow them frame by frame (src/lib/squad-loops.ts). The CSS lives in
// src/components/site/squad-fx.css. Reduced motion shows the still poster and no layer at all.

import { squadLoops } from "./squad-loops";

export type SquadSlug = "projects" | "events" | "technical" | "social-media" | "design";

const VIOLET = "#725dff";
const LILAC = "#a979fa";
const LENS = "#6294ff";
const PINK = "#ff5cb8";
const WHITE = "#ffffff";

/** A four-point sparkle centred on x, y. */
const sparkle = (x: number, y: number, r: number, color: string, delay: number, dur = 2.4) =>
  `<path class="sfx-spark" d="M${x} ${y - r} C${x + r * 0.16} ${y - r * 0.16} ${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y} C${x + r * 0.16} ${y + r * 0.16} ${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r} C${x - r * 0.16} ${y + r * 0.16} ${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y} C${x - r * 0.16} ${y - r * 0.16} ${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z" fill="${color}" style="transform-origin:${x}px ${y}px;animation-delay:${delay}s;animation-duration:${dur}s"/>`;

const glowDefs = (id: string) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>`;

/** Steam curling up from a coffee cup whose lid is centred on x, y. */
const steam = (x: number, y: number, delay: number) =>
  [0, 1, 2]
    .map(
      (i) =>
        `<path class="sfx-steam" d="M${x - 10 + i * 10} ${y - 6} c-12 -16 12 -26 0 -42 c-10 -14 8 -22 2 -34" fill="none" stroke="${WHITE}" stroke-width="5" stroke-linecap="round" style="transform-origin:${x}px ${y}px;animation-delay:${delay + i * 0.9}s"/>`,
    )
    .join("");

/** The code on the laptop scrolls: two copies of the panel, one under the other, slide up for ever. */
const CODE_PANEL = "M78 606 L178 600 L186 766 L86 772Z";
const CODE_H = 166;

/**
 * TECHNICAL: the RGB LED strips breathe through the club colours, PC fans glow, sparks on the board,
 * the laptop's code scrolls and the coffee on the right is still hot.
 */
function technical(k: string, art: string) {
  const strips = [
    "M0 48 L366 60",
    "M432 38 L920 100 L1600 6",
    "M0 238 L442 242",
    "M0 414 L380 414",
    "M1096 648 L1600 718",
  ]
    .map(
      (d, i) =>
        `<path class="sfx-strip" d="${d}" stroke-width="16" filter="url(#${k}b)" style="animation-delay:-${i * 1.3}s"/>` +
        `<path class="sfx-strip sfx-strip-core" d="${d}" stroke-width="3" style="animation-delay:-${i * 1.3}s"/>`,
    )
    .join("");
  const fans = [
    [1434, 506, 34],
    [1576, 501, 36],
    [1577, 567, 36],
    [1578, 631, 33],
  ]
    .map(
      ([x, y, r], i) =>
        `<circle class="sfx-fan" cx="${x}" cy="${y}" r="${r}" fill="url(#${k}fan)" style="animation-delay:-${i * 0.7}s"/>`,
    )
    .join("");
  const rings = [0, 1, 2]
    .map(
      (i) =>
        `<ellipse class="sfx-ring" cx="1106" cy="842" rx="44" ry="16" fill="none" stroke="${LENS}" stroke-width="3" style="transform-origin:1106px 842px;animation-delay:${i * 0.9}s"/>`,
    )
    .join("");
  const sparks = [
    sparkle(948, 770, 16, WHITE, 0.2, 1.6),
    sparkle(1012, 742, 11, LENS, 0.9, 1.6),
    sparkle(905, 792, 9, PINK, 1.4, 1.6),
    sparkle(985, 800, 13, WHITE, 2.1, 1.6),
  ].join("");
  return (
    `<defs>${glowDefs(`${k}b`)}<radialGradient id="${k}fan"><stop offset="0" stop-color="${WHITE}" stop-opacity=".9"/><stop offset=".45" stop-color="${PINK}" stop-opacity=".55"/><stop offset="1" stop-color="${VIOLET}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${k}scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LENS}" stop-opacity="0"/><stop offset=".5" stop-color="${LENS}" stop-opacity=".35"/><stop offset="1" stop-color="${LENS}" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${k}mon"><path d="M1186 456 L1378 460 L1374 600 L1188 596Z"/></clipPath>` +
    `<g class="sfx-screen">${strips}${fans}</g>` +
    `<clipPath id="${k}code"><path d="${CODE_PANEL}"/></clipPath></defs>` +
    `<g clip-path="url(#${k}mon)"><rect class="sfx-scanline" x="1180" y="420" width="210" height="46" fill="url(#${k}scan)"/></g>` +
    (art
      ? `<g clip-path="url(#${k}code)"><g class="sfx-code" style="--code:-${CODE_H}px">` +
        [0, CODE_H]
          .map(
            (dy) =>
              `<g transform="translate(0 ${dy})"><image href="${art}" width="1600" height="900" clip-path="url(#${k}code)"/></g>`,
          )
          .join("") +
        `</g></g>`
      : "") +
    `<g class="sfx-screen">${steam(1186, 666, 1.4)}</g>` +
    rings +
    sparks
  );
}

/**
 * PROJECTS: the sketches draw themselves in inside the clip itself. On top: magic at the tip of the
 * presenter's wand, which rides along with the wand (see squad-loops.ts), and two glints on the board.
 */
function projects(k: string) {
  const tip =
    `<g data-track="wand-tip"><circle class="sfx-tip" cx="806" cy="256" r="22" fill="url(#${k}tip)" style="transform-origin:806px 256px"/>` +
    sparkle(806, 256, 15, LILAC, 0.2, 1.8) +
    sparkle(818, 240, 9, PINK, 0.9, 1.8) +
    sparkle(792, 246, 8, LENS, 1.4, 1.8) +
    `</g>`;
  const glints = [
    sparkle(1000, 680, 14, LILAC, 2.2, 3.4),
    sparkle(1366, 748, 12, LENS, 4.1, 3.4),
  ].join("");
  return (
    `<defs><radialGradient id="${k}tip"><stop offset="0" stop-color="${WHITE}" stop-opacity=".95"/><stop offset=".4" stop-color="${LILAC}" stop-opacity=".6"/><stop offset="1" stop-color="${LILAC}" stop-opacity="0"/></radialGradient></defs>` +
    glints +
    tip
  );
}

/** EVENTS: a light runs the visitor route on the layout board, Entrance to Stage, then the Stage box lights up. */
function events(k: string) {
  const route = "M908 190 L1082 190 L1100 190 L1100 232 L1090 250 L1090 384";
  return (
    `<defs>${glowDefs(`${k}b`)}<linearGradient id="${k}sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${WHITE}" stop-opacity="0"/><stop offset=".5" stop-color="${WHITE}" stop-opacity=".55"/><stop offset="1" stop-color="${WHITE}" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${k}board"><path d="M858 54 H1538 V250 H1290 V506 H1062 V250 H858Z"/></clipPath></defs>` +
    `<path class="sfx-route" d="${route}" stroke="${VIOLET}" stroke-width="14" filter="url(#${k}b)" pathLength="100"/>` +
    `<path class="sfx-route sfx-route-core" d="${route}" stroke="${LILAC}" stroke-width="5" pathLength="100"/>` +
    `<rect class="sfx-stage" x="1034" y="388" width="108" height="46" rx="3" fill="${LILAC}" fill-opacity=".35" stroke="${VIOLET}" stroke-width="4"/>` +
    `<g clip-path="url(#${k}board)"><rect class="sfx-sweep" x="700" y="40" width="160" height="480" fill="url(#${k}sweep)" transform="skewX(-18)"/></g>` +
    sparkle(1144, 336, 15, PINK, 0.4, 2.6) +
    sparkle(1180, 140, 10, LILAC, 1.6, 2.6) +
    sparkle(1478, 150, 12, LENS, 2.4, 2.6)
  );
}

/** SOCIAL MEDIA AND OUTREACH: the megaphone sends out waves, the phone films with a flash, QR codes get scanned. */
function social(k: string) {
  const waves = [0, 1, 2]
    .map(
      (i) =>
        `<path class="sfx-wave" d="M1012 368 A60 60 0 0 1 1012 470" fill="none" stroke="${WHITE}" stroke-width="6" stroke-linecap="round" style="transform-origin:960px 418px;animation-delay:${i * 0.55}s"/>`,
    )
    .join("");
  const qrs: [number, number, number, number][] = [
    [596, 148, 46, 0],
    [711, 158, 56, 1.5],
    [1464, 168, 52, 3],
  ];
  const qrMarks = qrs
    .map(([x, y, s, d]) => {
      const c = 10;
      const corners =
        `M${x - 6} ${y - 6 + c} V${y - 6} H${x - 6 + c} M${x + s + 6 - c} ${y - 6} H${x + s + 6} V${y - 6 + c} ` +
        `M${x + s + 6} ${y + s + 6 - c} V${y + s + 6} H${x + s + 6 - c} M${x - 6 + c} ${y + s + 6} H${x - 6} V${y + s + 6 - c}`;
      return (
        `<g class="sfx-qr" style="animation-delay:${d}s"><path d="${corners}" fill="none" stroke="${PINK}" stroke-width="4" stroke-linecap="round"/>` +
        `<rect class="sfx-qr-line" x="${x - 4}" y="${y}" width="${s + 8}" height="4" rx="2" fill="${PINK}" style="--qr:${s}px;animation-delay:${d}s"/></g>`
      );
    })
    .join("");
  return (
    `<defs><radialGradient id="${k}flash"><stop offset="0" stop-color="${WHITE}"/><stop offset=".35" stop-color="${WHITE}" stop-opacity=".8"/><stop offset="1" stop-color="${WHITE}" stop-opacity="0"/></radialGradient></defs>` +
    // These two ride along with the megaphone and the phone (see squad-loops.ts).
    `<g data-track="megaphone">${waves}</g>` +
    `<g data-track="phone"><circle class="sfx-flash" cx="1078" cy="440" r="70" fill="url(#${k}flash)" style="transform-origin:1078px 440px"/>` +
    `<circle class="sfx-rec" cx="1172" cy="428" r="7" fill="#ff3b3b"/></g>` +
    qrMarks +
    sparkle(70, 150, 14, WHITE, 0.8, 3) +
    sparkle(232, 160, 11, WHITE, 2.2, 3) +
    sparkle(960, 128, 12, WHITE, 3.4, 3)
  );
}

/** DESIGN: string lights twinkle, the monitor picks a poster layout, the stylus and print nozzle glow. */
const BULBS: [number, number][] = [
  [47, 106],
  [114, 84],
  [173, 49],
  [219, 11],
  [284, 55],
  [356, 69],
  [440, 46],
  [494, 13],
  [555, 25],
  [556, 89],
  [554, 158],
  [555, 219],
  [555, 285],
  [614, 34],
  [642, 87],
  [689, 130],
  [743, 139],
  [814, 109],
  [867, 62],
  [908, 6],
  [1049, 56],
  [1103, 108],
  [1173, 151],
  [1252, 164],
  [1337, 158],
  [1406, 121],
  [1471, 62],
  [1513, 16],
];
/** The four layout options on the monitor; a highlight hops between them. */
const TILES: [number, number, number, number][] = [
  [522, 377, 92, 70],
  [617, 372, 90, 70],
  [524, 452, 91, 70],
  [621, 445, 89, 72],
];
function design(k: string) {
  const bulbs = BULBS.map(
    ([x, y], i) =>
      `<circle class="sfx-bulb" cx="${x}" cy="${y}" r="22" fill="url(#${k}bulb)" style="transform-origin:${x}px ${y}px;animation-delay:-${((i * 0.83) % 3).toFixed(2)}s"/>`,
  ).join("");
  const picks = TILES.map(
    ([x, y, w, h], i) =>
      `<rect class="sfx-pick" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="5" fill="${LILAC}" fill-opacity=".18" stroke="${VIOLET}" stroke-width="4" style="animation-delay:${i * 1.5}s"/>`,
  ).join("");
  return (
    `<defs><radialGradient id="${k}bulb"><stop offset="0" stop-color="${WHITE}" stop-opacity=".95"/><stop offset=".3" stop-color="${LILAC}" stop-opacity=".7"/><stop offset="1" stop-color="${LILAC}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${k}nozzle"><stop offset="0" stop-color="${WHITE}"/><stop offset=".4" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${k}sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${WHITE}" stop-opacity="0"/><stop offset=".5" stop-color="${WHITE}" stop-opacity=".45"/><stop offset="1" stop-color="${WHITE}" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${k}mon"><path d="M503 352 L724 344 L728 545 L505 560Z"/></clipPath></defs>` +
    `<g class="sfx-screen">${bulbs}</g>` +
    picks +
    `<g clip-path="url(#${k}mon)"><rect class="sfx-sheen" x="360" y="330" width="90" height="250" fill="url(#${k}sheen)" transform="skewX(-20)"/></g>` +
    // These two ride along with the print head and the stylus (see squad-loops.ts).
    `<g data-track="nozzle"><circle class="sfx-nozzle" cx="1186" cy="524" r="12" fill="url(#${k}nozzle)" style="transform-origin:1186px 524px"/></g>` +
    `<g data-track="stylus-tip">` +
    sparkle(412, 664, 11, LILAC, 0.1, 1.8) +
    sparkle(426, 652, 7, PINK, 0.7, 1.8) +
    sparkle(400, 676, 8, LENS, 1.3, 1.8) +
    `</g>`
  );
}

/** The effect layer for one squad, as SVG markup in the 1600 x 900 frame of its picture. */
export function squadFx(
  slug: SquadSlug,
  opts: {
    /** the squad's own picture, for effects made from it */ art?: string;
  } = {},
): string {
  const k = `sfx-${slug}`;
  const body = {
    technical: () => technical(k, opts.art ?? ""),
    projects: () => projects(k),
    events: () => events(k),
    "social-media": () => social(k),
    design: () => design(k),
  }[slug]();
  // Two clips are framed a little tighter than the picture: move the effects onto the clip.
  const m = squadLoops[slug].frame;
  return m ? `<g transform="matrix(${m.join(" ")})">${body}</g>` : body;
}
