// Robo's pixel teleport. He is rasterised into a grid of coloured squares, the squares stream into the link you
// clicked, and on the next page they stream back out and rebuild him. Drawn on one canvas over the whole site.

export type Cell = { dx: number; dy: number; c: string; row: number }; // offset from the top-left of his box
type Bit = { sx: number; sy: number; tx: number; ty: number; cx: number; cy: number; c: string; d: number; T: number; r: number }; // r: when the scan line passes it

const VARS = ["--violet", "--lilac", "--lens", "--ink", "--paper"];

/** Turns one of Robo's SVGs into coloured cells. Resolves CSS colour variables first, since an image cannot see them. */
export function sampleSvg(svg: SVGSVGElement, w: number, h: number, cell: number, mirror = false): Promise<Cell[]> {
  const css = getComputedStyle(document.documentElement);
  let src = new XMLSerializer().serializeToString(svg);
  for (const v of VARS) src = src.split(`var(${v})`).join(css.getPropertyValue(v).trim() || "#725dff");
  src = src.replace("<svg", `<svg width="${Math.round(w)}" height="${Math.round(h)}"`);
  const cols = Math.max(4, Math.round(w / cell)), rows = Math.max(4, Math.round(h / cell));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = cols; cv.height = rows;
      const g = cv.getContext("2d", { willReadFrequently: true });
      if (!g) return resolve([]);
      g.drawImage(img, 0, 0, cols, rows);
      const px = g.getImageData(0, 0, cols, rows).data, out: Cell[] = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        if (px[k + 3]! < 140) continue; // skip the soft shadow and empty space
        const ii = mirror ? cols - 1 - i : i;
        out.push({ dx: (ii + 0.5) * (w / cols), dy: (j + 0.5) * (h / rows), c: `rgb(${px[k]},${px[k + 1]},${px[k + 2]})`, row: j / rows });
      }
      resolve(out);
    };
    img.onerror = () => resolve([]);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  });
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function pixelStream(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d")!;
  let bits: Bit[] = [], t0 = 0, kind: "up" | "down" = "up", size = 6, label: { x: number; y: number } | null = null, dpr = 1;
  const fit = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  };
  fit();
  const curve = (sx: number, sy: number, tx: number, ty: number) => {
    const mx = (sx + tx) / 2, my = (sy + ty) / 2, len = Math.hypot(tx - sx, ty - sy) || 1;
    const bend = (Math.random() * 2 - 1) * Math.min(90, len * 0.35);
    return { cx: mx - ((ty - sy) / len) * bend, cy: my + ((tx - sx) / len) * bend - Math.min(120, 30 + len * 0.15) };
  };
  return {
    fit,
    /** Dissolve from his box into point P. Rows go top to bottom, in step with the scan line. */
    up(cells: Cell[], box: { x: number; y: number }, P: { x: number; y: number }, now: number, cell: number, scanMs: number) {
      kind = "up"; t0 = now; size = cell; label = P;
      bits = cells.map((q) => {
        const sx = box.x + q.dx, sy = box.y + q.dy, tx = P.x + (Math.random() - 0.5) * 8, ty = P.y + (Math.random() - 0.5) * 8;
        return { sx, sy, tx, ty, ...curve(sx, sy, tx, ty), c: q.c, r: q.row * scanMs, d: q.row * scanMs + Math.random() * 90, T: 420 + Math.random() * 260 };
      });
    },
    /** Stream out of point S and rebuild him in his box, feet first. */
    down(cells: Cell[], box: { x: number; y: number }, S: { x: number; y: number }, now: number, cell: number) {
      kind = "down"; t0 = now; size = cell; label = { x: box.x + 0, y: box.y };
      bits = cells.map((q) => {
        const tx = box.x + q.dx, ty = box.y + q.dy, sx = S.x + (Math.random() - 0.5) * 10, sy = S.y + (Math.random() - 0.5) * 10;
        return { sx, sy, tx, ty, ...curve(sx, sy, tx, ty), c: q.c, r: 0, d: (1 - q.row) * 420 + Math.random() * 140, T: 460 + Math.random() * 260 };
      });
    },
    /** 0 to 1: how many pixels have arrived. */
    progress(now: number) {
      if (!bits.length) return 1;
      let n = 0; for (const b of bits) if (now - t0 >= b.d + b.T) n++;
      return n / bits.length;
    },
    /** Screen y below which every pixel has landed, so the real robot can be shown there. -Infinity once he is whole. */
    solidBelow(now: number) {
      let y = -Infinity; for (const b of bits) if (now - t0 < b.d + b.T) y = Math.max(y, b.ty + size / 2);
      return y;
    },
    draw(now: number) {
      const line = kind === "down" ? this.solidBelow(now) : 0;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
      if (!bits.length) return;
      const el = now - t0;
      for (const b of bits) {
        const u = Math.min(1, Math.max(0, (el - b.d) / b.T));
        if (kind === "up" && u <= 0) { // the scan line has passed but this pixel has not left yet
          if (el >= b.r) { g.fillStyle = b.c; g.fillRect(b.sx - size / 2, b.sy - size / 2, size, size); }
          continue;
        }
        if (kind === "down" && u >= 1 && b.ty >= line) continue; // the real robot has taken over here
        const at = (v: number) => { const e = easeIO(Math.max(0, v)), m = 1 - e; return [m * m * b.sx + 2 * m * e * b.cx + e * e * b.tx, m * m * b.sy + 2 * m * e * b.cy + e * e * b.ty, e] as const; };
        if (kind === "up" && u >= 1) continue;
        g.fillStyle = b.c;
        // a short fading trail behind each moving pixel, so it reads as a stream of data, not dust
        if (u > 0 && u < 1) for (const [lag, a] of [[0.12, 0.25], [0.06, 0.5]] as const) {
          const [tx, ty, te] = at(u - lag), ts = kind === "up" ? size * (1 - 0.45 * te) * 0.7 : size * (0.5 + 0.5 * te) * 0.7;
          g.globalAlpha = a; g.fillRect(tx - ts / 2, ty - ts / 2, ts, ts);
        }
        g.globalAlpha = 1;
        const [x, y, e] = at(u), sz = kind === "up" ? size * (1 - 0.45 * e) : size * (0.5 + 0.5 * e);
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      // the little progress box, in the site's pixel font
      if (label) {
        const p = Math.round(this.progress(now) * 100), w = 150, h = 38;
        const lx = Math.min(Math.max(label.x - w / 2, 8), innerWidth - w - 8);
        const ly = kind === "up" ? Math.min(Math.max(label.y + 18, 70), innerHeight - h - 8) : Math.max(label.y - h - 8, 70);
        g.fillStyle = "#201e2d"; g.fillRect(lx, ly, w, h);
        g.strokeStyle = "#fffffa"; g.lineWidth = 2; g.strokeRect(lx + 1, ly + 1, w - 2, h - 2);
        g.fillStyle = "#fffffa"; g.font = "9px Silkscreen, monospace"; g.textBaseline = "top";
        g.fillText(kind === "up" ? "UPLOADING ROBO" : "DOWNLOADING ROBO", lx + 8, ly + 7);
        g.textAlign = "right"; g.fillStyle = "#a979fa"; g.fillText(`${p}%`, lx + w - 8, ly + 7); g.textAlign = "left";
        g.fillStyle = "#3a3654"; g.fillRect(lx + 8, ly + 22, w - 16, 8);
        g.fillStyle = "#6294ff"; g.fillRect(lx + 8, ly + 22, Math.round((w - 16) * p / 100), 8);
      }
    },
    clear() { bits = []; label = null; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); },
  };
}
