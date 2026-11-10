// The merch studio: lights, camera and the four garments, with the prints projected onto them.
// The garments are real 3D models (credited on the page), cleaned of brand marks and coloured here.
// Loaded on demand by MerchStudio, so three.js never slows down the first paint of the page.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
import type { MerchKind } from "@/lib/site";
import type { ColourId, Pick } from "@/lib/merch";
import { makeFabricTextures, type Knit } from "./fabric";
import { createZipRig, type ZipRig } from "./zip-rig";
import {
  CREST_SRC,
  MONO_ASPECT,
  POSTER_ASPECT,
  CHEST_NAME,
  STARS_SRC,
  drawChestName,
  drawNumber,
  fontsReady,
  loadImage,
  monoSrc,
  posterSrc,
} from "./art";

export type View = "front" | "back" | "right" | "left";

export type MerchScene = {
  set: (p: Pick) => void;
  view: (v: View) => void;
  spin: (on: boolean) => void;
  zoom: (k: number) => void;
  /** The zip on the zip hoodie: 0 is closed, 1 is open. */
  zip: (v: number) => void;
  dispose: () => void;
};

/** `lower` is the cloth below the two-tone line; on a one colour piece it is the same as `fabric`. */
type Palette = { fabric: string; lower: string; sheen: string; cord: string; metal: string };

const PALETTES: Record<ColourId, Palette> = {
  black: {
    fabric: "#1f1f23",
    lower: "#1f1f23",
    sheen: "#56565f",
    cord: "#a979fa",
    metal: "#4a4a51",
  },
  white: {
    fabric: "#efeee9",
    lower: "#efeee9",
    sheen: "#ffffff",
    cord: "#201e2d",
    metal: "#c9c9d0",
  },
  lilac: {
    fabric: "#b393f8",
    lower: "#b393f8",
    sheen: "#ece4ff",
    cord: "#fffffa",
    metal: "#c9c9d0",
  },
  duo: { fabric: "#b393f8", lower: "#efeee9", sheen: "#f1ecff", cord: "#fffffa", metal: "#c9c9d0" },
};

/** Exposure per colour, so black keeps its folds and white does not burn out. */
const EXPOSURE: Record<ColourId, number> = { black: 1.15, white: 0.86, lilac: 0.98, duo: 0.93 };

/** Knit detail for the pieces whose model has no fabric texture of its own. */
const KNIT: Partial<Record<MerchKind, Knit>> = { tee: "jersey", polo: "pique" };

/**
 * Where the prints go on each model, in metres from the hem. `back` is the middle of the back poster and `poster`
 * its width. `mono` and `name` are the front prints as [x, y, width]; the wearer's left chest is +x. `arm` is how
 * far the upper sleeve leans out from hanging straight down (radians), so the sleeve badges sit upright along
 * the arm. `split` is the two-tone line.
 */
type Spot = [number, number, number];
const PRINT: Record<
  MerchKind,
  {
    back: number;
    poster: number;
    mono: Spot;
    name: Spot;
    layout: "patch" | "line";
    sleeveY: number;
    arm: number;
    badge: number;
    /** How much bigger the sleeve number is than the crest badge. */
    num: number;
    tilt?: number;
    split: number;
  }
