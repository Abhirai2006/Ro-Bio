// The puppet rigs for the squad illustrations: which parts of each drawing move, around which pivot,
// and how. Coordinates are in the 1600 x 900 frame of the artwork. Motion helpers are in ./puppet.
// Every loop runs forever; a tap (or hovering the picture) makes a person act it out more.
import { beat, drift, wave, type Rig } from "./puppet";
import type { SquadSlug } from "./squad-fx";

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** TECHNICAL: the blond coder scratches his head at the bug list, the others work and listen. */
const technical: Rig = {
  parts: [
    {
      // Blond coder: head shakes a little as he stares at the bugs.
      id: "blond-head",
      poly: [
        [1020, 350],
        [1060, 335],
        [1110, 345],
        [1122, 380],
        [1118, 420],
        [1110, 460],
        [1090, 470],
        [1060, 455],
        [1030, 445],
        [1018, 420],
        [1015, 380],
      ],
      feather: 26,
      pivot: [1082, 482],
      wakes: ["blond-hand-r", "blond-hand-l"],
      move: (t, b) => ({
        r: 1.4 * drift(t, 1) + (1 + 2 * b) * 1.2 * wave(t, 0.7) * beat(t, 5, 1, 2.2),
      }),
    },
    {
      // His right hand rubs his hair, turning about the elbow.
      id: "blond-hand-r",
      poly: [
        [1060, 338],
        [1100, 328],
        [1132, 340],
        [1152, 360],
        [1186, 382],
        [1206, 410],
        [1206, 436],
        [1186, 442],
        [1162, 424],
        [1136, 404],
        [1106, 392],
        [1078, 386],
        [1062, 372],
      ],
      feather: 18,
      pivot: [1206, 446],
      hit: [
        [1040, 320],
        [1220, 330],
        [1230, 470],
        [1000, 470],
      ],
      wakes: ["blond-hand-l", "blond-head"],
      move: (t, b) => {
        const k = lerp(1, 2.2, b);
        return {
          r: k * (1.6 * wave(t, 0.42) + 0.5 * wave(t, 0.21, 0.3)),
          x: 1.2 * k * wave(t, 0.42, 0.25),
        };
      },
    },
    {
      // His left hand scratches too, out of step with the right one.
      id: "blond-hand-l",
      poly: [
        [1000, 345],
        [1035, 336],
        [1062, 348],
        [1068, 378],
        [1052, 400],
        [1026, 406],
        [1002, 400],
        [986, 384],
      ],
      feather: 18,
      pivot: [976, 404],
      hit: [
        [960, 320],
        [1070, 320],
        [1070, 420],
        [960, 420],
      ],
      wakes: ["blond-hand-r", "blond-head"],
      move: (t, b) => {
        const k = lerp(1, 2.2, b);
        return { r: -k * 2.2 * wave(t, 0.5, 0.4), y: 1.2 * k * wave(t, 0.25) };
      },
    },
    {
      // Purple hoodie: nods along to the music in his earpiece.
      id: "hoodie-head",
      poly: [
        [405, 370],
        [430, 330],
        [480, 315],
        [530, 320],
        [560, 345],
        [565, 380],
        [555, 430],
        [540, 470],
        [520, 500],
        [500, 530],
        [470, 540],
        [440, 530],
        [425, 510],
        [410, 490],
        [410, 450],
        [398, 410],
      ],
      feather: 30,
      pivot: [505, 565],
      move: (t, b) => {
        const k = lerp(1, 2, b);
        const n = Math.pow(Math.max(0, wave(t, 0.92)), 2); // a nod on every beat
        return { r: -k * (2.2 * n + 0.6 * drift(t, 3)) };
      },
    },
    {
      // Glasses: leans over the board, head bobbing as he concentrates.
      id: "glasses-head",
      poly: [
        [790, 400],
        [810, 360],
        [860, 345],
        [920, 355],
        [962, 400],
        [958, 440],
        [940, 480],
        [930, 530],
        [900, 555],
        [865, 560],
        [830, 545],
        [800, 500],
        [785, 460],
      ],
      feather: 28,
      pivot: [862, 590],
      wakes: ["glasses-hand-l", "glasses-hand-r"],
      move: (t, b) => ({ r: (1 + b) * (1.1 * drift(t, 7)), y: 1.5 * beat(t, 4.2, 0.5, 1.2) }),
    },
    {
      id: "glasses-hand-l",
      poly: [
        [870, 700],
        [920, 690],
        [960, 700],
        [975, 730],
        [965, 765],
        [930, 770],
        [890, 760],
        [870, 735],
      ],
      feather: 26,
      pivot: [860, 735],
      wakes: ["glasses-hand-r"],
      move: (t, b) => {
        const k = lerp(1, 2.5, b);
        return { x: k * 2.2 * drift(t * 2.2, 11), y: k * 1.6 * Math.abs(wave(t, 0.8)) };
      },
    },
    {
      id: "glasses-hand-r",
      poly: [
        [985, 695],
        [1030, 685],
        [1065, 700],
        [1070, 740],
        [1060, 770],
        [1020, 772],
        [990, 750],
      ],
      feather: 26,
      pivot: [1030, 730],
      wakes: ["glasses-hand-l"],
      move: (t, b) => {
        const k = lerp(1, 2.5, b);
        return { x: k * 1.8 * drift(t * 2.6, 5), y: k * 1.8 * Math.abs(wave(t, 0.65, 0.3)) };
      },
    },
    {
      // AR glasses: reads the laptop, head moving along the lines.
      id: "ar-head",
      poly: [
        [165, 400],
        [175, 345],
        [215, 315],
        [270, 312],
        [320, 335],
        [330, 380],
        [325, 440],
        [310, 480],
        [285, 505],
        [255, 510],
        [225, 495],
        [200, 470],
        [180, 450],
      ],
      feather: 28,
      pivot: [252, 545],
      move: (t, b) => ({ r: (1 + b) * (1.3 * wave(t, 3.4) + 0.4 * drift(t, 2)) }),
    },
  ],
};

