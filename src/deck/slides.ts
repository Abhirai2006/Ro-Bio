// The Robo Spark slides. Facts (date, time, team size, Bot Forge date, mission count) come from
// src/lib/site.ts and src/lib/robo-spark.ts, so the slides never go out of date on their own.
import { botForge, coreTeamSize, events, formatDate, site } from "@/lib/site";
import {
  DISCUSSION_MINUTES,
  ICEBREAKER_MINUTES,
  STAGE_TEAMS,
  missionByNumber,
  missions,
  route,
} from "@/lib/robo-spark";
import * as A from "./anims";
import type { SlideDef } from "./engine";
import { Countdown } from "./timer";

export type DeckAssets = {
  logo: string;
  poster: string;
  girl: string;
  astronaut: string;
  sparkbot: string;
};

export type DeckHooks = {
  /** Team numbers for the stage, from the judges' ranking. Rejects when the ranking cannot be read here. */
  stageTeams?: () => Promise<number[]>;
};

const V = { beige: "#E4DBD4", violet: "#6F5DFF", ink: "#1E1A3C" };
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Big display text with its outlined echo behind it, like the poster. */
const dup = (lines: string, cls = "") =>
  `<div class="rsd-dup ${cls}"><span class="rsd-dup-ghost" aria-hidden="true">${lines}</span><span class="rsd-dup-main">${lines}</span></div>`;

