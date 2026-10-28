// Robo in profile, facing right, for walking, running and jumping. Same colours and parts as the front view.
// Angles are in degrees and "forward" is positive for hips, shoulders and elbows. Flip the whole thing to face left.
// Standing space matches robo-rig.ts: origin at the pelvis, y down, the floor line at y = 106.

export type WalkPose = {
  hN: number; kN: number; hF: number; kF: number; // hip and knee, near and far leg
  sN: number; eN: number; sF: number; eF: number; // shoulder and elbow, near and far arm
  lean: number; head: number; eye: number; lx: number; // torso lean, head tilt, eye open (0..1), pupil shift
};

export const WALK_IDLE: WalkPose = { hN: 2, kN: 0, hF: -2, kF: 0, sN: 4, eN: 12, sF: -4, eF: 12, lean: 0, head: 0, eye: 1, lx: 1 };

/** One step of the walk cycle. phase is in radians, amp is 1 for a walk and about 1.55 for a run. */
export function walkCycle(phase: number, amp = 1): WalkPose {
  const s = Math.sin(phase), c = Math.cos(phase);
  const swingN = Math.max(0, c), swingF = Math.max(0, -c); // a leg swings forward while its hip angle is rising
  return {
    hN: 26 * amp * s, hF: -26 * amp * s,
    kN: 6 + 44 * amp * Math.pow(swingN, 1.4), kF: 6 + 44 * amp * Math.pow(swingF, 1.4),
    sN: -24 * amp * s, sF: 24 * amp * s,
    eN: 16 + 16 * amp * Math.max(0, s), eF: 16 + 16 * amp * Math.max(0, -s),
    lean: 3 + 5 * (amp - 1) * 2, head: -1.5 * amp * Math.cos(phase * 2), eye: 1, lx: 1.2,
  };
}
export const WALK_JUMP: WalkPose = { hN: 58, kN: 78, hF: 34, kF: 64, sN: -112, eN: 24, sF: -96, eF: 30, lean: 10, head: -6, eye: 1, lx: 1.4 };
export const WALK_FALL: WalkPose = { hN: 24, kN: 14, hF: -18, kF: 30, sN: -66, eN: 18, sF: -74, eF: 18, lean: 2, head: -4, eye: 1, lx: 1 };

const THIGH = 46, SHIN = 44, SOLE = 9, FLOOR = 106;
const rad = (d: number) => (d * Math.PI) / 180;
/** How far to shift the body so the lowest foot always rests exactly on the floor line. */
export function groundShift(p: WalkPose) {
  const sole = (h: number, k: number) => 6 + THIGH * Math.cos(rad(h)) + SHIN * Math.cos(rad(h - k)) + SOLE;
  return FLOOR - Math.max(sole(p.hN, p.kN), sole(p.hF, p.kF));
}

const f = (n: number) => n.toFixed(2);
export function walkTransforms(p: WalkPose, grounded = true): Record<string, string> {
  return {
    root: `translate(0 ${f(grounded ? groundShift(p) : 0)})`,
    torso: `rotate(${f(p.lean)})`,
    head: `translate(0 -92) rotate(${f(p.head)})`,
    armN: `translate(0 -72) rotate(${f(-p.sN)})`, foreN: `translate(0 38) rotate(${f(-p.eN)})`,
    armF: `translate(0 -72) rotate(${f(-p.sF)})`, foreF: `translate(0 38) rotate(${f(-p.eF)})`,
    legN: `translate(0 6) rotate(${f(-p.hN)})`, shinN: `translate(0 46) rotate(${f(p.kN)})`, footN: `translate(0 44) rotate(${f(p.hN - p.kN)})`,
    legF: `translate(0 6) rotate(${f(-p.hF)})`, shinF: `translate(0 46) rotate(${f(p.kF)})`, footF: `translate(0 44) rotate(${f(p.hF - p.kF)})`,
    lid: `translate(12.5 -32) scale(1 ${f(Math.max(0.001, 1 - p.eye))})`,
    pupil: `translate(${f(p.lx)} 0)`,
  };
}

