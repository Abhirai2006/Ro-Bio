// The four Robo Spark scenes. Transparent backgrounds, so they sit on any slide or page.
// One light up and to the left: shadows fall down and to the right everywhere.
import { artDefs, INK, PAL, SKIN, person, sparkbot } from "./people";

const L = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;
const shade = (d: string, fill: string) =>
  `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#lit)"/><path d="${d}" fill="none" ${L}/>`;
/** Pixels per metre for a scene drawn with head height H: a person is 7.5 heads, about 1.65 m tall. */
export const pxPerMetre = (H: number) => (7.5 * H) / 1.65;
// Every scene gets its own ids for its gradients and patterns. Several scenes share a page (the deck has
// all of them), and a browser will not paint a fill whose definition sits in a hidden slide.
const IDS = [
  "litSoft",
  "lit",
  "hairLit",
  "castShadow",
  "kasuti",
  "checkShirt",
  "denimWeave",
  "aboveTable",
];
let made = 0;
const svg = (w: number, h: number, body: string, label: string, H = 60, key?: string) => {
  const k = key ?? `a${++made}`;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}" data-ppm="${pxPerMetre(H).toFixed(1)}">${artDefs}${body}</svg>`;
  for (const id of IDS)
    out = out.replace(new RegExp(`(id="|url\\(#)${id}(["\\)])`, "g"), `$1${k}-${id}$2`);
  return out;
};

/** A phone lying face up, its screen asleep. */
const phone = (x: number, y: number, r: number, s = 1, cls = "") =>
  `<g class="${cls}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${shade("M-15 -30 h30 a6 6 0 0 1 6 6 v48 a6 6 0 0 1 -6 6 h-30 a6 6 0 0 1 -6 -6 v-48 a6 6 0 0 1 6 -6 Z", "#24203f")}<rect x="-12" y="-24" width="24" height="44" rx="3" fill="#3a3570"/><text x="0" y="4" text-anchor="middle" font-family="Silkscreen, monospace" font-size="10" fill="${PAL.lilac}">zz</text></g>`;

/** Scene for "No phones": a student drops his phone into the Phone Parking box, the spark robot keeps watch. 640 x 610. */
export function scenePhones(key?: string) {
  const H = 64;
  const boy = person(250, 590, {
    H,
    skin: SKIN.warm,
    build: "m",
    hair: "short",
    top: "hoodie",
    color: PAL.violet,
    face: "wink",
    acc: ["earphones"],
    pose: { armL: [10, 4], armR: [62, 12], gripR: true, turn: 0.4 },
  });
  // The phone starts in his hand; the deck lets it fall into the box under gravity.
  const box = `<g>
    <ellipse cx="430" cy="592" rx="150" ry="16" fill="url(#castShadow)"/>
    ${shade("M300 450 h230 l-16 140 h-198 Z", PAL.violet)}
    ${shade("M292 428 h246 v26 h-246 Z", PAL.deep)}
    <text x="415" y="512" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="22" fill="${PAL.paper}">PHONE</text>
    <text x="415" y="540" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="22" fill="${PAL.paper}">PARKING</text>
    ${phone(350, 432, -14)}${phone(400, 428, 6)}${phone(462, 434, 18)}</g>`;
  const drop = phone(372, 352, 12, 1, "art-drop");
  return svg(
    640,
    610,
    `${box}${boy}${drop}${sparkbot(570, 590, 0.62, { mood: "stern", armL: -30, armR: 50, id: "bot-phones" })}`,
    "A student drops his phone into the Phone Parking box while the spark robot keeps watch",
    H,
    key,
  );
}

