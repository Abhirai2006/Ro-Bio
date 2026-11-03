// Draws a Robo Spark certificate as an SVG, 1123 x 794 (A4 landscape at 96 dpi).
// The same function is used by the website pages, the PNG download and the bulk PDF script,
// so every copy of a certificate looks the same. Text y values are baselines.
import qrcode from "qrcode-generator";
import { CERT_METRICS } from "@/lib/cert-metrics";
import { SIGNERS, verifyUrl, type Cert } from "@/lib/certificates";

export const CERT_W = 1123;
export const CERT_H = 794;

/** Where each picture comes from: a URL on the site, or a data URI for a standalone file. */
export type CertAssets = {
  robioLogo: string;
  crest: string;
  museLogo: string;
  participationArt: string;
  participationSeal: string;
  posterArt: string;
  signatures: { left: string | null; centre: string | null; right: string | null };
};

/** The picture files in public/ that a certificate uses. */
export const CERT_FILES = {
  robioLogo: "certificates/robio-logo.png",
  crest: "certificates/uom-crest.png",
  museLogo: "certificates/muse-logo.png",
  participationArt: "certificates/participation-art.svg",
  participationSeal: "certificates/participation-seal.svg",
  posterArt: "events/robo-spark/art-poster.webp",
} as const;

/** The font files in public/fonts/cert/, with the family names the SVG uses. */
export const CERT_FONTS = [
  { family: "RS Cinzel", file: "cinzel-700.woff2", weight: 700, style: "normal" },
  { family: "RS Cormorant", file: "cormorant-500.woff2", weight: 500, style: "normal" },
  { family: "RS Cormorant", file: "cormorant-500-italic.woff2", weight: 500, style: "italic" },
  { family: "RS Rubik Mono", file: "rubik-mono-one.woff2", weight: 400, style: "normal" },
  { family: "RS Silkscreen", file: "silkscreen-400.woff2", weight: 400, style: "normal" },
  { family: "RS Silkscreen", file: "silkscreen-700.woff2", weight: 700, style: "normal" },
  { family: "RS Nunito Sans", file: "nunito-sans-600.woff2", weight: 600, style: "normal" },
] as const;

/** The @font-face rules. `src` turns a font file name into a URL or a data URI. */
export function certFontCss(src: (file: string) => string = (f) => `/fonts/cert/${f}`): string {
  return CERT_FONTS.map(
    (f) =>
      `@font-face{font-family:"${f.family}";src:url("${src(f.file)}") format("woff2");font-weight:${f.weight};font-style:${f.style};font-display:block}`,
  ).join("");
}

/** The picture URLs on the live site. */
export function certAssetUrls(signatures: CertAssets["signatures"], base = "/"): CertAssets {
  const sig = (f: string | null) => (f ? `${base}certificates/${f}` : null);
  return {
    robioLogo: base + CERT_FILES.robioLogo,
    crest: base + CERT_FILES.crest,
    museLogo: base + CERT_FILES.museLogo,
    participationArt: base + CERT_FILES.participationArt,
    participationSeal: base + CERT_FILES.participationSeal,
    posterArt: base + CERT_FILES.posterArt,
    signatures: {
      left: sig(signatures.left),
      centre: sig(signatures.centre),
      right: sig(signatures.right),
    },
  };
}

type MetricFont = keyof typeof CERT_METRICS;
const widthTables = new Map<MetricFont, { w: number[]; avg: number }>();
function table(font: MetricFont) {
  let t = widthTables.get(font);
  if (!t) {
    const w = CERT_METRICS[font].split(",").map((s) => (s === "" ? -1 : Number(s)));
    const known = w.filter((n) => n > 0);
    t = { w, avg: known.reduce((a, b) => a + b, 0) / known.length };
    widthTables.set(font, t);
  }
  return t;
}

/** How wide a line of text is, in px, without letter spacing. Kerning is left out (a few px at most). */
export function textWidth(text: string, font: MetricFont, size: number): number {
  const t = table(font);
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 32;
    const w = code >= 32 && code <= 255 ? (t.w[code - 32] ?? -1) : -1;
    units += w >= 0 ? w : t.avg;
  }
  return (units * size) / 1000;
}