/** A nod: the head dips and comes back up, twice, every `period` seconds starting at `at`. */
const nod = (t: number, period: number, at: number) =>
  beat(t, period, at, 0.55) + 0.7 * beat(t, period, at + 0.6, 0.5);

/** EVENTS: the planner at the board talks the others through it, they nod, the note taker writes it all down. */
const events: Rig = {
  pins: [
    // The STAGE box on the board stays put next to the cap.
    {
      poly: [
        [1034, 386],
        [1142, 386],
        [1142, 436],
        [1034, 436],
      ],
      feather: 14,
    },
  ],
  parts: [
    {
      // The speaker at the board: her head bobs as she talks.
      id: "speaker-head",
      poly: [
        [1290, 330],
        [1305, 280],
        [1360, 256],
        [1430, 258],
        [1470, 290],
        [1484, 350],
        [1478, 410],
        [1455, 440],
        [1400, 450],
        [1360, 460],
        [1320, 470],
        [1295, 455],
        [1285, 420],
        [1282, 380],
      ],
      feather: 30,
      pivot: [1400, 505],
      wakes: ["speaker-jaw", "speaker-arm"],
      move: (t, b) => ({
        r: (1 + b) * (1.3 * wave(t, 1.9) + 0.8 * drift(t * 1.5, 4)),
        y: -1.5 * beat(t, 0.9, 0, 0.45),
      }),
    },
    {
      // Her jaw: she keeps talking, in phrases with short pauses.
      id: "speaker-jaw",
      poly: [
        [1292, 421],
        [1334, 419],
        [1346, 440],
        [1340, 464],
        [1310, 470],
        [1290, 452],
      ],
      feather: 12,
      pivot: [1318, 419],
      move: (t, b) => {
        const phrase = Math.max(0, wave(t, 3.1)) > 0.15 ? 1 : 0.15;
        const syl = Math.abs(Math.sin(t * 11.5) * Math.sin(t * 4.3 + 1));
        return { sy: 1 + (0.1 + 0.06 * b) * syl * phrase };
      },
    },
    {
      // Her pointer: she taps along the plan on the board.
      id: "speaker-arm",
      poly: [
        [1126, 332],
        [1138, 330],
        [1210, 405],
        [1240, 420],
        [1262, 450],
        [1300, 520],
        [1350, 575],
        [1335, 600],
        [1290, 565],
        [1245, 500],
        [1222, 482],
        [1180, 472],
        [1160, 440],
        [1168, 412],
        [1200, 412],
        [1126, 342],
      ],
      feather: 12,
      pivot: [1342, 590],
      hit: [
        [1120, 320],
        [1260, 400],
        [1360, 600],
        [1150, 480],
      ],
      wakes: ["speaker-jaw"],
      move: (t, b) => ({ r: (1 + b) * (1.6 * wave(t, 2.6) - 1.4 * beat(t, 1.3, 0.2, 0.35)) }),
    },
    {
      // Blue jacket listens and nods.
      id: "blue-head",
      poly: [
        [800, 330],
        [820, 290],
        [870, 262],
        [950, 255],
        [1010, 270],
        [1050, 300],
        [1066, 348],
        [1040, 380],
        [1000, 420],
        [980, 460],
        [950, 490],
        [900, 495],
        [860, 480],
        [830, 450],
        [810, 410],
        [795, 370],
      ],
      feather: 26,
      pivot: [915, 530],
      move: (t, b) => ({ r: -(2.6 + 2 * b) * nod(t, 4.4, 1.2) + 0.5 * drift(t, 8) }),
    },
    {
      // Glasses in the middle nods too, a beat after him.
      id: "glasses-head",
      poly: [
        [470, 300],
        [500, 260],
        [560, 245],
        [640, 250],
        [700, 280],
        [720, 330],
        [712, 400],
        [700, 450],
        [680, 485],
        [650, 495],
        [610, 490],
        [570, 470],
        [530, 450],
        [490, 420],
        [465, 370],
      ],
      feather: 28,
      pivot: [612, 545],
      move: (t, b) => ({ r: (2.6 + 2 * b) * nod(t, 4.4, 2.6) + 0.5 * drift(t, 9) }),
    },
    {
      // The note taker nods while he writes.
      id: "notes-head",
      poly: [
        [125, 360],
        [150, 290],
        [200, 262],
        [270, 262],
        [330, 285],
        [345, 340],
        [330, 420],
        [320, 470],
        [290, 485],
        [260, 475],
        [225, 455],
        [195, 430],
        [160, 400],
      ],
      feather: 28,
      pivot: [250, 515],
      wakes: ["notes-hand"],
      move: (t, b) => ({ r: (1.8 + 1.5 * b) * nod(t, 4.4, 3.6) + 0.9 * drift(t, 6) + 1.2 }),
    },
    {
      // ...and his pen keeps going: small loops for the letters, a slide along the line, back to the start.
      id: "notes-hand",
      poly: [
        [255, 628],
        [275, 625],
        [300, 650],
        [340, 662],
        [346, 690],
        [330, 712],
        [290, 716],
        [262, 700],
        [250, 670],
      ],
      feather: 22,
      pivot: [235, 700],
      move: (t, b) => {
        const k = lerp(1, 1.6, b);
        const line = (t % 2.4) / 2.4; // left to right along a line, then back
        const slide = line < 0.85 ? line / 0.85 : 1 - (line - 0.85) / 0.15;
        return { x: k * (7 * slide - 3.5), y: k * 1.4 * Math.sin(t * 19) * (line < 0.85 ? 1 : 0) };
      },
    },
  ],
};

