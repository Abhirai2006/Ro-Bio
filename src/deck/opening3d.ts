// The opening scene of the Robo Spark deck: a white cobot builds a small robot from three parts,
// the robot powers on and waves. three.js, studio lighting with reflections, soft shadows.
// Every pose is a pure function of time, so a slow laptop can drop frames but can never skip a step.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const COL = {
  ink: 0x1e1a3c,
  violet: 0x6f5dff,
  lilac: 0xb7abff,
  pink: 0xff5cb8,
  yellow: 0xffe066,
  paper: 0xf8f4f0,
};

/** Total length of the build, in seconds. After it the robot keeps idling: blinking, looking around. */
export const OPENING_SECONDS = 19;

type Opts = { onDone?: () => void };

/* ---------- arm geometry (metres, roughly a UR5e scaled down) ---------- */
const BASE_H = 0.09; // top of the base column
const SHOULDER_H = 0.075; // shoulder pivot above the yaw turret
const L1 = 0.34; // upper arm
const L2 = 0.3; // forearm
const TOOL = 0.165; // wrist pivot to the middle of the finger pads
const R_WHEEL = 0.03; // the small robot's wheel radius
const G = 9.81; // m/s²

type Pose = { yaw: number; a1: number; a2: number; a3: number; roll: number; grip: number };
/** How far the parts are turned, so the finished robot faces the camera. */
const PART_YAW = 0.35;

/** Inverse kinematics with the tool pointing straight down. `grip` is the finger opening in metres. */
function solve(p: THREE.Vector3, grip: number): Pose {
  const yaw = Math.atan2(p.x, p.z);
  const r = Math.hypot(p.x, p.z);
  const wy = p.y + TOOL - (BASE_H + SHOULDER_H); // wrist pivot, relative to the shoulder
  const wz = r;
  const d = Math.min(L1 + L2 - 1e-4, Math.hypot(wy, wz));
  const c = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const a2 = Math.acos(Math.max(-1, Math.min(1, c)));
  const phi = Math.atan2(wz, wy);
  const a1 = phi - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
  const a3 = Math.PI - a1 - a2;
  // Fingers close across the parts' depth (their local z), so they never hit the wheels.
  return { yaw, a1, a2, a3, roll: yaw - PART_YAW - Math.PI / 2, grip };
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (10 - 15 * t + 6 * t * t)); // minimum jerk
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  yaw: lerp(a.yaw, b.yaw, k),
  a1: lerp(a.a1, b.a1, k),
  a2: lerp(a.a2, b.a2, k),
  a3: lerp(a.a3, b.a3, k),
  roll: lerp(a.roll, b.roll, k),
  grip: lerp(a.grip, b.grip, k),
});

