// Semi-realistic people and the Robo Spark spark robot, drawn as SVG.
// Proportions follow the classic 7.5-head canon for young adults: eyes at half the head height, shoulders about
// two heads wide, elbows at the waist, fingertips at mid-thigh, knees two heads above the floor.
// One light source, up and to the left, lights everything: every shape is shaded left to right the same way,
// and every shadow falls down and to the right.

export const INK = "#2A2140";
const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

export const PAL = {
  ink: "#1E1A3C",
  violet: "#6F5DFF",
  deep: "#4B37D6",
  lilac: "#B7ABFF",
  pale: "#DCD6FF",
  beige: "#E4DBD4",
  paper: "#F8F4F0",
  pink: "#FF5CB8",
  yellow: "#FFE066",
  blue: "#5D7CFF",
  ice: "#C9DCFF",
  denim: "#34407A",
  red: "#C2364F",
};
export const SKIN = { deep: "#6B4430", brown: "#8C5A3C", warm: "#A0694A", wheat: "#B77B55" };
const HAIR = "#17100E";

/** Shared definitions: the one light, as shading overlays, plus fabric patterns. Put once in every <svg>. */
export const artDefs = `
<defs>
  <linearGradient id="lit" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".62" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".32"/>
  </linearGradient>
  <linearGradient id="litSoft" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".24"/>
  </linearGradient>
  <linearGradient id="hairLit" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#5a4038" stop-opacity=".7"/><stop offset=".35" stop-color="#5a4038" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="castShadow"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <pattern id="kasuti" width="16" height="16" patternUnits="userSpaceOnUse">
    <rect width="16" height="16" fill="${PAL.red}"/>
    <path d="M8 2 L14 8 L8 14 L2 8 Z" fill="none" stroke="${PAL.paper}" stroke-width="1.6"/>
    <rect x="6.5" y="6.5" width="3" height="3" fill="${PAL.yellow}"/>
  </pattern>
  <pattern id="checkShirt" width="22" height="22" patternUnits="userSpaceOnUse">
    <rect width="22" height="22" fill="#4C66D9"/><rect width="11" height="22" fill="#3F57C2"/>
    <rect y="9" width="22" height="4" fill="#C9DCFF" opacity=".55"/><rect x="9" width="4" height="22" fill="#C9DCFF" opacity=".35"/>
  </pattern>
  <pattern id="denimWeave" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="6" fill="${PAL.denim}"/><path d="M0 6 L6 0" stroke="#4a5796" stroke-width="1"/>
  </pattern>
</defs>`;

type P = [number, number];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const f = (n: number) => n.toFixed(1);
const rad = (d: number) => (d * Math.PI) / 180;
/** A direction at `deg` degrees from straight down, swung outwards on `side` (-1 = viewer's left, 1 = right). */
const dir = (deg: number, side: number, len: number): P => [
  side * Math.sin(rad(deg)) * len,
  Math.cos(rad(deg)) * len,
];

/** Paints `d` with a fill, then the one-light shading over it, then the outline. */
const shape = (d: string, fill: string, shade = "lit", extra = "") =>
  `<path d="${d}" fill="${fill}" ${extra}/><path d="${d}" fill="url(#${shade})"/><path d="${d}" fill="none" ${LINE}/>`;

/** A tapered limb from a to b: width w0 at a, w1 at b, with rounded ends. */
function limb(a: P, b: P, w0: number, w1: number) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L,
    ny = dx / L;
  const p1: P = [a[0] + (nx * w0) / 2, a[1] + (ny * w0) / 2];
  const p2: P = [b[0] + (nx * w1) / 2, b[1] + (ny * w1) / 2];
  const p3: P = [b[0] - (nx * w1) / 2, b[1] - (ny * w1) / 2];
  const p4: P = [a[0] - (nx * w0) / 2, a[1] - (ny * w0) / 2];
  // bulge the middle slightly, like muscle under cloth
  const m1: P = [(p1[0] + p2[0]) / 2 + (nx * w0) / 10, (p1[1] + p2[1]) / 2 + (ny * w0) / 10];
  const m2: P = [(p3[0] + p4[0]) / 2 - (nx * w0) / 10, (p3[1] + p4[1]) / 2 - (ny * w0) / 10];
  return `M${f(p1[0])} ${f(p1[1])} Q${f(m1[0])} ${f(m1[1])} ${f(p2[0])} ${f(p2[1])} A${f(w1 / 2)} ${f(w1 / 2)} 0 0 0 ${f(p3[0])} ${f(p3[1])} Q${f(m2[0])} ${f(m2[1])} ${f(p4[0])} ${f(p4[1])} A${f(w0 / 2)} ${f(w0 / 2)} 0 0 0 ${f(p1[0])} ${f(p1[1])} Z`;
}

/** A hand at the wrist, pointing along `deg` (from straight down), palm towards the viewer. */
function hand(w: P, deg: number, side: number, H: number, skin: string, grip = false) {
  const len = 0.62 * H,
    wid = 0.36 * H;
  const tip = add(w, dir(deg, side, len));
  const mid: P = [(w[0] + tip[0]) / 2, (w[1] + tip[1]) / 2];
  const ang = Math.atan2(tip[1] - w[1], tip[0] - w[0]) * (180 / Math.PI) - 90;
  const thumb = add(w, dir(deg + 40 * side * -1 * side, side, 0.3 * H));
  const palm = `<ellipse cx="${f(mid[0])}" cy="${f(mid[1])}" rx="${f(wid / 2)}" ry="${f(len / (grip ? 2.6 : 2.1))}" transform="rotate(${f(ang)} ${f(mid[0])} ${f(mid[1])})" fill="${skin}"/>`;
  const fingers = grip
    ? ""
    : [-0.22, 0, 0.22]
        .map((o) => {
          const base = add(mid, [Math.cos(rad(ang)) * o * wid, Math.sin(rad(ang)) * o * wid]);
          const end = add(base, dir(deg, side, len * 0.34));
          return `<path d="M${f(base[0])} ${f(base[1])} L${f(end[0])} ${f(end[1])}" stroke="${INK}" stroke-width="1.3" opacity=".45"/>`;
        })
        .join("");
  return `<g>${palm}<ellipse cx="${f(mid[0])}" cy="${f(mid[1])}" rx="${f(wid / 2)}" ry="${f(len / (grip ? 2.6 : 2.1))}" transform="rotate(${f(ang)} ${f(mid[0])} ${f(mid[1])})" fill="url(#lit)" ${LINE}/>${fingers}
    <ellipse cx="${f(thumb[0])}" cy="${f(thumb[1])}" rx="${f(0.08 * H)}" ry="${f(0.15 * H)}" transform="rotate(${f(ang + side * 35)} ${f(thumb[0])} ${f(thumb[1])})" fill="${skin}" ${LINE}/></g>`;
}

