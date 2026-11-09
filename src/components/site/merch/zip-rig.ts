// The working zip on the zip hoodie. The model's front is cut down the zip line, and each front panel swings open
// as the slider comes down. The opening is driven by a row of damped springs, one per band of height, pulled
// towards where the zip lets the cloth go and tied to the bands above and below, so the fabric lags, sways and
// settles like cloth on a hanger instead of moving like a door.
import * as THREE from "three";

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** A plain float copy of a glTF geometry with its node transform baked in, so it can be edited every frame. */
function bake(geo: THREE.BufferGeometry, m: THREE.Matrix4) {
  const out = new THREE.BufferGeometry();
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const v = new THREE.Vector3();
  for (const name of ["position", "normal", "tangent", "uv"]) {
    const a = geo.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      if (name === "uv") {
        arr[i * 2] = a.getX(i);
        arr[i * 2 + 1] = a.getY(i);
        continue;
      }
      if (name === "position") v.fromBufferAttribute(a, i).applyMatrix4(m);
      else v.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix3(nm).normalize();
      arr[i * a.itemSize] = v.x;
      arr[i * a.itemSize + 1] = v.y;
      arr[i * a.itemSize + 2] = v.z;
      if (a.itemSize === 4) arr[i * 4 + 3] = a.getW(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  out.setIndex(Array.from(geo.index!.array));
  return out;
}

/** Splits the closed front down x = 0: triangles on the wearer's left get their own copy of the seam vertices. */
function cut(geo: THREE.BufferGeometry, top: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const n0 = pos.count;
  const seam = (i: number) =>
    Math.abs(pos.getX(i)) < 0.002 && pos.getZ(i) > 0.02 && pos.getY(i) < top + 0.01;
  const idx = Array.from(geo.index!.array);
  const copies = new Map<number, number>();
  const extra: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const cx = (pos.getX(idx[t]!) + pos.getX(idx[t + 1]!) + pos.getX(idx[t + 2]!)) / 3;
    if (cx <= 0) continue;
    for (let k = 0; k < 3; k++) {
      const i = idx[t + k]!;
      if (!seam(i)) continue;
      let c = copies.get(i);
      if (c === undefined) {
        c = n0 + extra.length;
        copies.set(i, c);
        extra.push(i);
      }
      idx[t + k] = c;
    }
  }
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.getAttribute(name) as THREE.BufferAttribute;
    const arr = new Float32Array((a.count + extra.length) * a.itemSize);
    arr.set(a.array as Float32Array);
    extra.forEach((src, k) => {
      for (let j = 0; j < a.itemSize; j++)
        arr[(a.count + k) * a.itemSize + j] = a.array[src * a.itemSize + j]!;
    });
    geo.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  geo.setIndex(idx);
  return { copies: extra.length, firstCopy: n0 };
}

export type ZipRig = {
  /** 0 is zipped up, 1 is open all the way. */
  setTarget: (v: number) => void;
  target: () => number;
  /** Steps the cloth. True while anything is still moving. */
  update: (dt: number) => boolean;
  /** The slider and its puller, for picking with the pointer. */
  handles: THREE.Object3D[];
  /** The zip value for a height the pointer is dragging at. */
  valueAt: (y: number) => number;
  /** How far forward the zip line is at a height, for the drag plane. */
  lineZ: (y: number) => number;
  dispose: () => void;
};

export function createZipRig(root: THREE.Object3D, metal: THREE.Material): ZipRig | null {
  let found: THREE.Mesh | null = null;
  const zips: THREE.Mesh[] = [];
  const cords: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const role = o.name || o.parent?.name || "";
    if (role.startsWith("body")) found = o;
    else if (role.startsWith("zip")) zips.push(o);
    else if (role.startsWith("cord")) cords.push(o);
  });
  const body = found as THREE.Mesh | null;
  if (!body) return null;

  // --- the body, baked to world space and cut open down the front
  const geo = bake(body.geometry, body.matrixWorld);
  const TOP = 0.745,
    BOTTOM = 0.025;
  const { copies, firstCopy } = cut(geo, TOP);
  if (copies < 10) return null;
  body.geometry = geo;
  root.attach(body);
  body.position.set(0, 0, 0);
  body.quaternion.identity();
  body.scale.set(1, 1, 1);
  body.updateMatrixWorld(true);

  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute;
  const tan = geo.getAttribute("tangent") as THREE.BufferAttribute | undefined;
  const rest = Float32Array.from(pos.array as Float32Array);
  const restN = Float32Array.from(nor.array as Float32Array);
  const restT = tan ? Float32Array.from(tan.array as Float32Array) : null;

  // the zip line: the front centre, hem to collar, as z for each height
  const line: [number, number][] = [];
  for (let i = 0; i < firstCopy; i++)
    if (Math.abs(rest[i * 3]!) < 0.002 && rest[i * 3 + 2]! > 0.02)
      line.push([rest[i * 3 + 1]!, rest[i * 3 + 2]!]);
  line.sort((p, q) => p[0] - q[0]);
  const lineZ = (y: number) => {
    if (!line.length) return 0.15;
    if (y <= line[0]![0]) return line[0]![1];
    for (let i = 1; i < line.length; i++)
      if (y <= line[i]![0]) {
        const [y0, z0] = line[i - 1]!,
          [y1, z1] = line[i]!;
        return z0 + ((z1 - z0) * (y - y0)) / (y1 - y0 || 1);
      }
    return line[line.length - 1]![1];
  };

  // which vertices move, which way and how much: the front, most at the zip edge, nothing at the side seams
  const moving: number[] = [];
  const weight: number[] = [];
  const sideOf: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3]!,
      z = rest[i * 3 + 2]!;
    const w = Math.exp(-Math.abs(x) / 0.085) * smooth(-0.03, 0.06, z);
    if (w > 0.004) {
      moving.push(i);
      weight.push(w);
      sideOf.push(i >= firstCopy || x > 0 ? 1 : -1);
    }
  }

  // --- the springs: one per band of height
  const BANDS = 56;
  const u = new Float32Array(BANDS),
    vel = new Float32Array(BANDS);
  const lo = BOTTOM - 0.03,
    hi = TOP + 0.03;
  const bandY = (k: number) => lo + (k / (BANDS - 1)) * (hi - lo);
  let goal = 0;
  let shown = 0; // where the slider is drawn, eased towards the goal
  /** How far the zip lets the cloth at height y open, for slider position z. */
  const opening = (y: number, z: number) => {
    const ys = TOP - (TOP - BOTTOM) * z;
    const free = Math.min(1, Math.max(0, (y - ys) / 0.2)) ** 0.85 * (0.4 + 0.6 * z);
    const released = smooth(0.94, 1, z);
    return free + (1 - free) * released;
  };
  const at = (y: number) => {
    const f = ((y - lo) / (hi - lo)) * (BANDS - 1);
    const k = Math.max(0, Math.min(BANDS - 2, Math.floor(f)));
    const t = Math.min(1, Math.max(0, f - k));
    return u[k]! * (1 - t) + u[k + 1]! * t;
  };

  /** Where a point on the front ends up for an opening d (0..1) on its side s. */
  const deform = (x: number, y: number, z: number, d: number, s: number, out: number[]) => {
    const lapel = smooth(0.58, TOP, y);
    out[0] = x + s * d * (0.085 + 0.035 * lapel);
    out[1] = y - d * 0.005 * (1 - lapel);
    out[2] = z + d * (0.01 + 0.02 * lapel) + d * 0.004 * Math.sin(y * 55 + s * 1.7);
    return out;
  };

  const tmp = [0, 0, 0];
  const turn = new THREE.Quaternion(),
    nv = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  const apply = () => {
    for (let k = 0; k < moving.length; k++) {
      const i = moving[k]!,
        s = sideOf[k]!;
      const x = rest[i * 3]!,
        y = rest[i * 3 + 1]!,
        z = rest[i * 3 + 2]!;
      const d = at(y) * weight[k]!;
      deform(x, y, z, d, s, tmp);
      pos.setXYZ(i, tmp[0]!, tmp[1]!, tmp[2]!);
      // the cloth turns outward as it opens
      turn.setFromAxisAngle(up, s * d * 0.55);
      nv.set(restN[i * 3]!, restN[i * 3 + 1]!, restN[i * 3 + 2]!).applyQuaternion(turn);
      nor.setXYZ(i, nv.x, nv.y, nv.z);
      if (tan && restT) {
        nv.set(restT[i * 4]!, restT[i * 4 + 1]!, restT[i * 4 + 2]!).applyQuaternion(turn);
        tan.setXYZ(i, nv.x, nv.y, nv.z);
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    if (tan) tan.needsUpdate = true;
    geo.computeBoundingSphere();
  };

  // the drawcords hang from each side of the hood opening, so each one swings out with its own panel
  const cordParts = cords.map((m) => {
    const g = bake(m.geometry, m.matrixWorld);
    m.geometry = g;
    root.attach(m);
    m.position.set(0, 0, 0);
    m.quaternion.identity();
    m.scale.set(1, 1, 1);
    m.updateMatrixWorld(true);
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    return { g, p, rest: Float32Array.from(p.array as Float32Array) };
  });
  const applyCords = () => {
    for (const c of cordParts) {
      for (let i = 0; i < c.p.count; i++) {
        const x = c.rest[i * 3]!,
          y = c.rest[i * 3 + 1]!,
          z = c.rest[i * 3 + 2]!;
        const s = x > 0 ? 1 : -1;
        deform(x, y, z, at(y) * Math.exp(-Math.abs(x) / 0.085), s, tmp);
        c.p.setXYZ(i, tmp[0]!, tmp[1]!, tmp[2]! + 0.002);
      }
      c.p.needsUpdate = true;
      c.g.computeBoundingSphere();
    }
  };

  // --- metal teeth along both edges, interlocked where the zip is closed
  const toothGeo = new THREE.BoxGeometry(0.0056, 0.0024, 0.0026);
  const PITCH = 0.0034;
  const count = Math.floor((TOP - BOTTOM) / PITCH);
  const sides = ([-1, 1] as const).map((s) => {
    const ys: number[] = [];
    for (let i = s < 0 ? 0 : 1; i < count; i += 2) ys.push(BOTTOM + i * PITCH);
    const mesh = new THREE.InstancedMesh(toothGeo, metal, ys.length);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    return { mesh, ys, s };
  });
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    scl = new THREE.Vector3(1, 1, 1),
    pv = new THREE.Vector3();
  const placeTeeth = () => {
    for (const side of sides) {
      side.ys.forEach((y, i) => {
        const d = at(y);
        deform(side.s * 0.0016, y, lineZ(y) + 0.0022, d, side.s, tmp);
        pv.set(tmp[0]!, tmp[1]!, tmp[2]!);
        q.setFromAxisAngle(up, side.s * d * 0.55);
        side.mesh.setMatrixAt(i, m4.compose(pv, q, scl));
      });
      side.mesh.instanceMatrix.needsUpdate = true;
    }
  };

  // the model's own zip strip would stay in one piece, so the teeth above replace it; the slider and puller ride the zip
  const height = (m: THREE.Mesh) => {
    const bb = new THREE.Box3().setFromObject(m);
    return bb.max.y - bb.min.y;
  };
  const strip = zips.reduce<THREE.Mesh | null>(
    (a, m) => (!a || height(m) > height(a) ? m : a),
    null,
  );
  if (strip) strip.visible = false;
  const riders = zips.filter((m) => m !== strip);
  const riderRest = riders.map((m) => {
    const bb = new THREE.Box3().setFromObject(m);
    return { m, base: m.position.clone(), y: (bb.min.y + bb.max.y) / 2 };
  });
  const sliderY0 = riderRest.length ? Math.max(...riderRest.map((r) => r.y)) : TOP;
  const placeRiders = () => {
    const ys = TOP - (TOP - BOTTOM) * shown;
    const dy = Math.min(ys, sliderY0) - sliderY0;
    // once the zip is apart the slider stays on the wearer's right side, like a real one
    const d = at(ys) * smooth(0.94, 1, shown);
    deform(0, ys, lineZ(ys), d, -1, tmp);
    for (const r of riderRest)
      r.m.position.set(r.base.x + tmp[0]!, r.base.y + dy, r.base.z + (tmp[2]! - lineZ(sliderY0)));
  };

  apply();
  applyCords();
  placeTeeth();
  placeRiders();

  return {
    setTarget: (v) => {
      goal = Math.min(1, Math.max(0, v));
    },
    target: () => goal,
    update(dt) {
      const h = Math.min(dt, 1 / 30);
      const before = shown;
      shown += (goal - shown) * (1 - Math.exp(-h * 14));
      if (Math.abs(goal - shown) < 1e-4) shown = goal;
      let energy = Math.abs(shown - before) * 50;
      // a few small steps per frame keep the springs steady
      for (let step = 0; step < 3; step++) {
        const st = h / 3;
        for (let k = 0; k < BANDS; k++) {
          const target = opening(bandY(k), shown);
          const above = u[Math.min(BANDS - 1, k + 1)]!,
            below = u[Math.max(0, k - 1)]!;
          const acc = 70 * (target - u[k]!) + 34 * (above + below - 2 * u[k]!) - 7.5 * vel[k]!;
          vel[k] = vel[k]! + acc * st;
          u[k] = u[k]! + vel[k]! * st;
        }
      }
      for (let k = 0; k < BANDS; k++) energy += Math.abs(vel[k]!);
      if (energy < 0.002) return false;
      apply();
      applyCords();
      placeTeeth();
      placeRiders();
      return true;
    },
    handles: riders,
    valueAt: (y) => Math.min(1, Math.max(0, (TOP - y) / (TOP - BOTTOM))),
    lineZ,
    dispose: () => {
      toothGeo.dispose();
      sides.forEach((s) => s.mesh.dispose());
    },
  };
}
