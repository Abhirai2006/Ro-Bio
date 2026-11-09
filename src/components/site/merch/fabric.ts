// Knit textures drawn in code: single jersey for the tee, pique for the polo, a heavier jersey face for the
// fleece pieces, and 1x1 rib for cuffs, collars and hems. Each one is a height map turned into a normal map.
import * as THREE from "three";

type Height = (x: number, y: number) => number;

function hash(i: number, j: number) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Tileable value noise on a grid of `cells`. */
function tileNoise(x: number, y: number, cells: number) {
  const fx = x * cells,
    fy = y * cells;
  const xi = Math.floor(fx),
    yi = Math.floor(fy);
  const u = fx - xi,
    v = fy - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const c = (a: number, b: number) =>
    hash((((xi + a) % cells) + cells) % cells, (((yi + b) % cells) + cells) % cells);
  const a0 = c(0, 0) + (c(1, 0) - c(0, 0)) * s(u),
    a1 = c(0, 1) + (c(1, 1) - c(0, 1)) * s(u);
  return a0 + (a1 - a0) * s(v);
}

function normalCanvas(size: number, h: Height, strength: number) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) H[y * size + x] = h(x / size, y / size);
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(size, size);
  const at = (x: number, y: number) => H[((y + size) % size) * size + ((x + size) % size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const k = (y * size + x) * 4;
      img.data[k] = (-dx / l) * 127.5 + 127.5;
      img.data[k + 1] = (dy / l) * 127.5 + 127.5;
      img.data[k + 2] = (1 / l) * 127.5 + 127.5;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/** Single jersey: columns of V shaped loops. Wales run down the canvas. */
const jersey =
  (wales: number, courses: number, grain: number): Height =>
  (x, y) => {
    const cx = x * wales,
      cy = y * courses;
    const ix = Math.floor(cx),
      iy = Math.floor(cy);
    const fx = cx - ix,
      fy = cy - iy;
    const leg = (ox: number, tilt: number) => {
      const px = fx - ox,
        py = fy - 0.5;
      const c = Math.cos(tilt),
        s = Math.sin(tilt);
      const rx = (px * c - py * s) / 0.2,
        ry = (px * s + py * c) / 0.62;
      const d = rx * rx + ry * ry;
      return d < 1 ? Math.sqrt(1 - d) : 0;
    };
    const loop = Math.max(leg(0.29, 0.42), leg(0.71, -0.42));
    const jitter = 0.75 + 0.25 * hash(ix, iy);
    return loop * jitter + grain * tileNoise(x, y, 32);
  };

/** Pique: a raised net with small cells pressed in, the texture of a polo. */
const pique =
  (cells: number): Height =>
  (x, y) => {
    const cx = x * cells,
      cy = y * cells * 1.25;
    const dA = Math.hypot(cx - Math.floor(cx) - 0.5, cy - Math.floor(cy) - 0.5);
    const ox = cx + 0.5,
      oy = cy + 0.5;
    const dB = Math.hypot(ox - Math.floor(ox) - 0.5, oy - Math.floor(oy) - 0.5);
    const d = Math.min(dA, dB);
    return Math.min(1, d / 0.32) + 0.15 * tileNoise(x, y, 24);
  };

/** 1x1 rib: raised wales with deep valleys between. Wales run along the canvas x axis. */
const rib =
  (wales: number): Height =>
  (x, y) => {
    const s = Math.abs(Math.sin(Math.PI * y * wales));
    return Math.pow(s, 0.55) + 0.12 * tileNoise(x, y, 16);
  };

/** Low frequency mottling for the colour map, so a flat colour reads as dyed cloth. */
function grainCanvas(size: number) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const n = 0.5 * tileNoise(u, v, 6) + 0.3 * tileNoise(u, v, 18) + 0.2 * tileNoise(u, v, 90);
      const c = 238 + (n - 0.5) * 22;
      const k = (y * size + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = c;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

function tex(cv: HTMLCanvasElement, repeat: number, aniso: number, srgb = false, rotate = false) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (rotate) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

export type Knit = "jersey" | "pique" | "fleece";

export type FabricTextures = {
  normal: Record<Knit, { u: THREE.Texture; v: THREE.Texture }>;
  rib: THREE.Texture;
  grain: { u: THREE.Texture; v: THREE.Texture };
  dash: THREE.Texture;
  dispose: () => void;
};

export function makeFabricTextures(aniso: number): FabricTextures {
  const jerseyCv = normalCanvas(256, jersey(16, 22, 0.25), 2.2);
  const fleeceCv = normalCanvas(256, jersey(14, 19, 0.6), 1.5);
  const piqueCv = normalCanvas(256, pique(10), 2.6);
  // texture coordinates are in metres: one tile of jersey is 3.2 cm, pique 2.6 cm, rib 4 cm
  const pair = (cv: HTMLCanvasElement, rep: number) => ({
    v: tex(cv, rep, aniso),
    u: tex(cv, rep, aniso, false, true),
  });
  const normal = {
    jersey: pair(jerseyCv, 1 / 0.032),
    fleece: pair(fleeceCv, 1 / 0.036),
    pique: pair(piqueCv, 1 / 0.026),
  };
  const ribT = tex(normalCanvas(256, rib(16), 3.2), 1, aniso);
  ribT.repeat.set(1, 1 / 0.04);
  const grainCv = grainCanvas(512);
  const grain = {
    v: tex(grainCv, 1 / 0.45, aniso, true),
    u: tex(grainCv, 1 / 0.45, aniso, true, true),
  };
  const dashCv = document.createElement("canvas");
  dashCv.width = 32;
  dashCv.height = 4;
  const dg = dashCv.getContext("2d")!;
  dg.fillStyle = "#000";
  dg.fillRect(0, 0, 32, 4);
  dg.fillStyle = "#fff";
  dg.fillRect(2, 0, 22, 4);
  const dash = tex(dashCv, 1, aniso);
  dash.repeat.set(1 / 0.0042, 1);
  const all = [...Object.values(normal).flatMap((p) => [p.u, p.v]), ribT, grain.u, grain.v, dash];
  return { normal, rib: ribT, grain, dash, dispose: () => all.forEach((t) => t.dispose()) };
}