export type Pose = {
  /** Upper arm angle from straight down, outwards positive. Then the forearm's own angle, same convention. */
  armL?: [number, number];
  armR?: [number, number];
  gripL?: boolean;
  gripR?: boolean;
  /** Head tilt in degrees and a small three-quarter turn (-1 to 1, positive looks to the viewer's right). */
  tilt?: number;
  turn?: number;
};

export type Person = {
  H: number; // head height in px: the whole figure is 7.5 of these
  skin: string;
  build?: "m" | "f";
  hair?: "short" | "long" | "braid" | "bun" | "curly";
  top?: "hoodie" | "tee" | "kurta" | "check";
  color?: string;
  pants?: string;
  face?: "smile" | "talk" | "think" | "wow" | "wink";
  acc?: ("glasses" | "earphones" | "bindi" | "cap" | "lanyard" | "watch" | "tote")[];
  pose?: Pose;
  /** Draw only from the waist up (people sitting behind a table). */
  bust?: boolean;
  /** Something held in a hand: drawn at that wrist, on top of the hand. */
  holdL?: (w: P) => string;
  holdR?: (w: P) => string;
  id?: string;
};

/** Where the joints of a person standing at (x, y) are, from the 7.5-head canon. */
export function skeleton(x: number, y: number, p: Person) {
  const H = p.H,
    fem = p.build === "f";
  const sw = (fem ? 1.68 : 1.95) * H;
  const pose = p.pose ?? {};
  const shoulderY = y - 6.12 * H;
  const sh = {
    L: [x - sw / 2 + 0.12 * H, shoulderY + 0.06 * H] as P,
    R: [x + sw / 2 - 0.12 * H, shoulderY + 0.06 * H] as P,
  };
  const arm = (side: number, a: [number, number]) => {
    const s = side < 0 ? sh.L : sh.R;
    const e = add(s, dir(a[0], side, 1.45 * H));
    const w = add(e, dir(a[1], side, 1.2 * H));
    return { s, e, w };
  };
  return {
    H,
    sw,
    hipW: (fem ? 1.6 : 1.42) * H,
    waistW: (fem ? 1.12 : 1.3) * H,
    crown: y - 7.5 * H,
    chin: y - 6.5 * H,
    shoulderY,
    waistY: y - 4.6 * H,
    hipY: y - 3.85 * H,
    kneeY: y - 2.0 * H,
    ankleY: y - 0.25 * H,
    L: arm(-1, pose.armL ?? [8, 4]),
    R: arm(1, pose.armR ?? [8, 4]),
  };
}

