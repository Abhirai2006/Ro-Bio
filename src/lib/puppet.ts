// Puppet motion for the squad illustrations: the picture is laid on a fine mesh and parts of it (a head,
// an arm, a hand) are bent around a pivot, the way the Puppet tool in After Effects works. Nothing is
// redrawn, so every frame is still the design team's own drawing. Each part has a soft edge, so the
// picture around it stretches a little instead of tearing.
//
// Coordinates are in the 1600 x 900 frame of the artwork. Rigs live in src/lib/squad-rigs.ts.

export type Pt = [number, number];

/** Where a part sits at one moment: turn (degrees), shift and stretch, all around the part's pivot. */
export type Pose = { r?: number; x?: number; y?: number; sx?: number; sy?: number };

export type Part = {
  id: string;
  /** Inside this outline the part moves fully. */
  poly: Pt[];
  /** How far outside the outline (in px) the motion fades to nothing. */
  feather: number;
  /** How far inside the outline the motion starts to fade (default 0: full strength right up to the edge). */
  inner?: number;
  pivot: Pt;
  /** t is seconds; boost goes from 0 to 1 when someone taps or hovers the part. */
  move: (t: number, boost: number) => Pose;
  /** The part that reacts to a tap here (defaults to this part's own outline). */
  hit?: Pt[];
  /** Tapping this part also wakes these parts. */
  wakes?: string[];
  /** Move a cut out layer (see Rig.layers) instead of the picture itself. */
  layer?: string;
};

export type Rig = {
  /** The picture the mesh is laid on, in public/team/art (default: the squad's own picture). */
  base?: string;
  /** Cut out pieces drawn over the picture, each a full frame transparent WebP in public/team/art. */
  layers?: string[];
  parts: Part[];
  /** Points that ride along with a part (a wand tip), so the effects layer can follow them. */
  track?: { id: string; part: string; at: Pt }[];
  /** Outlines that must never move (a whiteboard frame, a screen edge). */
  pins?: { poly: Pt[]; feather: number }[];
};

export const W = 1600;
export const H = 900;

// Motion helpers -----------------------------------------------------------------------------------

const TAU = Math.PI * 2;
export const wave = (t: number, period: number, phase = 0) => Math.sin(TAU * (t / period + phase));

/** 0 most of the time, rising to 1 and back between `at` and `at + dur` of every `period` seconds. */
export function beat(t: number, period: number, at: number, dur: number) {
  const u = (((t - at) % period) + period) % period;
  if (u > dur) return 0;
  const s = Math.sin((Math.PI * u) / dur);
  return s * s;
}

/** Smooth wandering value in roughly -1..1, different for every seed. */
export function drift(t: number, seed: number) {
  return (
    0.55 * Math.sin(t * 0.83 + seed * 1.7) +
    0.3 * Math.sin(t * 1.91 + seed * 4.1) +
    0.15 * Math.sin(t * 3.7 + seed * 2.3)
  );
}

// Weights --------------------------------------------------------------------------------------------

function inside(p: Pt, poly: Pt[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function edgeDist(p: Pt, poly: Pt[]) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]!;
    const [bx, by] = poly[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l));
    const ex = ax + u * dx - p[0];
    const ey = ay + u * dy - p[1];
    best = Math.min(best, ex * ex + ey * ey);
  }
  return Math.sqrt(best);
}

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** 1 inside the outline, easing to 0 at `feather` px outside it (and from `inner` px inside it). */
export function weight(p: Pt, poly: Pt[], feather: number, inner = 0) {
  const d = (inside(p, poly) ? -1 : 1) * edgeDist(p, poly);
  return 1 - smooth((d + inner) / (inner + feather || 1));
}

