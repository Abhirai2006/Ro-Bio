// Plays seeded Robo Sumo matches headlessly with scripted players of different skill and prints win rates.
// Usage: node --experimental-strip-types scripts/sumo-sim.mjs [matches]
import { makeMatch, step, controlFromInput, radiusOf, toCentre, wrap } from "../src/lib/sumo.ts";

export const players = {
  // Drives straight at the CPU, ignores the edge.
  charger: (m) => { const [P, C] = m.bots; const a = Math.atan2(C.y - P.y, C.x - P.x); return [Math.cos(a), Math.sin(a)]; },
  // Same, but backs off to the centre if it gets close to the edge.
  safeCharger: (m) => {
    const [P, C] = m.bots, a = radiusOf(P) > 98 ? toCentre(P) : Math.atan2(C.y - P.y, C.x - P.x);
    return [Math.cos(a), Math.sin(a)];
  },
  // A decent human: gets on the centre side of the CPU, pushes outward, and backs off when its wheels fade.
  flanker: (m) => {
    const [P, C] = m.bots, dist = Math.hypot(C.x - P.x, C.y - P.y);
    if (radiusOf(P) > 100) { const a = toCentre(P); return [Math.cos(a), Math.sin(a)]; }
    const away = Math.atan2(P.y - C.y, P.x - C.x);
    if (P.fade > 0.2 && dist < 70) return [Math.cos(away), Math.sin(away)];
    const rC = radiusOf(C), ux = (C.x - 160) / (rC || 1), uy = (C.y - 160) / (rC || 1);
    const onInner = (P.x - C.x) * -ux + (P.y - C.y) * -uy > 0;
    const bearing = Math.atan2(P.y - C.y, P.x - C.x), inner = Math.atan2(-uy, -ux), delta = wrap(inner - bearing);
    if (!onInner || Math.abs(delta) > 0.6) {
      const step = Math.max(-0.75, Math.min(0.75, delta)), r = Math.max(64, dist);
      const wx = C.x + Math.cos(bearing + step) * r, wy = C.y + Math.sin(bearing + step) * r, a = Math.atan2(wy - P.y, wx - P.x);
      return [Math.cos(a), Math.sin(a)];
    }
    const a = Math.atan2(C.y - P.y, C.x - P.x); return [Math.cos(a), Math.sin(a)];
  },
};

export function play(kind, seed, tune = {}) {
  const m = makeMatch(seed, tune), dt = 1 / 120;
  let ix = 0, iy = 0, nextIn = 0, hits = 0;
  while (!m.over) {
    if (m.t >= nextIn) { [ix, iy] = players[kind](m); nextIn = m.t + 1 / 30; }
    step(m, controlFromInput(m.bots[0], ix, iy), dt);
    if (m.hit > 0) { hits++; m.hit = 0; }
    for (const b of m.bots) if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || Math.hypot(b.vx, b.vy) > 600) throw new Error("physics blew up");
  }
  return { over: m.over, winner: m.winner, t: m.t, hits };
}

export function rates(kind, N, tune = {}) {
  let you = 0, cpu = 0, time = 0, tsum = 0;
  for (let s = 1; s <= N; s++) { const r = play(kind, s, tune); if (r.winner === "you") you++; else cpu++; if (r.over === "time") time++; tsum += r.t; }
  return { win: (you / N) * 100, time: (time / N) * 100, avg: tsum / N };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const N = Number(process.argv[2] || 100);
  const sweeps = process.argv[3] ? JSON.parse(process.argv[3]) : [{}];
  for (const tune of sweeps) {
    const row = Object.keys(players).map((k) => { const r = rates(k, N, tune); return `${k} ${r.win.toFixed(0)}% (timeouts ${r.time.toFixed(0)}%, ${r.avg.toFixed(0)}s)`; });
    console.log(JSON.stringify(tune).padEnd(34), "|", row.join(" | "));
  }
}
