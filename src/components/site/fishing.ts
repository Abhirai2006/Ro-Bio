// The robot fisherman on the Shark Tank page. He sits on the top edge of the banner with a real fishing rod,
// and a bundle of rupee notes hangs on the line as bait. The line is a rope that swings with gravity; the rod
// bends as the line pulls. The visitor moves the bait with the mouse or a finger. When the shark catches it,
// the bundle bursts into notes that flutter down, and he lowers a fresh one.
// Models: "Lonely Robot" by groone and "Fishing Rod, Rigged and Animated" by Ergin ERYILDIR (both CC BY 4.0),
// made smaller for the web, the robot painted in the club's colours; the notes are "Indian 2000 rupees notes"
// by varun pal (CC BY 4.0).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** The sitting pose, as turns (radians) added to the robot's rest pose, found by trying it out. */
const SIT: Record<string, [number, number, number]> = {
  thighL: [-1.5, 0, 0],
  thighR: [-1.5, 0, 0],
  shinL: [-1.6, 0, 0],
  shinR: [-1.6, 0, 0],
  upper_armL: [1.2, 0, -0.35],
  upper_armR: [1.2, 0, 0.35],
  forearmL: [0.9, 0, 0],
  forearmR: [0.9, 0, 0],
};

/** The robot's paint, by the model's material names: the club's violet, blue and ink. */
const PAINT: Record<string, { color: number; metalness: number; roughness: number }> = {
  Base_Color: { color: 0x725dff, metalness: 0.35, roughness: 0.35 },
  Joints: { color: 0x6294ff, metalness: 0.6, roughness: 0.3 },
  Mouth_Color: { color: 0x201e2d, metalness: 0.2, roughness: 0.4 },
};

const ROPE_POINTS = 26;
/** The bundle's size on screen, in pixels. */
const NOTE_W = 120;

type Note = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  phase: number;
  age: number;
};

export type Env = {
  /** World units per screen pixel, and the window height in pixels. */
  k: number;
  vh: number;
  toWorld: (x: number, y: number) => THREE.Vector2;
  /** Where the visitor is pointing, in world units, or null before they have pointed at all. */
  pointer: THREE.Vector2 | null;
  /** True once the shark is out and the visitor may move the bait. */
  free: boolean;
  /** Where the bait hangs before that: the hole in the banner. */
  rest: THREE.Vector2;
  lite: boolean;
};

export type Fishing = {
  /** Where the bait is now, or null while a new bundle is not on the line yet. */
  bait: () => THREE.Vector3 | null;
  /** How long the bait has been held still, in seconds. */
  stillFor: () => number;
  /** The shark got it: the bundle bursts and a new one is lowered a little later. */
  catchBait: () => void;
  /** A tug on the line when the shark snaps and misses. */
  tug: () => void;
  /** The shark's first bite: a tug, two notes torn off, and a smaller bundle. */
  nibble: () => void;
  update: (dt: number, env: Env) => void;
  setVisible: (on: boolean) => void;
  dispose: () => void;
};

