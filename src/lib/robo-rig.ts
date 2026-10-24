// "Robo": a full-body robot built as a skeleton of nested SVG groups. Pure functions only, so the same code
// renders on the server, drives the animation in the browser, and can be rendered in tests.
// Standing space: origin at the pelvis, y down, the feet end near y = 104, the floor is at y = 106.

export type Pose = {
  rx: number; ry: number; rr: number; // whole body position and rotation
  spine: number; hr: number; // torso bend, head turn
  aLs: number; aLe: number; aRs: number; aRe: number; // arms: shoulder outward, elbow inward (left is the viewer's left)
  lLh: number; lLk: number; lRh: number; lRk: number; // legs: hip outward, knee inward
  eye: number; mouth: number; // 0 closed, 1 open
  lx: number; ly: number; // where the pupils look, in pixels
  breath: number; beat: number; // 0..1, driven by the animation loop
};

export const REST: Pose = {
  rx: 0, ry: 0, rr: 0, spine: 0, hr: 0,
  aLs: 8, aLe: 8, aRs: 8, aRe: 8, lLh: 3, lLk: 0, lRh: 3, lRk: 0,
  eye: 1, mouth: 0, lx: 0, ly: 0, breath: 0, beat: 0,
};
const P = (o: Partial<Pose>): Pose => ({ ...REST, ...o });

export const POSES = {
  // Lying on its side, head propped on one hand, like a figure reclining at rest.
  sleep: P({ rx: 26, ry: 51, rr: -90, hr: 12, aLs: 150, aLe: -120, aRs: 6, aRe: 14, lLh: -2, lLk: 22, lRh: 4, lRk: 58, eye: 0, mouth: 0.05 }),
  // Sitting up, legs still stretched out.
  sit: P({ rx: -4, ry: 84, rr: -90, spine: 90, hr: 6, aLs: 24, aLe: 20, aRs: 24, aRe: 20, eye: 0.55, mouth: 0.1 }),
  stand: P({}),
  // Both arms overhead, head back, mouth wide: a proper yawn.
  yawn: P({ spine: -7, hr: -14, aLs: 158, aLe: 12, aRs: 158, aRe: 12, lLh: 8, lRh: 8, eye: 0.08, mouth: 1 }),
  // A hand to the chin.
  think: P({ aRs: 62, aRe: 212, hr: 7, lRh: 3 }),
  wave: P({ aRs: 118, aRe: -8, hr: -4, mouth: 0.35 }),
  // Being carried: arms up, legs dangling.
  held: P({ aLs: 150, aLe: 10, aRs: 150, aRe: 10, lLh: 10, lLk: 14, lRh: 6, lRk: 10, mouth: 0.4 }),
} as const;

const f = (n: number) => n.toFixed(2);

/** Every joint as an SVG transform. */
export function transforms(p: Pose): Record<string, string> {
  const s = (v: number) => (1 + v).toFixed(3);
  return {
    root: `translate(${f(p.rx)} ${f(p.ry)}) rotate(${f(p.rr)})`,
    torso: `rotate(${f(p.spine)})`,
    chest: `translate(0 -45) scale(${s(0.03 * p.breath)} ${s(0.014 * p.breath)}) translate(0 45)`,
    head: `translate(0 -92) rotate(${f(p.hr)})`,
    armL: `translate(-30 -72) rotate(${f(p.aLs)})`, foreL: `translate(0 38) rotate(${f(-p.aLe)})`,
    armR: `translate(30 -72) rotate(${f(-p.aRs)})`, foreR: `translate(0 38) rotate(${f(p.aRe)})`,
    legL: `translate(-13 6) rotate(${f(p.lLh)})`, shinL: `translate(0 46) rotate(${f(-p.lLk)})`,
    legR: `translate(13 6) rotate(${f(-p.lRh)})`, shinR: `translate(0 46) rotate(${f(p.lRk)})`,
    lidL: `translate(-8 -32) scale(1 ${f(Math.max(0.001, 1 - p.eye))})`, lidR: `translate(8 -32) scale(1 ${f(Math.max(0.001, 1 - p.eye))})`,
    pupilL: `translate(${f(p.lx)} ${f(p.ly)})`, pupilR: `translate(${f(p.lx)} ${f(p.ly)})`,
    mouth: `translate(0 -6) scale(1 ${f(0.12 + 0.88 * p.mouth)})`,
    heart: `translate(5 -47) scale(${s(0.24 * p.beat)})`,
    lungs: `translate(0 -50) scale(${s(0.07 * p.breath)} ${s(0.05 * p.breath)}) translate(0 50)`,
  };
}