function bbox(poly: Pt[], pad: number): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** Where point p lands when the part takes `pose`. */
export function apply(p: Pt, pivot: Pt, pose: Pose): Pt {
  const a = ((pose.r ?? 0) * Math.PI) / 180;
  const dx = (p[0] - pivot[0]) * (pose.sx ?? 1);
  const dy = (p[1] - pivot[1]) * (pose.sy ?? 1);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [pivot[0] + dx * c - dy * s + (pose.x ?? 0), pivot[1] + dx * s + dy * c + (pose.y ?? 0)];
}

// Mesh -----------------------------------------------------------------------------------------------

export type Mesh = {
  parts: Part[];
  base: Float32Array; // x, y per vertex in artwork px
  index: Uint16Array;
  /** For each part: the vertices it touches and how strongly. */
  touch: { idx: Uint32Array; w: Float32Array }[];
};

/** The mesh for the picture (layer undefined) or for one cut out layer. */
export function buildMesh(rig: Rig, step: number, layer?: string): Mesh {
  const parts = rig.parts.filter((p) => p.layer === layer);
  const cols = Math.ceil(W / step) + 1;
  const rows = Math.ceil(H / step) + 1;
  const base = new Float32Array(cols * rows * 2);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 2;
      base[i] = Math.min(W, c * step);
      base[i + 1] = Math.min(H, r * step);
    }
  const index = new Uint16Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      index.set([a, a + 1, a + cols, a + 1, a + cols + 1, a + cols], k);
      k += 6;
    }

  // How much each vertex is held still by the pins.
  const pinned = new Float32Array(cols * rows);
  for (const pin of layer ? [] : (rig.pins ?? [])) {
    const [x0, y0, x1, y1] = bbox(pin.poly, pin.feather);
    for (let v = 0; v < cols * rows; v++) {
      const p: Pt = [base[v * 2]!, base[v * 2 + 1]!];
      if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
      pinned[v] = Math.max(pinned[v]!, weight(p, pin.poly, pin.feather));
    }
  }

  const touch = parts.map((part) => {
    const [x0, y0, x1, y1] = bbox(part.poly, part.feather);
    const idx: number[] = [];
    const w: number[] = [];
    const c0 = Math.max(0, Math.floor(x0 / step));
    const c1 = Math.min(cols - 1, Math.ceil(x1 / step));
    const r0 = Math.max(0, Math.floor(y0 / step));
    const r1 = Math.min(rows - 1, Math.ceil(y1 / step));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const v = r * cols + c;
        const p: Pt = [base[v * 2]!, base[v * 2 + 1]!];
        const wt = weight(p, part.poly, part.feather, part.inner) * (1 - pinned[v]!);
        if (wt > 0.002) {
          idx.push(v);
          w.push(wt);
        }
      }
    return { idx: Uint32Array.from(idx), w: Float32Array.from(w) };
  });
  return { parts, base, index, touch };
}

/** Writes this moment's vertex positions into `out`. */
export function pose(mesh: Mesh, t: number, boost: Record<string, number>, out: Float32Array) {
  out.set(mesh.base);
  mesh.parts.forEach((part, i) => {
    const ps = part.move(t, boost[part.id] ?? 0);
    const { idx, w } = mesh.touch[i]!;
    const a = ((ps.r ?? 0) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sx = ps.sx ?? 1;
    const sy = ps.sy ?? 1;
    const tx = ps.x ?? 0;
    const ty = ps.y ?? 0;
    const [px, py] = part.pivot;
    for (let j = 0; j < idx.length; j++) {
      const v = idx[j]! * 2;
      const bx = mesh.base[v]!;
      const by = mesh.base[v + 1]!;
      const dx = (bx - px) * sx;
      const dy = (by - py) * sy;
      out[v]! += w[j]! * (px + dx * c - dy * s + tx - bx);
      out[v + 1]! += w[j]! * (py + dx * s + dy * c + ty - by);
    }
  });
}

/** The part under a point, for taps. */
export function partAt(rig: Rig, p: Pt) {
  for (let i = rig.parts.length - 1; i >= 0; i--) {
    const part = rig.parts[i]!;
    if (inside(p, part.hit ?? part.poly)) return part;
  }
  return undefined;
}