export function person(x: number, y: number, p: Person) {
  const S = skeleton(x, y, p);
  const H = S.H;
  const pose = p.pose ?? {};
  const turn = (pose.turn ?? 0) * 0.07 * H;
  const col = p.color ?? PAL.violet;
  const top = p.top ?? "tee";
  const fill = top === "check" ? "url(#checkShirt)" : col;
  const pants = p.pants ?? "url(#denimWeave)";
  const out: string[] = [];
  const cx = x,
    hx = x + turn * 0.4;

  // Cast shadow: the light is up and to the left, so the shadow falls to the right.
  if (!p.bust)
    out.push(
      `<ellipse cx="${f(x + 0.55 * H)}" cy="${f(y + 0.05 * H)}" rx="${f(1.6 * H)}" ry="${f(0.22 * H)}" fill="url(#castShadow)"/>`,
    );

  // Hair that falls behind the body
  if (p.hair === "long")
    out.push(
      shape(
        `M${f(hx - 0.42 * H)} ${f(S.crown + 0.4 * H)} C ${f(hx - 0.55 * H)} ${f(S.chin + 0.6 * H)}, ${f(hx - 0.5 * H)} ${f(S.shoulderY + 0.9 * H)}, ${f(hx - 0.3 * H)} ${f(S.shoulderY + 1.1 * H)} L ${f(hx + 0.3 * H)} ${f(S.shoulderY + 1.1 * H)} C ${f(hx + 0.5 * H)} ${f(S.shoulderY + 0.9 * H)}, ${f(hx + 0.55 * H)} ${f(S.chin + 0.6 * H)}, ${f(hx + 0.42 * H)} ${f(S.crown + 0.4 * H)} Z`,
        HAIR,
        "hairLit",
      ),
    );

  // Legs (standing figures only): thigh and shin, trousers or leggings, then shoes
  if (!p.bust) {
    for (const side of [-1, 1]) {
      const hip: P = [cx + side * 0.36 * H, S.hipY];
      const knee: P = [cx + side * 0.42 * H, S.kneeY];
      const ankle: P = [cx + side * 0.4 * H, S.ankleY];
      out.push(shape(limb(hip, knee, 0.68 * H, 0.46 * H), pants));
      out.push(shape(limb(knee, ankle, 0.46 * H, 0.32 * H), pants));
      const toe = ankle[0] + side * 0.2 * H;
      out.push(
        shape(
          `M${f(ankle[0] - 0.26 * H)} ${f(ankle[1] - 0.02 * H)} Q ${f(ankle[0])} ${f(ankle[1] - 0.16 * H)} ${f(ankle[0] + 0.26 * H)} ${f(ankle[1] - 0.02 * H)} Q ${f(toe + side * 0.2 * H)} ${f(y - 0.08 * H)} ${f(toe + side * 0.08 * H)} ${f(y)} L ${f(ankle[0] - side * 0.3 * H)} ${f(y)} Q ${f(ankle[0] - side * 0.34 * H)} ${f(y - 0.12 * H)} ${f(ankle[0] - 0.26 * H)} ${f(ankle[1] - 0.02 * H)} Z`,
          PAL.paper,
        ),
      );
      out.push(
        `<path d="M${f(ankle[0] - side * 0.3 * H)} ${f(y - 0.06 * H)} L ${f(toe + side * 0.1 * H)} ${f(y - 0.06 * H)}" stroke="${PAL.violet}" stroke-width="${f(0.05 * H)}"/>`,
      );
    }
  }

  // Torso and clothes
  const hemY =
    top === "kurta" ? S.kneeY - 0.2 * H : top === "hoodie" ? S.hipY + 0.32 * H : S.hipY + 0.18 * H;
  const wide = top === "hoodie" ? 0.12 * H : 0;
  const torso = `M${f(S.L.s[0] - 0.06 * H)} ${f(S.shoulderY)} Q ${f(cx)} ${f(S.shoulderY - 0.18 * H)} ${f(S.R.s[0] + 0.06 * H)} ${f(S.shoulderY)}
    Q ${f(S.R.s[0] + 0.2 * H + wide)} ${f(S.shoulderY + 0.3 * H)} ${f(cx + S.sw / 2 - 0.1 * H + wide)} ${f(S.shoulderY + 1.1 * H)}
    Q ${f(cx + S.waistW / 2 + wide)} ${f(S.waistY)} ${f(cx + (top === "kurta" ? S.hipW / 2 + 0.25 * H : S.hipW / 2) + wide)} ${f(hemY)}
    L ${f(cx - (top === "kurta" ? S.hipW / 2 + 0.25 * H : S.hipW / 2) - wide)} ${f(hemY)}
    Q ${f(cx - S.waistW / 2 - wide)} ${f(S.waistY)} ${f(cx - S.sw / 2 + 0.1 * H - wide)} ${f(S.shoulderY + 1.1 * H)}
    Q ${f(S.L.s[0] - 0.2 * H - wide)} ${f(S.shoulderY + 0.3 * H)} ${f(S.L.s[0] - 0.06 * H)} ${f(S.shoulderY)} Z`;
  out.push(`<g class="art-chest">`);
  out.push(shape(torso, fill, "lit"));
  // fabric folds: a few soft creases where cloth bunches at the waist and under the arms
  out.push(
    `<path d="M${f(cx - 0.5 * H)} ${f(S.waistY + 0.1 * H)} q ${f(0.25 * H)} ${f(0.12 * H)} ${f(0.45 * H)} ${f(0.02 * H)} M${f(cx + 0.15 * H)} ${f(S.waistY + 0.2 * H)} q ${f(0.2 * H)} ${f(0.1 * H)} ${f(0.4 * H)} ${f(-0.04 * H)} M${f(cx + 0.55 * H)} ${f(S.shoulderY + 0.9 * H)} q ${f(-0.1 * H)} ${f(0.3 * H)} ${f(-0.02 * H)} ${f(0.6 * H)}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="2"/>`,
  );
  if (top === "hoodie") {
    out.push(
      shape(
        `M${f(cx - 0.55 * H)} ${f(S.shoulderY + 0.05 * H)} Q ${f(cx)} ${f(S.shoulderY + 0.55 * H)} ${f(cx + 0.55 * H)} ${f(S.shoulderY + 0.05 * H)} Q ${f(cx + 0.4 * H)} ${f(S.shoulderY - 0.25 * H)} ${f(cx)} ${f(S.shoulderY - 0.22 * H)} Q ${f(cx - 0.4 * H)} ${f(S.shoulderY - 0.25 * H)} ${f(cx - 0.55 * H)} ${f(S.shoulderY + 0.05 * H)} Z`,
        col,
        "litSoft",
      ),
    );
    out.push(
      `<path d="M${f(cx - 0.12 * H)} ${f(S.shoulderY + 0.3 * H)} v${f(0.9 * H)} M${f(cx + 0.12 * H)} ${f(S.shoulderY + 0.3 * H)} v${f(0.8 * H)}" stroke="${PAL.paper}" stroke-width="${f(0.05 * H)}" stroke-linecap="round"/>`,
    );
    out.push(
      `<path d="M${f(cx - 0.55 * H)} ${f(hemY - 0.95 * H)} h${f(1.1 * H)} l${f(0.12 * H)} ${f(0.6 * H)} h${f(-1.34 * H)} z" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2.2"/>`,
    );
    out.push(
      `<rect x="${f(cx - S.hipW / 2 - wide)}" y="${f(hemY - 0.16 * H)}" width="${f(S.hipW + 2 * wide)}" height="${f(0.16 * H)}" fill="#000" opacity=".12"/>`,
    );
  }
  if (top === "tee")
    out.push(
      `<path d="M${f(cx - 0.22 * H)} ${f(S.shoulderY - 0.1 * H)} Q ${f(cx)} ${f(S.shoulderY + 0.22 * H)} ${f(cx + 0.22 * H)} ${f(S.shoulderY - 0.1 * H)}" fill="none" ${LINE}/>`,
    );
  if (top === "check") {
    out.push(
      shape(
        `M${f(cx - 0.3 * H)} ${f(S.shoulderY - 0.12 * H)} L ${f(cx)} ${f(S.shoulderY + 0.32 * H)} L ${f(cx - 0.06 * H)} ${f(S.shoulderY + 0.04 * H)} Z M${f(cx + 0.3 * H)} ${f(S.shoulderY - 0.12 * H)} L ${f(cx)} ${f(S.shoulderY + 0.32 * H)} L ${f(cx + 0.06 * H)} ${f(S.shoulderY + 0.04 * H)} Z`,
        PAL.paper,
      ),
    );
    out.push(
      `<path d="M${f(cx)} ${f(S.shoulderY + 0.32 * H)} V ${f(hemY)}" stroke="${INK}" stroke-width="2"/>`,
    );
    for (let i = 0; i < 4; i++)
      out.push(
        `<circle cx="${f(cx + 0.06 * H)}" cy="${f(S.shoulderY + (0.6 + i * 0.55) * H)}" r="${f(0.035 * H)}" fill="${PAL.paper}" stroke="${INK}" stroke-width="1"/>`,
      );
  }
  if (top === "kurta") {
    out.push(
      `<path d="M${f(cx - 0.16 * H)} ${f(S.shoulderY - 0.1 * H)} L ${f(cx - 0.16 * H)} ${f(S.shoulderY + 0.45 * H)} M${f(cx + 0.16 * H)} ${f(S.shoulderY - 0.1 * H)} L ${f(cx + 0.16 * H)} ${f(S.shoulderY + 0.45 * H)} M${f(cx - 0.16 * H)} ${f(S.shoulderY + 0.45 * H)} h ${f(0.32 * H)}" fill="none" ${LINE}/>`,
    );
    // the dupatta: over the left shoulder, across the chest, with a Kasuti cross-stitch border
    const d = `M${f(S.L.s[0] - 0.05 * H)} ${f(S.shoulderY - 0.05 * H)} Q ${f(cx)} ${f(S.waistY - 0.4 * H)} ${f(cx + S.hipW / 2 + 0.05 * H)} ${f(S.hipY + 0.5 * H)} L ${f(cx + S.hipW / 2 + 0.3 * H)} ${f(S.hipY + 0.2 * H)} Q ${f(cx + 0.1 * H)} ${f(S.waistY - 0.8 * H)} ${f(S.L.s[0] + 0.35 * H)} ${f(S.shoulderY - 0.15 * H)} Z`;
    out.push(shape(d, "url(#kasuti)", "lit"));
  }
  out.push(`</g>`);

  // Arms and hands, in front of the body
  const sleeveLen = top === "tee" ? 0.5 : top === "check" ? 0.95 : top === "kurta" ? 1.6 : 2;
  for (const [side, A, grip, hold] of [
    [-1, S.L, pose.gripL, p.holdL],
    [1, S.R, pose.gripR, p.holdR],
  ] as const) {
    const a = side < 0 ? (pose.armL ?? [8, 4]) : (pose.armR ?? [8, 4]);
    const upper = limb(A.s, A.e, 0.5 * H, 0.38 * H);
    const fore = limb(A.e, A.w, 0.36 * H, 0.26 * H);
    // skin first, then the sleeve over the part it covers
    out.push(shape(upper, p.skin));
    out.push(shape(fore, p.skin));
    const sleeveEnd =
      sleeveLen >= 1
        ? add(A.e, dir(a[1], side, 1.2 * H * Math.min(1, sleeveLen - 1)))
        : add(A.s, dir(a[0], side, 1.45 * H * sleeveLen));
    const sleeveCol = top === "check" ? "url(#checkShirt)" : col;
    out.push(shape(limb(A.s, sleeveLen >= 1 ? A.e : sleeveEnd, 0.56 * H, 0.44 * H), sleeveCol));
    if (sleeveLen > 1) out.push(shape(limb(A.e, sleeveEnd, 0.44 * H, 0.34 * H), sleeveCol));
    out.push(hand(A.w, a[1], side, H, p.skin, !!grip));
    if (hold) out.push(hold(A.w));
    if ((p.acc ?? []).includes("watch") && side < 0)
      out.push(
        `<circle cx="${f(A.w[0])}" cy="${f(A.w[1] - 0.05 * H)}" r="${f(0.09 * H)}" fill="${PAL.ink}" stroke="${PAL.lilac}" stroke-width="1.5"/>`,
      );
  }

  // Neck, with the shadow the jaw casts on it
  out.push(
    shape(
      `M${f(hx - 0.19 * H)} ${f(S.chin - 0.2 * H)} L ${f(hx - 0.21 * H)} ${f(S.shoulderY + 0.02 * H)} Q ${f(hx)} ${f(S.shoulderY + 0.12 * H)} ${f(hx + 0.21 * H)} ${f(S.shoulderY + 0.02 * H)} L ${f(hx + 0.19 * H)} ${f(S.chin - 0.2 * H)} Z`,
      p.skin,
    ),
  );
  out.push(
    `<path d="M${f(hx - 0.19 * H)} ${f(S.chin - 0.08 * H)} Q ${f(hx)} ${f(S.chin + 0.12 * H)} ${f(hx + 0.19 * H)} ${f(S.chin - 0.08 * H)} L ${f(hx + 0.19 * H)} ${f(S.chin - 0.2 * H)} L ${f(hx - 0.19 * H)} ${f(S.chin - 0.2 * H)} Z" fill="#000" opacity=".2"/>`,
  );

  // Lanyard with a college ID card: it hangs from the neck like a pendulum (animated in the deck)
  if ((p.acc ?? []).includes("lanyard"))
    out.push(`<g class="art-pendulum" data-pivot="${f(hx)},${f(S.shoulderY - 0.05 * H)}" data-len="0.42">
      <path d="M${f(hx - 0.2 * H)} ${f(S.shoulderY - 0.05 * H)} L ${f(hx)} ${f(S.shoulderY + 1.35 * H)} L ${f(hx + 0.2 * H)} ${f(S.shoulderY - 0.05 * H)}" fill="none" stroke="${PAL.deep}" stroke-width="${f(0.06 * H)}"/>
      <rect x="${f(hx - 0.24 * H)}" y="${f(S.shoulderY + 1.32 * H)}" width="${f(0.48 * H)}" height="${f(0.66 * H)}" rx="${f(0.05 * H)}" fill="${PAL.paper}" ${LINE}/>
      <rect x="${f(hx - 0.16 * H)}" y="${f(S.shoulderY + 1.42 * H)}" width="${f(0.32 * H)}" height="${f(0.22 * H)}" fill="${PAL.lilac}"/>
      <path d="M${f(hx - 0.16 * H)} ${f(S.shoulderY + 1.76 * H)} h${f(0.32 * H)} M${f(hx - 0.16 * H)} ${f(S.shoulderY + 1.86 * H)} h${f(0.22 * H)}" stroke="${PAL.deep}" stroke-width="2"/></g>`);

  // Head: an egg shape, wider at the cranium, narrowing to the chin
  const c0 = S.crown,
    tilt = pose.tilt ?? 0;
  const head: string[] = [];
  const headPath = `M${f(hx)} ${f(c0)} C ${f(hx + 0.3 * H)} ${f(c0)}, ${f(hx + 0.39 * H)} ${f(c0 + 0.25 * H)}, ${f(hx + 0.38 * H)} ${f(c0 + 0.5 * H)} C ${f(hx + 0.37 * H)} ${f(c0 + 0.72 * H)}, ${f(hx + 0.27 * H)} ${f(c0 + 0.9 * H)}, ${f(hx + 0.06 * H)} ${f(S.chin)} Q ${f(hx)} ${f(S.chin + 0.02 * H)} ${f(hx - 0.06 * H)} ${f(S.chin)} C ${f(hx - 0.27 * H)} ${f(c0 + 0.9 * H)}, ${f(hx - 0.37 * H)} ${f(c0 + 0.72 * H)}, ${f(hx - 0.38 * H)} ${f(c0 + 0.5 * H)} C ${f(hx - 0.39 * H)} ${f(c0 + 0.25 * H)}, ${f(hx - 0.3 * H)} ${f(c0)}, ${f(hx)} ${f(c0)} Z`;
  for (const side of [-1, 1])
    head.push(
      shape(
        `M${f(hx + side * 0.36 * H)} ${f(c0 + 0.45 * H)} q ${f(side * 0.12 * H)} ${f(-0.02 * H)} ${f(side * 0.1 * H)} ${f(0.14 * H)} q ${f(side * -0.02 * H)} ${f(0.12 * H)} ${f(side * -0.1 * H)} ${f(0.12 * H)} Z`,
        p.skin,
      ),
    );
  head.push(shape(headPath, p.skin, "litSoft"));
  // features, nudged by the three-quarter turn
  const ex = 0.17 * H,
    ey = c0 + 0.5 * H,
    fx = hx + turn;
  const face = p.face ?? "smile";
  const eye = (side: number) => {
    const c: P = [fx + side * ex, ey];
    const look = face === "think" ? -0.025 * H : 0;
    const open = face === "wink" && side > 0 ? 0 : 1;
    if (!open)
      return `<path d="M${f(c[0] - 0.08 * H)} ${f(c[1])} q ${f(0.08 * H)} ${f(0.05 * H)} ${f(0.16 * H)} 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    const r = face === "wow" ? 0.045 * H : 0.038 * H;
    return `<g class="art-eye"><path d="M${f(c[0] - 0.085 * H)} ${f(c[1])} Q ${f(c[0])} ${f(c[1] - 0.075 * H)} ${f(c[0] + 0.085 * H)} ${f(c[1])} Q ${f(c[0])} ${f(c[1] + 0.05 * H)} ${f(c[0] - 0.085 * H)} ${f(c[1])} Z" fill="#FBF7F2"/>
      <circle cx="${f(c[0] + turn * 0.2)}" cy="${f(c[1] + look - 0.004 * H)}" r="${f(r)}" fill="#3B2418"/><circle cx="${f(c[0] + turn * 0.2)}" cy="${f(c[1] + look - 0.004 * H)}" r="${f(r * 0.5)}" fill="#0E0806"/>
      <circle cx="${f(c[0] + turn * 0.2 - r * 0.35)}" cy="${f(c[1] + look - r * 0.45)}" r="${f(r * 0.28)}" fill="#fff"/>
      <path d="M${f(c[0] - 0.095 * H)} ${f(c[1] + 0.005 * H)} Q ${f(c[0])} ${f(c[1] - 0.085 * H)} ${f(c[0] + 0.095 * H)} ${f(c[1] - 0.005 * H)}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      <path class="art-lid" d="M${f(c[0] - 0.09 * H)} ${f(c[1])} Q ${f(c[0])} ${f(c[1] - 0.08 * H)} ${f(c[0] + 0.09 * H)} ${f(c[1])} Q ${f(c[0])} ${f(c[1] + 0.055 * H)} ${f(c[0] - 0.09 * H)} ${f(c[1])} Z" fill="${p.skin}" opacity="0"/></g>`;
  };
  head.push(eye(-1), eye(1));
  // brows: raised a little when thinking or surprised
  const by = ey - (face === "wow" ? 0.15 : face === "think" ? 0.13 : 0.11) * H;
  head.push(
    `<path d="M${f(fx - ex - 0.09 * H)} ${f(by + 0.02 * H)} Q ${f(fx - ex)} ${f(by - 0.03 * H)} ${f(fx - ex + 0.09 * H)} ${f(by + 0.01 * H)} M${f(fx + ex - 0.09 * H)} ${f(by + (face === "think" ? -0.02 : 0.01) * H)} Q ${f(fx + ex)} ${f(by - 0.03 * H)} ${f(fx + ex + 0.09 * H)} ${f(by + 0.02 * H)}" fill="none" stroke="${HAIR}" stroke-width="${f(0.035 * H)}" stroke-linecap="round"/>`,
  );
  // nose: lit from the left, so its shadow is on the right side
  const ny = c0 + 0.73 * H;
  head.push(
    `<path d="M${f(fx + 0.015 * H)} ${f(ey + 0.04 * H)} Q ${f(fx + 0.07 * H)} ${f(ny - 0.04 * H)} ${f(fx + 0.06 * H)} ${f(ny)} Q ${f(fx + 0.02 * H)} ${f(ny + 0.025 * H)} ${f(fx - 0.04 * H)} ${f(ny)}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.2" stroke-linecap="round"/>`,
  );
  head.push(
    `<ellipse cx="${f(fx + 0.045 * H)}" cy="${f(ny - 0.01 * H)}" rx="${f(0.03 * H)}" ry="${f(0.045 * H)}" fill="#000" opacity=".1"/>`,
  );
  // mouth
  const my = c0 + 0.85 * H;
  head.push(
    {
      smile: `<path d="M${f(fx - 0.11 * H)} ${f(my - 0.01 * H)} Q ${f(fx)} ${f(my + 0.09 * H)} ${f(fx + 0.11 * H)} ${f(my - 0.01 * H)} Q ${f(fx)} ${f(my + 0.03 * H)} ${f(fx - 0.11 * H)} ${f(my - 0.01 * H)} Z" fill="#FBF7F2" stroke="#7A3A36" stroke-width="2.2" stroke-linejoin="round"/>`,
      wink: `<path d="M${f(fx - 0.1 * H)} ${f(my)} Q ${f(fx + 0.02 * H)} ${f(my + 0.07 * H)} ${f(fx + 0.11 * H)} ${f(my - 0.03 * H)}" fill="none" stroke="#7A3A36" stroke-width="3" stroke-linecap="round"/>`,
      talk: `<path d="M${f(fx - 0.08 * H)} ${f(my - 0.01 * H)} Q ${f(fx)} ${f(my + 0.1 * H)} ${f(fx + 0.08 * H)} ${f(my - 0.01 * H)} Q ${f(fx)} ${f(my - 0.03 * H)} ${f(fx - 0.08 * H)} ${f(my - 0.01 * H)} Z" fill="#5A2427" stroke="#7A3A36" stroke-width="2"/>`,
      think: `<path d="M${f(fx - 0.06 * H)} ${f(my + 0.01 * H)} Q ${f(fx + 0.01 * H)} ${f(my - 0.015 * H)} ${f(fx + 0.07 * H)} ${f(my + 0.005 * H)}" fill="none" stroke="#7A3A36" stroke-width="2.8" stroke-linecap="round"/>`,
      wow: `<ellipse cx="${f(fx)}" cy="${f(my + 0.02 * H)}" rx="${f(0.045 * H)}" ry="${f(0.06 * H)}" fill="#5A2427" stroke="#7A3A36" stroke-width="2"/>`,
    }[face],
  );
  // a soft warm blush on the cheeks
  head.push(
    `<ellipse cx="${f(fx - 0.22 * H)}" cy="${f(c0 + 0.66 * H)}" rx="${f(0.07 * H)}" ry="${f(0.035 * H)}" fill="${PAL.pink}" opacity=".18"/><ellipse cx="${f(fx + 0.22 * H)}" cy="${f(c0 + 0.66 * H)}" rx="${f(0.07 * H)}" ry="${f(0.035 * H)}" fill="${PAL.pink}" opacity=".18"/>`,
  );
  if ((p.acc ?? []).includes("bindi"))
    head.push(
      `<circle cx="${f(fx)}" cy="${f(by - 0.02 * H)}" r="${f(0.022 * H)}" fill="${PAL.red}"/>`,
    );

  // hair on top
  const hairTop = {
    short: `M${f(hx - 0.4 * H)} ${f(c0 + 0.42 * H)} C ${f(hx - 0.46 * H)} ${f(c0 - 0.12 * H)}, ${f(hx + 0.34 * H)} ${f(c0 - 0.2 * H)}, ${f(hx + 0.41 * H)} ${f(c0 + 0.38 * H)} C ${f(hx + 0.3 * H)} ${f(c0 + 0.12 * H)}, ${f(hx + 0.05 * H)} ${f(c0 + 0.22 * H)}, ${f(hx - 0.12 * H)} ${f(c0 + 0.12 * H)} C ${f(hx - 0.24 * H)} ${f(c0 + 0.2 * H)}, ${f(hx - 0.34 * H)} ${f(c0 + 0.26 * H)}, ${f(hx - 0.4 * H)} ${f(c0 + 0.42 * H)} Z`,
    long: `M${f(hx - 0.42 * H)} ${f(c0 + 0.55 * H)} C ${f(hx - 0.48 * H)} ${f(c0 - 0.1 * H)}, ${f(hx + 0.48 * H)} ${f(c0 - 0.1 * H)}, ${f(hx + 0.42 * H)} ${f(c0 + 0.55 * H)} C ${f(hx + 0.32 * H)} ${f(c0 + 0.2 * H)}, ${f(hx + 0.05 * H)} ${f(c0 + 0.12 * H)}, ${f(hx - 0.02 * H)} ${f(c0 + 0.1 * H)} C ${f(hx - 0.2 * H)} ${f(c0 + 0.2 * H)}, ${f(hx - 0.34 * H)} ${f(c0 + 0.3 * H)}, ${f(hx - 0.42 * H)} ${f(c0 + 0.55 * H)} Z`,
    braid: `M${f(hx - 0.4 * H)} ${f(c0 + 0.45 * H)} C ${f(hx - 0.46 * H)} ${f(c0 - 0.12 * H)}, ${f(hx + 0.46 * H)} ${f(c0 - 0.12 * H)}, ${f(hx + 0.4 * H)} ${f(c0 + 0.45 * H)} C ${f(hx + 0.28 * H)} ${f(c0 + 0.18 * H)}, ${f(hx + 0.08 * H)} ${f(c0 + 0.14 * H)}, ${f(hx)} ${f(c0 + 0.14 * H)} C ${f(hx - 0.08 * H)} ${f(c0 + 0.14 * H)}, ${f(hx - 0.28 * H)} ${f(c0 + 0.18 * H)}, ${f(hx - 0.4 * H)} ${f(c0 + 0.45 * H)} Z`,
    bun: `M${f(hx - 0.4 * H)} ${f(c0 + 0.42 * H)} C ${f(hx - 0.44 * H)} ${f(c0 - 0.08 * H)}, ${f(hx + 0.44 * H)} ${f(c0 - 0.08 * H)}, ${f(hx + 0.4 * H)} ${f(c0 + 0.42 * H)} C ${f(hx + 0.26 * H)} ${f(c0 + 0.16 * H)}, ${f(hx - 0.26 * H)} ${f(c0 + 0.16 * H)}, ${f(hx - 0.4 * H)} ${f(c0 + 0.42 * H)} Z`,
    curly: "",
  }[p.hair ?? "short"];
  if (hairTop) head.push(shape(hairTop, HAIR, "hairLit"));
  if (p.hair === "bun")
    head.push(
      shape(
        `M${f(hx - 0.2 * H)} ${f(c0 + 0.02 * H)} a ${f(0.2 * H)} ${f(0.17 * H)} 0 1 1 ${f(0.4 * H)} 0 a ${f(0.2 * H)} ${f(0.1 * H)} 0 0 1 ${f(-0.4 * H)} 0 Z`,
        HAIR,
        "hairLit",
      ),
    );
  if (p.hair === "curly")
    head.push(
      [
        [-0.34, 0.3],
        [-0.24, 0.08],
        [-0.05, -0.02],
        [0.16, 0.02],
        [0.32, 0.18],
        [0.38, 0.38],
        [-0.4, 0.46],
      ]
        .map(([dx, dy]) =>
          shape(
            `M${f(hx + dx! * H - 0.14 * H)} ${f(c0 + dy! * H)} a ${f(0.14 * H)} ${f(0.14 * H)} 0 1 0 ${f(0.28 * H)} 0 a ${f(0.14 * H)} ${f(0.14 * H)} 0 1 0 ${f(-0.28 * H)} 0 Z`,
            HAIR,
            "hairLit",
          ),
        )
        .join(""),
    );
  if ((p.acc ?? []).includes("glasses"))
    head.push(
      `<g fill="none" stroke="${PAL.ink}" stroke-width="${f(0.03 * H)}"><rect x="${f(fx - ex - 0.11 * H)}" y="${f(ey - 0.09 * H)}" width="${f(0.22 * H)}" height="${f(0.16 * H)}" rx="${f(0.05 * H)}"/><rect x="${f(fx + ex - 0.11 * H)}" y="${f(ey - 0.09 * H)}" width="${f(0.22 * H)}" height="${f(0.16 * H)}" rx="${f(0.05 * H)}"/><path d="M${f(fx - 0.06 * H)} ${f(ey - 0.03 * H)} h${f(0.12 * H)}"/></g>`,
    );
  if ((p.acc ?? []).includes("cap"))
    head.push(
      shape(
        `M${f(hx - 0.42 * H)} ${f(c0 + 0.3 * H)} C ${f(hx - 0.42 * H)} ${f(c0 - 0.16 * H)}, ${f(hx + 0.42 * H)} ${f(c0 - 0.16 * H)}, ${f(hx + 0.42 * H)} ${f(c0 + 0.3 * H)} Z`,
        PAL.violet,
      ),
      shape(
        `M${f(hx - 0.1 * H)} ${f(c0 + 0.26 * H)} Q ${f(hx + 0.5 * H)} ${f(c0 + 0.16 * H)} ${f(hx + 0.78 * H)} ${f(c0 + 0.32 * H)} Q ${f(hx + 0.4 * H)} ${f(c0 + 0.38 * H)} ${f(hx - 0.1 * H)} ${f(c0 + 0.32 * H)} Z`,
        PAL.deep,
      ),
    );

  out.push(
    `<g class="art-head" data-pivot="${f(hx)},${f(S.chin)}" transform="rotate(${tilt} ${f(hx)} ${f(S.chin)})">${head.join("")}</g>`,
  );

  // Earphone wires and the braid are drawn last and hang free: the deck swings them as pendulums.
  if ((p.acc ?? []).includes("earphones"))
    out.push(`<g class="art-pendulum" data-pivot="${f(hx)},${f(S.chin + 0.1 * H)}" data-len="0.35">
      <path d="M${f(hx - 0.44 * H)} ${f(c0 + 0.58 * H)} C ${f(hx - 0.42 * H)} ${f(S.chin + 0.5 * H)}, ${f(hx - 0.1 * H)} ${f(S.shoulderY + 0.5 * H)}, ${f(hx)} ${f(S.shoulderY + 0.9 * H)} M${f(hx + 0.44 * H)} ${f(c0 + 0.58 * H)} C ${f(hx + 0.42 * H)} ${f(S.chin + 0.5 * H)}, ${f(hx + 0.1 * H)} ${f(S.shoulderY + 0.5 * H)}, ${f(hx)} ${f(S.shoulderY + 0.9 * H)} L ${f(hx)} ${f(S.shoulderY + 1.5 * H)}" fill="none" stroke="${PAL.paper}" stroke-width="${f(0.025 * H)}"/>
      <rect x="${f(hx - 0.04 * H)}" y="${f(S.shoulderY + 1.45 * H)}" width="${f(0.08 * H)}" height="${f(0.14 * H)}" rx="${f(0.03 * H)}" fill="${PAL.paper}" stroke="${INK}" stroke-width="1"/></g>`);
  if (p.hair === "braid") {
    const px = hx + 0.4 * H,
      py = c0 + 0.88 * H;
    const segs = Array.from({ length: 7 }, (_, i) => {
      const yy = py + i * 0.3 * H;
      return shape(
        `M${f(px - 0.13 * H)} ${f(yy)} Q ${f(px)} ${f(yy - 0.1 * H)} ${f(px + 0.13 * H)} ${f(yy)} Q ${f(px + 0.14 * H)} ${f(yy + 0.2 * H)} ${f(px)} ${f(yy + 0.34 * H)} Q ${f(px - 0.14 * H)} ${f(yy + 0.2 * H)} ${f(px - 0.13 * H)} ${f(yy)} Z`,
        HAIR,
        "hairLit",
      );
    }).join("");
    out.push(
      `<g class="art-pendulum" data-pivot="${f(px)},${f(py)}" data-len="0.5">${segs}<circle cx="${f(px)}" cy="${f(py + 2.2 * H)}" r="${f(0.07 * H)}" fill="${PAL.pink}" ${LINE}/></g>`,
    );
  }
  if ((p.acc ?? []).includes("tote"))
    out.push(
      shape(
        `M${f(S.R.s[0])} ${f(S.shoulderY)} L ${f(cx + S.hipW / 2 + 0.2 * H)} ${f(S.hipY - 0.3 * H)}`,
        "none",
      ),
      shape(
        `M${f(cx + S.hipW / 2 - 0.05 * H)} ${f(S.hipY - 0.4 * H)} h${f(0.8 * H)} l${f(0.06 * H)} ${f(1.0 * H)} h${f(-0.92 * H)} Z`,
        PAL.paper,
      ),
      `<path d="M${f(cx + S.hipW / 2 + 0.1 * H)} ${f(S.hipY + 0.1 * H)} h${f(0.5 * H)} M${f(cx + S.hipW / 2 + 0.1 * H)} ${f(S.hipY + 0.3 * H)} h${f(0.35 * H)}" stroke="${PAL.violet}" stroke-width="${f(0.06 * H)}"/>`,
    );

  return `<g${p.id ? ` id="${p.id}"` : ""} class="art-person">${out.join("")}</g>`;
}