/** Things that fade rather than move. */
export function opacities(p: Pose): Record<string, string> {
  const shut = p.eye < 0.35 ? 1 : 0;
  return { closedL: String(shut), closedR: String(shut) };
}

const INK = "#15131c", BONE = "#efe9d8", BONE_LINE = "#a99f86", PINK = "#f3a9c0", RED = "#e24d63";
const T = (tf: Record<string, string>, id: string) => `id="rb-${id}" transform="${tf[id]}"`;
const capsule = (w: number, len: number, fill: string, cls = "shell") =>
  `<rect class="${cls}" x="${-w / 2}" y="${-w / 2 + 1}" width="${w}" height="${len + w - 2}" rx="${w / 2}" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
const bone = (x1: number, y1: number, x2: number, y2: number, w: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BONE}" stroke-width="${w}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BONE_LINE}" stroke-width="1" stroke-linecap="round" opacity=".6"/>`;
const joint = (r: number) => `<circle class="shell" r="${r}" fill="#fffffa" stroke="${INK}" stroke-width="2"/>`;

function arm(side: "L" | "R", tf: Record<string, string>) {
  const hand = `<rect class="shell" x="-6.5" y="${side === "L" ? 33 : 33}" width="13" height="13" rx="5" fill="#fffffa" stroke="${INK}" stroke-width="2"/>
    <g class="bones"><line x1="-3" y1="38" x2="-3" y2="45" stroke="${BONE}" stroke-width="2.4" stroke-linecap="round"/><line x1="0" y1="38" x2="0" y2="46" stroke="${BONE}" stroke-width="2.4" stroke-linecap="round"/><line x1="3" y1="38" x2="3" y2="45" stroke="${BONE}" stroke-width="2.4" stroke-linecap="round"/></g>`;
  return `<g ${T(tf, "arm" + side)}>
    ${capsule(12, 38, "var(--lilac)")}<g class="bones">${bone(0, 0, 0, 38, 5)}<circle r="4.5" fill="${BONE}" stroke="${BONE_LINE}"/></g>
    ${joint(7.5)}
    <g ${T(tf, "fore" + side)}>
      ${capsule(11, 36, "var(--violet)")}<g class="bones">${bone(-1.6, 0, -1.6, 36, 3.4)}${bone(1.8, 0, 1.8, 36, 3.4)}</g>
      ${joint(6)}${hand}
    </g>
  </g>`;
}

function leg(side: "L" | "R", tf: Record<string, string>) {
  return `<g ${T(tf, "leg" + side)}>
    ${capsule(17, 46, "#2d2a40")}<rect class="shell" x="-2" y="8" width="4" height="30" rx="2" fill="var(--lilac)"/>
    <g class="bones">${bone(0, 0, 0, 46, 6)}<circle r="5.5" fill="${BONE}" stroke="${BONE_LINE}"/></g>
    ${joint(9)}
    <g ${T(tf, "shin" + side)}>
      ${capsule(14, 44, "var(--violet)")}<g class="bones">${bone(0, 0, 0, 44, 5)}<circle cx="0" cy="-1" r="4.2" fill="${BONE}" stroke="${BONE_LINE}"/></g>
      <rect class="shell" x="${side === "L" ? -13 : -10}" y="42" width="23" height="11" rx="5" fill="var(--lilac)" stroke="${INK}" stroke-width="2"/>
      <g class="bones"><rect x="${side === "L" ? -9 : -6}" y="44" width="15" height="5" rx="2.5" fill="${BONE}"/></g>
    </g>
  </g>`;
}

