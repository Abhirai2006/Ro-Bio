// Checks that forward(solveIK(p)) lands back on p for 40000 random reachable points, both elbows.
import { solveIK, forward } from "../src/lib/ik.ts";
const L1 = 150, L2 = 130;
let worst = 0;
for (let i = 0; i < 20000; i++) {
  const r = 22 + Math.random() * 256, a = Math.random() * Math.PI * 2;
  const x = r * Math.cos(a), y = r * Math.sin(a);
  for (const e of [1, -1]) {
    const p = solveIK(x, y, L1, L2, e);
    if (!p.reachable) throw new Error("reachable point reported unreachable");
    const f = forward(p.t1, p.t2, L1, L2);
    worst = Math.max(worst, Math.hypot(f.x - x, f.y - y));
  }
}
const far = solveIK(400, 0, L1, L2, 1), ff = forward(far.t1, far.t2, L1, L2);
if (far.reachable || Math.abs(ff.x - 280) > 1e-3) throw new Error("out-of-reach target not clamped onto the ring");
console.log("worst position error:", worst.toExponential(2), "| out-of-reach clamps to the ring: ok");
if (worst > 1e-6) process.exit(1);
