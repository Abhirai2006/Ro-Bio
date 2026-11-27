// The Shark Tank page's 3D shark and glass. A sheet of glass sits over the banner. The shark hits it from behind:
// the first hit cracks it, the second shatters it into real pieces that fly out, spin, fall, bounce off the bottom
// of the screen, knock into each other and settle, with a puff of glass dust. The shark bursts out of the hole and
// then swims all over the page, turning and banking, and snaps at the mouse when it swims close.
// Drawn on one see-through canvas fixed over the whole window, so the shark stays with you as you scroll.
// Loaded only on that page, on computers. The model is "Animated Swimming Great White Shark Loop" by LasquetiSpice
// (CC BY 4.0), made smaller for the web; the page credits it under the banner.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFishing, type Fishing } from "./fishing";

/** Seconds after play(): the first hit cracks the glass, the second shatters it. */
export const CRACK_AT = 0.25;
export const SHATTER_AT = 0.75;

export type SharkWorld = {
  /** Puts the glass back whole and runs the break again. */
  play: () => void;
  /** Hides or brings back the shark. */
  setHidden: (hidden: boolean) => void;
  dispose: () => void;
};

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
type P = [number, number];

/** Keeps the part of a polygon inside the rectangle 0..w by 0..h (Sutherland and Hodgman). */
function clipToRect(poly: P[], w: number, h: number): P[] {
  const edges: [(p: P) => boolean, (a: P, b: P) => P][] = [
    [(p) => p[0] >= 0, (a, b) => [0, a[1] + ((b[1] - a[1]) * (0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= w, (a, b) => [w, a[1] + ((b[1] - a[1]) * (w - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= 0, (a, b) => [a[0] + ((b[0] - a[0]) * (0 - a[1])) / (b[1] - a[1]), 0]],
    [(p) => p[1] <= h, (a, b) => [a[0] + ((b[0] - a[0]) * (h - a[1])) / (b[1] - a[1]), h]],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i]!,
        b = src[(i + 1) % src.length]!;
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) return [];
  }
  return out;
}

const area = (p: P[]) =>
  Math.abs(
    p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length]!;
      return s + a[0] * b[1] - b[0] * a[1];
    }, 0) / 2,
  );

/**
 * How a sheet of glass breaks when something hits it: cracks run out from the impact point like spokes, and rings
 * of cracks cross them, small pieces near the hit and big ones further out. Points are shared between neighbouring
 * pieces, so the pieces fit together exactly before they fly apart.
 */
function fracture(w: number, h: number, ix: number, iy: number, rays = 18): P[][] {
  const angles = Array.from(
    { length: rays },
    (_, i) => ((i + rand(-0.3, 0.3)) / rays) * Math.PI * 2,
  );
  const far = Math.max(
    Math.hypot(ix, iy),
    Math.hypot(w - ix, iy),
    Math.hypot(ix, h - iy),
    Math.hypot(w - ix, h - iy),
  );
  const radii = [Math.min(w, h) * 0.035];
  while (radii[radii.length - 1]! < far) radii.push(radii[radii.length - 1]! * rand(1.55, 1.95));
  radii.push(far * 3);
  const pt = radii.map((r, j) =>
    angles.map((a): P => {
      const rr = j === radii.length - 1 ? r : r * rand(0.82, 1.18);
      return [ix + Math.cos(a) * rr, iy + Math.sin(a) * rr];
    }),
  );
  const pieces: P[][] = [];
  // the little spikes right at the hit
  for (let i = 0; i < rays; i++) pieces.push([[ix, iy], pt[0]![i]!, pt[0]![(i + 1) % rays]!]);
  for (let j = 0; j < radii.length - 1; j++)
    for (let i = 0; i < rays; i++) {
      const a = pt[j]![i]!,
        b = pt[j]![(i + 1) % rays]!,
        c = pt[j + 1]![(i + 1) % rays]!,
        d = pt[j + 1]![i]!;
      if (j > 0 && Math.random() < 0.55) {
        pieces.push([a, b, c], [a, c, d]);
      } else pieces.push([a, b, c, d]);
    }
  return pieces.map((p) => clipToRect(p, w, h)).filter((p) => p.length >= 3 && area(p) > 1e-4);
}

type Shard = {
  mesh: THREE.Mesh;
  glass: THREE.MeshPhysicalMaterial;
  edge: THREE.LineBasicMaterial;
  /** Position of the piece's centre inside the sheet, from the bottom left corner. */
  local: THREE.Vector2;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  radius: number;
  /** How far from the hit, 0 to 1: cracks reach the far pieces a moment later. */
  reach: number;
  restFor: number;
  fade: number;
};

export function createSharkWorld(
  host: HTMLElement,
  opts: {
    url: string;
    /** The banner the glass covers, and the spot on it where the shark hits. */
    banner: HTMLElement;
    hole: HTMLElement;
    /** The robot fisherman and his rod, whose bait the shark chases. */
    fishing?: { robotUrl: string; rodUrl: string; notesUrl: string };
    /** A phone: a lighter version with fewer pieces, less dust and a lower resolution. */
    lite?: boolean;
    /** Called once if a phone cannot keep the animation smooth, so the page can show the still picture. */
    onSlow?: () => void;
    onReady: () => void;
    onFail: () => void;
  },
): SharkWorld {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const lite = !!opts.lite;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x1a2233, 1.2));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-6, 10, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 1.6);
  rim.position.set(8, 4, -10);
  scene.add(rim);

  const CAM = 50;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  camera.position.set(0, 0, CAM);
  // World units for one screen pixel on the z = 0 plane, worked out on every resize.
  let k = 0.03,
    vw = 1,
    vh = 1;
  const resize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    k = (2 * CAM * Math.tan(THREE.MathUtils.degToRad(15))) / vh;
  };
  resize();
  window.addEventListener("resize", resize);
  const toWorld = (x: number, y: number) => new THREE.Vector2((x - vw / 2) * k, (vh / 2 - y) * k);

  const pointer = { at: new THREE.Vector2(9999, 9999), movedAt: -1e9 };
  const onMove = (e: PointerEvent) => {
    pointer.at.copy(toWorld(e.clientX, e.clientY));
    pointer.movedAt = performance.now();
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  // ---- the glass ----
  const pane = new THREE.Group();
  scene.add(pane);
  let shards: Shard[] = [];
  let dust: THREE.Points | null = null;
  let dustVel: Float32Array | null = null;
  let thickness = 0.1;

  const clearGlass = () => {
    for (const s of shards) {
      s.mesh.geometry.dispose();
      (s.mesh.children[0] as THREE.LineLoop | undefined)?.geometry.dispose();
      s.glass.dispose();
      s.edge.dispose();
      s.mesh.removeFromParent();
    }
    shards = [];
    if (dust) {
      dust.geometry.dispose();
      (dust.material as THREE.Material).dispose();
      dust.removeFromParent();
      dust = null;
    }
  };

  /** Builds the sheet whole, over the banner as it is on screen now. */
  const buildGlass = () => {
    clearGlass();
    const b = opts.banner.getBoundingClientRect();
    const hl = opts.hole.getBoundingClientRect();
    const w = b.width * k,
      h = b.height * k;
    const ix = (hl.left + hl.width / 2 - b.left) * k,
      iy = (b.bottom - (hl.top + hl.height / 2)) * k;
    thickness = 5 * k;
    const far = Math.hypot(Math.max(ix, w - ix), Math.max(iy, h - iy));
    for (const poly of fracture(w, h, ix, iy, lite ? 12 : 18)) {
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length,
        cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geo.translate(0, 0, -thickness / 2);
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xe8f2ff,
        metalness: 0,
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transparent: true,
        opacity: 0.16,
        envMapIntensity: 2.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, glass);
      const edge = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          poly.map(([x, y]) => new THREE.Vector3(x - cx, y - cy, thickness / 2 + 0.002)),
        ),
        edge,
      );
      mesh.add(outline);
      mesh.position.set(cx, cy, 0);
      pane.add(mesh);
      shards.push({
        mesh,
        glass,
        edge,
        local: new THREE.Vector2(cx - ix, cy - iy),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        radius: Math.max(...poly.map(([x, y]) => Math.hypot(x - cx, y - cy))),
        reach: Math.min(1, Math.hypot(cx - ix, cy - iy) / far),
        restFor: 0,
        fade: 1,
      });
    }
  };

  /** Keeps the whole sheet on the banner while the page scrolls. */
  const followBanner = () => {
    const b = opts.banner.getBoundingClientRect();
    const w = toWorld(b.left, b.bottom);
    pane.position.set(w.x, w.y, 0);
  };

  /** The second hit: every piece gets a push away from the hit and towards you, more the closer it was. */
  const shatter = () => {
    // Pieces leave the sheet and live in the window from now on.
    pane.updateMatrixWorld();
    for (const s of shards) {
      const p = s.mesh.getWorldPosition(new THREE.Vector3());
      s.mesh.removeFromParent();
      s.mesh.position.copy(p);
      scene.add(s.mesh);
      const near = 1 - s.reach;
      const out = s.local.clone().normalize();
      const speed = (180 + 900 * near * near) * k;
      s.vel.set(
        out.x * speed + rand(-60, 60) * k,
        out.y * speed + rand(40, 220) * k,
        (300 + 1100 * near) * k * rand(0.6, 1.2),
      );
      s.spin.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(2 + 12 * near);
      s.edge.opacity = 0.9;
    }
    // Glass dust: a bright puff at the hit that falls and fades.
    const n = lite ? 140 : 320;
    const pos = new Float32Array(n * 3);
    dustVel = new Float32Array(n * 3);
    const at = new THREE.Vector3();
    const hl = opts.hole.getBoundingClientRect();
    const c = toWorld(hl.left + hl.width / 2, hl.top + hl.height / 2);
    at.set(c.x, c.y, 0.2);
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const a = Math.random() * Math.PI * 2,
        r = rand(100, 700) * k;
      dustVel.set([Math.cos(a) * r, Math.sin(a) * r + 120 * k, rand(100, 900) * k], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2.4 * k,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    );
    scene.add(dust);
  };

  // ---- the shark ----
  const shark = new THREE.Group();
  shark.visible = false;
  scene.add(shark);
  let mixer: THREE.AnimationMixer | null = null;
  let swim: THREE.AnimationAction | null = null;
  let bite: THREE.AnimationAction | null = null;
  const sharkVel = new THREE.Vector3();
  const target = new THREE.Vector3();
  let lastDir = new THREE.Vector2(1, 0);
  let bank = 0;
  let biteUntil = 0,
    biteNext = 0;
  let hidden = false;
  let ready = false;
  let fishing: Fishing | null = null;
  /** After a catch the shark swims off with its prize for a while before it hunts again. */
  let fedUntil = 0;

  const newTarget = () => {
    const W = (vw / 2) * k,
      H = (vh / 2) * k;
    if (performance.now() - pointer.movedAt < 4000 && Math.random() < 0.35)
      target.set(pointer.at.x, pointer.at.y, rand(1, 5));
    else target.set(rand(-W * 1.05, W * 1.05), rand(-H * 0.7, H * 0.7), rand(0.5, 6));
  };

  new GLTFLoader().load(
    opts.url,
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      const inner = new THREE.Group();
      inner.add(model);
      inner.userData["fit"] = Math.max(size.x, size.y, size.z);
      shark.add(inner);
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.frustumCulled = false;
      });
      mixer = new THREE.AnimationMixer(model);
      const clip = (name: string) =>
        gltf.animations.find((a) => a.name.toLowerCase().includes(name)) ?? gltf.animations[0];
      const s = clip("swim"),
        b = clip("bit");
      if (s) (swim = mixer.clipAction(s)).play();
      if (b) {
        bite = mixer.clipAction(b);
        bite.setLoop(THREE.LoopOnce, 1);
        bite.clampWhenFinished = false;
      }
      ready = true;
      buildGlass();
      if (opts.fishing)
        createFishing(scene, { ...opts.fishing, banner: opts.banner })
          .then((f) => {
            fishing = f;
            f.setVisible(!hidden);
          })
          .catch(() => {
            /* no fisherman: the shark just swims */
          });
      opts.onReady();
    },
    undefined,
    () => opts.onFail(),
  );

  let started = -1;
  let shattered = false;
  let frames = 0,
    frameTime = 0,
    slowSent = false;
  let last = performance.now();
  const up = new THREE.Vector3(0, 1, 0);
  const look = new THREE.Vector3();
  const gravity = () => -2600 * k;

  const stepGlass = (dt: number, t: number) => {
    const floor = (-vh / 2) * k * 0.94;
    if (!shattered) {
      followBanner();
      // the first hit: cracks race out from the hit
      if (t >= CRACK_AT)
        for (const s of shards) {
          const show = THREE.MathUtils.clamp((t - CRACK_AT - s.reach * 0.3) / 0.12, 0, 1);
          s.edge.opacity = show * (0.95 - s.reach * 0.45);
        }
      return;
    }
    for (const s of shards) {
      const m = s.mesh;
      s.vel.y += gravity() * dt;
      s.vel.multiplyScalar(1 - 0.35 * dt); // air
      m.position.addScaledVector(s.vel, dt);
      m.rotation.x += s.spin.x * dt;
      m.rotation.y += s.spin.y * dt;
      m.rotation.z += s.spin.z * dt;
      // the bottom of the screen is the floor: bounce, slide, settle
      if (m.position.y - s.radius * 0.3 < floor) {
        m.position.y = floor + s.radius * 0.3;
        if (s.vel.y < 0) s.vel.y = -s.vel.y * 0.32;
        s.vel.x *= 0.78;
        s.vel.z *= 0.78;
        s.spin.multiplyScalar(0.7);
        if (Math.abs(s.vel.y) < 60 * k) {
          s.vel.y = 0;
          // lie down flat on the floor as it settles
          m.rotation.x += (Math.PI / 2 - (m.rotation.x % Math.PI)) * Math.min(1, dt * 6);
          s.restFor += dt;
        }
      }
      if (m.position.z > CAM - 8) {
        m.position.z = CAM - 8;
        s.vel.z = -Math.abs(s.vel.z) * 0.3;
      }
      if (s.restFor > 2.2 || t - SHATTER_AT > 6.5) s.fade -= dt / 0.8;
      s.glass.opacity = 0.32 * Math.max(0, s.fade);
      s.edge.opacity = 0.9 * Math.max(0, s.fade);
    }
    // pieces knock into each other once they have spread out a little
    if (t - SHATTER_AT > 0.3)
      for (let i = 0; i < shards.length; i++)
        for (let j = i + 1; j < shards.length; j++) {
          const a = shards[i]!,
            b = shards[j]!;
          const d = b.mesh.position.clone().sub(a.mesh.position);
          const min = (a.radius + b.radius) * 0.45;
          const dist = d.length();
          if (dist <= 1e-6 || dist >= min) continue;
          const nrm = d.divideScalar(dist);
          const push = (min - dist) / 2;
          a.mesh.position.addScaledVector(nrm, -push);
          b.mesh.position.addScaledVector(nrm, push);
          const rel = b.vel.clone().sub(a.vel).dot(nrm);
          if (rel < 0) {
            const imp = -rel * 0.65;
            a.vel.addScaledVector(nrm, -imp);
            b.vel.addScaledVector(nrm, imp);
          }
        }
    // drop the pieces that have faded away
    const gone = shards.filter((s) => s.fade <= 0);
    if (gone.length) {
      for (const s of gone) {
        s.mesh.geometry.dispose();
        (s.mesh.children[0] as THREE.LineLoop | undefined)?.geometry.dispose();
        s.glass.dispose();
        s.edge.dispose();
        s.mesh.removeFromParent();
      }
      shards = shards.filter((s) => s.fade > 0);
    }
    if (dust && dustVel) {
      const pos = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        dustVel[i * 3 + 1]! += gravity() * 0.6 * dt;
        pos.setXYZ(
          i,
          pos.getX(i) + dustVel[i * 3]! * dt,
          pos.getY(i) + dustVel[i * 3 + 1]! * dt,
          pos.getZ(i) + dustVel[i * 3 + 2]! * dt,
        );
      }
      pos.needsUpdate = true;
      const mat = dust.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - (t - SHATTER_AT) / 1.6);
      if (mat.opacity <= 0) {
        dust.geometry.dispose();
        mat.dispose();
        dust.removeFromParent();
        dust = null;
      }
    }
  };

  const stepShark = (dt: number, t: number) => {
    if (!mixer) return;
    const inner = shark.children[0];
    if (inner)
      inner.scale.setScalar((Math.min(360, vw * 0.6) * k) / (inner.userData["fit"] as number));
    const now = performance.now();
    const lungeAt = SHATTER_AT - 0.12;
    if (t < lungeAt) {
      shark.visible = false;
      return;
    }
    shark.visible = !hidden;
    if (t < lungeAt + 0.6) {
      // bursting through: from behind the banner, straight out at you
      const hl = opts.hole.getBoundingClientRect();
      const c = toWorld(hl.left + hl.width / 2, hl.top + hl.height / 2);
      const e = easeOut((t - lungeAt) / 0.6);
      shark.position.set(c.x, c.y, -16 + e * 22);
      shark.rotation.set(-0.15, 0, 0);
      sharkVel.set(0, 0, 0);
      if (!target.lengthSq()) newTarget();
      mixer.update(dt);
      return;
    }
    // swimming round the page
    const maxSpeed = 340 * k,
      accel = 520 * k;
    // go for the bait when there is one; otherwise wander
    const bait = fishing?.bait() ?? null;
    const hunting = !!bait && now > fedUntil;
    if (hunting) target.set(bait.x, bait.y, 1.5);
    const to = target.clone().sub(shark.position);
    if (!hunting && to.length() < 60 * k) newTarget();
    // closing in on the bait it slows down and turns tighter, so it can strike instead of circling
    const dist = to.length();
    const closing = hunting && dist < 320 * k;
    const want = to
      .clone()
      .setLength(closing ? Math.max(90 * k, Math.min(maxSpeed, dist * 1.6)) : maxSpeed);
    want.y *= 0.6;
    const steer = want.sub(sharkVel);
    const grip = closing ? accel * 2.4 : accel;
    if (steer.length() > grip * dt) steer.setLength(grip * dt);
    sharkVel.add(steer);
    shark.position.addScaledVector(sharkVel, dt);
    const speed = sharkVel.length();
    if (speed > 1e-4) {
      look.set(sharkVel.x, sharkVel.y, sharkVel.z + speed * 0.35).normalize();
      shark.up.copy(up);
      shark.lookAt(shark.position.clone().add(look));
      const dir = new THREE.Vector2(sharkVel.x, sharkVel.y).normalize();
      const turn = (lastDir.x * dir.y - lastDir.y * dir.x) / Math.max(dt, 1e-3);
      lastDir = dir;
      bank += (THREE.MathUtils.clamp(-turn * 0.35, -0.7, 0.7) - bank) * Math.min(1, dt * 3);
      shark.rotateZ(bank);
    }
    if (swim) swim.timeScale = 0.6 + (speed / maxSpeed) * 0.8;
    // one clean bite gets it: the bundle bursts and the notes scatter
    const mouth = shark.position
      .clone()
      .add(new THREE.Vector3(0, 0, 1).applyQuaternion(shark.quaternion).multiplyScalar(150 * k));
    const near = bait && hunting ? mouth.distanceTo(bait) : Infinity;
    if (bite && swim && now > biteNext && near < 150 * k) {
      bite.reset().setEffectiveWeight(1).fadeIn(0.12).play();
      swim.fadeOut(0.12);
      biteUntil = now + 850;
      biteNext = now + 1600;
      if (fishing) {
        fishing.catchBait();
        fedUntil = now + 3200;
        newTarget();
      }
    }
    if (bite && swim && biteUntil && now > biteUntil) {
      bite.fadeOut(0.25);
      swim.reset().fadeIn(0.25).play();
      biteUntil = 0;
    }
    mixer.update(dt);
  };

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const raw = (now - last) / 1000;
    const dt = Math.min(raw, 0.05);
    last = now;
    // On a phone, watch the first few seconds of the break: if it cannot keep up, hand over to the picture.
    if (lite && started >= 0 && !slowSent && !document.hidden) {
      const since = (now - started) / 1000;
      if (since > 0.4 && since < 3.4) {
        frames++;
        frameTime += raw;
      } else if (since >= 3.4 && frames > 0) {
        slowSent = true;
        if (frameTime / frames > 1 / 26) opts.onSlow?.();
      }
    }
    if (!ready || document.hidden) return;
    const t = started < 0 ? 0 : (now - started) / 1000;
    if (started >= 0 && !shattered && t >= SHATTER_AT) {
      shattered = true;
      shatter();
    }
    stepGlass(dt, t);
    if (started >= 0) stepShark(dt, t);
    if (fishing) {
      const hl = opts.hole.getBoundingClientRect();
      fishing.update(dt, {
        k,
        vh,
        toWorld,
        pointer: pointer.movedAt > 0 ? pointer.at : null,
        free: shattered && t > SHATTER_AT + 1.2,
        rest: toWorld(hl.left + hl.width / 2, hl.top + hl.height / 2),
        lite,
      });
    }
    renderer.clear();
    // While it bursts through, the shark only shows inside the hole; the banner hides the rest of it.
    const lungeAt = SHATTER_AT - 0.12;
    if (shark.visible && t >= lungeAt && t < lungeAt + 0.3) {
      shark.visible = false;
      renderer.render(scene, camera);
      shark.visible = true;
      const hl = opts.hole.getBoundingClientRect();
      const keep = scene.children.filter((o) => o !== shark && o.visible);
      keep.forEach((o) => (o.visible = false));
      renderer.setScissorTest(true);
      renderer.setScissor(hl.left, vh - hl.bottom, hl.width, hl.height);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
      keep.forEach((o) => (o.visible = true));
    } else renderer.render(scene, camera);
  });

  return {
    play() {
      if (!ready) return;
      shattered = false;
      target.set(0, 0, 0);
      buildGlass();
      followBanner();
      shark.visible = false;
      started = performance.now();
      frames = 0;
      frameTime = 0;
    },
    setHidden(h) {
      hidden = h;
      shark.visible = !h && started >= 0 && shattered;
      fishing?.setVisible(!h);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      fishing?.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      clearGlass();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        for (const mt of Array.isArray(m.material) ? m.material : [m.material]) {
          for (const v of Object.values(mt))
            if (v && typeof v === "object" && "isTexture" in v) (v as THREE.Texture).dispose();
          mt.dispose();
        }
      });
      scene.environment?.dispose();
      pmrem.dispose();
      room.dispose?.();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