> = {
  jacket: {
    // the zip hoodie's hood hangs lower than the hoodie's, so its poster sits lower to stay clear of it
    back: 0.385,
    poster: 0.3,
    mono: [0.118, 0.53, 0.112],
    name: [-0.125, 0.53, 0.13],
    layout: "patch",
    sleeveY: 0.5,
    arm: 0.62,
    badge: 0.075,
    num: 1.5,
    split: 0.27,
  },
  hoodie: {
    back: 0.38,
    poster: 0.3,
    mono: [0.118, 0.53, 0.112],
    name: [-0.125, 0.53, 0.13],
    layout: "patch",
    sleeveY: 0.5,
    arm: 0.62,
    badge: 0.075,
    num: 1.5,
    split: 0.27,
  },
  tee: {
    back: 0.41,
    poster: 0.3,
    mono: [0, 0.5, 0.25],
    name: [0, 0.355, 0.24],
    layout: "line",
    sleeveY: 0.59,
    arm: 0.95,
    badge: 0.055,
    num: 1.2,
    tilt: -0.15,
    split: 0.25,
  },
  polo: {
    back: 0.4,
    poster: 0.29,
    mono: [0, 0.452, 0.23],
    name: [0, 0.32, 0.22],
    layout: "line",
    sleeveY: 0.595,
    arm: 0.95,
    badge: 0.055,
    num: 1.2,
    tilt: -0.15,
    split: 0.25,
  },
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Built = {
  kind: MerchKind;
  group: THREE.Group;
  fabric: THREE.MeshPhysicalMaterial[];
  cord: THREE.MeshStandardMaterial[];
  metal: THREE.MeshStandardMaterial[];
  box: THREE.Box3;
  points: Record<"right" | "left" | "back", THREE.Vector3>;
  zip: ZipRig | null;
  dispose: () => void;
};

export function createMerchScene(
  host: HTMLElement,
  initial: Pick,
  on: {
    ready: () => void;
    loading: (busy: boolean) => void;
    zip: (v: number) => void;
    spin: (on: boolean) => void;
    error: () => void;
  },
): MerchScene {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = EXPOSURE[initial.colour];
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.transition = "opacity 180ms ease";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8c8b93, 0.4));
  const key = new THREE.DirectionalLight(0xfff6ee, 2.6);
  key.position.set(-1.3, 2.3, 2.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -0.8,
    right: 0.8,
    top: 1,
    bottom: -0.4,
    near: 0.5,
    far: 6,
  });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 5;
  key.target.position.set(0, 0.4, 0);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xe8ecff, 0.7);
  fill.position.set(1.8, 1.0, 1.4);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(0.6, 1.6, -2.2);
  const rim2 = new THREE.DirectionalLight(0xf1ecff, 0.8);
  rim2.position.set(-1.6, 0.9, -1.4);
  scene.add(fill, rim, rim2);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
  camera.position.set(0, 0.45, 2.6);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 0.55;
  controls.maxDistance = 4.2;
  controls.autoRotateSpeed = 1.4;
  controls.target.set(0, 0.4, 0);

  // The XYZ gizmo in the corner. Tap an axis ball to look along it.
  const gizmo = new ViewHelper(camera, canvas);
  gizmo.setLabels("X", "Y", "Z");
  gizmo.setLabelStyle('600 26px "JetBrains Mono", monospace', "#ffffff", 15);
  gizmo.location = { top: null, right: 8, bottom: 52, left: null };
  const GIZMO = 128;
  const inGizmo = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left,
      y = e.clientY - r.top;
    return (
      x > r.width - GIZMO - 8 && x < r.width - 8 && y > r.height - GIZMO - 52 && y < r.height - 52
    );
  };

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const knit = makeFabricTextures(aniso);

  const patchCv = document.createElement("canvas"),
    lineCv = document.createElement("canvas"),
    chipCv = document.createElement("canvas");
  const canvasTex = (cv: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  let pick = { ...initial };
  let stars: HTMLImageElement | null = null;
  const drawArt = () => {
    drawChestName(patchCv, pick.name, pick.colour, "patch", stars);
    drawChestName(lineCv, pick.name, pick.colour, "line", stars);
    drawNumber(chipCv, pick.number, pick.colour, pick.style);
  };
  drawArt();
  const patchTex = canvasTex(patchCv),
    lineTex = canvasTex(lineCv),
    chipTex = canvasTex(chipCv);
  const loader = new THREE.TextureLoader();
  const image = (src: string) => {
    const t = loader.load(src, () => (dirty = true));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const crestTex = image(CREST_SRC);
  // the design team's art comes in versions for each fabric; each file is fetched the first time it is needed
  const art = new Map<string, THREE.Texture>();
  const artTex = (src: string) => {
    let t = art.get(src);
    if (!t) art.set(src, (t = image(src)));
    return t;
  };
  const redrawArt = () => {
    drawArt();
    patchTex.needsUpdate = lineTex.needsUpdate = chipTex.needsUpdate = true;
    dirty = true;
  };
  void fontsReady().then(() => !disposed && redrawArt());
  loadImage(STARS_SRC)
    .then((img) => {
      stars = img;
      if (!disposed) redrawArt();
    })
    .catch(() => {});

  const printMat = (map: THREE.Texture, roughness = 0.6) =>
    new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      roughness,
      metalness: 0,
    });
  const prints = {
    poster: printMat(artTex(posterSrc(pick.colour)), 0.62),
    mono: printMat(artTex(monoSrc(pick.colour, pick.kind)), 0.6),
    patch: printMat(patchTex),
    line: printMat(lineTex),
    chip: printMat(chipTex),
    crest: printMat(crestTex, 0.72),
  };
  const swapArt = () => {
    prints.poster.map = artTex(posterSrc(pick.colour));
    prints.mono.map = artTex(monoSrc(pick.colour, current?.kind ?? pick.kind));
    dirty = true;
  };

  const shown: Record<keyof Palette, THREE.Color> = {
    fabric: new THREE.Color(PALETTES[pick.colour].fabric),
    lower: new THREE.Color(PALETTES[pick.colour].lower),
    sheen: new THREE.Color(PALETTES[pick.colour].sheen),
    cord: new THREE.Color(PALETTES[pick.colour].cord),
    metal: new THREE.Color(PALETTES[pick.colour].metal),
  };
  let tintAnim = 0;
  // the two-tone line, shared by every fabric material: the colour below it and its height on the piece on show
  const duo = { uLower: { value: shown.lower }, uSplit: { value: PRINT[pick.kind].split } };

  const gltf = new GLTFLoader();
  const cache = new Map<MerchKind, Promise<Built>>();
  let current: Built | null = null;
  const raycaster = new THREE.Raycaster();

  /**
   * Keeps only the cloth that faces the same way as the print. The projection box also reaches the lining and the
   * inside of the collar behind it, which would show the print from inside once the zip hoodie opens.
   */
  function keepFacing(g: THREE.BufferGeometry, n: THREE.Vector3) {
    const pos = g.getAttribute("position"),
      nor = g.getAttribute("normal");
    if (!pos || !nor) return;
    const keep: number[] = [];
    for (let t = 0; t < pos.count; t += 3) {
      let d = 0;
      for (let k = 0; k < 3; k++)
        d += nor.getX(t + k) * n.x + nor.getY(t + k) * n.y + nor.getZ(t + k) * n.z;
      if (d > 0.3) keep.push(t, t + 1, t + 2);
    }
    if (keep.length === pos.count) return;
    for (const name of Object.keys(g.attributes)) {
      const a = g.getAttribute(name);
      const out = new Float32Array(keep.length * a.itemSize);
      keep.forEach((i, j) => {
        for (let c = 0; c < a.itemSize; c++) out[j * a.itemSize + c] = a.getComponent(i, c);
      });
      g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
    }
  }

  /** Shoots a ray at the garment and lays a print where it lands, facing out, `up` along the cloth. */
  function project(
    targets: THREE.Mesh[],
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    upHint: THREE.Vector3,
    size: [number, number],
    depth: number,
    mat: THREE.Material,
    parent: THREE.Group,
    made?: THREE.Mesh[],
  ) {
    raycaster.set(origin, dir.clone().normalize());
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit || !hit.face) return null;
    const mesh = hit.object as THREE.Mesh;
    const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
    if (n.dot(dir) > 0) n.negate();
    const up = upHint.clone().addScaledVector(n, -upHint.dot(n)).normalize();
    const x = new THREE.Vector3().crossVectors(up, n).normalize();
    const euler = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, n));
    // a print can span several panels (a back sewn from two halves): lay it on every piece under it
    const reach = new THREE.Box3().setFromCenterAndSize(
      hit.point,
      new THREE.Vector3(1, 1, 1).multiplyScalar(Math.hypot(size[0], size[1], depth)),
    );
    for (const target of targets) {
      if (target !== mesh && !new THREE.Box3().setFromObject(target).intersectsBox(reach)) continue;
      const g = new DecalGeometry(
        target,
        hit.point,
        euler,
        new THREE.Vector3(size[0], size[1], depth),
      );
      keepFacing(g, n);
      if (!g.getAttribute("position")?.count) {
        g.dispose();
        continue;
      }
      const d = new THREE.Mesh(g, mat);
      d.receiveShadow = true;
      d.renderOrder = 2;
      parent.add(d);
      made?.push(d);
    }
    return hit.point.clone();
  }

  async function build(kind: MerchKind): Promise<Built> {
    const model = await gltf.loadAsync(`/merch/models/${kind}/${kind}.gltf`);
    const group = new THREE.Group();
    const root = model.scene;
    group.add(root);
    const P = PALETTES[pick.colour];
    const fabric: THREE.MeshPhysicalMaterial[] = [];
    const cord: THREE.MeshStandardMaterial[] = [];
    const metal: THREE.MeshStandardMaterial[] = [];
    const disposables: { dispose: () => void }[] = [];
    const fabricMeshes: THREE.Mesh[] = [];
    const k = KNIT[kind];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const src = o.material as THREE.MeshStandardMaterial;
      o.castShadow = true;
      o.receiveShadow = true;
      disposables.push(o.geometry);
      if (src.name === "cord") {
        const m = new THREE.MeshPhysicalMaterial({
          color: P.cord,
          roughness: 0.75,
          sheen: 0.6,
          side: THREE.DoubleSide,
        });
        cord.push(m);
        o.material = m;
      } else if (src.name === "zip") {
        const m = new THREE.MeshStandardMaterial({
          color: P.metal,
          metalness: 0.9,
          roughness: 0.32,
          side: THREE.DoubleSide,
        });
        metal.push(m);
        o.material = m;
      } else {
        const m = new THREE.MeshPhysicalMaterial({
          color: P.fabric,
          normalMap: src.normalMap ?? (k ? knit.normal[k].v : null),
          normalScale: src.normalMap ? src.normalScale.clone() : new THREE.Vector2(0.45, 0.45),
          aoMap: src.aoMap,
          // the zip hoodie opens, so its baked shadows inside the hood are softened to read as cloth, not a hole
          aoMapIntensity: kind === "jacket" ? 0.5 : 1,
          roughnessMap: src.roughnessMap,
          roughness: src.roughnessMap ? 1 : 0.92,
          metalness: 0,
          sheen: 0.85,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color(P.sheen),
          side: THREE.DoubleSide,
        });
        // the inside of the cloth reads as a lining: a touch darker than the outside, but lit by light bouncing
        // around inside the garment, so an open neck or hood never shows a black hole
        // On a two-tone piece the cloth below the line takes the lower colour, with a soft seam where they meet.
        m.onBeforeCompile = (sh) => {
          sh.uniforms["uLower"] = duo.uLower;
          sh.uniforms["uSplit"] = duo.uSplit;
          sh.vertexShader = sh.vertexShader
            .replace("void main() {", "varying float vDuoY;\nvoid main() {")
            .replace(
              "#include <project_vertex>",
              "#include <project_vertex>\n  vDuoY = (modelMatrix * vec4(transformed, 1.0)).y;",
            );
          sh.fragmentShader = sh.fragmentShader
            .replace(
              "void main() {",
              "uniform vec3 uLower;\nuniform float uSplit;\nvarying float vDuoY;\nvoid main() {",
            )
            .replace(
              "#include <color_fragment>",
              [
                "#include <color_fragment>",
                "  if (distance(uLower, diffuseColor.rgb) > 0.002) {",
                "    float duoD = vDuoY - uSplit;",
                "    diffuseColor.rgb = mix(uLower, diffuseColor.rgb, smoothstep(-0.0012, 0.0012, duoD));",
                "    diffuseColor.rgb *= 1.0 - 0.2 * (1.0 - smoothstep(0.0, 0.0035, abs(duoD)));",
                "  }",
                "  vec3 liningBase = diffuseColor.rgb;",
                "  if (!gl_FrontFacing) diffuseColor.rgb *= 0.8;",
              ].join("\n"),
            )
            .replace(
              "#include <dithering_fragment>",
              "if (!gl_FrontFacing) gl_FragColor.rgb += liningBase * 0.22;\n#include <dithering_fragment>",
            );
        };
        fabric.push(m);
        o.material = m;
        if (o.name !== "hood") fabricMeshes.push(o);
      }
      for (const t of [src.map, src.normalMap, src.aoMap, src.roughnessMap, src.emissiveMap])
        if (t) {
          t.anisotropy = aniso;
          disposables.push(t);
        }
      src.dispose();
    });
    group.updateMatrixWorld(true);
    // the zip hoodie's front can open: cut it before the prints are laid on
    const zip =
      kind === "jacket"
        ? createZipRig(
            root,
            metal[0] ??
              new THREE.MeshStandardMaterial({ color: P.metal, metalness: 0.9, roughness: 0.32 }),
          )
        : null;
    group.updateMatrixWorld(true);

    const pr = PRINT[kind];
    const upY = new THREE.Vector3(0, 1, 0);
    const back =
      project(
        fabricMeshes,
        new THREE.Vector3(0, pr.back, -1.5),
        new THREE.Vector3(0, 0, 1),
        upY,
        [pr.poster, pr.poster * POSTER_ASPECT],
        0.14,
        prints.poster,
        group,
      ) ?? new THREE.Vector3(0, pr.back, -0.12);
    // the front: Mono and the name; on the zip hoodie they open with their side of the zip
    const front: THREE.Mesh[] = [];
    const onFront = (spot: Spot, h: number, mat: THREE.Material) =>
      project(
        fabricMeshes,
        new THREE.Vector3(spot[0], spot[1], 1.5),
        new THREE.Vector3(0, 0, -1),
        upY,
        [spot[2], h],
        0.1,
        mat,
        group,
        front,
      );
    onFront(pr.mono, pr.mono[2] * MONO_ASPECT, prints.mono);
    const nm = CHEST_NAME[pr.layout];
    onFront(
      pr.name,
      (pr.name[2] * nm.h) / nm.w,
      pr.layout === "patch" ? prints.patch : prints.line,
    );
    if (zip) for (const m of front) zip.follow(m.geometry);
    /** How far forward the sleeve on this side sits at the badge height, read off the model itself. */
    const sleeveZ = (sd: 1 | -1) => {
      const v = new THREE.Vector3();
      let sum = 0,
        n = 0;
      for (const m of fabricMeshes) {
        const pos = m.geometry.getAttribute("position");
        for (let i = 0; i < pos.count; i += 3) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          if (sd * v.x > 0.24 && Math.abs(v.y - pr.sleeveY) < 0.05) {
            sum += v.z;
            n++;
          }
        }
      }
      return n ? sum / n : 0;
    };
    const sleeve = (sd: 1 | -1, mat: THREE.Material, w: number, h = pr.badge) => {
      const up = new THREE.Vector3(-sd * Math.sin(pr.arm), Math.cos(pr.arm), 0);
      const z = sleeveZ(sd);
      return (
        project(
          fabricMeshes,
          // short sleeves stand out from the body, so their ray comes in from a little below to land on the outside face
          new THREE.Vector3(sd * 1.5, pr.sleeveY + 1.5 * Math.tan(pr.tilt ?? 0), z),
          new THREE.Vector3(-sd, -Math.tan(pr.tilt ?? 0), 0),
          up,
          [w, h],
          // shallow, so a badge on a short sleeve never wraps onto the body beside it
          pr.tilt ? 0.045 : 0.06,
          mat,
          group,
        ) ?? new THREE.Vector3(sd * 0.35, pr.sleeveY, 0)
      );
    };
    // the wearer's right arm is on -x, the left on +x
    const right = sleeve(-1, prints.crest, pr.badge * (568 / 632));
    // the number art is square
    const left = sleeve(1, prints.chip, pr.badge * pr.num, pr.badge * pr.num);

    const box = new THREE.Box3().setFromObject(group);
    return {
      kind,
      group,
      fabric,
      cord,
      metal,
      box,
      points: { back, right, left },
      zip,
      dispose: () => {
        zip?.dispose();
        group.traverse((o) => {
          if (o instanceof THREE.Mesh && o.geometry instanceof DecalGeometry) o.geometry.dispose();
        });
        disposables.forEach((d) => d.dispose());
        [...fabric, ...cord, ...metal].forEach((m) => m.dispose());
      },
    };
  }

  const get = (kind: MerchKind) => {
    let p = cache.get(kind);
    if (!p) {
      p = build(kind);
      cache.set(kind, p);
      p.catch(() => cache.delete(kind));
    }
    return p;
  };

  function applyPalette(b: Built) {
    duo.uSplit.value = PRINT[b.kind].split;
    for (const m of b.fabric) {
      m.color.copy(shown.fabric);
      m.sheenColor.copy(shown.sheen);
    }
    for (const m of b.cord) m.color.copy(shown.cord);
    for (const m of b.metal) m.color.copy(shown.metal);
  }

  const frame = (b: Built) => {
    const { min, max } = b.box;
    const h = max.y - min.y + 0.16,
      w = Math.max(-min.x, max.x) * 2 + 0.08;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(h / (2 * t), w / (2 * t * camera.aspect)) + max.z;
    return { dist, target: new THREE.Vector3(0, (min.y + max.y) / 2 - 0.015, 0) };
  };

  type Pose = { az: number; pol: number; dist: number; target: THREE.Vector3 };
  let tween: { from: Pose; to: Pose; t0: number; dur: number } | null = null;
  const pose = (): Pose => {
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    return { az: sph.theta, pol: sph.phi, dist: sph.radius, target: controls.target.clone() };
  };
  const setPose = (p: Pose) => {
    controls.target.copy(p.target);
    camera.position
      .copy(p.target)
      .add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(p.dist, p.pol, p.az)));
    camera.lookAt(p.target);
  };
  const goTo = (to: Pose, dur = 950) => {
    const from = pose();
    let d = to.az - from.az;
    d = ((((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    tween = { from, to: { ...to, az: from.az + d }, t0: performance.now(), dur };
    dirty = true;
  };
  const viewPose = (v: View): Pose => {
    const b = current!;
    const f = frame(b);
    if (v === "front") return { az: 0, pol: Math.PI / 2 - 0.06, dist: f.dist, target: f.target };
    if (v === "back")
      return { az: Math.PI, pol: Math.PI / 2 - 0.08, dist: f.dist, target: f.target };
    const p = b.points[v];
    return {
      az: v === "right" ? -1.3 : 1.3,
      pol: Math.PI / 2 - 0.1,
      dist: Math.max(1.4, f.dist * 0.68),
      target: p.clone().lerp(f.target, 0.6),
    };
  };

  let want: MerchKind = pick.kind;
  let spinIn: { t0: number } | null = null;
  async function show(kind: MerchKind, first = false) {
    want = kind;
    on.loading(true);
    let b: Built;
    try {
      b = await get(kind);
    } catch (err) {
      console.error(err);
      on.loading(false);
      on.error();
      return;
    }
    if (disposed || want !== kind) return;
    on.loading(false);
    applyPalette(b);
    if (current && current !== b) scene.remove(current.group);
    if (current !== b) scene.add(b.group);
    current = b;
    swapArt();
    canvas.style.opacity = "1";
    if (first) {
      setPose({ ...viewPose("front"), az: -0.75 });
      goTo(viewPose("front"), 1500);
      on.ready();
    } else {
      const f = frame(b);
      goTo({ ...pose(), dist: f.dist, target: f.target }, 600);
      b.group.rotation.y = -0.35;
      spinIn = { t0: performance.now() };
    }
    dirty = true;
  }

  let dirty = true;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let visible = true;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    let moving = false;
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      const e = ease(k);
      const { from, to } = tween;
      setPose({
        az: THREE.MathUtils.lerp(from.az, to.az, e),
        pol: THREE.MathUtils.lerp(from.pol, to.pol, e),
        dist: THREE.MathUtils.lerp(from.dist, to.dist, e),
        target: from.target.clone().lerp(to.target, e),
      });
      if (k >= 1) tween = null;
      moving = true;
    }
    if (gizmo.animating) {
      gizmo.center.copy(controls.target);
      gizmo.update(dt);
      moving = true;
    }
    if (current?.zip?.update(dt)) moving = true;
    if (spinIn && current) {
      const k = Math.min(1, (now - spinIn.t0) / 700);
      current.group.rotation.y = -0.35 * (1 - ease(k));
      if (k >= 1) spinIn = null;
      moving = true;
    }
    if (tintAnim > 0 && current) {
      const target = PALETTES[pick.colour];
      const a = 1 - Math.exp(-dt * 14);
      for (const key of Object.keys(shown) as (keyof Palette)[])
        shown[key].lerp(new THREE.Color(target[key]), a);
      renderer.toneMappingExposure += (EXPOSURE[pick.colour] - renderer.toneMappingExposure) * a;
      tintAnim -= dt;
      if (tintAnim <= 0) {
        for (const key of Object.keys(shown) as (keyof Palette)[]) shown[key].set(target[key]);
        renderer.toneMappingExposure = EXPOSURE[pick.colour];
      }
      applyPalette(current);
      moving = true;
    }
    const changed = gizmo.animating ? false : controls.update(dt);
    if (changed || moving || dirty || controls.autoRotate) {
      renderer.clear();
      renderer.render(scene, camera);
      gizmo.render(renderer);
      dirty = false;
    }
  };

  const resize = () => {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  const io = new IntersectionObserver((e) => {
    visible = e.some((x) => x.isIntersecting);
    if (visible) dirty = true;
  });
  io.observe(host);
  const onVis = () => {
    last = performance.now();
    dirty = true;
  };
  document.addEventListener("visibilitychange", onVis);
  const stopSpin = () => {
    tween = null;
    if (controls.autoRotate) {
      controls.autoRotate = false;
      on.spin(false);
    }
  };
  controls.addEventListener("start", stopSpin);
  controls.addEventListener("change", () => (dirty = true));
  // the gizmo gets its taps before the orbit controls see them
  const onGizmoDown = (e: PointerEvent) => {
    if (!inGizmo(e)) return;
    e.stopImmediatePropagation();
    stopSpin();
    gizmo.center.copy(controls.target);
    if (gizmo.handleClick(e)) dirty = true;
  };
  canvas.addEventListener("pointerdown", onGizmoDown, { capture: true });

  // dragging the zip puller: it slides along the zip line, the orbit controls stay out of it
  const pointer = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
  };
  let dragging: number | null = null;
  const onZipDown = (e: PointerEvent) => {
    const z = current?.zip;
    if (!z || inGizmo(e)) return;
    aim(e);
    if (!ray.intersectObjects(z.handles, false).length) return;
    e.stopImmediatePropagation();
    stopSpin();
    dragging = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const local = new THREE.Ray(),
    hit = new THREE.Vector3(),
    inv = new THREE.Matrix4();
  const onZipMove = (e: PointerEvent) => {
    const z = current?.zip;
    if (!z) return;
    aim(e);
    if (dragging === null) {
      canvas.style.cursor = ray.intersectObjects(z.handles, false).length ? "grab" : "";
      return;
    }
    e.stopImmediatePropagation();
    // follow the pointer on an upright plane through the zip line, in the garment's own space
    inv.copy(current!.group.matrixWorld).invert();
    local.copy(ray.ray).applyMatrix4(inv);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z.lineZ(0.4));
    if (!local.intersectPlane(plane, hit)) return;
    const v = z.valueAt(hit.y);
    z.setTarget(v);
    on.zip(v);
    dirty = true;
  };
  const onZipUp = (e: PointerEvent) => {
    if (dragging === null) return;
    e.stopImmediatePropagation();
    canvas.releasePointerCapture(dragging);
    dragging = null;
    canvas.style.cursor = "";
  };
  canvas.addEventListener("pointerdown", onZipDown, { capture: true });
  canvas.addEventListener("pointermove", onZipMove, { capture: true });
  canvas.addEventListener("pointerup", onZipUp, { capture: true });
  canvas.addEventListener("pointercancel", onZipUp, { capture: true });
  const onDbl = () => current && goTo(viewPose("front"));
  canvas.addEventListener("dblclick", onDbl);

  raf = requestAnimationFrame(loop);
  void show(pick.kind, true).then(() => {
    // fetch the other pieces in the background, so switching is quick
    const rest = (["jacket", "hoodie", "tee", "polo"] as MerchKind[]).filter(
      (k) => k !== pick.kind,
    );
    const next = () => {
      const k = rest.shift();
      if (!k || disposed) return;
      get(k).then(next, next);
    };
    if (typeof window.requestIdleCallback === "function")
      window.requestIdleCallback(next, { timeout: 3000 });
    else setTimeout(next, 1500);
  });

  return {
    set(p) {
      const prev = pick;
      pick = { ...p };
      if (p.colour !== prev.colour) {
        tintAnim = 0.45;
        swapArt();
      }
      if (
        p.name !== prev.name ||
        p.number !== prev.number ||
        p.colour !== prev.colour ||
        p.style !== prev.style
      )
        redrawArt();
      if (p.kind !== prev.kind) {
        canvas.style.opacity = "0.2";
        void show(p.kind);
      }
      dirty = true;
    },
    view(v) {
      if (!current) return;
      stopSpin();
      goTo(viewPose(v));
    },
    zoom(k) {
      const p = tween ? tween.to : pose();
      const dist = THREE.MathUtils.clamp(p.dist * k, controls.minDistance, controls.maxDistance);
      goTo({ ...pose(), dist }, 320);
    },
    zip(v) {
      current?.zip?.setTarget(v);
      dirty = true;
    },
    spin(onOff) {
      controls.autoRotate = onOff;
      if (onOff && current) {
        const f = frame(current);
        goTo({ ...pose(), dist: f.dist, target: f.target, pol: Math.PI / 2 - 0.06 }, 700);
      }
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("dblclick", onDbl);
      canvas.removeEventListener("pointerdown", onGizmoDown, { capture: true });
      canvas.removeEventListener("pointerdown", onZipDown, { capture: true });
      canvas.removeEventListener("pointermove", onZipMove, { capture: true });
      canvas.removeEventListener("pointerup", onZipUp, { capture: true });
      canvas.removeEventListener("pointercancel", onZipUp, { capture: true });
      controls.dispose();
      gizmo.dispose();
      cache.forEach((p) =>
        p.then(
          (b) => b.dispose(),
          () => {},
        ),
      );
      Object.values(prints).forEach((m) => m.dispose());
      [patchTex, lineTex, chipTex, crestTex, ...art.values()].forEach((t) => t.dispose());
      knit.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