export async function createFishing(
  scene: THREE.Scene,
  opts: { robotUrl: string; rodUrl: string; notesUrl: string; banner: HTMLElement },
): Promise<Fishing> {
  const loader = new GLTFLoader();
  const [robotGltf, rodGltf, notesGltf] = await Promise.all([
    loader.loadAsync(opts.robotUrl),
    loader.loadAsync(opts.rodUrl),
    loader.loadAsync(opts.notesUrl),
  ]);
  const root = new THREE.Group();
  scene.add(root);

  // ---- the fisherman, posed sitting with the rod in his hands ----
  const fisher = new THREE.Group();
  root.add(fisher);
  const robot = robotGltf.scene;
  robot.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // the model was made smaller without its normals: work out crisp ones, with hard edges kept hard
    m.geometry = toCreasedNormals(m.geometry, Math.PI / 5);
    m.frustumCulled = false;
    for (const mt of Array.isArray(m.material) ? m.material : [m.material]) {
      const paint = PAINT[mt.name];
      const std = mt as THREE.MeshStandardMaterial;
      if (paint && std.color) {
        std.color.setHex(paint.color);
        std.metalness = paint.metalness;
        std.roughness = paint.roughness;
      }
    }
  });
  const bones: Record<string, THREE.Bone> = {};
  robot.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name.replace(/_metarig$/, "")] = o as THREE.Bone;
  });
  for (const [name, [x, y, z]] of Object.entries(SIT)) {
    const b = bones[name];
    if (b) {
      b.rotation.x += x;
      b.rotation.y += y;
      b.rotation.z += z;
    }
  }
  fisher.add(robot);
  fisher.updateMatrixWorld(true);
  const at = (n: string) => bones[n]?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
  const tall = Math.max(0.01, at("spine004").y - at("footL").y);
  const hip = at("thighL").add(at("thighR")).multiplyScalar(0.5);
  const grip = at("handL").add(at("handR")).multiplyScalar(0.5);
  const head = bones["spine004"];
  const headRestY = head ? head.rotation.y : 0;

  const rod = rodGltf.scene;
  const rodScale = (tall * 1.6) / 7.68;
  rod.scale.setScalar(rodScale);
  const pitch = 0.18;
  const rodDir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(-1, 0, 0), rodDir);
  rod.position
    .copy(grip)
    .sub(new THREE.Vector3(0.9 * rodScale, 0, 0).applyQuaternion(rod.quaternion));
  fisher.add(rod);
  const rodBones: THREE.Bone[] = [];
  let tipBone: THREE.Object3D | null = null;
  rod.traverse((o) => {
    if ((o as THREE.Bone).isBone && /^Bone0/.test(o.name)) rodBones.push(o as THREE.Bone);
    if (/Bone010/.test(o.name)) tipBone = o;
  });
  rodBones.sort((a, b) => a.name.localeCompare(b.name));
  const rodRest = rodBones.map((b) => b.rotation.z);

  // ---- the line ----
  const pts = Array.from({ length: ROPE_POINTS }, () => new THREE.Vector3());
  const prev = pts.map((p) => p.clone());
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x9aa0b8, transparent: true, opacity: 0.9 }),
  );
  line.frustumCulled = false;
  root.add(line);
  let ropeLen = 0;
  let started = false;

  // ---- the bait: a real bundle of notes, standing up to face you, on a clip ----
  const notesModel = notesGltf.scene;
  const nb = new THREE.Box3().setFromObject(notesModel);
  const ns = nb.getSize(new THREE.Vector3());
  notesModel.position.sub(nb.getCenter(new THREE.Vector3()));
  const noteScale = NOTE_W / Math.max(ns.x, 0.001);
  const noteH = ns.z * noteScale;
  const stand = new THREE.Group();
  stand.add(notesModel);
  stand.scale.setScalar(noteScale);
  stand.rotation.x = Math.PI / 2; // its printed face turned towards you
  const bundle = new THREE.Group();
  bundle.add(stand);
  const clip = new THREE.Mesh(
    new THREE.TorusGeometry(4, 1.1, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 1, roughness: 0.25 }),
  );
  clip.position.y = noteH / 2 + 3.5;
  bundle.add(clip);
  root.add(bundle);
  let noteMesh: THREE.Mesh | null = null;
  notesModel.traverse((o) => {
    if (!noteMesh && (o as THREE.Mesh).isMesh) noteMesh = o as THREE.Mesh;
  });
  // A loose note is that same printed shape, sized from its own measurements (the model's nodes are scaled),
  // and made paper thin along its thinnest side.
  const loose = new THREE.Vector3(1, 1, 1);
  if (noteMesh) {
    const g = (noteMesh as THREE.Mesh).geometry;
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 1e-6);
    loose.setScalar(NOTE_W / longest);
    const thin = size.x <= size.y && size.x <= size.z ? "x" : size.y <= size.z ? "y" : "z";
    loose[thin] *= 0.05;
  }
  let baitOn = true;
  let respawnAt = 0;

  let stillSince = performance.now();
  const lastTarget = new THREE.Vector2(1e9, 1e9);
  const notes: Note[] = [];
  let jerk = 0;

  /** Throws `count` loose notes from the bait: the same printed note, as thin as paper. */
  const spray = (count: number) => {
    const from = pts[ROPE_POINTS - 1]!.clone();
    const src = noteMesh as THREE.Mesh | null;
    for (let i = 0; src && i < count; i++) {
      const mat = (src.material as THREE.MeshStandardMaterial).clone();
      mat.transparent = true;
      mat.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(src.geometry, mat);
      mesh.position.copy(from);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      root.add(mesh);
      const a = Math.random() * Math.PI * 2;
      notes.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.6 + 0.9, Math.random() * 0.8 + 0.2),
        spin: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).multiplyScalar(9),
        phase: Math.random() * 6,
        age: 0,
      });
    }
  };
  /** First bites the current bundle has taken: each one leaves it a little smaller. */
  let bite = 0;

  return {
    bait: () => (baitOn ? (pts[ROPE_POINTS - 1]?.clone() ?? null) : null),
    stillFor: () => (performance.now() - stillSince) / 1000,
    tug() {
      jerk = Math.max(jerk, 0.6);
    },
    nibble() {
      if (!baitOn) return;
      // the first bite: a tug on the line, a couple of notes torn off, a slightly smaller bundle
      jerk = Math.max(jerk, 0.8);
      bite = Math.min(bite + 1, 3);
      spray(2);
    },
    catchBait() {
      if (!baitOn) return;
      baitOn = false;
      bundle.visible = false;
      jerk = 1;
      respawnAt = performance.now() + 2600;
      spray(16);
    },
    update(dt, env) {
      const k = env.k;
      // sit on the top edge of the banner, over the right side, facing into the page
      const r = opts.banner.getBoundingClientRect();
      const seat = env.toWorld(r.right - r.width * 0.14, r.top);
      fisher.scale.setScalar(((env.lite ? 130 : 200) * k) / tall);
      fisher.rotation.y = -1.15;
      fisher.position.set(0, 0, 0);
      fisher.updateMatrixWorld(true);
      const h = hip.clone().applyMatrix4(fisher.matrixWorld);
      fisher.position.set(seat.x - h.x, seat.y - h.y + 4 * k, 2 - h.z);
      fisher.updateMatrixWorld(true);
      const tip = tipBone
        ? (tipBone as THREE.Object3D).getWorldPosition(new THREE.Vector3())
        : fisher.position.clone();

      // where the bait should go: the hole at first, then wherever the visitor points
      const want = env.free && env.pointer ? env.pointer : env.rest;
      if (want.distanceTo(lastTarget) > 4 * k) stillSince = performance.now();
      lastTarget.copy(want);
      const target = new THREE.Vector3(want.x, want.y, 1.5);

      if (!started) {
        for (let i = 0; i < ROPE_POINTS; i++) {
          pts[i]!.lerpVectors(tip, target, i / (ROPE_POINTS - 1));
          prev[i]!.copy(pts[i]!);
        }
        ropeLen = tip.distanceTo(target);
        started = true;
      }
      const now = performance.now();
      if (!baitOn && now > respawnAt) {
        // a fresh bundle, lowered from the rod tip
        baitOn = true;
        bundle.visible = true;
        bite = 0;
        ropeLen = 40 * k;
        for (let i = 0; i < ROPE_POINTS; i++) {
          pts[i]!.copy(tip).y -= (ropeLen * i) / (ROPE_POINTS - 1);
          prev[i]!.copy(pts[i]!);
        }
      }
      // reel the line in or out so it can reach
      const reach = Math.max(60 * k, tip.distanceTo(target) * 1.06);
      ropeLen += (reach - ropeLen) * Math.min(1, dt * 2.5);
      const seg = ropeLen / (ROPE_POINTS - 1);
      const g = -1800 * k;
      pts[0]!.copy(tip);
      prev[0]!.copy(tip);
      for (let i = 1; i < ROPE_POINTS; i++) {
        const p = pts[i]!,
          q = prev[i]!;
        const vx = (p.x - q.x) * 0.985,
          vy = (p.y - q.y) * 0.985,
          vz = (p.z - q.z) * 0.985;
        q.copy(p);
        p.x += vx;
        p.y += vy + g * dt * dt;
        p.z += vz;
      }
      // the visitor's hand on the bait: a soft pull, so it lags and swings
      if (baitOn) pts[ROPE_POINTS - 1]!.lerp(target, Math.min(1, dt * 7));
      for (let it = 0; it < 14; it++)
        for (let i = 0; i < ROPE_POINTS - 1; i++) {
          const a = pts[i]!,
            b = pts[i + 1]!;
          const d = b.clone().sub(a);
          const len = d.length() || 1e-6;
          const diff = (len - seg) / len;
          if (i === 0) b.addScaledVector(d, -diff);
          else {
            a.addScaledVector(d, diff * 0.5);
            b.addScaledVector(d, -diff * 0.5);
          }
        }
      lineGeo.setFromPoints(pts);

      // the bundle hangs from the end of the line and turns slowly
      const end = pts[ROPE_POINTS - 1]!,
        before = pts[ROPE_POINTS - 2]!;
      bundle.position.copy(end);
      bundle.position.y -= (noteH / 2 + 5) * k;
      bundle.scale.setScalar(k * (1 - bite * 0.12));
      const sway = Math.atan2(end.x - before.x, before.y - end.y);
      bundle.rotation.set(0, (bundle.rotation.y + dt * 0.6) % (Math.PI * 2), -sway * 0.8);

      // the rod bends with the pull on the line, and jerks when the shark bites
      jerk = Math.max(0, jerk - dt * 2.2);
      const pull = THREE.MathUtils.clamp((tip.y - end.y) / (400 * k), 0, 1) * 0.35 + jerk * 0.6;
      rodBones.forEach(
        (b, i) => (b.rotation.z = (rodRest[i] ?? 0) - (pull / rodBones.length) * 1.4),
      );
      // he watches the bait
      if (head) {
        const local = fisher.worldToLocal(end.clone());
        head.rotation.y =
          headRestY + THREE.MathUtils.clamp(Math.atan2(local.x, local.z) * 0.5, -0.7, 0.7);
      }

      // notes from a caught bundle flutter down like paper
      for (const n of notes) {
        n.age += dt;
        n.vel.y -= 1.1 * dt;
        n.vel.multiplyScalar(1 - 1.8 * dt);
        n.mesh.position.x += (n.vel.x * 420 + Math.sin(n.age * 5 + n.phase) * 60) * k * dt;
        n.mesh.position.y += n.vel.y * 420 * k * dt;
        n.mesh.position.z += n.vel.z * 200 * k * dt;
        n.mesh.rotation.x += n.spin.x * dt;
        n.mesh.rotation.y += n.spin.y * dt;
        n.mesh.rotation.z += n.spin.z * dt;
        n.spin.multiplyScalar(1 - 0.6 * dt);
        n.mesh.scale.copy(loose).multiplyScalar(k);
        (n.mesh.material as THREE.MeshStandardMaterial).opacity = THREE.MathUtils.clamp(
          3.6 - n.age,
          0,
          1,
        );
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i]!;
        if (n.age > 3.6 || n.mesh.position.y < (-env.vh / 2) * k * 1.3) {
          (n.mesh.material as THREE.Material).dispose();
          n.mesh.removeFromParent();
          notes.splice(i, 1);
        }
      }
    },
    setVisible(on) {
      root.visible = on;
    },
    dispose() {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.geometry) return;
        m.geometry.dispose();
        for (const mt of Array.isArray(m.material) ? m.material : [m.material]) mt?.dispose();
      });
      root.removeFromParent();
    },
  };
}