const INK = "#15131c";
const id = (tf: Record<string, string>, n: string) => `id="rw-${n}" transform="${tf[n]}"`;
const cap = (w: number, len: number, fill: string) => `<rect x="${-w / 2}" y="${-w / 2 + 1}" width="${w}" height="${len + w - 2}" rx="${w / 2}" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
const joint = (r: number) => `<circle r="${r}" fill="#fffffa" stroke="${INK}" stroke-width="2"/>`;

function arm(side: "N" | "F", tf: Record<string, string>) {
  const far = side === "F";
  return `<g ${id(tf, "arm" + side)}>${cap(12, 38, far ? "#8a5fe0" : "var(--lilac)")}${joint(7)}
    <g ${id(tf, "fore" + side)}>${cap(11, 36, far ? "#5a48d6" : "var(--violet)")}${joint(5.5)}<circle cx="0" cy="40" r="6.5" fill="#fffffa" stroke="${INK}" stroke-width="2"/></g></g>`;
}
function leg(side: "N" | "F", tf: Record<string, string>) {
  const far = side === "F";
  return `<g ${id(tf, "leg" + side)}>${cap(17, 46, far ? "#1c1a2b" : "#2d2a40")}${joint(8.5)}
    <g ${id(tf, "shin" + side)}>${cap(14, 44, far ? "#5a48d6" : "var(--violet)")}
      <g ${id(tf, "foot" + side)}><rect x="-7" y="-1" width="25" height="11" rx="5" fill="${far ? "#8a5fe0" : "var(--lilac)"}" stroke="${INK}" stroke-width="2"/>
        <g class="flame"><path d="M-3,10 L4,24 L11,10Z" fill="#ffb347"/><path d="M0,10 L4,19 L8,10Z" fill="#fff3b0"/></g></g>
    </g></g>`;
}

/** The profile robot as an SVG string. */
export function walkMarkup(p: WalkPose = WALK_IDLE): string {
  const tf = walkTransforms(p);
  return `<svg class="rw" viewBox="-130 -160 260 284" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<style>.rw{display:block;width:100%;height:100%;overflow:visible}.rw .shadow{transition:opacity .2s}.rw[data-air="1"] .shadow{opacity:0}.rw .flame{opacity:0}.rw[data-fly="1"] .flame{opacity:1;animation:rwf .12s linear infinite alternate}@keyframes rwf{to{transform:scale(1,1.3)}}</style>
<ellipse class="shadow" cx="4" cy="106" rx="32" ry="5" fill="rgba(21,19,28,.16)"/>
<g ${id(tf, "root")}>
  ${arm("F", tf)}${leg("F", tf)}
  <g ${id(tf, "torso")}>
    <rect x="-24" y="-76" width="11" height="44" rx="4" fill="${INK}"/><circle cx="-18.5" cy="-66" r="2.4" fill="var(--lens)"/>
    <rect x="-15" y="-84" width="30" height="78" rx="11" fill="var(--violet)" stroke="${INK}" stroke-width="2"/>
    <rect x="-3" y="-72" width="15" height="34" rx="6" fill="var(--lilac)" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="5" cy="-54" r="7" fill="${INK}"/><circle cx="5" cy="-54" r="3.6" fill="var(--lens)"/>
    <rect x="-14" y="-28" width="26" height="4.5" rx="2" fill="${INK}"/><rect x="-14" y="-19" width="26" height="4.5" rx="2" fill="${INK}"/>
    <rect x="-11" y="-79" width="4" height="52" rx="2" fill="#fffffa" opacity=".22"/>
    <rect x="-5" y="-98" width="10" height="18" rx="3" fill="${INK}"/>
    <g ${id(tf, "head")}><g transform="scale(1.14)">
      <line x1="-2" y1="-44" x2="-3" y2="-55" stroke="${INK}" stroke-width="2.4"/><circle cx="-3" cy="-57" r="3.6" fill="var(--lens)" stroke="${INK}" stroke-width="1.6"/>
      <rect x="-18" y="-46" width="40" height="46" rx="14" fill="var(--violet)" stroke="${INK}" stroke-width="2"/>
      <circle cx="-5" cy="-22" r="7" fill="var(--lilac)" stroke="${INK}" stroke-width="2"/>
      <rect x="2" y="-38" width="20" height="26" rx="10" fill="${INK}"/>
      <ellipse cx="12.5" cy="-25" rx="5.4" ry="7" fill="var(--lens)"/><circle ${id(tf, "pupil")} cx="13.5" cy="-25" r="2.3" fill="#fffffa"/>
      <path d="M6,-34.5 Q12,-36 18,-34.5" fill="none" stroke="#fffffa" stroke-opacity=".32" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="16" cy="-15.5" rx="3" ry="1.9" fill="#f3a9c0" opacity=".8"/>
      <rect ${id(tf, "lid")} x="-6.5" y="0" width="13" height="14" fill="${INK}"/>
    </g></g>
  </g>
  ${leg("N", tf)}${arm("N", tf)}
</g>
</svg>`;
}
