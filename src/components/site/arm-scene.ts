// Draws the pick-and-place arm in 3D with three.js. All the movement comes from ArmSim in src/lib/arm-sim.ts;
// this file only builds the models and copies the simulation's state onto them every frame.
// It is loaded on demand by RobotArm, so three.js never slows down the first paint of the page.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ARM, SAMPLE, TABLE, TRAY, inTray, type ArmSim, type Kind } from "@/lib/arm-sim";

const C = { ink: 0x201e2d, paper: 0xfffffa, lens: 0x6294ff, lilac: 0xa979fa, violet: 0x725dff };

export type Hit = { kind?: Kind | undefined; point?: { x: number; z: number } | undefined };
export type ArmScene = {
  hit: (clientX: number, clientY: number) => Hit;
  hover: (kind: Kind | null) => void;
  dispose: () => void;
};

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A cylinder lying along the x axis: the housing of a joint that pitches. */
function joint(r: number, len: number, shell: THREE.Material, cap: THREE.Material, led: THREE.Material) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 40), shell);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (const side of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.012, 40), cap);
    c.rotation.z = Math.PI / 2;
    c.position.x = side * (len / 2 + 0.004);
    g.add(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.0022, 8, 40), led);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * (len / 2 + 0.0105);
    g.add(ring);
  }
  return g;
}

/** A tapered link from z = 0 to z = len. */
function link(r0: number, r1: number, len: number, shell: THREE.Material, band: THREE.Material) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 36), shell);
  body.rotation.x = Math.PI / 2;
  body.position.z = len / 2;
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry((r0 + r1) / 2 + 0.0012, (r0 + r1) / 2 + 0.0012, 0.018, 36), band);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = len * 0.55;
  g.add(stripe);
  return g;
}

