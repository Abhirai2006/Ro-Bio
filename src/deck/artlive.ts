// Brings the Robo Spark scenes to life with real physics. Every scene says how many pixels make a metre
// (a person is 7.5 heads, about 1.65 m), so gravity, pendulums and drag all run in real units:
//   falling things:  g = 9.81 m/s², bounce with a coefficient of restitution
//   hanging things:  simple pendulums, θ'' = -(g/L) sin θ - c θ', period 2π √(L/g)
//   confetti:        quadratic air drag, dv/dt = g - k v|v|, so it reaches a terminal speed of about 1 m/s
//   gears:           meshed gears turn opposite ways, speeds in the inverse ratio of their teeth
//   the spark robot: a damped spring, x'' = -ω² x - 2ζω x'
//   people:          breathing at 15 breaths a minute, blinking about every 4 seconds

const G = 9.81;

type Body = { step: (dt: number, t: number) => void };

const num = (s: string | null | undefined, d = 0) => (s == null || s === "" ? d : Number(s));
const pivot = (el: Element): [number, number] => {
  const [x, y] = (el.getAttribute("data-pivot") ?? "0,0").split(",").map(Number);
  return [x ?? 0, y ?? 0];
};

/** Starts the physics in one scene. Returns a stop function. Does nothing for people who prefer less motion. */
export function animateScene(svg: SVGSVGElement): () => void {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
    return () => {};
  const ppm = num(svg.getAttribute("data-ppm"), 290); // pixels per metre
  const bodies: Body[] = [];
  const base = new Map<Element, string>();
  const keep = (el: Element) => {
    if (!base.has(el)) base.set(el, el.getAttribute("transform") ?? "");
    return base.get(el)!;
  };

  // Breathing: the chest rises about 1.2 % at 15 breaths a minute (0.25 Hz), each person at their own phase.
  svg.querySelectorAll<SVGGElement>(".art-chest").forEach((g, i) => {
    const b = g.getBBox();
    const px = b.x + b.width / 2,
      py = b.y;
    const phase = i * 1.7;
    bodies.push({
      step: (_dt, t) =>
        g.setAttribute(
          "transform",
          `translate(${px} ${py}) scale(1 ${1 + 0.012 * Math.sin(2 * Math.PI * 0.25 * t + phase)}) translate(${-px} ${-py})`,
        ),
    });
  });

  // Blinking: a blink lasts about 0.15 s, every 2.5 to 5.5 s.
  svg.querySelectorAll<SVGGElement>(".art-head").forEach((h) => {
    const lids = [...h.querySelectorAll<SVGPathElement>(".art-lid")];
    if (!lids.length) return;
    let next = 1 + Math.random() * 3;
    bodies.push({
      step: (_dt, t) => {
        const on = t > next && t < next + 0.15;
        for (const l of lids) l.setAttribute("opacity", on ? "1" : "0");
        if (t > next + 0.15) next = t + 2.5 + Math.random() * 3;
      },
    });
  });

  // Pendulums: braids, ID-card lanyards, earphone wires. Small swings, kept alive by the body's own sway.
  svg.querySelectorAll<SVGGElement>(".art-pendulum").forEach((g, i) => {
    const [px, py] = pivot(g);
    const L = num(g.getAttribute("data-len"), 0.4); // metres
    const w0 = Math.sqrt(G / L);
    let th = (Math.random() - 0.5) * 0.12,
      om = 0;
    const c = 0.6; // light air and cloth damping
    keep(g);
    bodies.push({
      step: (dt, t) => {
        const sway = 0.06 * Math.sin(2 * Math.PI * 0.25 * t + i); // the body sways gently with breathing
        const steps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          const a = -(w0 * w0) * Math.sin(th) - c * om + sway;
          om += a * h;
          th += om * h;
        }
        g.setAttribute("transform", `rotate(${(th * 180) / Math.PI} ${px} ${py})`);
      },
    });
  });

  // Gears: the first turns at a steady 40°/s, the meshed one the other way at 40 × teethA / teethB.
  const gears = [...svg.querySelectorAll<SVGGElement>(".art-gear")];
  if (gears.length >= 2) {
    const nA = num(gears[0]!.getAttribute("data-teeth"), 16);
    const nB = num(gears[1]!.getAttribute("data-teeth"), 10);
    const wA = 40;
    const wB = (-wA * nA) / nB;
    gears.forEach((g) => keep(g));
    bodies.push({
      step: (_dt, t) => {
        gears[0]!.setAttribute("transform", `${base.get(gears[0]!)} rotate(${wA * t})`);
        gears[1]!.setAttribute("transform", `${base.get(gears[1]!)} rotate(${wB * t + 180 / nB})`);
      },
    });
  }

  // The spark robot hops in and settles on a damped spring: 3 Hz, damping ratio 0.25.
  svg.querySelectorAll<SVGGElement>(".art-bot").forEach((bot) => {
    const t0 = keep(bot);
    const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(t0);
    if (!m) return;
    const bx = Number(m[1]),
      by = Number(m[2]),
      s = Number(m[3]);
    const w = 2 * Math.PI * 3,
      z = 0.25;
    let y = -0.12 * ppm,
      v = 0; // starts 12 cm up, in the air
    let landed = false;
    const ant = bot.querySelector<SVGGElement>(".art-antenna");
    let ath = 0,
      aom = 0;
    bodies.push({
      step: (dt) => {
        const steps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / steps;
        let acc = 0;
        for (let k = 0; k < steps; k++) {
          // free fall until it touches the floor, then the spring of its own legs takes over
          if (!landed) {
            v += G * ppm * h;
            y += v * h;
            if (y >= 0) {
              landed = true;
              v *= 0.6;
            }
            acc = G * ppm;
          } else {
            acc = -w * w * y - 2 * z * w * v;
            v += acc * h;
            y += v * h;
          }
          // the antenna is a stiff spring pendulum, shaken by the body's motion
          const aw = 2 * Math.PI * 5;
          const aa = -aw * aw * ath - 2 * 0.15 * aw * aom - (acc / ppm) * 0.02;
          aom += aa * h;
          ath += aom * h;
        }
        bot.setAttribute("transform", `translate(${bx} ${by + y}) scale(${s})`);
        if (ant) ant.setAttribute("transform", `rotate(${ath * 57.3 * 6} 0 -170)`);
      },
    });
  });

  // The dropped phone: held for a moment, then released. It falls under gravity, bounces once
  // off the pile in the box (restitution 0.35), settles, and the scene starts again.
  svg.querySelectorAll<SVGGElement>(".art-drop").forEach((ph) => {
    const t0 = keep(ph);
    const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*rotate\(([-\d.]+)\)/.exec(t0);
    if (!m) return;
    const x0 = Number(m[1]),
      y0 = Number(m[2]),
      r0 = Number(m[3]);
    const floor = 418; // top of the pile of phones, in scene pixels
    let y = y0,
      v = 0,
      r = r0,
      spin = 0,
      held = 0.9,
      rest = 0,
      bounced = false;
    bodies.push({
      step: (dt) => {
        if (held > 0) {
          held -= dt;
          spin = 90; // it tips out of the hand as it is let go
        } else if (rest <= 0) {
          v += G * ppm * dt;
          y += v * dt;
          r += spin * dt;
          if (y >= floor) {
            y = floor;
            if (!bounced && v > 40) {
              v = -0.35 * v;
              spin *= -0.4;
              bounced = true;
            } else {
              v = 0;
              spin = 0;
              rest = 2.2;
            }
          }
        } else {
          rest -= dt;
          if (rest <= 0) {
            y = y0;
            v = 0;
            r = r0;
            held = 1.4;
            bounced = false;
          }
        }
        ph.setAttribute("transform", `translate(${x0} ${y}) rotate(${r})`);
        ph.setAttribute("opacity", rest > 0 && rest < 0.4 ? String(rest / 0.4) : "1");
      },
    });
  });

  // Confetti with quadratic air drag: light paper squares reach about 1 m/s and flutter side to side.
  const confetti = svg.querySelector<SVGGElement>(".art-confetti");
  if (confetti) {
    const vb = svg.viewBox.baseVal;
    const cols = ["#FF5CB8", "#FFE066", "#F8F4F0", "#B7ABFF", "#5D7CFF"];
    const vt = 1.0; // terminal speed, m/s
    const k = G / (vt * vt);
    const bits = Array.from({ length: 46 }, (_, i) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      el.setAttribute("width", "10");
      el.setAttribute("height", "6");
      el.setAttribute("fill", cols[i % cols.length]!);
      confetti.appendChild(el);
      return {
        el,
        x: Math.random() * vb.width,
        y: -Math.random() * vb.height,
        v: Math.random() * vt * ppm,
        ph: Math.random() * 6.3,
        f: 0.6 + Math.random() * 0.8,
        spin: (Math.random() - 0.5) * 600,
        r: 0,
      };
    });
    bodies.push({
      step: (dt, t) => {
        for (const b of bits) {
          const vm = b.v / ppm; // m/s
          const a = G - k * vm * Math.abs(vm);
          b.v += a * ppm * dt;
          b.y += b.v * dt;
          b.r += b.spin * dt;
          if (b.y > vb.height + 10) {
            b.y = -10;
            b.x = Math.random() * vb.width;
            b.v = 0;
          }
          const x = b.x + 0.05 * ppm * Math.sin(2 * Math.PI * b.f * t + b.ph);
          b.el.setAttribute(
            "transform",
            `translate(${x} ${b.y}) rotate(${b.r}) scale(1 ${Math.cos(2 * Math.PI * b.f * t + b.ph)})`,
          );
        }
      },
    });
  }

  let raf = 0;
  let last = performance.now();
  const start = last;
  const tick = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const t = (now - start) / 1000;
    for (const b of bodies) b.step(dt, t);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    for (const [el, tr] of base) {
      if (tr) el.setAttribute("transform", tr);
      else el.removeAttribute("transform");
    }
    confetti?.replaceChildren();
  };
}