/**
 * PROJECTS: the presenter talks the room through the sketches and waves his pointer like a wand. The
 * arm is a cut out layer (projects-arm.webp) over a copy of the picture with the arm painted out and
 * the whiteboard frame redrawn behind it (projects-plate), so it can swing without bending the frame.
 */
const projects: Rig = {
  base: "projects-plate",
  layers: ["projects-arm"],
  track: [{ id: "wand-tip", part: "arm", at: [806, 256] }],
  parts: [
    {
      id: "arm",
      layer: "projects-arm",
      poly: [
        [580, 230],
        [830, 230],
        [830, 660],
        [580, 660],
      ],
      feather: 1,
      pivot: [645, 640],
      hit: [
        [600, 420],
        [700, 380],
        [800, 240],
        [830, 260],
        [750, 420],
        [720, 640],
        [600, 640],
      ],
      wakes: ["jaw", "head"],
      move: (t, b) => {
        // Sways while he talks, then flicks the wand at the board: the flick gets bigger when tapped.
        const flick = beat(t, 3.6, 2.2, 0.5);
        return {
          r: 1.8 * wave(t, 3.6, 0.1) + (2.6 + 3 * b) * flick - 0.8 * beat(t, 3.6, 2.75, 0.4),
        };
      },
    },
    {
      id: "head",
      poly: [
        [330, 300],
        [370, 265],
        [440, 255],
        [500, 265],
        [530, 300],
        [535, 350],
        [525, 400],
        [510, 440],
        [480, 465],
        [440, 470],
        [410, 455],
        [380, 430],
        [350, 410],
        [330, 370],
      ],
      feather: 30,
      pivot: [452, 505],
      wakes: ["jaw", "arm"],
      move: (t, b) => ({
        r: (1 + b) * (1.4 * wave(t, 3.6, 0.35) + 0.6 * drift(t, 12)),
        y: -1.4 * beat(t, 0.8, 0.1, 0.4),
      }),
    },
    {
      id: "jaw",
      poly: [
        [445, 421],
        [500, 417],
        [510, 440],
        [495, 465],
        [460, 470],
        [440, 452],
      ],
      feather: 12,
      pivot: [472, 420],
      move: (t, b) => {
        const phrase = Math.max(0, wave(t, 3.6, 0.2)) > 0.1 ? 1 : 0.2;
        const syl = Math.abs(Math.sin(t * 10.5) * Math.sin(t * 3.9 + 2));
        return { sy: 1 + (0.09 + 0.05 * b) * syl * phrase };
      },
    },
  ],
};

