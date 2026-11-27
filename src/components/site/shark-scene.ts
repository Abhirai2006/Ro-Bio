// The 3D shark that bursts out of the Shark Tank banner. Loaded only on that page, on computers, after the page
// has settled. The model is "Great White Shark Attack Bite Animation Loop" by LasquetiSpice (CC BY 4.0), made
// smaller for the web (WebP textures, quantised mesh); the page credits it under the banner.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type SharkScene = {
  /** Starts the burst from the beginning: the shark rushes out of the banner, then hovers and bites. */
  play: () => void;
  dispose: () => void;
};

/** When the shark starts its lunge, in seconds after play(). The banner cracks and breaks just before. */
export const LUNGE_AT = 0.7;
const LUNGE_FOR = 0.9;

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function createSharkScene(
  host: HTMLElement,
  url: string,
  onReady: () => void,
  onFail: () => void,
): SharkScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a2233, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-6, 10, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 1.6);
  rim.position.set(8, 4, -10);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  // The shark sits in a holder: the holder moves it along its path, the model inside is centred and scaled.
  const holder = new THREE.Group();
  scene.add(holder);
  let mixer: THREE.AnimationMixer | null = null;
  let started = -1;
  let last = performance.now();
  const pointer = { x: 0, y: 0 };

  const resize = () => {
    const w = host.clientWidth || 1,
      h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  new GLTFLoader().load(
    url,
    (gltf) => {
      const model = gltf.scene;
      // Centre it and scale it to a known length, whatever units the file uses.
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      model.position.sub(centre);
      const inner = new THREE.Group();
      inner.add(model);
      inner.scale.setScalar(13 / Math.max(size.x, size.y, size.z));
      holder.add(inner);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.frustumCulled = false; // a skinned mesh's bounds lag its animation
      });
      if (gltf.animations[0]) {
        mixer = new THREE.AnimationMixer(model);
        const bite = mixer.clipAction(gltf.animations[0]);
        bite.timeScale = 0.75;
        bite.play();
      }
      onReady();
    },
    undefined,
    () => onFail(),
  );

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
  io.observe(host);

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || started < 0) return;
    const t = (performance.now() - started) / 1000;
    mixer?.update(dt);
    // From deep inside the banner, out towards the viewer, then a slow hover.
    const k = easeOut((t - LUNGE_AT) / LUNGE_FOR);
    const hover = t > LUNGE_AT + LUNGE_FOR ? t - LUNGE_AT - LUNGE_FOR : 0;
    holder.position.set(
      Math.sin(hover * 0.9) * 0.35,
      -1.2 + k * 1.0 + Math.sin(hover * 1.3) * 0.25,
      -70 + k * 86 + Math.sin(hover * 0.7) * 0.5,
    );
    holder.rotation.set(
      0.1 - k * 0.45 + pointer.y * 0.12,
      (1 - k) * 0.5 + Math.sin(hover * 0.6) * 0.12 + pointer.x * 0.25,
      Math.sin(hover * 0.8) * 0.05,
    );
    renderer.render(scene, camera);
  });

  return {
    play() {
      started = performance.now();
      last = started;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
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
