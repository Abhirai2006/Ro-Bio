// Draws a rigged illustration with WebGL and keeps it moving. If WebGL is missing or a picture cannot
// be loaded, it gives up quietly and the still picture under the canvas stays on show.
import { apply, buildMesh, partAt, pose, H, W, type Mesh, type Pt, type Rig } from "./puppet";

const VERT = `attribute vec2 p;attribute vec2 u;varying vec2 v;
void main(){v=u;gl_Position=vec4(p.x/${W / 2}.0-1.0,1.0-p.y/${H / 2}.0,0.0,1.0);}`;
const FRAG = `precision mediump float;varying vec2 v;uniform sampler2D t;
void main(){gl_FragColor=texture2D(t,v);}`;

export type Puppet = {
  /** Wake the part under this point (and the parts it wakes), as a tap does. */
  poke: (p: Pt) => boolean;
  /** Is there a part under this point? */
  over: (p: Pt) => boolean;
  /** Everyone moves a little more while the pointer is over the picture. */
  hover: (on: boolean) => void;
  stop: () => void;
};

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });

/**
 * `art(name)` gives the URL of a picture in public/team/art. `onReady` runs once the first frame is
 * on the canvas, so the canvas can fade in over the still picture without a jump.
 */
export function startPuppet(
  canvas: HTMLCanvasElement,
  rig: Rig,
  {
    base,
    art,
    step = 8,
    onReady,
    onTrack,
    time,
  }: {
    base: string;
    art: (name: string) => string;
    step?: number;
    onReady?: () => void;
    /** Where each of the rig's tracked points has moved to this frame (as a shift from its drawn spot). */
    onTrack?: (id: string, dx: number, dy: number) => void;
    /** Seconds; for previews that need a fixed moment. */
    time?: () => number;
  },
): Puppet | null {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: false,
    antialias: true,
    alpha: false,
  });
  if (!gl) return null;

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const pLoc = gl.getAttribLocation(prog, "p");
  const uLoc = gl.getAttribLocation(prog, "u");
  gl.enableVertexAttribArray(pLoc);
  gl.enableVertexAttribArray(uLoc);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  type Sheet = {
    mesh: Mesh;
    pos: Float32Array;
    posBuf: WebGLBuffer | null;
    uvBuf: WebGLBuffer | null;
    idxBuf: WebGLBuffer | null;
    tex: WebGLTexture | null;
    alpha: boolean;
  };
  const sheet = (layer: string | undefined): Sheet => {
    const mesh = buildMesh(rig, step, layer);
    const uv = new Float32Array(mesh.base.length);
    for (let i = 0; i < uv.length; i += 2) {
      uv[i] = mesh.base[i]! / W;
      uv[i + 1] = mesh.base[i + 1]! / H;
    }
    const s: Sheet = {
      mesh,
      pos: new Float32Array(mesh.base.length),
      posBuf: gl.createBuffer(),
      uvBuf: gl.createBuffer(),
      idxBuf: gl.createBuffer(),
      tex: gl.createTexture(),
      alpha: !!layer,
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, s.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, s.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW);
    return s;
  };
  const sheets = [sheet(undefined), ...(rig.layers ?? []).map((l) => sheet(l))];

  let ready = false;
  let alive = true;
  Promise.all([art(rig.base ?? base), ...(rig.layers ?? []).map(art)].map(load))
    .then((ims) => {
      if (!alive) return;
      ims.forEach((im, i) => {
        const s = sheets[i]!;
        gl.bindTexture(gl.TEXTURE_2D, s.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const f = s.alpha ? gl.RGBA : gl.RGB;
        gl.texImage2D(gl.TEXTURE_2D, 0, f, f, gl.UNSIGNED_BYTE, im);
      });
      ready = true;
    })
    .catch(() => {
      /* The still picture stays. */
    });

  const boost: Record<string, number> = {};
  const target: Record<string, number> = {};
  let hovering = false;
  let visible = true;
  let shown = false;
  let raf = 0;
  let last = performance.now();
  const t0 = last;

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const draw = (t: number) => {
    size();
    gl.viewport(0, 0, canvas.width, canvas.height);
    sheets.forEach((s, i) => {
      pose(s.mesh, t, boost, s.pos);
      if (i === 1) gl.enable(gl.BLEND);
      gl.bindTexture(gl.TEXTURE_2D, s.tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.uvBuf);
      gl.vertexAttribPointer(uLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, s.pos);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.idxBuf);
      gl.drawElements(gl.TRIANGLES, s.mesh.index.length, gl.UNSIGNED_SHORT, 0);
    });
    gl.disable(gl.BLEND);
    for (const tr of rig.track ?? []) {
      const part = rig.parts.find((p) => p.id === tr.part);
      if (!part) continue;
      const [x, y] = apply(tr.at, part.pivot, part.move(t, boost[part.id] ?? 0));
      onTrack?.(tr.id, x - tr.at[0], y - tr.at[1]);
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || !alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const part of rig.parts) {
      const id = part.id;
      const goal = Math.max(target[id] ?? 0, hovering ? 0.35 : 0);
      const cur = boost[id] ?? 0;
      // Rise fast, settle slowly.
      boost[id] = cur + (goal - cur) * Math.min(1, dt * (goal > cur ? 8 : 1.6));
      target[id] = Math.max(0, (target[id] ?? 0) - dt * 0.45);
    }
    if (ready) {
      draw(time ? time() : (now - t0) / 1000);
      if (!shown) {
        shown = true;
        onReady?.();
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  io.observe(canvas);
  raf = requestAnimationFrame(frame);

  const wake = (id: string) => {
    target[id] = 1;
  };
  return {
    poke(p) {
      const part = partAt(rig, p);
      if (!part) return false;
      wake(part.id);
      part.wakes?.forEach(wake);
      return true;
    },
    over: (p) => !!partAt(rig, p),
    hover(on) {
      hovering = on;
    },
    stop() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