/** The biggest font size up to `size` at which the text fits in `max` px. */
export function fitSize(
  text: string,
  font: MetricFont,
  size: number,
  max: number,
  letterSpacingEm = 0,
): number {
  const w = textWidth(text, font, size) + [...text].length * letterSpacingEm * size;
  return w <= max ? size : Math.floor(((size * max) / w) * 10) / 10;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => String(Math.round(v * 100) / 100);

type TextOpts = {
  x: number;
  y: number;
  family: string;
  size: number;
  fill: string;
  weight?: number;
  italic?: boolean;
  /** Letter spacing in em. */
  ls?: number;
  anchor?: "start" | "middle" | "end";
  extra?: string;
};

/** One line of text. Centred text with letter spacing is moved right by half a space, so it is truly centred. */
function text(content: string, o: TextOpts): string {
  const ls = (o.ls ?? 0) * o.size;
  const anchor = o.anchor ?? "middle";
  const x = anchor === "middle" ? o.x + ls / 2 : anchor === "end" ? o.x + ls : o.x;
  const attrs = [
    `x="${n(x)}"`,
    `y="${n(o.y)}"`,
    `font-family="${o.family}"`,
    `font-size="${n(o.size)}"`,
    `fill="${o.fill}"`,
    o.weight ? `font-weight="${o.weight}"` : "",
    o.italic ? `font-style="italic"` : "",
    ls ? `letter-spacing="${n(ls)}"` : "",
    anchor !== "start" ? `text-anchor="${anchor}"` : "",
    o.extra ?? "",
  ].filter(Boolean);
  return `<text ${attrs.join(" ")}>${content}</text>`;
}

/** The QR code as one path, `size` px square, dark modules only (no quiet zone, no background). */
export function qrPath(data: string, x: number, y: number, size: number, fill: string): string {
  const q = qrcode(0, "Q");
  q.addData(data, "Byte");
  q.make();
  const count = q.getModuleCount();
  let d = "";
  for (let r = 0; r < count; r++) {
    let c = 0;
    while (c < count) {
      if (!q.isDark(r, c)) {
        c++;
        continue;
      }
      let e = c;
      while (e < count && q.isDark(r, e)) e++;
      d += `M${c} ${r}h${e - c}v1h${c - e}z`;
      c = e;
    }
  }
  const k = size / count;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${Math.round(k * 10000) / 10000})" fill="${fill}" d="${d}"/>`;
}

const image = (href: string, x: number, y: number, w: number, h: number, extra = "") =>
  `<image href="${esc(href)}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${extra ? ` ${extra}` : ""}/>`;

/** The signature pictures sit on the line: scaled to fit the slot, bottom aligned. */
function signature(href: string | null, cx: number, y: number, w: number, h: number) {
  return href ? image(href, cx - w / 2, y, w, h, `preserveAspectRatio="xMidYMax meet"`) : "";
}