const dayMonthYear = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y}`;
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const KEY = "stage-teams";
const savedTeams = (): number[] => {
  try {
    const v = JSON.parse(localStorage.getItem(`robo-spark-${KEY}`) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
};
let teamsInMemory: number[] | null = null;
const currentTeams = () => teamsInMemory ?? savedTeams();
const saveTeams = (t: number[]) => {
  teamsInMemory = t;
  try {
    localStorage.setItem(`robo-spark-${KEY}`, JSON.stringify(t));
  } catch {
    /* fine */
  }
};

export function buildSlides(img: DeckAssets, hooks: DeckHooks = {}): SlideDef[] {
  const spark = events.find((e) => e.slug === "robo-spark");
  const date = spark?.date ? dayMonthYear(spark.date) : "";
  const time = (spark?.time ?? "").toUpperCase().replace(" TO ", " - ");
  const [startYear, startMonth] = site.startedOn.split("-").map(Number) as [number, number];
  const ice = new Countdown("icebreaker", ICEBREAKER_MINUTES);
  const discussion = new Countdown("discussion", DISCUSSION_MINUTES);
  const example = missionByNumber(17) ?? missions[0]!;
  const tagNames = [
    "Elder care",
    "Space junk",
    "Flood rescue",
    "Robot farmer",
    "Blind assist",
    "Snake rescue",
    "Mars explorer",
    "Steady spoon",
    "Water cleanup",
  ];
  const tagSpots = [
    [30, 50, -6],
    [330, 155, 4],
    [60, 260, 3],
    [300, 365, -5],
    [10, 470, -3],
    [320, 575, 6],
    [70, 680, -4],
    [300, 785, 3],
    [20, 890, 5],
  ];
  const stops = route.length;
  const stopW = 1584 / stops;

  let stageNote = "";
  let popper: ReturnType<typeof A.popper> | null = null;
  const paintTeams = (el: HTMLElement, revealed: number) => {
    const teams = currentTeams();
    const slots = [...el.querySelectorAll<HTMLElement>(".rsd-slot")];
    slots.forEach((s, k) => {
      const n = teams[k];
      s.querySelector(".rsd-slot-num")!.textContent = n ? String(n) : "?";
      s.classList.toggle("rsd-empty", !n);
      void revealed;
    });
    el.querySelector(".rsd-stage-note")!.textContent = stageNote;
  };

  return [
    {
      id: "title",
      title: "Robo Spark",
      bg: V.beige,
      transition: "fade",
      anims: {
        sparks: A.sparks,
        term: A.terminal(["> HELLO, FIRST YEARS", "> ROBO SPARK: ONLINE"]),
      },
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-title-col">
          ${dup("ROBO<br>SPARK", "rsd-title-big")}
          <p class="rsd-pix rsd-title-kind" data-in="2" data-fx="rise">INTERACTIVE GROUP DISCUSSION</p>
          <div class="rsd-title-when" data-in="3" data-fx="rise">
            ${date ? `<span class="rsd-pill">${esc(date)}</span>` : ""}
            ${time ? `<span class="rsd-pix rsd-time">${esc(time)}</span>` : ""}
          </div>
          <canvas class="rsd-term" data-anim="term" width="760" height="104" aria-hidden="true"></canvas>
        </div>
        <div class="rsd-sticker" data-in="5" data-fx="pop" style="transform: rotate(8deg)"><img src="${img.logo}" alt="RO-BIO logo" width="180" height="180"></div>
        <div class="rsd-poster" data-in="1" data-fx="right">
          <img src="${img.poster}" alt="Robo Spark poster art: a girl with a magnifying glass and an astronaut inspect a tiny sparking robot" width="1010" height="584">
          <canvas class="rsd-sparks" data-anim="sparks" width="480" height="320" aria-hidden="true"></canvas>
        </div>`,
    },
    {
      id: "hands",
      title: "Hands up",
      bg: V.violet,
      html: `
        <div class="rsd-stripes rsd-stripes-r rsd-stripes-beige"></div>
        <div class="rsd-hands-left">
          ${dup("HANDS<br>UP!", "rsd-light rsd-hands-big")}
          <div class="rsd-sticker-text rsd-pink" data-in="3" data-fx="pop" style="transform: rotate(-4deg)">YES, YOU!</div>
        </div>
        <div class="rsd-hands-right">
          <p class="rsd-pix rsd-light rsd-hands-lead" data-in="2" data-fx="fade">RAISE YOUR HAND IF YOU…</p>
          <ul class="rsd-hands-list">
            <li data-click="1" data-fx="right"><span class="rsd-pix">01</span>…have built something with a motor or a circuit.</li>
            <li data-click="2" data-fx="right"><span class="rsd-pix">02</span>…have never touched a robot. Welcome!</li>
            <li data-click="3" data-fx="right"><span class="rsd-pix">03</span>…think robots will take over the world.</li>
          </ul>
        </div>`,
    },
    {
      id: "route",
      title: "Today's route",
      bg: V.beige,
      anims: { signal: A.signal(stopW / 2, 1584 - stopW / 2) },
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-pad">
          <div class="rsd-h2" data-in="0" data-fx="left"><span class="rsd-ink">TODAY'S</span> <span class="rsd-violet">ROUTE</span></div>
          <p class="rsd-pix rsd-sub" data-in="1" data-fx="fade">${stops} STOPS · 75 MINUTES · 0 PHONES</p>
        </div>
        <div class="rsd-route">
          <canvas data-anim="signal" width="1584" height="200" aria-hidden="true"></canvas>
          <ol>${route
            .map(
              (r, k) =>
                `<li data-in="${k + 2}" data-fx="pop"><span class="rsd-stop">${k + 1}</span><span class="rsd-stop-name">${esc(r.name)}</span><span class="rsd-pix rsd-stop-at">${r.at}</span></li>`,
            )
            .join("")}</ol>
        </div>`,
    },
    {
      id: "weare",
      title: "We are RO-BIO",
      bg: V.beige,
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-weare-col">
          <div class="rsd-h2 rsd-ink" data-in="0" data-fx="left">WE ARE</div>
          ${dup("RO-BIO", "rsd-weare-big")}
          <p class="rsd-lead rsd-deep" data-in="2" data-fx="fade">${esc(site.branch)} students at MUSE Mysuru.</p>
          <ul class="rsd-stats">
            <li data-in="3" data-fx="left"><b>${coreTeamSize}</b><span>core members, all students like you</span></li>
            <li data-in="4" data-fx="left"><b>${startYear}</b><span>started in ${MONTHS[startMonth - 1]}, right here at MUSE</span></li>
            <li data-in="5" data-fx="left"><b>SAT</b><span>sessions with engineers from companies like L&amp;T</span></li>
          </ul>
        </div>
        <div class="rsd-weare-art" data-in="1" data-fx="rise"><img src="${img.astronaut}" alt="The Robo Spark astronaut giving a thumbs up" width="510" height="584"></div>`,
    },
    {
      id: "whatwedo",
      title: "What we do",
      bg: V.ink,
      anims: { circuit: A.circuit },
      html: `
        <canvas class="rsd-full" data-anim="circuit" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-pad rsd-wwd">
          <p class="rsd-pix rsd-lilac rsd-kicker" data-in="0" data-fx="fade">WHAT WE DO</p>
          <dl>
            ${[
              ["ROBOTICS", "Robots, sensors, motors and code"],
              ["ELECTRONICS", "Circuits, PCBs and microcontrollers"],
              ["BIOMEDICAL", "Devices that read the human body"],
              ["COMPETITIONS", "Test your build against others"],
              ["PROJECTS", "From idea to working prototype"],
            ]
              .map(
                ([w, d], k) =>
                  `<div class="rsd-wwd-row ${k % 2 ? "rsd-outline" : ""}" data-in="${k + 1}" data-fx="left"><dt>${w}</dt><dd>${d}</dd></div>`,
              )
              .join("")}
          </dl>
        </div>`,
    },
    {
      id: "saturdays",
      title: "Saturdays and Bot Forge",
      bg: V.beige,
      anims: { sumo: A.sumo },
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-sat">
          <p class="rsd-pix rsd-deep rsd-kicker" data-in="0" data-fx="fade">EVERY WEEK</p>
          ${dup("SAT<br>UR<br>DAYS", "rsd-ink-dup rsd-sat-big")}
          <p class="rsd-lead rsd-ink" data-in="2" data-fx="rise">Engineers from companies like L&amp;T teach us in our own classroom.</p>
        </div>
        <div class="rsd-forge" data-in="1" data-fx="right">
          <p class="rsd-pix rsd-beige rsd-kicker">COMING UP</p>
          ${dup("BOT<br>FORGE", "rsd-light rsd-forge-big")}
          <p class="rsd-pix rsd-beige rsd-forge-what">${botForge.activities.map((a) => a.name.toUpperCase()).join(" · ")}</p>
          <p class="rsd-forge-when">${botForge.date ? `${esc(formatDate(botForge.date))}. Registration details coming soon.` : "Date and registration coming soon."}</p>
          <canvas class="rsd-sumo" data-anim="sumo" width="840" height="330" aria-hidden="true"></canvas>
        </div>`,
    },
    {
      id: "group",
      title: "Meet your group",
      bg: V.beige,
      timer: ice,
      anims: { ice: A.icebreaker(ice) },
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-group-left">
          ${dup("MEET<br>YOUR<br>GROUP", "rsd-ink-dup rsd-group-big")}
          <canvas class="rsd-ice" data-anim="ice" width="760" height="330" aria-label="Icebreaker countdown"></canvas>
        </div>
        <ol class="rsd-group-steps">
          <li data-in="1" data-fx="right"><b>1</b>Say your name and your branch.</li>
          <li data-in="2" data-fx="right"><b>2</b>Name one robot you love.</li>
          <li data-in="3" data-fx="right"><b>3</b>Say what a robot could do for you.</li>
          <li class="rsd-roles" data-in="4" data-fx="rise"><span class="rsd-pix">THEN PICK A SPEAKER, A SCRIBE AND A TIMEKEEPER</span></li>
        </ol>`,
    },
    {
      id: "rules",
      title: "No phones",
      bg: V.ink,
      html: `
        <div class="rsd-pad rsd-rules">
          <p class="rsd-pix rsd-lilac rsd-kicker" data-in="0" data-fx="fade">${DISCUSSION_MINUTES} MINUTES. JUST YOUR TEAM'S BRAINS.</p>
          <div class="rsd-rule" data-in="1" data-fx="left"><span>NO</span><span>PHONES.</span></div>
          <div class="rsd-rule" data-in="2" data-fx="left"><span>NO</span><span>LAPTOPS.</span></div>
          <div class="rsd-rule rsd-violet" data-in="3" data-fx="left"><span>NO</span><span>AI.</span></div>
          <div class="rsd-sticker-text rsd-pink" data-in="5" data-fx="pop" style="transform: rotate(-3deg)">PENS + PAPER ONLY</div>
          <p class="rsd-lead rsd-paper" data-in="6" data-fx="fade">Everyone speaks. Every idea counts. Write it on your card.</p>
        </div>
        <div class="rsd-rules-art" data-in="4" data-fx="rise"><img src="${img.astronaut}" alt="" width="510" height="584"></div>`,
    },
    {
      id: "missions",
      title: `${missions.length} missions`,
      bg: V.violet,
      html: `
        <div class="rsd-stripes rsd-stripes-r rsd-stripes-beige"></div>
        <div class="rsd-mis-left">
          ${dup(String(missions.length), "rsd-light rsd-mis-num")}
          <div class="rsd-h2 rsd-ink rsd-mis-word" data-in="1" data-fx="rise">MISSIONS</div>
          <p class="rsd-lead rsd-paper" data-in="2" data-fx="fade">Every team gets its own mission card. The team next to you has a different one.</p>
          <p class="rsd-pix rsd-paper rsd-mis-go" data-in="3" data-fx="fade">READ IT. DISCUSS IT. SOLVE IT.</p>
        </div>
        <div class="rsd-tags">
          ${tagNames.map((t, k) => `<span class="rsd-tag ${k % 3 === 1 ? "rsd-tag-light" : ""}" data-in="${k + 3}" data-fx="pop" style="left:${tagSpots[k]![0]}px;top:${tagSpots[k]![1]}px;transform:rotate(${tagSpots[k]![2]}deg)">${esc(t.toUpperCase())}</span>`).join("")}
          <span class="rsd-tag rsd-tag-more" data-in="13" data-fx="pop" style="left:430px;top:985px;transform:rotate(-2deg)">+ ${missions.length - tagNames.length} MORE</span>
        </div>`,
    },
    {
      id: "card",
      title: "Flip your card",
      bg: V.beige,
      html: `
        <div class="rsd-pad">
          <div class="rsd-h2" data-in="0" data-fx="left"><span class="rsd-ink">FLIP YOUR</span> <span class="rsd-violet">CARD</span></div>
        </div>
        <div class="rsd-cards">
          <div class="rsd-card rsd-card-front" data-in="1" data-fx="tilt" style="transform: rotate(-2deg)">
            <p class="rsd-pix rsd-violet">FRONT · YOUR MISSION</p>
            <p class="rsd-card-mission">MISSION ${example.n}</p>
            <p class="rsd-card-text">${esc(example.card)}</p>
            <p class="rsd-card-hint">Read it together first. Make sure everyone understands it.</p>
          </div>
          <div class="rsd-card rsd-card-back" data-in="2" data-fx="tilt" style="transform: rotate(1.5deg)">
            <p class="rsd-pix rsd-lilac">BACK · WRITE THIS</p>
            <ol>
              <li>Team number and mission number</li>
              <li>Your idea in ONE line</li>
              <li>How it works: what it senses, what it does</li>
              <li>Who it helps, and why</li>
              <li>The hardest part</li>
            </ol>
            <p class="rsd-card-hint rsd-lilac">A quick drawing is welcome.</p>
          </div>
        </div>`,
    },
    {
      id: "go",
      title: "Ready, set, go",
      bg: V.violet,
      transition: "fade",
      anims: { burst: A.burst },
      html: `
        <canvas class="rsd-full" data-anim="burst" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-go">
          <p class="rsd-pix rsd-paper rsd-go-ready" data-in="0" data-fx="drop">READY, SET…</p>
          ${dup("GO!", "rsd-light rsd-go-big")}
          <div class="rsd-h2 rsd-ink rsd-go-min" data-in="2" data-fx="rise">${DISCUSSION_MINUTES} MINUTES</div>
        </div>`,
    },
    {
      id: "timer",
      title: `${DISCUSSION_MINUTES}-minute timer`,
      bg: V.beige,
      transition: "fade",
      timer: discussion,
      anims: { big: A.bigTimer(discussion, "ROBO SPARK · GROUP DISCUSSION") },
      html: `<canvas class="rsd-full" data-anim="big" width="1920" height="1080" aria-label="${DISCUSSION_MINUTES}-minute discussion countdown"></canvas>
        <img class="rsd-timer-bot" src="${img.sparkbot}" alt="" width="130" height="72">`,
    },
    {
      id: "judges",
      title: "Judges at work",
      bg: V.ink,
      anims: { scan: A.scanner },
      html: `
        <canvas class="rsd-full" data-anim="scan" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-pad rsd-judges">
          <p class="rsd-pix rsd-lilac rsd-kicker" data-in="0" data-fx="fade">HANG TIGHT…</p>
          ${dup("JUDGES<br>AT WORK", "rsd-light rsd-judges-big")}
          <p class="rsd-lead rsd-paper" data-in="2" data-fx="fade">We're reading every card.</p>
          <p class="rsd-pix rsd-lilac rsd-judges-think" data-in="3" data-fx="fade">THINK: WHAT WOULD YOU ASK THE TEAMS ON STAGE?</p>
        </div>
        <div class="rsd-judges-art" data-in="1" data-fx="right"><img src="${img.girl}" alt="The Robo Spark girl inspecting with a magnifying glass" width="470" height="584"></div>`,
    },
    {
      id: "stage",
      title: "On stage",
      bg: V.violet,
      anims: { spots: A.spotlights },
      html: `
        <canvas class="rsd-full" data-anim="spots" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-pad">
          ${dup("ON<br>STAGE", "rsd-light rsd-stage-big")}
          <div class="rsd-stage-cards">
            <div data-in="1" data-fx="rise"><b>3</b><span class="rsd-pix">MINUTES</span><p>to share the problem, your idea and how it works</p></div>
            <div data-in="2" data-fx="rise"><b>1</b><span class="rsd-pix">QUESTION</span><p>from the judges</p></div>
            <div data-in="3" data-fx="rise"><b>ALL</b><span class="rsd-pix">TEAMS</span><p>get a big clap</p></div>
          </div>
        </div>`,
    },
    {
      id: "callup",
      title: "Teams on stage",
      bg: V.ink,
      transition: "fade",
      anims: {
        pop: (X, W, H) => {
          popper = A.popper(X, W, H);
          return () => {
            popper?.stop();
            popper = null;
          };
        },
      },
      onEnter: (el) => {
        paintTeams(el, 0);
        if (!hooks.stageTeams) return;
        stageNote = "Reading the judges' ranking…";
        paintTeams(el, 0);
        hooks
          .stageTeams()
          .then((t) => {
            if (t.length) {
              saveTeams(t);
              stageNote = "";
            } else stageNote = currentTeams().length ? "" : "No scores yet. Press Set teams.";
          })
          .catch(() => {
            stageNote = currentTeams().length
              ? ""
              : "Ranking not available on this laptop. Press Set teams.";
          })
          .finally(() => paintTeams(el, 0));
      },
      onStep: (step, el) => {
        const slot = el.querySelector<HTMLElement>(`.rsd-slot[data-click="${step}"]`);
        if (!slot || !popper) return;
        const r = slot.getBoundingClientRect();
        const s = el.getBoundingClientRect();
        const k = 1920 / s.width;
        popper.pop((r.left + r.width / 2 - s.left) * k, (r.top + r.height / 2 - s.top) * k);
      },
      html: `
        <canvas class="rsd-full" data-anim="pop" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-pad rsd-callup">
          <p class="rsd-pix rsd-lilac rsd-kicker" data-in="0" data-fx="fade">CALLING TO THE STAGE</p>
          <div class="rsd-h2 rsd-paper" data-in="1" data-fx="rise">TEAM NUMBERS</div>
          <div class="rsd-slots">
            ${Array.from({ length: STAGE_TEAMS }, (_, k) => `<div class="rsd-slot" data-click="${k + 1}" data-fx="pop"><span class="rsd-pix">TEAM</span><span class="rsd-slot-num">?</span></div>`).join("")}
          </div>
          <p class="rsd-callup-foot rsd-paper" data-in="2" data-fx="fade">In order of team number. Come to the stage with your card!</p>
          <p class="rsd-stage-note rsd-pix"></p>
          <button type="button" class="rsd-set-teams">Set teams</button>
        </div>`,
    },
    {
      id: "touch",
      title: "Stay in touch",
      bg: V.beige,
      anims: { beat: A.heartbeat },
      html: `
        <div class="rsd-stripes rsd-stripes-l"></div>
        <div class="rsd-pad rsd-touch">
          <div class="rsd-h2" data-in="0" data-fx="left"><span class="rsd-ink">STAY IN</span> <span class="rsd-violet">TOUCH</span></div>
          <div class="rsd-touch-row">
            <div class="rsd-touch-links">
              <div data-in="1" data-fx="left"><p class="rsd-pix rsd-deep">INSTAGRAM</p><p class="rsd-handle">${esc(site.instagramHandle.toUpperCase())}</p></div>
              <div data-in="2" data-fx="left"><p class="rsd-pix rsd-deep">LINKEDIN</p><p class="rsd-handle">RO-BIO HUB</p></div>
              <canvas class="rsd-beat" data-anim="beat" width="900" height="130" aria-hidden="true"></canvas>
            </div>
            <div class="rsd-qr" data-in="3" data-fx="pop" style="transform: rotate(2deg)">
              <span class="rsd-qr-box">[QR CODE]</span>
              <span>attendance and certificate form</span>
              <img src="${img.sparkbot}" alt="" width="130" height="72">
            </div>
          </div>
        </div>`,
    },
    {
      id: "thanks",
      title: "Thank you",
      bg: V.beige,
      transition: "fade",
      anims: { conf: A.confetti },
      html: `
        <canvas class="rsd-full" data-anim="conf" width="1920" height="1080" aria-hidden="true"></canvas>
        <div class="rsd-thanks">
          ${dup("THANK<br>YOU!", "rsd-ink-dup rsd-thanks-big")}
          <p class="rsd-pix rsd-deep rsd-thanks-welcome" data-in="2" data-fx="rise">WELCOME TO RO-BIO!</p>
          <p class="rsd-lead rsd-ink" data-in="3" data-fx="fade">Your robotics journey starts today.</p>
          <p class="rsd-pix rsd-deep rsd-thanks-foot" data-in="4" data-fx="fade">ROBO SPARK${date ? ` · ${esc(date)}` : ""}</p>
        </div>
        <div class="rsd-thanks-art" data-in="1" data-fx="right"><img src="${img.poster}" alt="The Robo Spark characters with the sparking robot" width="1010" height="584"></div>`,
    },
  ];
}

