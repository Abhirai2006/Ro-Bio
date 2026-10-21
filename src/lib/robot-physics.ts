import Matter from "matter-js";

export const { Engine, Bodies, Body, Composite, Events } = Matter;
export type Material = "glass" | "rubber" | "ball";
export const materialProperties = {
  glass: { restitution: 0.03, friction: 0.7, frictionAir: 0.002 },
  rubber: { restitution: 0.55, friction: 0.65, frictionAir: 0.002 },
  ball: { restitution: 0.35, friction: 0.015, frictionAir: 0.001 },
};
export const BREAK_SPEED = 4.5;
export function shouldBreak(material: Material, speed: number) {
  return material === "glass" && speed > BREAK_SPEED;
}
export function makeSample(material: Material, x = 90, y = 304) {
  const options = { ...materialProperties[material], label: "sample" };
  return material === "ball" ? Bodies.circle(x, y, 12, options) : Bodies.rectangle(x, y, 14, 28, options);
}

export const RING = { center: 160, radius: 130, botRadius: 18 };
export type CpuTactic = "RECOVER" | "FLANK" | "DRIVE" | "REVERSE";
export function cpuIntent(cpu: Matter.Body, player: Matter.Body, time: number, contact: boolean) {
  const center = RING.center;
  const edge = Math.hypot(cpu.position.x - center, cpu.position.y - center);
  let x = player.position.x + player.velocity.x * 10 - cpu.position.x;
  let y = player.position.y + player.velocity.y * 10 - cpu.position.y;
  let tactic: CpuTactic = "DRIVE";
  // Predict the edge early, and actively brake outward momentum.
  if (edge > RING.radius * 0.67) {
    x = (center - cpu.position.x) * 2 - cpu.velocity.x * 24;
    y = (center - cpu.position.y) * 2 - cpu.velocity.y * 24;
    tactic = "RECOVER";
  } else if (contact && Math.floor(time / 1100) % 4 === 2) {
    x = -x; y = -y;
    tactic = "REVERSE";
  } else if (Math.floor(time / 1500) % 3 === 1) {
    // Orbit to get on the centre side of the opponent, then attack outward.
    const px = player.position.x - center, py = player.position.y - center;
    const distance = Math.max(1, Math.hypot(px, py));
    const side = Math.floor(time / 4500) % 2 ? -1 : 1;
    x = player.position.x - px / distance * 38 - py / distance * 24 * side - cpu.position.x;
    y = player.position.y - py / distance * 38 + px / distance * 24 * side - cpu.position.y;
    tactic = "FLANK";
  }
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length, tactic };
}