/** A springy wobble that rings out after every `period` seconds, like an antenna flicked. */
const spring = (t: number, period: number, at: number) => {
  const u = (((t - at) % period) + period) % period;
  return Math.exp(-u * 2.2) * Math.sin(u * 14);
};

/** SOCIAL MEDIA: the megaphone girl calls out, the camera guy films, the other two hand out flyers. */
const socialMedia: Rig = {
  parts: [
    {
      id: "shout-head",
      poly: [
        [565, 300],
        [590, 240],
        [650, 215],
        [740, 222],
        [800, 250],
        [830, 290],
        [820, 360],
        [805, 420],
        [790, 470],
        [750, 485],
        [700, 470],
        [660, 445],
        [620, 420],
        [585, 380],
      ],
      feather: 28,
      pivot: [720, 525],
      wakes: ["shout-jaw", "megaphone"],
      move: (t, b) => ({
        r: (1 + b) * (1.2 * wave(t, 2.2) + 0.5 * drift(t, 21)),
        y: -(1.5 + b) * beat(t, 0.55, 0, 0.3),
      }),
    },
    {
      id: "shout-jaw",
      poly: [
        [745, 436],
        [800, 430],
        [812, 452],
        [800, 476],
        [765, 480],
        [742, 462],
      ],
      feather: 12,
      pivot: [775, 432],
      move: (t, b) => {
        const call = Math.max(0, wave(t, 2.2)) > 0.05 ? 1 : 0.25;
        return { sy: 1 + (0.08 + 0.06 * b) * call * Math.abs(Math.sin(t * 9)) };
      },
    },
    {
      // The megaphone kicks a little with every call.
      id: "megaphone",
      poly: [
        [800, 420],
        [860, 360],
        [960, 340],
        [1012, 340],
        [1015, 420],
        [1000, 500],
        [960, 540],
        [905, 560],
        [860, 540],
        [820, 500],
      ],
      feather: 18,
      pivot: [862, 535],
      wakes: ["shout-jaw", "shout-head"],
      move: (t, b) => ({ r: -(1 + 1.5 * b) * (0.9 * beat(t, 0.55, 0, 0.3) + 0.4 * wave(t, 2.2)) }),
    },
    {
      // Curly hair laughs along.
      id: "curly-head",
      poly: [
        [325, 250],
        [350, 190],
        [420, 160],
        [500, 165],
        [540, 210],
        [545, 270],
        [530, 330],
        [500, 380],
        [460, 400],
        [420, 398],
        [380, 380],
        [350, 340],
        [335, 300],
      ],
      feather: 26,
      pivot: [440, 445],
      move: (t, b) => ({
        r: 1.1 * drift(t, 31) + (1 + b) * 0.9 * wave(t, 0.36) * beat(t, 5, 0.5, 1.6),
        y: -1.2 * beat(t, 0.36, 0, 0.2) * beat(t, 5, 0.5, 1.6),
      }),
    },
    {
      id: "curly-flyers",
      poly: [
        [470, 450],
        [530, 440],
        [610, 455],
        [615, 540],
        [560, 560],
        [500, 560],
        [468, 520],
      ],
      feather: 20,
      pivot: [540, 600],
      move: (t, b) => ({
        x: (1 + b) * 2.5 * wave(t, 1.7),
        y: -(1 + b) * 2 * beat(t, 1.7, 0.2, 0.6),
      }),
    },
    {
      // Pink hair holds her flyers out to whoever walks by.
      id: "pink-head",
      poly: [
        [170, 400],
        [200, 340],
        [260, 312],
        [330, 315],
        [390, 345],
        [410, 410],
        [400, 480],
        [380, 540],
        [345, 565],
        [300, 560],
        [260, 540],
        [220, 500],
        [185, 460],
      ],
      feather: 30,
      pivot: [312, 615],
      move: (t, b) => ({ r: (1 + b) * (1.4 * wave(t, 4.2) + 0.5 * drift(t, 41)) }),
    },
    {
      id: "pink-flyers",
      poly: [
        [458, 640],
        [500, 548],
        [560, 540],
        [700, 570],
        [705, 700],
        [640, 720],
        [570, 735],
        [470, 730],
      ],
      feather: 24,
      pivot: [520, 770],
      wakes: ["pink-head"],
      move: (t, b) => {
        const offer = beat(t, 3.2, 0.4, 1.4);
        return { x: (3 + 4 * b) * offer, y: -(2 + 3 * b) * offer + 0.8 * wave(t, 1.1) };
      },
    },
    {
      // The camera guy keeps the shot steady, panning a touch with the action.
      id: "phone",
      poly: [
        [1030, 420],
        [1080, 395],
        [1190, 398],
        [1235, 420],
        [1240, 480],
        [1200, 520],
        [1100, 525],
        [1040, 500],
      ],
      feather: 22,
      pivot: [1150, 565],
      move: (t, b) => ({
        r: (1 + b) * 0.9 * drift(t * 0.7, 51),
        x: 0.6 * Math.sin(t * 7.3),
        y: 0.5 * Math.sin(t * 6.1 + 1),
      }),
    },
    {
      id: "camera-head",
      poly: [
        [1130, 300],
        [1150, 240],
        [1210, 215],
        [1290, 215],
        [1340, 240],
        [1350, 300],
        [1340, 360],
        [1310, 400],
        [1270, 420],
        [1240, 412],
        [1190, 395],
        [1160, 380],
        [1140, 350],
      ],
      feather: 24,
      pivot: [1250, 470],
      wakes: ["antenna-l", "antenna-r"],
      move: (t, b) => ({ r: (1 + b) * 0.8 * drift(t * 0.7, 52) }),
    },
    {
      // The antennas on his beanie spring about.
      id: "antenna-l",
      poly: [
        [1186, 180],
        [1208, 180],
        [1206, 200],
        [1190, 246],
        [1176, 244],
        [1188, 198],
      ],
      feather: 8,
      pivot: [1180, 252],
      hit: [
        [1160, 170],
        [1350, 170],
        [1350, 270],
        [1160, 270],
      ],
      wakes: ["antenna-r"],
      move: (t, b) => ({ r: (5 + 6 * b) * spring(t, 2.6, 0) + 1.2 * wave(t, 1.3) }),
    },
    {
      id: "antenna-r",
      poly: [
        [1318, 188],
        [1340, 190],
        [1334, 208],
        [1306, 256],
        [1294, 252],
        [1318, 206],
      ],
      feather: 8,
      pivot: [1298, 262],
      move: (t, b) => ({ r: (5 + 6 * b) * spring(t, 2.6, 0.18) + 1.2 * wave(t, 1.3, 0.3) }),
    },
  ],
};