/** Lets the presenter type the stage teams by hand when the ranking is not available on this laptop. */
export function wireSetTeams(root: HTMLElement) {
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest(".rsd-set-teams");
    if (!b) return;
    e.stopPropagation();
    const now = currentTeams().join(", ");
    const typed = window.prompt(
      `Team numbers for the stage, separated by commas (up to ${STAGE_TEAMS}):`,
      now,
    );
    if (typed === null) return;
    const list = [
      ...new Set(
        typed
          .split(/[^0-9]+/)
          .filter(Boolean)
          .map(Number)
          .filter((n) => n >= 1 && n <= 999),
      ),
    ]
      .sort((a, b) => a - b)
      .slice(0, STAGE_TEAMS);
    saveTeams(list);
    const slide = b.closest<HTMLElement>(".rsd-slide");
    if (slide)
      slide.querySelectorAll<HTMLElement>(".rsd-slot").forEach((s, k) => {
        s.querySelector(".rsd-slot-num")!.textContent = list[k] ? String(list[k]) : "?";
        s.classList.toggle("rsd-empty", !list[k]);
      });
    const note = slide?.querySelector(".rsd-stage-note");
    if (note) note.textContent = "";
  };
  root.addEventListener("click", onClick, true);
  return () => root.removeEventListener("click", onClick, true);
}