export function createArmScene(host: HTMLElement, sim: ArmSim, onFrame: () => void): ArmScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ink);
  scene.fog = new THREE.Fog(C.ink, 1.5, 2.7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(33, 1, 0.01, 10);
  camera.position.set(-0.24, 0.84, 1.3);
  const lookAt = new THREE.Vector3(0.03, 0.16, 0.06);
  camera.lookAt(lookAt);

  scene.add(new THREE.HemisphereLight(0xd8dcff, C.ink, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-0.45, 1.1, 0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7, near: 0.2, far: 2.6 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8f7bff, 1.4);
  rim.position.set(0.5, 0.6, -0.9);
  scene.add(rim);

  // Materials
  const shell = new THREE.MeshStandardMaterial({ color: 0xf1f0f8, roughness: 0.34, metalness: 0.04 });
  const cap = new THREE.MeshStandardMaterial({ color: C.violet, roughness: 0.42, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2a3c, roughness: 0.5, metalness: 0.55 });
  const led = new THREE.MeshStandardMaterial({ color: C.lens, emissive: C.lens, emissiveIntensity: 1.8 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x15141c, roughness: 0.95 });

  // The bench, with a 5 cm grid like a cutting mat. It runs far back so the fog can fade it out.
  const grid = canvasTexture(512, 512, (g) => {
    g.fillStyle = "#2a2740";
    g.fillRect(0, 0, 512, 512);
    const step = 512 / 10; // one tile is 50 cm, so ten squares of 5 cm
    for (let i = 0; i <= 10; i++) {
      g.strokeStyle = i % 5 ? "rgba(169,121,250,0.13)" : "rgba(169,121,250,0.32)";
      g.lineWidth = i % 5 ? 1.5 : 3;
      g.beginPath();
      g.moveTo(i * step, 0);
      g.lineTo(i * step, 512);
      g.moveTo(0, i * step);
      g.lineTo(512, i * step);
      g.stroke();
    }
  });
  grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
  grid.repeat.set(6, 5);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.82, metalness: 0 }));
  table.rotation.x = -Math.PI / 2;
  table.position.set(0, 0, -0.5);
  table.receiveShadow = true;
  scene.add(table);
  // A low rail around the work cell: samples stop at it instead of rolling out of reach.
  const railMat = new THREE.MeshStandardMaterial({ color: 0x3b3656, roughness: 0.5, metalness: 0.2 });
  const railGlow = new THREE.MeshStandardMaterial({ color: C.lilac, emissive: C.lilac, emissiveIntensity: 0.35, roughness: 0.6 });
  const cw = TABLE.maxX - TABLE.minX, cd = TABLE.maxZ - TABLE.minZ, cx = (TABLE.minX + TABLE.maxX) / 2, cz = (TABLE.minZ + TABLE.maxZ) / 2;
  for (const [w, d, x, z] of [
    [cw + 0.016, 0.008, cx, TABLE.maxZ + 0.004],
    [cw + 0.016, 0.008, cx, TABLE.minZ - 0.004],
    [0.008, cd, TABLE.minX - 0.004, cz],
    [0.008, cd, TABLE.maxX + 0.004, cz],
  ] as const) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), railMat);
    rail.position.set(x, 0.006, z);
    rail.receiveShadow = true;
    scene.add(rail);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(w < d ? 0.003 : w, 0.0015, w < d ? d : 0.003), railGlow);
    glow.position.set(x, 0.0125, z);
    scene.add(glow);
  }

  // Base and turret
  const base = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.016, 56), dark);
  plate.position.y = 0.008;
  base.add(plate);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12), shell);
    bolt.position.set(Math.cos(a) * 0.102, 0.019, Math.sin(a) * 0.102);
    base.add(bolt);
  }
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.076, 0.084, 48), shell);
  column.position.y = 0.058;
  base.add(column);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.0695, 0.0025, 8, 56), led);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.099;
  base.add(baseRing);
  scene.add(base);

  const yawG = new THREE.Group();
  yawG.position.y = 0.1;
  scene.add(yawG);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.067, 0.04, 48), shell);
  turret.position.y = 0.02;
  yawG.add(turret);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.07), shell);
  yoke.position.y = 0.045;
  yawG.add(yoke);
  const shoulderHousing = joint(0.056, 0.13, shell, cap, led);
  shoulderHousing.position.y = ARM.shoulderY - 0.1;
  yawG.add(shoulderHousing);

  const shoulderG = new THREE.Group();
  shoulderG.position.y = ARM.shoulderY - 0.1;
  yawG.add(shoulderG);
  shoulderG.add(link(0.036, 0.03, ARM.upper, shell, cap));

  const elbowG = new THREE.Group();
  elbowG.position.z = ARM.upper;
  shoulderG.add(elbowG);
  elbowG.add(joint(0.046, 0.105, shell, cap, led));
  elbowG.add(link(0.029, 0.024, ARM.fore, shell, cap));

  const wristG = new THREE.Group();
  wristG.position.z = ARM.fore;
  elbowG.add(wristG);
  wristG.add(joint(0.033, 0.08, shell, cap, led));

  // Roll module and gripper. In this frame the tool points along +z.
  const rollG = new THREE.Group();
  wristG.add(rollG);
  const rollBody = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.03, 0.036, 36), shell);
  rollBody.rotation.x = Math.PI / 2;
  rollBody.position.z = 0.046;
  rollG.add(rollBody);
  const rollRing = new THREE.Mesh(new THREE.TorusGeometry(0.0275, 0.002, 8, 40), led);
  rollRing.position.z = 0.064;
  rollG.add(rollRing);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 36), dark);
  flange.rotation.x = Math.PI / 2;
  flange.position.z = 0.067;
  rollG.add(flange);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.108, 0.036, 0.02, 2, 0.004), dark);
  palm.position.z = 0.077;
  rollG.add(palm);
  const fingers = [-1, 1].map((side) => {
    const f = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.026, ARM.fingerLen, 2, 0.002), shell);
    body.position.set(side * 0.005, 0, 0);
    f.add(body);
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.022, 0.03), pad);
    rubber.position.set(side * 0.0005, 0, 0.008);
    f.add(rubber);
    f.position.z = ARM.tool;
    rollG.add(f);
    return { f, side };
  });

  // Fixture rings on the bench where each sample starts
  const ringMat = new THREE.MeshBasicMaterial({ color: C.lens, transparent: true, opacity: 0.3, depthWrite: false });
  for (const s of sim.samples) {
    const r = new THREE.Mesh(new THREE.RingGeometry(SAMPLE[s.kind].foot + 0.006, SAMPLE[s.kind].foot + 0.009, 48), ringMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(s.p.x, 0.0006, s.p.z);
    scene.add(r);
  }

  // Tray with a foam insert
  const tray = new THREE.Group();
  tray.position.set(TRAY.x, 0, TRAY.z);
  scene.add(tray);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x3b3656, roughness: 0.55, metalness: 0.1 });
  const ow = TRAY.w + TRAY.wall * 2, od = TRAY.d + TRAY.wall * 2;
  const floorBox = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.004, od), trayMat);
  floorBox.position.y = 0.002;
  tray.add(floorBox);
  for (const [w, d, x, z] of [
    [ow, TRAY.wall, 0, (od - TRAY.wall) / 2],
    [ow, TRAY.wall, 0, -(od - TRAY.wall) / 2],
    [TRAY.wall, TRAY.d, (ow - TRAY.wall) / 2, 0],
    [TRAY.wall, TRAY.d, -(ow - TRAY.wall) / 2, 0],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, TRAY.rim, d), trayMat);
    wall.position.set(x, TRAY.rim / 2, z);
    wall.castShadow = wall.receiveShadow = true;
    tray.add(wall);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.0005, 0.002, d + 0.0005), new THREE.MeshStandardMaterial({ color: C.lilac, roughness: 0.5 }));
    lip.position.set(x, TRAY.rim + 0.001, z);
    tray.add(lip);
  }
  const foamTex = canvasTexture(256, 128, (g) => {
    g.fillStyle = "#4a3e7d";
    g.fillRect(0, 0, 256, 128);
    for (let y = 8; y < 128; y += 16)
      for (let x = (y / 16) % 2 ? 16 : 8; x < 256; x += 16) {
        const grad = g.createRadialGradient(x, y, 1, x, y, 7);
        grad.addColorStop(0, "rgba(255,255,255,0.12)");
        grad.addColorStop(1, "rgba(0,0,0,0.12)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.fill();
      }
  });
  const foam = new THREE.Mesh(new THREE.BoxGeometry(TRAY.w, TRAY.foam - 0.004, TRAY.d), new THREE.MeshStandardMaterial({ map: foamTex, roughness: 1 }));
  foam.position.y = 0.004 + (TRAY.foam - 0.004) / 2;
  foam.receiveShadow = true;
  tray.add(foam);
  const label = canvasTexture(512, 64, (g) => {
    g.fillStyle = "#a979fa";
    g.font = "bold 34px Silkscreen, ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("DROP ZONE", 256, 34);
  });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.019), new THREE.MeshBasicMaterial({ map: label, transparent: true, depthWrite: false }));
  labelMesh.position.set(0, TRAY.rim / 2, od / 2 + 0.0008);
  tray.add(labelMesh);
  // Redraw the label once the pixel font has loaded.
  document.fonts?.load("bold 34px Silkscreen").then(() => {
    const g = (label.image as HTMLCanvasElement).getContext("2d")!;
    g.clearRect(0, 0, 512, 64);
    g.fillStyle = "#a979fa";
    g.font = "bold 34px Silkscreen, ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("DROP ZONE", 256, 34);
    label.needsUpdate = true;
    dirty = true;
  }).catch(() => {});

  // Samples
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe3ecff, roughness: 0.05, metalness: 0, transmission: 1, thickness: 0.003, ior: 1.5, clearcoat: 1 });
  const ballTex = canvasTexture(256, 128, (g) => {
    g.fillStyle = "#a979fa";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#fffffa";
    g.fillRect(0, 56, 256, 16);
    g.fillRect(56, 0, 16, 128);
    g.fillRect(184, 0, 16, 128);
  });
  const meshes = new Map<Kind, THREE.Object3D>();
  const hitboxes: THREE.Mesh[] = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  for (const s of sim.samples) {
    const g = new THREE.Group();
    const k = SAMPLE[s.kind];
    if (s.kind === "glass") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(k.half, k.half, k.h * 2 - 0.01, 40), glassMat);
      body.position.y = -0.005;
      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(k.half - 0.003, k.half - 0.003, 0.03, 32),
        new THREE.MeshStandardMaterial({ color: C.lens, emissive: C.lens, emissiveIntensity: 0.35, roughness: 0.2 }),
      );
      liquid.position.y = -k.h + 0.019;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(k.half + 0.0015, k.half + 0.0015, 0.012, 40), new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.5 }));
      top.position.y = k.h - 0.006;
      g.add(body, liquid, top);
    } else if (s.kind === "rubber") {
      g.add(new THREE.Mesh(new RoundedBoxGeometry(k.half * 2, k.h * 2, k.half * 2, 3, 0.005), new THREE.MeshStandardMaterial({ color: C.violet, roughness: 0.85 })));
    } else {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(k.h, 40, 24), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })));
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
    });
    const box = new THREE.Mesh(new THREE.CylinderGeometry(k.foot + 0.02, k.foot + 0.02, k.h * 2 + 0.03, 12), hitMat);
    box.userData["kind"] = s.kind;
    g.add(box);
    hitboxes.push(box);
    scene.add(g);
    meshes.set(s.kind, g);
  }

  // A ring under a sample the mouse is over, and a landing mark under whatever is being carried
  const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.036, 0.041, 48), new THREE.MeshBasicMaterial({ color: C.lens, transparent: true, opacity: 0.9, depthWrite: false }));
  hoverRing.rotation.x = -Math.PI / 2;
  hoverRing.visible = false;
  scene.add(hoverRing);
  const landing = new THREE.Group();
  const landMat = new THREE.MeshBasicMaterial({ color: C.lens, transparent: true, opacity: 0.85, depthWrite: false });
  const landRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), landMat);
  landRing.rotation.x = -Math.PI / 2;
  const landDot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), landMat);
  landDot.rotation.x = -Math.PI / 2;
  landing.add(landRing, landDot);
  landing.visible = false;
  scene.add(landing);
  const guide = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), new THREE.MeshBasicMaterial({ color: C.lens, transparent: true, opacity: 0.4, depthWrite: false }));
  guide.visible = false;
  scene.add(guide);
  let hovered: Kind | null = null;

  // Resizing
  let dirty = true;
  const size = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens: step back a little so the tray stays in view.
    camera.position.set(-0.24, 0.84, 1.3).sub(lookAt).multiplyScalar(camera.aspect < 1.1 ? 1.18 : 1).add(lookAt);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const ro = new ResizeObserver(size);
  ro.observe(host);
  size();

  // Copy the simulation onto the models
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const ballPrev = { x: 0, z: 0, yaw: 0, ready: false };
  const sync = () => {
    yawG.rotation.y = sim.q.yaw;
    shoulderG.rotation.x = -sim.q.shoulder;
    elbowG.rotation.x = -sim.q.elbow;
    wristG.rotation.x = -sim.q.wrist;
    rollG.rotation.z = sim.q.roll;
    for (const { f, side } of fingers) f.position.x = side * sim.grip;
    for (const s of sim.samples) {
      const g = meshes.get(s.kind)!;
      g.position.set(s.p.x, s.p.y, s.p.z);
      if (s.kind === "ball") {
        // Roll the ball by the distance it travelled, and turn it with the gripper while it is held.
        if (ballPrev.ready) {
          const dx = s.p.x - ballPrev.x, dz = s.p.z - ballPrev.z, d = Math.hypot(dx, dz);
          if (!s.held && d > 1e-6 && s.p.y < SAMPLE.ball.h + TRAY.foam + 0.002) {
            axis.set(dz / d, 0, -dx / d);
            g.quaternion.premultiply(q.setFromAxisAngle(axis, d / SAMPLE.ball.h));
          }
          if (s.held) g.quaternion.premultiply(q.setFromAxisAngle(axis.set(0, 1, 0), s.yaw - ballPrev.yaw));
        }
        Object.assign(ballPrev, { x: s.p.x, z: s.p.z, yaw: s.yaw, ready: true });
      } else g.rotation.y = s.yaw;
    }
    const floorAt = (p: { x: number; z: number }) => (inTray(p) ? TRAY.foam : 0) + 0.0012;
    const hs = hovered && !sim.heldKind && !sim.busy ? sim.sample(hovered) : null;
    hoverRing.visible = !!hs;
    if (hs) hoverRing.position.set(hs.p.x, floorAt(hs.p), hs.p.z);
    const held = sim.heldKind ? sim.sample(sim.heldKind) : null;
    landing.visible = guide.visible = !!held;
    if (held) {
      landing.position.set(sim.aim.x, floorAt(sim.aim), sim.aim.z);
      landing.scale.setScalar(SAMPLE[held.kind].foot + 0.008);
      const bottom = held.p.y - SAMPLE[held.kind].h;
      guide.position.set(held.p.x, bottom / 2, held.p.z);
      guide.scale.set(1, Math.max(0.001, bottom), 1);
    }
  };

  // Main loop: the simulation always runs while the arm is on screen; drawing only happens when something changed.
  let raf = 0, last = 0, visible = true;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (!visible) return;
    const wasMoving = sim.moving;
    sim.step(dt);
    if (wasMoving || sim.moving || dirty) {
      sync();
      renderer.render(scene, camera);
      dirty = false;
    }
    onFrame();
  };
  raf = requestAnimationFrame(loop);
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    last = 0;
    dirty = true;
  });
  io.observe(host);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  return {
    hit(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const found = ray.intersectObjects(hitboxes, false)[0];
      const t = -ray.ray.origin.y / ray.ray.direction.y;
      const point = t > 0 ? { x: ray.ray.origin.x + ray.ray.direction.x * t, z: ray.ray.origin.z + ray.ray.direction.z * t } : undefined;
      return found ? { kind: found.object.userData["kind"] as Kind, point } : { point };
    },
    hover(kind) {
      if (kind !== hovered) {
        hovered = kind;
        dirty = true;
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt: THREE.Material & { map?: THREE.Texture | null }) => {
            mt.map?.dispose();
            mt.dispose();
          });
        }
      });
      scene.environment?.dispose();
      pmrem.dispose();
      room.dispose?.();
      renderer.dispose();
      canvas.remove();
    },
  };
}