/** DESIGN: the studio at work. Typing, scribbling on the tablet, pinning up sketches, the 3D printer printing. */
const design: Rig = {
  track: [
    { id: "nozzle", part: "print-head", at: [1186, 524] },
    { id: "stylus-tip", part: "stylus", at: [412, 664] },
  ],
  pins: [
    // The printer's side wall and the poster stay put while the print head runs between them.
    {
      poly: [
        [1096, 420],
        [1146, 420],
        [1146, 660],
        [1096, 660],
      ],
      feather: 6,
    },
    {
      poly: [
        [1244, 455],
        [1460, 455],
        [1460, 770],
        [1244, 770],
      ],
      feather: 8,
    },
    // The figure being printed stays where it is while the print head moves over it.
    {
      poly: [
        [1160, 526],
        [1220, 526],
        [1224, 640],
        [1158, 640],
      ],
      feather: 6,
    },
  ],
  parts: [
    {
      // Stylus hand: quick small loops, then a longer stroke, over and over.
      id: "stylus",
      poly: [
        [358, 570],
        [372, 566],
        [395, 610],
        [412, 625],
        [416, 655],
        [406, 668],
        [380, 667],
        [365, 650],
        [361, 618],
      ],
      feather: 18,
      pivot: [330, 650],
      wakes: ["tablet-head"],
      move: (t, b) => {
        const k = lerp(1, 1.8, b);
        const w = t * 9.5;
        const stroke = beat(t, 2.6, 1.8, 0.7);
        return {
          x: k * (2.4 * Math.cos(w) + 5 * stroke),
          y: k * (1.6 * Math.sin(2 * w) + 2 * stroke),
        };
      },
    },
    {
      id: "tablet-head",
      poly: [
        [215, 380],
        [240, 320],
        [300, 300],
        [380, 305],
        [430, 340],
        [445, 400],
        [430, 460],
        [400, 490],
        [350, 500],
        [300, 490],
        [260, 470],
        [225, 430],
      ],
      feather: 28,
      pivot: [330, 540],
      move: (t, b) => ({ r: (1 + b) * (0.9 * drift(t, 61) + 0.6 * wave(t, 2.6)) }),
    },
    {
      // Typing: each hand taps on its own uneven rhythm.
      id: "type-l",
      poly: [
        [600, 600],
        [640, 592],
        [668, 600],
        [672, 630],
        [660, 648],
        [620, 650],
        [598, 630],
      ],
      feather: 12,
      pivot: [640, 640],
      wakes: ["type-r", "type-head"],
      move: (t, b) => {
        const k = lerp(1, 1.8, b);
        const tap = Math.max(0, Math.sin(t * 23) * Math.sin(t * 5.3 + 1));
        return { y: k * 2.2 * tap, x: k * 1.2 * drift(t * 3, 71) };
      },
    },
    {
      id: "type-r",
      poly: [
        [700, 578],
        [735, 572],
        [750, 585],
        [745, 606],
        [715, 610],
        [698, 598],
      ],
      feather: 12,
      pivot: [725, 600],
      wakes: ["type-l", "type-head"],
      move: (t, b) => {
        const k = lerp(1, 1.8, b);
        const tap = Math.max(0, Math.sin(t * 19 + 2) * Math.sin(t * 4.1));
        return { y: k * 2 * tap, x: k * 1.4 * drift(t * 3, 72) };
      },
    },
    {
      id: "type-head",
      poly: [
        [695, 395],
        [730, 350],
        [800, 340],
        [860, 370],
        [870, 420],
        [850, 480],
        [810, 510],
        [760, 510],
        [730, 490],
        [715, 450],
      ],
      feather: 26,
      pivot: [792, 552],
      move: (t, b) => ({ r: (1 + b) * (0.8 * drift(t, 73) - 1.2 * beat(t, 5.5, 3, 1.2)) }),
    },
    {
      // Pinning a sketch to the board: the hand presses and smooths it down.
      id: "pin-arm",
      poly: [
        [962, 168],
        [985, 160],
        [1003, 175],
        [1003, 210],
        [1000, 250],
        [975, 255],
        [962, 230],
        [960, 195],
      ],
      feather: 20,
      pivot: [960, 300],
      wakes: ["pin-head"],
      move: (t, b) => {
        const k = lerp(1, 1.8, b);
        const press = beat(t, 2.4, 0, 0.5);
        return { r: k * 1.3 * wave(t, 2.4, 0.15), y: -k * 2.5 * press };
      },
    },
    {
      id: "pin-head",
      poly: [
        [820, 215],
        [850, 190],
        [890, 188],
        [912, 205],
        [915, 240],
        [905, 270],
        [880, 285],
        [840, 285],
        [820, 260],
      ],
      feather: 24,
      pivot: [870, 315],
      move: (t, b) => ({ r: (1 + b) * (1 * wave(t, 4.8) + 0.4 * drift(t, 81)) }),
    },
    {
      // Headphones on, nodding to the music.
      id: "music-head",
      poly: [
        [1140, 230],
        [1180, 195],
        [1240, 195],
        [1280, 230],
        [1290, 290],
        [1270, 340],
        [1230, 360],
        [1180, 350],
        [1150, 320],
        [1135, 280],
      ],
      feather: 28,
      pivot: [1222, 410],
      move: (t, b) => ({
        r: (1 + b) * (1.6 * Math.pow(Math.max(0, wave(t, 0.85)), 2) + 0.5 * drift(t, 91)),
      }),
    },
    {
      // The print head runs back and forth across the figure along its rods.
      id: "print-head",
      poly: [
        [1153, 452],
        [1222, 450],
        [1222, 500],
        [1214, 521],
        [1192, 523],
        [1180, 523],
        [1158, 505],
      ],
      feather: 24,
      pivot: [1188, 485],
      hit: [
        [1050, 420],
        [1310, 420],
        [1310, 650],
        [1050, 650],
      ],
      move: (t, b) => {
        const speed = lerp(1, 2.2, b);
        const u = (t * 0.55 * speed) % 2;
        const tri = u < 1 ? u : 2 - u; // there and back
        const ease = tri * tri * (3 - 2 * tri);
        return { x: 20 * ease, y: 0.5 * Math.sin(t * 40) };
      },
    },
  ],
};

export const squadRigs: Partial<Record<SquadSlug, Rig>> = {
  projects,
  technical,
  events,
  "social-media": socialMedia,
  design,
};
