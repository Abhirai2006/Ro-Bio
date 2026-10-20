import { beatShape, ecgAt } from "../src/lib/ecg.ts";
import { makeTrack, newRobot, step } from "../src/lib/linefollow.ts";

// ECG: 12 s at a fixed heart rate. Count R peaks, check spacing, wave order and amplitudes.
function ecg(bpm) {
  const rr = 60 / bpm, beats = Array.from({ length: Math.ceil(14 / rr) }, (_, i) => 1 + i * rr);
  const fs = 500, v = []; for (let i = 0; i < 12 * fs; i++) v.push(ecgAt(i / fs + 1, beats, rr));
  const peaks = []; for (let i = 1; i < v.length - 1; i++) if (v[i] > 0.6 && v[i] >= v[i - 1] && v[i] > v[i + 1]) peaks.push(i / fs);
  const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const R = beatShape(0, rr);
  let pMax = -9, pAt = 0; for (let t = -0.3; t < -0.08; t += 0.002) { const x = beatShape(t, rr); if (x > pMax) { pMax = x; pAt = t; } }
  let tMax = -9, tAt = 0; for (let t = 0.1; t < 0.55 && t < rr - 0.2; t += 0.002) { const x = beatShape(t, rr); if (x > tMax) { tMax = x; tAt = t; } }
  console.log(`ECG ${bpm} bpm: peaks=${peaks.length} meanRR=${mean.toFixed(3)}s (want ${rr.toFixed(3)}) R=${R.toFixed(2)} P=${pMax.toFixed(2)}@${pAt.toFixed(2)}s T=${tMax.toFixed(2)}@${tAt.toFixed(2)}s`);
  if (Math.abs(mean - rr) > 0.01 || pAt >= 0 || tAt <= 0 || !(R > tMax && tMax > pMax)) { console.log("ECG CHECK FAILED"); process.exit(1); }
}
ecg(72); ecg(140);

// Line follower: the lesson the sliders are meant to teach. Each row is asserted.
const track = makeTrack();
function run(p, secs = 30) {
  const r = newRobot(track), dt = 1 / 120;
  for (let t = 0; t < secs; t += dt) { step(r, p, track, dt); if (r.lost > 1.2) return "LOST"; }
  return r.laps;
}
const cases = [
  ["kp 0.5, kd 0 (too weak to turn)", { kp: 0.5, ki: 0, kd: 0, speed: 110 }, (r) => r === "LOST"],
  ["kp 3, kd 1 (the default)", { kp: 3, ki: 0, kd: 1, speed: 110 }, (r) => r >= 3],
  ["kp 10, kd 0 (wobbles, no progress)", { kp: 10, ki: 0, kd: 0, speed: 110 }, (r) => r === "LOST" || r < 2],
  ["kp 10, kd 3 (damping fixes it)", { kp: 10, ki: 0, kd: 3, speed: 110 }, (r) => r >= 3],
  ["kp 3, kd 1, speed 200 (faster laps)", { kp: 3, ki: 0, kd: 1, speed: 200 }, (r) => r >= 4],
];
let bad = 0;
for (const [name, p, ok] of cases) { const r = run(p); const pass = ok(r); if (!pass) bad++; console.log(`${pass ? "ok  " : "FAIL"} ${name}: ${r} laps in 30 s`); }
if (bad) process.exit(1);