/** The whole robot as an SVG string. Server-rendered in the sleeping pose, then updated by the animation loop. */
export function rigMarkup(p: Pose, xray = false, floor = true): string {
  const tf = transforms(p), op = opacities(p);
  const ticks = [-100, -60, -20, 20, 60, 100].map((x) => `<line x1="${x}" y1="115" x2="${x}" y2="119" stroke="${INK}" stroke-width="2"/>`).join("");
  const floorSvg = floor
    ? `<ellipse cx="0" cy="111" rx="112" ry="5" fill="rgba(0,0,0,.2)"/><rect x="-124" y="106" width="248" height="9" fill="${INK}"/><rect x="-124" y="106" width="248" height="2.5" fill="#fffffa" opacity=".85"/>${ticks}`
    : "";
  return `<svg class="rb" data-x="${xray ? 1 : 0}" viewBox="-130 -160 260 284" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robo, a friendly robot with a biological skeleton inside. It starts asleep, wakes up, and then follows your cursor with its eyes.">
<style>
.rb{display:block;width:100%;height:100%}.rb .shell,.rb .keep{transition:opacity .4s}.rb .bones{opacity:0;transition:opacity .4s}
.rb[data-x="1"] .shell{opacity:.13}.rb[data-x="1"] .bones{opacity:1}
.rb .zz{opacity:0}.rb[data-phase="sleep"] .zz{opacity:1;animation:rbz 3.2s ease-in-out infinite}
.rb[data-phase="sleep"] .zz:nth-child(2){animation-delay:1s}.rb[data-phase="sleep"] .zz:nth-child(3){animation-delay:2s}
@keyframes rbz{0%{transform:translate(0,8px);opacity:0}25%{opacity:1}100%{transform:translate(10px,-26px);opacity:0}}
@media (prefers-reduced-motion:reduce){.rb[data-phase="sleep"] .zz{animation:none}}
</style>
${floorSvg}
<g ${T(tf, "root")}>
  ${leg("L", tf)}${leg("R", tf)}
  <rect class="shell" x="-25" y="-9" width="50" height="22" rx="7" fill="${INK}"/>
  <g class="bones"><path d="M-21,-6 Q0,10 21,-6 L16,12 Q0,20 -16,12Z" fill="${BONE}" stroke="${BONE_LINE}"/></g>
  <g ${T(tf, "torso")}>
    <g ${T(tf, "chest")}>
      <rect class="shell" x="-28" y="-84" width="56" height="78" rx="13" fill="var(--violet)" stroke="${INK}" stroke-width="2"/>
      <rect class="shell" x="-17" y="-72" width="34" height="36" rx="7" fill="var(--lilac)" stroke="${INK}" stroke-width="1.6"/>
      <circle class="shell" cx="0" cy="-54" r="8" fill="${INK}"/><circle class="shell" cx="0" cy="-54" r="4.2" fill="var(--lens)"/>
      <rect class="shell" x="-18" y="-28" width="36" height="5" rx="2.5" fill="${INK}"/><rect class="shell" x="-18" y="-19" width="36" height="5" rx="2.5" fill="${INK}"/>
      <g class="bones">
        ${[-84, -76, -68, -60, -52, -44, -36, -28, -20, -12].map((y) => `<rect x="-3.2" y="${y}" width="6.4" height="6" rx="2" fill="${BONE}" stroke="${BONE_LINE}" stroke-width=".8"/>`).join("")}
        <g ${T(tf, "lungs")}><ellipse cx="-13" cy="-52" rx="10" ry="17" fill="#f7c6d2" stroke="#c98a9c"/><ellipse cx="13" cy="-52" rx="10" ry="17" fill="#f7c6d2" stroke="#c98a9c"/></g>
        ${[0, 1, 2, 3, 4].map((i) => { const y = -70 + i * 9; return `<path d="M-2,${y} Q-25,${y - 2} -23,${y + 10} Q-15,${y + 17} -3,${y + 13}" fill="none" stroke="${BONE}" stroke-width="3" stroke-linecap="round"/><path d="M2,${y} Q25,${y - 2} 23,${y + 10} Q15,${y + 17} 3,${y + 13}" fill="none" stroke="${BONE}" stroke-width="3" stroke-linecap="round"/>`; }).join("")}
        <rect x="-2.6" y="-72" width="5.2" height="30" rx="2.4" fill="${BONE}" stroke="${BONE_LINE}" stroke-width=".8"/>
        <path ${T(tf, "heart")} d="M0,8 C-11,-2 -10,-13 0,-8 C10,-13 11,-2 0,8Z" fill="${RED}" stroke="#9d2a3c" stroke-width="1.4"/>
      </g>
    </g>
    <rect class="shell" x="-6.5" y="-98" width="13" height="18" rx="3" fill="${INK}"/><g class="bones">${bone(0, -96, 0, -82, 5)}</g>
    ${arm("L", tf)}${arm("R", tf)}
    <g ${T(tf, "head")}>
      <line class="shell" x1="0" y1="-44" x2="0" y2="-55" stroke="${INK}" stroke-width="2.4"/><circle class="shell" cx="0" cy="-57" r="3.6" fill="var(--lens)" stroke="${INK}" stroke-width="1.6"/>
      <circle class="shell" cx="-25" cy="-22" r="6.5" fill="var(--lilac)" stroke="${INK}" stroke-width="2"/><circle class="shell" cx="25" cy="-22" r="6.5" fill="var(--lilac)" stroke="${INK}" stroke-width="2"/>
      <g class="bones"><ellipse cx="0" cy="-24" rx="21" ry="21.5" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="1.4"/>
        <path d="M-14,-35 Q-18,-43 -8,-44 Q-3,-50 4,-45 Q13,-48 14,-38 Q19,-30 12,-27 Q6,-22 -1,-26 Q-10,-23 -14,-35Z" fill="${PINK}" stroke="#c76b8c" stroke-width="1.2"/>
        <path d="M-9,-38 Q-4,-34 -8,-30 M-1,-42 Q3,-37 -1,-33 M7,-40 Q11,-36 6,-31" fill="none" stroke="#c76b8c" stroke-width=".9"/>
        <path d="M-9,-8 L-9,-1 M-3,-8 L-3,-1 M3,-8 L3,-1 M9,-8 L9,-1" stroke="${BONE_LINE}" stroke-width="1.4"/></g>
      <rect class="shell" x="-23" y="-46" width="46" height="46" rx="14" fill="var(--violet)" stroke="${INK}" stroke-width="2"/>
      <rect class="shell" x="-17.5" y="-38" width="35" height="26" rx="10" fill="${INK}"/>
      <g class="keep">
        <ellipse cx="-8" cy="-25" rx="5.6" ry="7" fill="var(--lens)"/><ellipse cx="8" cy="-25" rx="5.6" ry="7" fill="var(--lens)"/>
        <circle ${T(tf, "pupilL")} cx="-8" cy="-25" r="2.4" fill="#fffffa"/><circle ${T(tf, "pupilR")} cx="8" cy="-25" r="2.4" fill="#fffffa"/>
        <rect ${T(tf, "lidL")} x="-6.5" y="0" width="13" height="14" fill="${INK}"/><rect ${T(tf, "lidR")} x="-6.5" y="0" width="13" height="14" fill="${INK}"/>
        <path id="rb-closedL" opacity="${op.closedL}" d="M-13,-24 Q-8,-19 -3,-24" fill="none" stroke="var(--lens)" stroke-width="2.2" stroke-linecap="round"/>
        <path id="rb-closedR" opacity="${op.closedR}" d="M3,-24 Q8,-19 13,-24" fill="none" stroke="var(--lens)" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse ${T(tf, "mouth")} cx="0" cy="0" rx="6.5" ry="6" fill="${INK}" stroke="#fffffa" stroke-width="1.4"/>
      </g>
    </g>
  </g>
</g>
<g id="rb-zzz" fill="var(--lens)" font-family="monospace" font-weight="700" stroke="${INK}" stroke-width=".6">
  <text class="zz" x="-96" y="22" font-size="15">z</text><text class="zz" x="-84" y="8" font-size="20">z</text><text class="zz" x="-70" y="-8" font-size="26">Z</text>
</g>
</svg>`;
}