/** Scene for "60 missions": a team around a table with the mission card, gears turning in a thought bubble. 880 x 560. */
export function sceneTeam(key?: string) {
  const H = 52;
  const y = 560;
  // Sitting at the table: forearms rest on it, pointing in. One thinks with a hand on the chin, one has an idea.
  const people = [
    person(150, y + 92, {
      H,
      skin: SKIN.brown,
      build: "m",
      hair: "curly",
      top: "tee",
      color: PAL.deep,
      face: "think",
      acc: ["glasses"],
      bust: true,
      pose: { armL: [12, -82], armR: [22, -158], gripR: true, turn: 0.3 },
    }),
    person(330, y + 86, {
      H,
      skin: SKIN.wheat,
      build: "f",
      hair: "long",
      top: "kurta",
      color: PAL.lilac,
      face: "wow",
      acc: ["bindi"],
      bust: true,
      pose: { armL: [10, -78], armR: [10, -78] },
    }),
    person(520, y + 92, {
      H,
      skin: SKIN.deep,
      build: "m",
      hair: "short",
      top: "check",
      face: "smile",
      acc: ["watch"],
      bust: true,
      pose: { armL: [12, -80], armR: [150, 176], turn: -0.3 },
    }),
    person(710, y + 94, {
      H,
      skin: SKIN.warm,
      build: "f",
      hair: "bun",
      top: "hoodie",
      color: "#8F80FF",
      face: "think",
      acc: ["lanyard"],
      bust: true,
      pose: { armL: [10, -84], armR: [10, -66], gripR: true, turn: -0.4 },
    }),
  ].join("");
  const seated = `<defs><clipPath id="aboveTable"><rect x="0" y="0" width="880" height="452"/></clipPath></defs><g clip-path="url(#aboveTable)">${people}</g>`;
  const table = `${shade("M20 430 h840 l-30 50 h-780 Z", "#8C6A4E")}<path d="M60 480 v80 M820 480 v80" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <ellipse cx="470" cy="482" rx="400" ry="10" fill="#000" opacity=".18"/>`;
  const card = `<g transform="translate(420 432) rotate(-3)"><ellipse cx="14" cy="4" rx="118" ry="8" fill="#000" opacity=".2"/>${shade("M-110 -36 h220 v60 h-220 Z", PAL.paper)}
    <text x="0" y="-8" text-anchor="middle" font-family="Rubik Mono One, Tektur, sans-serif" font-size="20" fill="${PAL.violet}">MISSION 17</text>
    <path d="M-84 8 h168 M-84 18 h110" stroke="${PAL.lilac}" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="translate(250 428) rotate(74)"><rect x="-4" y="-50" width="8" height="58" rx="2" fill="${PAL.yellow}" ${L}/><path d="M-4 8 l4 10 l4 -10 z" fill="${INK}"/></g>`;
  // Two meshing gears: 16 teeth and 10 teeth. Meshed gears turn opposite ways at speeds in the ratio 10:16.
  const gear = (cx: number, cy: number, teeth: number, r: number, c: string, cls: string) => {
    const t = Array.from(
      { length: teeth },
      (_, i) =>
        `<rect x="-3.6" y="${-r - 7}" width="7.2" height="10" rx="1.5" transform="rotate(${(360 / teeth) * i})"/>`,
    ).join("");
    return `<g class="${cls}" data-teeth="${teeth}" transform="translate(${cx} ${cy})"><g fill="${c}" ${L}>${t}<circle r="${r}"/></g><circle r="${r * 0.32}" fill="${PAL.paper}" ${L}/></g>`;
  };
  const bubble = `<g><circle cx="560" cy="200" r="9" fill="${PAL.paper}" ${L}/><circle cx="590" cy="160" r="14" fill="${PAL.paper}" ${L}/>
    <path d="M610 120 c -40 0 -40 -62 0 -62 c 4 -40 70 -46 86 -14 c 30 -30 96 -8 84 34 c 40 14 26 74 -16 70 c -14 30 -78 28 -88 6 c -30 18 -82 0 -66 -34 z" fill="${PAL.paper}" ${L}/>
    ${gear(680, 84, 16, 32, PAL.yellow, "art-gear")}${gear(733, 64, 10, 20, PAL.lilac, "art-gear art-gear-b")}</g>`;
  return svg(
    880,
    560,
    `${bubble}${seated}${table}${card}${sparkbot(800, 430, 0.42, { mood: "happy", armL: 60, armR: 70, id: "bot-team" })}`,
    "A team of four students around a table with the Mission 17 card, thinking together",
    H,
    key,
  );
}