/** The tiny spark robot from the poster: a light blue box with the infinity sign, curly antenna, ribbed arms. */
export function sparkbot(
  x: number,
  y: number,
  s: number,
  o: { mood?: "happy" | "stern" | "wow"; armL?: number; armR?: number; id?: string } = {},
) {
  const mood = o.mood ?? "happy";
  const eyes =
    mood === "happy"
      ? `<path d="M-30 -132 q10 -14 20 0 M10 -132 q10 -14 20 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
      : mood === "wow"
        ? `<circle cx="-20" cy="-134" r="9" fill="${INK}"/><circle cx="20" cy="-134" r="9" fill="${INK}"/><circle cx="-23" cy="-137" r="3" fill="#fff"/><circle cx="17" cy="-137" r="3" fill="#fff"/>`
        : `<path d="M-32 -146 l22 7 M32 -146 l-22 7" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="-28" y="-136" width="16" height="9" rx="4" fill="${INK}"/><rect x="12" y="-136" width="16" height="9" rx="4" fill="${INK}"/>`;
  const arm = (
    side: number,
    deg: number,
  ) => `<g class="art-botarm" transform="translate(${side * 70} -52) rotate(${-side * deg})">
      ${shape(`M0 -12 C ${side * 30} -12, ${side * 62} 0, ${side * 66} 30 L ${side * 46} 34 C ${side * 44} 14, ${side * 26} 10, 0 12 Z`, PAL.violet)}
      ${[0.3, 0.55, 0.8].map((t) => `<path d="M${side * 60 * t} ${-10 + 34 * t * t} l${side * 4} 20" stroke="${PAL.lilac}" stroke-width="3"/>`).join("")}
      ${shape(`M${side * 40} 44 a20 20 0 1 0 ${side * 34} -8 l${side * -8} 6 a10 10 0 1 1 ${side * -16} 6 Z`, PAL.ice)}
    </g>`;
  return `<g${o.id ? ` id="${o.id}"` : ""} class="art-bot" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="34" cy="6" rx="110" ry="16" fill="url(#castShadow)"/>
    ${arm(-1, o.armL ?? 15)}${arm(1, o.armR ?? 15)}
    ${shape("M-70 -96 h140 a10 10 0 0 1 10 10 v80 a10 10 0 0 1 -10 10 h-140 a10 10 0 0 1 -10 -10 v-80 a10 10 0 0 1 10 -10 Z", PAL.ice)}
    <path d="M-40 -46 c 0 -28, 34 -28, 40 0 c 6 28, 40 28, 40 0 c 0 -28, -34 -28, -40 0 c -6 28, -40 28, -40 0 z" fill="none" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M-40 -46 c 0 -28, 34 -28, 40 0 c 6 28, 40 28, 40 0 c 0 -28, -34 -28, -40 0 c -6 28, -40 28, -40 0 z" fill="none" stroke="${PAL.blue}" stroke-width="7" stroke-linejoin="round"/>
    ${shape("M-52 -170 h104 a10 10 0 0 1 10 10 v52 a10 10 0 0 1 -10 10 h-104 a10 10 0 0 1 -10 -10 v-52 a10 10 0 0 1 10 -10 Z", PAL.ice)}
    ${shape("M-68 -150 h14 v30 h-14 Z", PAL.violet)}${shape("M54 -150 h14 v30 h-14 Z", PAL.violet)}
    ${eyes}
    <g class="art-antenna" data-pivot="0,-170"><path d="M0 -170 c -14 -8 14 -14 0 -22 c -14 -8 14 -14 0 -22" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="0" cy="-218" r="8" fill="${PAL.pink}" ${LINE}/></g>
  </g>`;
}
