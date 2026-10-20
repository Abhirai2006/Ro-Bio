// A differential-drive robot with five IR sensors following a line under PID control.
export type Params = { kp: number; ki: number; kd: number; speed: number };
export type Pt = { x: number; y: number };
export type Robot = { x: number; y: number; phi: number; integ: number; prevE: number; lastE: number; e: number; u: number; lost: number; s: number[]; idx: number; laps: number; lapT: number; best: number; vl: number; vr: number };

export const W = 560, H = 340;
export const MOTOR_LAG = 0.3; // seconds. Real motors take time to respond, which is why high gains oscillate.
export const WHEEL_BASE = 26, AHEAD = 20, SENSOR_X = [-16, -8, 0, 8, 16], WEIGHT = [-2, -1, 0, 1, 2], LINE_W = 12;

export function makeTrack(n = 480): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: W / 2 + 205 * Math.cos(a) + 30 * Math.cos(3 * a + 0.6), y: 140 + 100 * Math.sin(a) + 22 * Math.sin(2 * a + 1.1) };
  });
}

export function newRobot(track: Pt[]): Robot {
  const a = track[0], b = track[1];
  return { x: a.x, y: a.y, phi: Math.atan2(b.y - a.y, b.x - a.x), integ: 0, prevE: 0, lastE: 0, e: 0, u: 0, lost: 0, s: [0, 0, 0, 0, 0], idx: 0, laps: 0, lapT: 0, best: 0, vl: 0, vr: 0 };
}

export function nearest(track: Pt[], px: number, py: number) {
  let best = 1e12, bi = 0;
  for (let i = 0; i < track.length; i++) { const dx = track[i].x - px, dy = track[i].y - py, d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
  return { d: Math.sqrt(best), i: bi };
}

export function step(r: Robot, p: Params, track: Pt[], dt: number) {
  const hx = Math.cos(r.phi), hy = Math.sin(r.phi), rx = -hy, ry = hx; // heading and right-hand unit vectors (y down)
  let sum = 0, wsum = 0;
  for (let i = 0; i < 5; i++) {
    const d = nearest(track, r.x + AHEAD * hx + SENSOR_X[i] * rx, r.y + AHEAD * hy + SENSOR_X[i] * ry).d;
    r.s[i] = Math.max(0, Math.min(1, 1 - Math.max(0, d - LINE_W / 2) / 10));
    sum += r.s[i]; wsum += WEIGHT[i] * r.s[i];
  }
  let e: number;
  if (sum > 0.05) { e = wsum / sum; r.lastE = e; r.lost = 0; } else { e = (r.lastE >= 0 ? 1 : -1) * 2.5; r.lost += dt; }
  r.integ = Math.max(-3, Math.min(3, r.integ + e * dt));
  const de = (e - r.prevE) / dt; r.prevE = e; r.e = e;
  const u = (p.kp * e + p.ki * r.integ + p.kd * de) * 25;
  const vl = Math.max(0, Math.min(2.2 * p.speed, p.speed + u)), vr = Math.max(0, Math.min(2.2 * p.speed, p.speed - u));
  r.vl += ((vl - r.vl) * dt) / MOTOR_LAG; r.vr += ((vr - r.vr) * dt) / MOTOR_LAG;
  r.u = (r.vl - r.vr) / 2;
  const v = (r.vl + r.vr) / 2;
  r.x += v * hx * dt; r.y += v * hy * dt; r.phi += ((r.vl - r.vr) / WHEEL_BASE) * dt;
  r.lapT += dt;
  const n = nearest(track, r.x, r.y).i;
  if (r.idx > track.length * 0.9 && n < track.length * 0.1) { r.laps++; r.best = r.best ? Math.min(r.best, r.lapT) : r.lapT; r.lapT = 0; }
  r.idx = n;
}