/* ---------- small helpers for good-looking parts ---------- */
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const shadowed = <T extends THREE.Mesh>(m: T) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export function mountOpening(host: HTMLElement, opts: Opts = {}) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    host.classList.add("rsd-no3d"); // the slide shows its 2D fallback
    opts.onDone?.();
    return () => {};
  }
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "rsd-3d";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120f26);
  scene.fog = new THREE.Fog(0x120f26, 2.4, 5.2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  const cam = new THREE.PerspectiveCamera(30, 1920 / 1080, 0.02, 20);

  // Lighting: a soft key from above front, a violet rim from behind, a pink kicker, and a pool of light on the bench.
  // The lamps follow the inverse-square law (decay 2, no cut-off), as real light does: half the distance, four times
  // the light. Intensities are in candela, set so the bench is as bright as it was. The rim is a distant source.
  scene.add(new THREE.HemisphereLight(0xdcd8ff, 0x1e1a3c, 0.28));
  const key = new THREE.SpotLight(0xfff4ea, 48, 0, Math.PI / 5.5, 0.6, 2);
  key.position.set(0.6, 2.1, 1.3);
  key.target.position.set(0, 0.1, 0.05);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.015;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8f7bff, 2.4);
  rim.position.set(-1.2, 1.2, -1.6);
  scene.add(rim);
  const kick = new THREE.PointLight(COL.pink, 1.3, 0, 2);
  kick.position.set(-0.8, 0.9, 0.5);
  scene.add(kick);

  // Materials
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xeef0f6,
    roughness: 0.26,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
  });
  const cap = new THREE.MeshPhysicalMaterial({
    color: COL.violet,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.5,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x1b1a22,
    roughness: 0.55,
    metalness: 0.3,
  });
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bcc8, roughness: 0.32, metalness: 0.9 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.95 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: COL.lilac,
    emissive: COL.violet,
    emissiveIntensity: 2.2,
  });
  const cable = new THREE.MeshStandardMaterial({ color: 0x23222c, roughness: 0.6, metalness: 0.1 });

  /* ---------- the bench ---------- */
  const matTex = canvasTexture(1024, 1024, (g) => {
    g.fillStyle = "#1a1733";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i <= 32; i++) {
      g.strokeStyle = i % 8 ? "rgba(183,171,255,0.07)" : "rgba(183,171,255,0.2)";
      g.lineWidth = i % 8 ? 1.5 : 3;
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32, 1024);
      g.moveTo(0, i * 32);
      g.lineTo(1024, i * 32);
      g.stroke();
    }
  });
  matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping;
  matTex.repeat.set(4, 4);
  const bench = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({
      map: matTex,
      color: 0x9a96b8,
      roughness: 0.85,
      metalness: 0.05,
    }),
  );
  bench.rotation.x = -Math.PI / 2;
  bench.receiveShadow = true;
  scene.add(bench);

  /* ---------- the arm ---------- */
  const arm = new THREE.Group();
  scene.add(arm);
  // base plate with bolts, column with a light ring
  const plate = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.012, 64), black));
  plate.position.y = 0.006;
  arm.add(plate);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bolt = shadowed(
      new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 16), alu),
    );
    bolt.position.set(Math.cos(a) * 0.086, 0.015, Math.sin(a) * 0.086);
    arm.add(bolt);
  }
  const column = shadowed(
    new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, BASE_H - 0.012, 64), shell),
  );
  column.position.y = 0.012 + (BASE_H - 0.012) / 2;
  arm.add(column);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.0028, 12, 80), ledMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = BASE_H - 0.004;
  arm.add(baseRing);

  /** A joint housing: a white drum with violet end caps and a light ring, its axis along x. */
  const housing = (r: number, len: number) => {
    const g = new THREE.Group();
    const drum = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 64), shell));
    drum.rotation.z = Math.PI / 2;
    g.add(drum);
    for (const s of [-1, 1]) {
      const c = shadowed(
        new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, len * 0.16, 64), cap),
      );
      c.rotation.z = Math.PI / 2;
      c.position.x = s * (len / 2 + len * 0.06);
      g.add(c);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.0022, 10, 64), ledMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = s * (len / 2 + len * 0.14 + 0.0005);
      g.add(ring);
    }
    return g;
  };
  /** A tapered tube from y = 0 to y = len. */
  const tube = (r0: number, r1: number, len: number) => {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 48), shell));
    m.position.y = len / 2;
    return m;
  };
  /** A cable running beside a link, gently bowed. */
  const cableAlong = (len: number, side: number, depth: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side, 0.02, depth),
      new THREE.Vector3(side * 1.25, len * 0.5, depth * 1.4),
      new THREE.Vector3(side, len - 0.02, depth),
    ]);
    return shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0045, 10), cable));
  };

  const yawG = new THREE.Group();
  yawG.position.y = BASE_H;
  arm.add(yawG);
  const turret = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.06, 0.05, 64), shell));
  turret.position.y = 0.025;
  yawG.add(turret);
  const shoulderG = new THREE.Group();
  shoulderG.position.y = SHOULDER_H;
  yawG.add(shoulderG);
  const shH = housing(0.05, 0.11);
  shH.position.y = SHOULDER_H;
  yawG.add(shH);
  shoulderG.add(tube(0.034, 0.03, L1));
  shoulderG.add(cableAlong(L1, 0.042, -0.012));
  const elbowG = new THREE.Group();
  elbowG.position.y = L1;
  shoulderG.add(elbowG);
  elbowG.add(housing(0.042, 0.095));
  elbowG.add(tube(0.027, 0.023, L2));
  elbowG.add(cableAlong(L2, -0.034, -0.01));
  const elbowLed = new THREE.Mesh(
    new RoundedBoxGeometry(0.006, L2 * 0.55, 0.012, 2, 0.002),
    ledMat,
  );
  elbowLed.position.set(0.024, L2 * 0.5, 0);
  elbowG.add(elbowLed);
  const wristG = new THREE.Group();
  wristG.position.y = L2;
  elbowG.add(wristG);
  wristG.add(housing(0.032, 0.075));
  const w2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 48), shell));
  w2.position.y = 0.04;
  wristG.add(w2);
  const w2cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.012, 48), cap));
  w2cap.position.y = 0.072;
  wristG.add(w2cap);
  const rollG = new THREE.Group(); // wrist 3: turns the gripper about the tool axis
  rollG.position.y = 0.078;
  wristG.add(rollG);
  const flange = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 40), alu));
  flange.position.y = 0.005;
  rollG.add(flange);
  // Gripper: a black body, two aluminium fingers with rubber pads.
  const gBody = shadowed(
    new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.045, 0.04, 3, 0.008), black),
  );
  gBody.position.y = 0.032;
  rollG.add(gBody);
  const gLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.0405), ledMat);
  gLed.position.y = 0.042;
  rollG.add(gLed);
  const finger = () => {
    const f = new THREE.Group();
    const bar = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.06, 0.026, 2, 0.003), alu));
    bar.position.y = 0.03;
    f.add(bar);
    const padM = shadowed(
      new THREE.Mesh(new RoundedBoxGeometry(0.006, 0.032, 0.024, 2, 0.002), rubber),
    );
    padM.position.set(0, 0.045, 0);
    f.add(padM);
    return f;
  };
  const fA = finger(),
    fB = finger();
  fA.position.y = fB.position.y = 0.05;
  rollG.add(fA, fB);
  const gripPt = new THREE.Object3D(); // the point between the pads
  gripPt.position.y = TOOL - 0.078;
  rollG.add(gripPt);

  const applyPose = (p: Pose) => {
    yawG.rotation.y = p.yaw;
    shoulderG.rotation.x = p.a1;
    elbowG.rotation.x = p.a2;
    wristG.rotation.x = p.a3;
    rollG.rotation.y = p.roll;
    const half = Math.max(0.006, p.grip / 2);
    const pad = 0.006 / 2 + 0.003;
    fA.position.x = half + pad;
    fB.position.x = -half - pad;
  };

  /* ---------- the little robot, in three parts ---------- */
  const violetPlastic = new THREE.MeshPhysicalMaterial({
    color: COL.violet,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const inkPlastic = new THREE.MeshPhysicalMaterial({
    color: 0x24204a,
    roughness: 0.4,
    clearcoat: 0.4,
  });
  // wheel base: a violet chassis with two black tyres and violet hubs
  const baseP = new THREE.Group();
  const chassis = shadowed(
    new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.032, 0.085, 3, 0.008), violetPlastic),
  );
  chassis.position.y = 0.036;
  baseP.add(chassis);
  const wheels: THREE.Group[] = [];
  const boltMat = new THREE.MeshStandardMaterial({
    color: COL.yellow,
    roughness: 0.35,
    metalness: 0.6,
  });
  for (const s of [-1, 1]) {
    const wheel = new THREE.Group(); // turns about its axle (local x)
    wheel.position.set(s * 0.066, R_WHEEL, 0);
    baseP.add(wheel);
    wheels.push(wheel);
    const tyre = shadowed(
      new THREE.Mesh(new THREE.CylinderGeometry(R_WHEEL, R_WHEEL, 0.022, 40), rubber),
    );
    tyre.rotation.z = Math.PI / 2;
    wheel.add(tyre);
    const hub = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.024, 24), cap));
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.026, 10), boltMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, Math.cos(a) * 0.008, Math.sin(a) * 0.008);
      wheel.add(bolt);
    }
  }
  const BASE_TOP = 0.052;
  // body: white shell with a violet chest panel, a status light and two small arms
  const bodyP = new THREE.Group();
  const torso = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.07, 0.07, 4, 0.012), shell));
  torso.position.y = 0.035;
  bodyP.add(torso);
  const chest = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.03, 0.004, 2, 0.002), violetPlastic);
  chest.position.set(0, 0.038, 0.035);
  bodyP.add(chest);
  const chestLight = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: COL.pink,
    emissiveIntensity: 0,
  });
  const chestDot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 24), chestLight);
  chestDot.position.set(0, 0.038, 0.0375);
  bodyP.add(chestDot);
  const armL = new THREE.Group(),
    armR = new THREE.Group();
  for (const [g, s] of [
    [armL, -1],
    [armR, 1],
  ] as const) {
    g.position.set(s * 0.05, 0.055, 0);
    const limb = shadowed(
      new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.05, 0.016, 2, 0.006), inkPlastic),
    );
    limb.position.y = -0.022;
    g.add(limb);
    const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.01, 20, 14), violetPlastic));
    hand.position.y = -0.05;
    g.add(hand);
    g.rotation.z = s * 0.15;
    bodyP.add(g);
  }
  const BODY_H = 0.07;
  // head: dark screen face with eyes, an antenna with a pink light
  const headP = new THREE.Group();
  const skull = shadowed(
    new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.06, 0.065, 4, 0.014), shell),
  );
  skull.position.y = 0.03;
  headP.add(skull);
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 256;
  faceCanvas.height = 160;
  const faceG = faceCanvas.getContext("2d")!;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const drawFace = (on: number, blink: boolean, smile: number) => {
    faceG.fillStyle = "#0d0b1f";
    faceG.fillRect(0, 0, 256, 160);
    if (on > 0) {
      faceG.globalAlpha = on;
      faceG.fillStyle = "#b7abff";
      faceG.shadowColor = "#6f5dff";
      faceG.shadowBlur = 18;
      const eyeH = blink ? 6 : 38;
      faceG.fillRect(62, 70 - eyeH / 2, 34, eyeH);
      faceG.fillRect(160, 70 - eyeH / 2, 34, eyeH);
      if (smile > 0) {
        faceG.strokeStyle = "#ff5cb8";
        faceG.lineWidth = 8;
        faceG.beginPath();
        faceG.arc(128, 104, 30, 0.2 * Math.PI, (0.2 + 0.6 * smile) * Math.PI);
        faceG.stroke();
      }
      faceG.shadowBlur = 0;
      faceG.globalAlpha = 1;
    }
    faceTex.needsUpdate = true;
  };
  drawFace(0, false, 0);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.066, 0.042),
    new THREE.MeshStandardMaterial({
      map: faceTex,
      emissiveMap: faceTex,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0,
    }),
  );
  screen.position.set(0, 0.031, 0.0327);
  headP.add(screen);
  const stalk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 12), alu));
  stalk.position.y = 0.074;
  headP.add(stalk);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x552244,
    emissive: COL.pink,
    emissiveIntensity: 0,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 14), bulbMat);
  bulb.position.y = 0.092;
  headP.add(bulb);
  const bulbLight = new THREE.PointLight(COL.pink, 0, 0, 2);
  bulbLight.position.y = 0.092;
  headP.add(bulbLight);
  scene.add(baseP, bodyP, headP);

  /* ---------- where things are ---------- */
  // The assembly pad sits in front of the arm, the parts tray to its right.
  const PAD = new THREE.Vector3(-0.2, 0, 0.3);
  const pad = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.018, 72), black));
  pad.position.set(PAD.x, 0.009, PAD.z);
  scene.add(pad);
  const padRingMat = new THREE.MeshStandardMaterial({
    color: COL.lilac,
    emissive: COL.violet,
    emissiveIntensity: 1.5,
  });
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.004, 12, 96), padRingMat);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.set(PAD.x, 0.019, PAD.z);
  scene.add(padRing);
  const PAD_TOP = 0.018;

  const tray = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.014, 0.46, 3, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x2c2852, roughness: 0.5, metalness: 0.3 }),
    ),
  );
  const TRAY = new THREE.Vector3(0.34, 0.007, 0.06);
  tray.position.copy(TRAY);
  scene.add(tray);
  const TRAY_TOP = 0.014;
  const slots = [
    new THREE.Vector3(TRAY.x, TRAY_TOP, TRAY.z + 0.15),
    new THREE.Vector3(TRAY.x, TRAY_TOP, TRAY.z),
    new THREE.Vector3(TRAY.x, TRAY_TOP, TRAY.z - 0.15),
  ];

  // Each part: where it waits, where it ends up, where the gripper holds it, and how wide it is there.
  const parts = [
    {
      obj: baseP,
      from: slots[0]!,
      to: new THREE.Vector3(PAD.x, PAD_TOP, PAD.z),
      hold: 0.036,
      width: 0.085,
    },
    {
      obj: bodyP,
      from: slots[1]!,
      to: new THREE.Vector3(PAD.x, PAD_TOP + BASE_TOP, PAD.z),
      hold: 0.05,
      width: 0.07,
    },
    {
      obj: headP,
      from: slots[2]!,
      to: new THREE.Vector3(PAD.x, PAD_TOP + BASE_TOP + BODY_H, PAD.z),
      hold: 0.04,
      width: 0.065,
    },
  ];
  const partYaw = PART_YAW;

  /* ---------- the timeline ---------- */
  type Seg = {
    t0: number;
    t1: number;
    kind: "joint" | "line";
    a: Pose;
    b: Pose;
    pa?: THREE.Vector3;
    pb?: THREE.Vector3;
    gripA?: number;
    gripB?: number;
  };
  const segs: Seg[] = [];
  const HOME: Pose = { ...solve(new THREE.Vector3(0.12, 0.3, 0.16), 0.1), a3: 0.9 };
  let t = 2.2; // camera intro first
  let cur = HOME;
  const OPEN = 0.1;
  // Real motor limits, those of a small cobot (UR3e class): base, shoulder and elbow at most 180°/s, the wrist
  // joints 360°/s, and the tool at most 0.5 m/s near the parts. A minimum-jerk move through Δ in time T peaks
  // at 1.875 Δ / T, so no move is ever shorter than 1.875 Δ / limit.
  const W_BIG = Math.PI;
  const W_WRIST = 2 * Math.PI;
  const V_TOOL = 0.5;
  const PEAK = 1.875;
  const need = (a: Pose, b: Pose) =>
    PEAK *
    Math.max(
      Math.abs(b.yaw - a.yaw) / W_BIG,
      Math.abs(b.a1 - a.a1) / W_BIG,
      Math.abs(b.a2 - a.a2) / W_BIG,
      Math.abs(b.a3 - a.a3) / W_WRIST,
      Math.abs(b.roll - a.roll) / W_WRIST,
    );
  const joint = (b: Pose, want: number) => {
    const dur = Math.max(want, need(cur, b));
    segs.push({ t0: t, t1: t + dur, kind: "joint", a: cur, b });
    t += dur;
    cur = b;
  };
  const line = (pa: THREE.Vector3, pb: THREE.Vector3, g0: number, g1: number, want: number) => {
    const dur = Math.max(want, need(cur, solve(pb, g1)), (PEAK * pa.distanceTo(pb)) / V_TOOL);
    segs.push({
      t0: t,
      t1: t + dur,
      kind: "line",
      a: cur,
      b: solve(pb, g1),
      pa,
      pb,
      gripA: g0,
      gripB: g1,
    });
    t += dur;
    cur = solve(pb, g1);
  };
  const hold = (dur: number) => joint(cur, dur);
  const events: { pick: number; place: number }[] = [];
  for (const p of parts) {
    const grabAt = p.from.clone().setY(p.from.y + p.hold);
    const dropAt = p.to.clone().setY(p.to.y + p.hold);
    const up = 0.12;
    joint(solve(grabAt.clone().setY(grabAt.y + up), OPEN), 1.0);
    line(grabAt.clone().setY(grabAt.y + up), grabAt, OPEN, OPEN, 0.55);
    line(grabAt, grabAt, OPEN, p.width - 0.004, 0.3); // close the fingers
    const pick = t;
    line(grabAt, grabAt.clone().setY(grabAt.y + up + 0.05), p.width - 0.004, p.width - 0.004, 0.5);
    joint(solve(dropAt.clone().setY(dropAt.y + up), p.width - 0.004), 1.05);
    line(dropAt.clone().setY(dropAt.y + up), dropAt, p.width - 0.004, p.width - 0.004, 0.55);
    const place = t;
    line(dropAt, dropAt, p.width - 0.004, OPEN, 0.25);
    line(dropAt, dropAt.clone().setY(dropAt.y + up), OPEN, OPEN, 0.4);
    events.push({ pick, place });
  }
  joint(HOME, 1.1);
  const BUILT = t; // the robot is complete
  hold(30);

  // After power-on the robot drives forward and coasts to a stop: its motors push at 0.25 m/s² for 0.4 s,
  // then rolling resistance of rubber on the mat (Crr 0.05) slows it at Crr g. It rolls without slipping,
  // so its wheels turn through distance / radius.
  const ROLL_AT = BUILT + 0.9;
  const A_PUSH = 0.25;
  const T_PUSH = 0.4;
  const A_STOP = 0.05 * G;
  const V_TOP = A_PUSH * T_PUSH;
  const T_STOP = V_TOP / A_STOP;
  const rolled = (tm: number) => {
    const s = tm - ROLL_AT;
    if (s <= 0) return 0;
    if (s < T_PUSH) return 0.5 * A_PUSH * s * s;
    const c = Math.min(s - T_PUSH, T_STOP);
    return 0.5 * A_PUSH * T_PUSH * T_PUSH + V_TOP * c - 0.5 * A_STOP * c * c;
  };
  const FWD = new THREE.Vector3(Math.sin(PART_YAW), 0, Math.cos(PART_YAW));

  const poseAt = (tm: number): Pose => {
    if (tm <= segs[0]!.t0) return HOME;
    const s = segs.find((x) => tm < x.t1) ?? segs[segs.length - 1]!;
    const k = smooth((tm - s.t0) / (s.t1 - s.t0));
    if (s.kind === "line" && s.pa && s.pb)
      return solve(s.pa.clone().lerp(s.pb, k), lerp(s.gripA!, s.gripB!, k));
    return lerpPose(s.a, s.b, k);
  };

  // Where a part is at time tm: waiting on the tray, carried in the fingers, or placed.
  const tmpM = new THREE.Matrix4();
  const partMatrix = (i: number, tm: number, out: THREE.Matrix4) => {
    const p = parts[i]!;
    const ev = events[i]!;
    const restQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), partYaw);
    if (tm < ev.pick) return out.compose(p.from, restQ, new THREE.Vector3(1, 1, 1));
    if (tm >= ev.place) return out.compose(p.to, restQ, new THREE.Vector3(1, 1, 1));
    // carried: follow the gripper exactly, keeping the part's own turn
    applyPose(poseAt(tm));
    arm.updateMatrixWorld(true);
    const g = new THREE.Vector3();
    gripPt.getWorldPosition(g);
    g.y -= p.hold;
    return out.compose(g, restQ, new THREE.Vector3(1, 1, 1));
  };

  /* ---------- sparks when a part clicks into place ---------- */
  // Each spark flies ballistically under g = 9.81 m/s², bounces off the pad or the bench (restitution 0.3,
  // sliding friction keeps 60 % of its sideways speed) and cools from white-yellow to orange as it goes.
  // Seeded, and worked out from the time alone, so any frame can be drawn on its own.
  const N_SPARK = 44;
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const sparkSets = parts.map((_, i) => {
    const r = seeded(17 + i * 101);
    return Array.from({ length: N_SPARK }, () => {
      const a = r() * 2 * Math.PI;
      const sp = 0.35 + r() * 0.35; // m/s outward
      return {
        vx: Math.cos(a) * sp,
        vy: 0.2 + r() * 0.9,
        vz: Math.sin(a) * sp,
        life: 0.45 + r() * 0.4,
      };
    });
  });
  const sparkGeo = new THREE.BoxGeometry(0.004, 0.004, 0.004);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, parts.length * N_SPARK);
  sparkMesh.frustumCulled = false;
  scene.add(sparkMesh);
  const hot = new THREE.Color(0xfff2b0);
  const cool = new THREE.Color(0xff6a1a);
  const sCol = new THREE.Color();
  const sPos = new THREE.Vector3();
  const sQ = new THREE.Quaternion();
  const sScale = new THREE.Vector3();
  const floorAt = (x: number, z: number) =>
    Math.hypot(x - PAD.x, z - PAD.z) < 0.115 ? PAD_TOP : 0;
  const fly = (
    o: THREE.Vector3,
    v: { vx: number; vy: number; vz: number },
    age: number,
    out: THREE.Vector3,
  ) => {
    let { x, y, z } = o;
    let { vx, vy, vz } = v;
    let left = age;
    for (let b = 0; b < 4; b++) {
      const floor = floorAt(x, z);
      const hit = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * (y - floor)))) / G; // when y reaches the floor
      if (hit >= left) {
        return out.set(x + vx * left, y + vy * left - 0.5 * G * left * left, z + vz * left);
      }
      x += vx * hit;
      z += vz * hit;
      y = floor;
      vy = -(vy - G * hit) * 0.3;
      vx *= 0.6;
      vz *= 0.6;
      left -= hit;
    }
    return out.set(x, y, z);
  };
  const drawSparks = (tm: number) => {
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      const o = parts[i]!.to.clone().setY(parts[i]!.to.y + 0.004);
      const age = tm - events[i]!.place;
      for (const sp of sparkSets[i]!) {
        const k = age / sp.life;
        if (k < 0 || k >= 1) sScale.setScalar(0);
        else {
          fly(o, sp, age, sPos);
          sScale.setScalar(1 - k * 0.7);
          sCol.copy(hot).lerp(cool, k);
          sparkMesh.setColorAt(n, sCol);
        }
        tmpM.compose(sPos, sQ, sScale);
        sparkMesh.setMatrixAt(n++, tmpM);
      }
    }
    sparkMesh.instanceMatrix.needsUpdate = true;
    if (sparkMesh.instanceColor) sparkMesh.instanceColor.needsUpdate = true;
  };
  sparkMesh.setColorAt(0, hot); // makes the colour buffer

  /* ---------- camera path ---------- */
  const look = new THREE.Vector3();
  const camAt = (tm: number) => {
    // a slow crane-in, a drift around the cell while it builds, then a push-in on the finished robot
    const intro = smooth(Math.min(1, tm / 2.6));
    const build = Math.min(1, tm / BUILT);
    const end = smooth(Math.max(0, Math.min(1, (tm - BUILT + 0.6) / 2.2)));
    const ang = lerp(0.95, 0.35, build) + Math.sin(tm * 0.18) * 0.05 - end * 0.25;
    const dist = lerp(2.4, 1.6, intro) - end * 0.7;
    const h = lerp(1.2, 0.82, intro) - end * 0.4;
    const target = new THREE.Vector3(
      lerp(0.05, PAD.x - 0.16, end),
      lerp(0.22, 0.13, end),
      lerp(0.12, PAD.z + 0.02, end),
    );
    cam.position.set(target.x + Math.sin(ang) * dist, h, target.z + Math.cos(ang) * dist);
    look.copy(target);
    cam.lookAt(look);
  };

  /* ---------- run ---------- */
  let raf = 0;
  let t0 = performance.now();
  let doneFired = false;
  let slowFrames = 0;
  let scale = 1;
  const forced = () => (window as unknown as { __openingT?: number }).__openingT; // lets a test freeze the scene
  const frame = (now: number) => {
    const tm = forced() ?? (now - t0) / 1000;
    const pose = poseAt(tm);
    const d = rolled(tm);
    for (let i = 0; i < parts.length; i++) {
      partMatrix(i, tm, tmpM);
      tmpM.decompose(parts[i]!.obj.position, parts[i]!.obj.quaternion, parts[i]!.obj.scale);
      if (d > 0) parts[i]!.obj.position.addScaledVector(FWD, d);
    }
    for (const w of wheels) w.rotation.x = d / R_WHEEL;
    applyPose(pose);

    // power on: chest light, antenna, eyes, smile; a little roll forward, then a wave
    const on = smooth((tm - BUILT - 0.2) / 0.8);
    chestLight.emissiveIntensity = on * 3;
    bulbMat.emissiveIntensity = on * (2 + Math.sin(tm * 6) * 1.2);
    bulbLight.intensity = on * 0.05; // a small LED, about 0.05 cd
    const blink = on > 0.9 && Math.sin(tm * 1.7) > 0.985;
    drawFace(on, blink, smooth((tm - BUILT - 1.0) / 0.6));
    padRingMat.emissiveIntensity = 1.5 + 3 * Math.max(0, 1 - Math.abs(tm - BUILT - 0.3) * 2);
    const wave =
      Math.max(0, Math.min(1, (tm - BUILT - 1.2) / 0.4)) *
      (tm < BUILT + 4.8 ? 1 : Math.max(0, 1 - (tm - BUILT - 4.8) / 0.5));
    armR.rotation.z = 0.15 + wave * (2.4 + Math.sin(tm * 9) * 0.35);
    armR.rotation.x = -wave * 0.3;
    const look2 = tm > BUILT + 1 ? Math.sin((tm - BUILT) * 0.8) * 0.35 : 0;
    headP.rotation.y = partYaw + look2;

    drawSparks(tm);

    camAt(tm);
    renderer.render(scene, cam);
    if (!doneFired && tm >= BUILT + 1.6) {
      doneFired = true;
      opts.onDone?.();
    }
  };

  // A slow laptop gets a lighter render instead of a stutter: fewer pixels, then no soft shadows.
  let last = performance.now();
  const watch = (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > 45) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 20 && scale > 0.6) {
      scale -= 0.2;
      renderer.setSize(Math.round(1920 * scale), Math.round(1080 * scale), false);
      if (scale < 0.7) renderer.shadowMap.type = THREE.BasicShadowMap;
      slowFrames = 0;
    }
  };
  const loop = (now: number) => {
    watch(now);
    frame(now);
    raf = requestAnimationFrame(loop);
  };
  t0 = performance.now();
  raf = requestAnimationFrame(loop);
  const restart = () => {
    t0 = performance.now();
    doneFired = false;
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    sparkGeo.dispose();
    renderer.dispose();
    pmrem.dispose();
    envTex.dispose();
    canvas.remove();
  };
  return Object.assign(stop, { restart });
}