/** Scene for "Flip your card": a student holds up her own robot sketch; the spark robot is amazed. 540 x 820. */
export function scenePen(key?: string) {
  const H = 86;
  const sketch = (
    w: [number, number],
  ) => `<g transform="translate(${w[0] - 70} ${w[1] - 225}) rotate(-5)">
    ${shade("M0 0 h190 v240 h-190 Z", PAL.paper)}
    <g fill="none" stroke="${PAL.deep}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="55" y="40" width="80" height="54" rx="7"/><circle cx="78" cy="66" r="6"/><circle cx="112" cy="66" r="6"/>
      <rect x="45" y="104" width="100" height="74" rx="8"/><path d="M45 124 h-32 M145 124 h32 M70 178 v30 M120 178 v30 M95 40 v-20"/>
      <circle cx="95" cy="16" r="5"/></g>
    <text x="95" y="226" text-anchor="middle" font-family="Silkscreen, monospace" font-size="15" fill="${PAL.violet}">FARM-BOT V1</text></g>`;
  const girl = person(270, 800, {
    H,
    skin: SKIN.deep,
    build: "f",
    hair: "braid",
    top: "tee",
    color: PAL.violet,
    face: "smile",
    acc: ["lanyard"],
    pose: { armL: [32, 158], armR: [10, 6], gripL: true, turn: 0.2 },
    holdL: sketch,
  });
  return svg(
    540,
    820,
    `${girl}${sparkbot(440, 800, 0.62, { mood: "wow", armL: 70, armR: 20, id: "bot-pen" })}`,
    "A student proudly holds up her hand-drawn robot sketch",
    H,
    key,
  );
}

/** Scene for "On stage": two students present; the spark robot cheers; confetti falls. 640 x 700. */
export function sceneStage(key?: string) {
  const H = 62;
  // The mic stand stands just in front of her, the mic angled at her mouth.
  const mic = `<g><path d="M270 690 v-350" stroke="${INK}" stroke-width="7"/><path d="M232 690 h76" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M270 342 l-34 -26" stroke="${INK}" stroke-width="6"/><rect x="214" y="296" width="16" height="30" rx="7" fill="#333" ${L} transform="rotate(52 222 311)"/></g>`;
  const speaker = person(180, 690, {
    H,
    skin: SKIN.brown,
    build: "f",
    hair: "braid",
    top: "kurta",
    color: PAL.yellow,
    face: "talk",
    acc: ["bindi"],
    pose: { armL: [150, 170], armR: [30, -40], turn: 0.3 },
  });
  const notes = (w: [number, number]) =>
    `<g transform="translate(${w[0] - 44} ${w[1] - 110}) rotate(8)">${shade("M0 0 h84 v108 h-84 Z", PAL.paper)}<path d="M14 24 h56 M14 44 h56 M14 64 h40" stroke="${PAL.violet}" stroke-width="5" stroke-linecap="round"/></g>`;
  const friend = person(470, 690, {
    H,
    skin: SKIN.warm,
    build: "m",
    hair: "short",
    top: "check",
    face: "smile",
    acc: ["cap"],
    pose: { armL: [30, 150], armR: [10, 4], gripL: true, turn: -0.3 },
    holdL: notes,
  });
  return svg(
    640,
    700,
    `${speaker}${mic}${friend}${sparkbot(575, 690, 0.5, { mood: "happy", armL: 80, armR: 80, id: "bot-stage" })}<g class="art-confetti"></g>`,
    "Two students present their idea on stage while the spark robot cheers",
    H,
    key,
  );
}