const svgOpen = (id: string, fontCss: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${CERT_W} ${CERT_H}" width="${CERT_W}" height="${CERT_H}" data-cert="${id}">` +
  (fontCss ? `<style>${fontCss}</style>` : "");

// Student certificate of participation (formal ivory design).
const NAVY = "#232046";
const GOLD = "#7E5F1C";
const MUTED = "#4a4566";
const BODY = "#2e2a4f";
const CINZEL = "RS Cinzel, Cinzel, serif";
const CORMORANT = "RS Cormorant, Cormorant Garamond, serif";
const STUDENT_COLS = [321, 561.5, 802] as const;
const MID = CERT_W / 2;

function studentSvg(cert: Cert, a: CertAssets, fontCss: string): string {
  const nameSize = fitSize(cert.name, "cormorantItalic", 60, 760);
  const team = cert.team ?? 0;
  const body = (y: number, content: string) =>
    text(content, { x: MID, y, family: CORMORANT, size: 17, fill: BODY, weight: 500 });
  const signers = SIGNERS.map((s, i) => {
    const cx = STUDENT_COLS[i] ?? MID;
    return [
      text(esc(s.name), {
        x: cx,
        y: 669,
        family: CINZEL,
        size: 13,
        fill: NAVY,
        weight: 700,
        ls: 0.08,
      }),
      ...s.role.map((line, j) =>
        text(esc(line), {
          x: cx,
          y: j ? 704.24 : 688,
          family: CORMORANT,
          size: 14.5,
          fill: MUTED,
          weight: 500,
          italic: true,
        }),
      ),
    ].join("");
  });
  return [
    svgOpen(cert.no, fontCss),
    `<g class="cert-art">`,
    image(a.participationArt, 0, 0, CERT_W, CERT_H),
    image(a.robioLogo, 396.5, 287, 330, 330, `opacity="0.05"`),
    image(a.participationSeal, 0, 0, CERT_W, CERT_H),
    `</g><g class="cert-logo">`,
    image(a.robioLogo, 108, 80, 102, 102),
    image(a.crest, 525.5, 82, 72, 82.3),
    image(a.museLogo, 931, 84, 84, 93.5),
    `</g><g class="cert-text">`,
    text("MYSORE UNIVERSITY SCHOOL OF ENGINEERING", {
      x: MID,
      y: 190,
      family: CINZEL,
      size: 17,
      fill: NAVY,
      weight: 700,
      ls: 0.13,
    }),
    text("Manasa Gangotri, Mysuru", {
      x: MID,
      y: 211,
      family: CORMORANT,
      size: 16,
      fill: MUTED,
      weight: 500,
      italic: true,
    }),
    text("RO-BIO", { x: MID, y: 249, family: CINZEL, size: 38, fill: NAVY, weight: 700, ls: 0.12 }),
    text("Est. 2026", {
      x: 657.5,
      y: 249,
      family: CORMORANT,
      size: 14,
      fill: GOLD,
      weight: 500,
      italic: true,
      anchor: "start",
    }),
    text("Robotics and Biomedical Engineering Club", {
      x: MID,
      y: 275,
      family: CINZEL,
      size: 14.5,
      fill: GOLD,
      weight: 700,
      ls: 0.12,
    }),
    text("CERTIFICATE", {
      x: MID,
      y: 343,
      family: CINZEL,
      size: 41,
      fill: NAVY,
      weight: 700,
      ls: 0.2,
    }),
    text("of Participation", {
      x: MID,
      y: 377,
      family: CORMORANT,
      size: 25,
      fill: GOLD,
      weight: 500,
      italic: true,
    }),
    text("This is to certify that", {
      x: MID,
      y: 414,
      family: CORMORANT,
      size: 18.5,
      fill: MUTED,
      weight: 500,
      italic: true,
    }),
    text(esc(cert.name), {
      x: MID,
      y: 467,
      family: CORMORANT,
      size: nameSize,
      fill: NAVY,
      weight: 500,
      italic: true,
      extra: `class="cert-name"`,
    }),
    body(
      524,
      `took part in <tspan font-style="italic">Robo Spark</tspan>, an interactive group discussion on robotics. As a member of Team ${team}, they designed a robot to solve a`,
    ),
    body(
      548.6,
      "real-world problem, working with their team using only their own ideas, a pen and paper.",
    ),
    text("Organised by RO-BIO Hub, Mysuru, on 3rd November 2026", {
      x: MID,
      y: 579,
      family: CORMORANT,
      size: 16.5,
      fill: MUTED,
      weight: 500,
      italic: true,
    }),
    ...signers,
    text(`No. ${esc(cert.no)}`, {
      x: 990,
      y: 686,
      family: CINZEL,
      size: 9.5,
      fill: NAVY,
      weight: 700,
      ls: 0.06,
    }),
    text("Scan to verify", {
      x: 990,
      y: 703,
      family: CORMORANT,
      size: 12.5,
      fill: MUTED,
      weight: 500,
      italic: true,
    }),
    `</g><g class="cert-sig">`,
    ...SIGNERS.map((s, i) => signature(a.signatures[s.slot], STUDENT_COLS[i] ?? MID, 597, 220, 50)),
    `</g><g class="cert-qr">`,
    qrPath(verifyUrl(cert.no), 960, 612, 60, NAVY),
    `</g></svg>`,
  ].join("");
}

// Coordinator certificate of appreciation (Robo Spark poster style).
const BEIGE = "#E4DBD4";
const LILAC = "#C9BCF2";
const VIOLET = "#6F5DFF";
const DEEP = "#4B37D6";
const INK = "#1E1A3C";
const PAPER = "#F8F4F0";
const PINK = "#FF5CB8";
const RUBIK = "RS Rubik Mono, Rubik Mono One, sans-serif";
const SILK = "RS Silkscreen, Silkscreen, monospace";
const NUNITO = "RS Nunito Sans, Nunito Sans, sans-serif";
const COORD_COLS = [190, 445, 700] as const;
/** Silkscreen capitals are 0.7 em tall; this puts them in the middle of a box. */
const silkMiddle = (top: number, height: number, size: number) => top + height / 2 + size * 0.35;

function coordinatorSvg(cert: Cert, a: CertAssets, fontCss: string): string {
  const id = cert.no.replace(/[^\w-]/g, "");
  const upper = cert.name.toUpperCase();
  const nameSize = fitSize(upper, "rubikMono", 40, 500);
  const tagText = "ROBO SPARK 3/11/2026";
  const tagW = textWidth(tagText, "silkscreenBold", 15) + 36;
  const tagX = 1046 - tagW;
  const role = cert.role.toUpperCase();
  const roleW = textWidth(role, "silkscreenBold", 15) + 32;
  const signers = SIGNERS.map((s, i) => {
    const cx = COORD_COLS[i] ?? 445;
    return [
      text(esc(s.name), { x: cx, y: 665, family: SILK, size: 13, fill: INK, weight: 700 }),
      ...s.role.map((line, j) =>
        text(esc(line), {
          x: cx,
          y: j ? 702 : 685,
          family: NUNITO,
          size: 12.5,
          fill: DEEP,
          weight: 600,
        }),
      ),
    ].join("");
  });
  const bodyLine = (y: number, s: string) =>
    text(s, { x: 78, y, family: NUNITO, size: 19, fill: INK, weight: 600, anchor: "start" });
  return [
    svgOpen(cert.no, fontCss),
    `<defs><pattern id="st-${id}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="26" fill="${VIOLET}"/></pattern>`,
    `<clipPath id="pc-${id}"><rect x="604" y="218" width="452" height="261" rx="16"/></clipPath></defs>`,
    `<g class="cert-art">`,
    `<rect width="${CERT_W}" height="${CERT_H}" fill="${BEIGE}"/>`,
    `<circle cx="840" cy="420" r="265" fill="${LILAC}"/>`,
    `<rect width="34" height="${CERT_H}" fill="url(#st-${id})"/>`,
    `<rect x="${CERT_W - 34}" width="34" height="${CERT_H}" fill="url(#st-${id})"/>`,
    `<rect x="52" y="22" width="${CERT_W - 104}" height="${CERT_H - 44}" rx="18" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
    `<g transform="rotate(2 ${n(tagX + tagW / 2)} 80)"><rect x="${n(tagX)}" y="58" width="${n(tagW)}" height="44" fill="${VIOLET}" stroke="${INK}" stroke-width="2.5"/></g>`,
    `<g transform="rotate(-2 ${n(78 + roleW / 2)} 399)"><rect x="78" y="380" width="${n(roleW)}" height="38" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/></g>`,
    `<g transform="rotate(2.5 830 348)">`,
    `<rect x="610" y="226" width="452" height="261" rx="16" fill="${INK}"/>`,
    `<rect x="604" y="218" width="452" height="261" rx="16" fill="#CCB5E4"/>`,
    image(
      a.posterArt,
      604,
      218,
      452,
      261,
      `preserveAspectRatio="xMidYMid slice" clip-path="url(#pc-${id})"`,
    ),
    `<rect x="604" y="218" width="452" height="261" rx="16" fill="none" stroke="${INK}" stroke-width="3"/>`,
    `</g>`,
    `<rect x="913" y="572" width="138" height="138" fill="#fff" stroke="${VIOLET}" stroke-width="4"/>`,
    ...COORD_COLS.map(
      (cx) =>
        `<line x1="${cx - 105}" y1="644" x2="${cx + 105}" y2="644" stroke="${INK}" stroke-width="1.5"/>`,
    ),
    `</g><g class="cert-logo">`,
    image(a.robioLogo, 72, 44, 74, 74),
    `</g><g class="cert-text">`,
    text("RO-BIO", { x: 158, y: 80, family: RUBIK, size: 26, fill: VIOLET, anchor: "start" }),
    text("ROBOTICS AND BIOMEDICAL ENGINEERING CLUB", {
      x: 160,
      y: 102,
      family: SILK,
      size: 11.5,
      fill: INK,
      anchor: "start",
    }),
    `<g transform="rotate(2 ${n(tagX + tagW / 2)} 80)">`,
    text(tagText, {
      x: tagX + tagW / 2,
      y: silkMiddle(58, 44, 15),
      family: SILK,
      size: 15,
      fill: PAPER,
      weight: 700,
    }),
    `</g>`,
    text("CERTIFICATE", {
      x: 83,
      y: 217,
      family: RUBIK,
      size: 54,
      fill: "none",
      anchor: "start",
      extra: `stroke="${VIOLET}" stroke-width="2"`,
    }),
    text("CERTIFICATE", { x: 78, y: 212, family: RUBIK, size: 54, fill: INK, anchor: "start" }),
    text("OF APPRECIATION", {
      x: 80,
      y: 254,
      family: SILK,
      size: 27,
      fill: VIOLET,
      weight: 700,
      anchor: "start",
    }),
    text("PRESENTED TO", { x: 80, y: 312, family: SILK, size: 14, fill: DEEP, anchor: "start" }),
    text(esc(upper), {
      x: 78,
      y: 362,
      family: RUBIK,
      size: nameSize,
      fill: VIOLET,
      anchor: "start",
      extra: `class="cert-name"`,
    }),
    `<g transform="rotate(-2 ${n(78 + roleW / 2)} 399)">`,
    text(esc(role), {
      x: 78 + roleW / 2,
      y: silkMiddle(380, 38, 15),
      family: SILK,
      size: 15,
      fill: INK,
      weight: 700,
    }),
    `</g>`,
    bodyLine(470, "for coordinating Robo Spark, RO-BIO's opening event for"),
    bodyLine(498, "first years, on 3 November 2026, and helping about 300"),
    bodyLine(526, "students design their first robots."),
    ...signers,
    text(`NO. ${esc(cert.no)}`, { x: 982, y: 732, family: SILK, size: 11, fill: INK, weight: 700 }),
    text("SCAN TO VERIFY", { x: 982, y: 749, family: SILK, size: 10, fill: INK }),
    `</g><g class="cert-sig">`,
    ...SIGNERS.map((s, i) => signature(a.signatures[s.slot], COORD_COLS[i] ?? 445, 588, 210, 50)),
    `</g><g class="cert-qr">`,
    qrPath(verifyUrl(cert.no), 922, 581, 120, INK),
    `</g></svg>`,
  ].join("");
}

/**
 * The whole certificate as SVG text. Pass `fontCss` (see certFontCss) to put the fonts inside the SVG;
 * leave it out when the page already loads them.
 */
export function certificateSvg(cert: Cert, assets: CertAssets, fontCss = ""): string {
  return cert.kind === "coordinator"
    ? coordinatorSvg(cert, assets, fontCss)
    : studentSvg(cert, assets, fontCss);
}
