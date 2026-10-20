export type Pose = { t1: number; t2: number; reachable: boolean };

// Two-link planar arm, angles in radians, y up. elbow = 1 or -1 picks which way the elbow bends.
// A target outside the reachable ring is pulled onto the ring, so the arm stretches toward it.
export function solveIK(x: number, y: number, l1: number, l2: number, elbow: 1 | -1): Pose {
  const dist = Math.hypot(x, y);
  const maxR = l1 + l2, minR = Math.abs(l1 - l2);
  const d = Math.min(Math.max(dist, minR + 1e-6), maxR - 1e-6);
  const k = dist === 0 ? 0 : d / dist;
  const c2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const t2 = elbow * Math.acos(Math.max(-1, Math.min(1, c2)));
  const t1 = Math.atan2(y * k, x * k) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
  return { t1, t2, reachable: dist <= maxR && dist >= minR };
}

export function forward(t1: number, t2: number, l1: number, l2: number) {
  return { x: l1 * Math.cos(t1) + l2 * Math.cos(t1 + t2), y: l1 * Math.sin(t1) + l2 * Math.sin(t1 + t2) };
}
