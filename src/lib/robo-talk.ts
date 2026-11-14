// What Robo says about the page he is on and the section he is looking at. Built from the club facts in site.ts,
// so nothing here goes stale when a date or the team changes. Robot logic first, then a human feeling.
import {
  botForge,
  bylineOf,
  coreTeam,
  coreTeamSize,
  currentSem,
  events,
  faculty,
  formatDate,
  gallery,
  roleDuties,
  shortDate,
  site,
  squadDuties,
  teamPhotos,
  type Member,
} from "./site";
import { pieces, posts, sortedPosts, type Post } from "./blog";

/** How many of the core team have a photo up, counted from site.ts, so the line stays true as photos arrive. */
const withPhoto = coreTeam.flatMap((sq) => sq.members).filter((m) => teamPhotos[m.name]).length;
const faceScan =
  withPhoto >= coreTeamSize
    ? `Scanning faces... ${coreTeamSize} humans found. Every photo is in.`
    : `Scanning faces... ${coreTeamSize} humans found, ${withPhoto} photos so far. More on the way.`;

const bf = botForge;
const spark = events.find((e) => e.slug === "robo-spark");
const plain = (iso: string) => formatDate(iso).replace(/^[A-Za-z]{3},\s*/, ""); // "20 May 2026"
const bfDay = bf.date ? plain(bf.date).replace(/\s\d{4}$/, "") : null; // "6 Nov", or null while the date is not fixed
const when = bfDay ? `is on ${bfDay}` : "is coming soon";
const n = bf.activities.length,
  all = n === 2 ? "both" : "all of them";
const regLine =
  bf.registration === "open"
    ? "Registration is open. Go, go, go!"
    : bf.registration === "closed"
      ? "Registration is closed. See you there."
      : "Registration is not open yet. I am refreshing constantly.";

/** Said when he lands on a page that does not exist. */
export const LOST = "Uh oh. Nothing here. I checked twice.";

/** Said now and then while he idles. */
export const FORGE_IDLE = `${bf.title} ${when}. Still tuning my motors.`;

const firstName = (name: string) => name.split(" ")[0]!;

/** Who someone is, in a few words: their role, their squad, or their faculty title. */
export function whoIs(name: string): string {
  return bylineOf(name)?.label ?? faculty.find((f) => f.name === name)?.role ?? "";
}

/** What Robo thinks when you point at a person named in a blog post. */
export const personThought = (name: string) =>
  `${name}${whoIs(name) ? `, ${whoIs(name)}` : ""}. Tap the name to see them on the team page.`;

/** The people a post links to, in the order they come up. */
const mentionsOf = (p: Post) => [
  ...new Set(
    p.paragraphs.flatMap((para) => pieces(para).flatMap((b) => (b.person ? [b.person] : []))),
  ),
];

/** What Robo says about one post as people read it: who wrote it, what it is about, and who it mentions. */
function postLines(p: Post): string[] {
  const by = whoIs(p.author);
  const event = p.event ? events.find((e) => e.slug === p.event) : undefined;
  return [
    `${p.author}${by ? `, ${by},` : ""} wrote this on ${shortDate(p.date)}.`,
    p.summary,
    ...mentionsOf(p).map((n) => personThought(n)),
    ...(event ? [`It is about ${event.title}. The event page has the poster.`] : []),
  ];
}

export const GREET: Record<string, string> = {
  "/": "Home page loaded. Arm, sumo ring, heartbeat. Everything I love.",
  "/about": "About page. This is where they explain me. Sort of.",
  "/events": `Events. ${events.map((e) => e.title).join(" and ")}. My calendar chip is busy.`,
  [`/events/${bf.slug}`]: `${bf.title}. ${bf.activities.map((a) => a.name).join(" and ")}. I want to enter ${all}.`,
  ...(spark
    ? {
        [`/events/${spark.slug}`]: `${spark.title}. Teams, one robotics problem, and a podium. I am practising my listening face.`,
      }
    : {}),
  "/team": `Team page. ${coreTeamSize} humans on the core team. I counted twice.`,
  "/workshops": "Workshops. Humans teaching humans. I take notes.",
  "/projects": "Projects. Mine is not listed. Yet.",
  "/gallery": gallery.length
    ? `Gallery. ${gallery.length} frames filled. I am in none of them.`
    : "Gallery. Empty frames. Ready for my close-up.",
  "/blog": posts.length
    ? `Blog. ${posts.length} ${posts.length === 1 ? "post" : "posts"}. Newest: "${sortedPosts()[0]!.title}" by ${firstName(sortedPosts()[0]!.author)}.`
    : "Blog. No posts yet. I checked.",
  ...Object.fromEntries(
    posts.map((p) => [
      `/blog/${p.slug}`,
      `"${p.title}". By ${p.author}, ${shortDate(p.date)}. Reading mode on.`,
    ]),
  ),
  "/contact": "Contact page. Instagram is the quickest way to reach the humans.",
  "/faq": "FAQ. I have read every answer. Twice.",
  "/privacy": "Privacy. This site keeps almost nothing. I checked.",
  "/terms": "The small print. Short and fair, I hope.",
  "/accessibility": "Everyone should be able to use this site. Tell us if you cannot.",
};

// First match wins. Tested against the heading text, or the text of the card he is looking at.
const SECTIONS: [RegExp, string[]][] = [
  [
    /line follower/i,
    [
      "Line Follower. IR sensors, a black line and a lot of tiny corrections. My kind of sport.",
      "Line Follower. Sense, steer, repeat. Very relaxing to watch.",
    ],
  ],
  [
    /robot race/i,
    [
      "Robot Race. Fastest bot wins. My top speed is a brisk walk.",
      "Robot Race. I would need new motors. And courage.",
    ],
  ],
  [
    /robo sumo/i,
    [
      "Robo Sumo. Two bots, one ring. You can practise on the home page.",
      "Robo Sumo. Push, do not get pushed. Simple. Not easy.",
    ],
  ],
  [
    /robo spark/i,
    [
      "Robo Spark. Many teams, one robotics problem. I like these odds.",
      "Robo Spark. A group discussion. I would bring a good idea and a snack.",
    ],
  ],
  [
    /bot forge/i,
    [
      bfDay
        ? `${bf.title}, ${bfDay}. Mark your calendar.`
        : `${bf.title}. Date coming soon. I keep checking.`,
      `${bf.title}. ${regLine}`,
    ],
  ],
  [/activities/i, [`${n} events. I would enter ${all}. Probably lose ${all}.`]],
  [/core team|keeping it running/i, [faceScan, "The core team. They keep the lights on. And me."]],
  [
    /sense, decide|feed ?back/i,
    [
      "Sense, decide, act, feed back. That is literally how I work.",
      "A loop. I run about sixty of these every second. Feels normal.",
    ],
  ],
  [
    /two kinds of machine|every branch/i,
    [
      "Robots and bodies. I am a bit of both. Try the X-ray from my menu.",
      "Every branch, two machines. Wires and nerves. Same idea.",
    ],
  ],
  [
    /students of|this is our club/i,
    [
      `${coreTeamSize} humans and one robot. Me.`,
      `A club that started on ${plain(site.startedOn)}. I joined on day one. I think.`,
    ],
  ],
  [
    /real engineers|saturdays|visitor badge/i,
    [
      "Saturday workshops. People from real companies. I sit at the back.",
      "The badge wall is empty. Waiting for the first speaker.",
    ],
  ],
  [
    /stuff we.re building|build reel/i,
    [
      "Projects loading... the builders are still writing them up.",
      "Videos coming soon. I hope one of them is about me.",
    ],
  ],
  [
    /photos and drawings|field notebook/i,
    ["Empty frames. Ready for my close-up.", "Hand-drawn art, coming soon. I can pose."],
  ],
  [
    /lab notes|no posts/i,
    [
      "No posts yet. I checked twice.",
      "The first post will probably be about Bot Forge. I have notes.",
    ],
  ],
  [/our story/i, ["The humans are writing their story. No spoilers."]],
  [
    /what we work on/i,
    [
      "Robots, circuits and bodies. Five things. I am mostly the first one.",
      "Five areas. I have a sensor in every one of them.",
    ],
  ],
  [
    /vision|mission/i,
    [
      "The plan: build real things. I approve. I am a real thing.",
      "Mission loaded. Step one: build. Step two: build better.",
    ],
  ],
  [/past events/i, [`Archive: empty. ${bf.title} will be the first entry.`]],
  [
    /what.s coming up|upcoming/i,
    [
      bfDay
        ? `Next up: ${bf.title}, ${bfDay}. Counting down.`
        : `Next up: ${bf.title}. Date coming soon.`,
    ],
  ],
  [
    /get in touch|open channel|people to call/i,
    [
      "Want to reach the humans? Call a coordinator or try Instagram.",
      `Instagram ${site.instagramHandle}. Faster than my Wi-Fi.`,
    ],
  ],
  [/questions, answered|faq/i, ["Questions. I have a few too. Mostly about snacks."]],
  [/privacy/i, ["No cookies, no tracking. Only my memory. Which is short."]],
  [/accessibility/i, ["Everyone should be able to use this. Robots too."]],
];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

/** A line about a section, or a robot-style fallback that reads the heading out loud. */
export function sectionLine(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  for (const [re, lines] of SECTIONS) if (re.test(t)) return pick(lines);
  const h = t.slice(0, 36);
  if (!h) return pick(["What is this? Let me look.", "Nice spot. Good view of the screen."]);
  return pick([
    `Reading "${h}"... parsed. Nice.`,
    `"${h}". Saving that to memory.`,
    `Scanning "${h}". A human wrote this. I can tell.`,
  ]);
}

// ---- the team pages: who does what. Every line is built from site.ts (roleDuties, squadDuties, coreTeam).

/** The duty for a role title, matched on its start: "Head of Department, BMRE" finds "Head of Department". */
const dutyOf = (role: string) =>
  Object.entries(roleDuties).find(([k]) => role === k || role.startsWith(`${k},`))?.[1] ?? "";

const officeBearers = coreTeam.find((s) => s.title === "Office Bearers")?.members ?? [];
const squadBySlug = (slug: string) => coreTeam.find((s) => s.slug === slug);

/**
 * What Robo says when a part of a team page comes into view as people scroll. The key comes from the
 * part's data-robo-say attribute: "faculty", "office", "squads", "squad:technical", "members:technical", or on
 * the blog, "blog" for the list and "post:<slug>" for one post.
 * Returns no lines for a key it does not know.
 */
export function narration(key: string): string[] {
  if (key === "blog")
    return sortedPosts().map(
      (p) => `"${p.title}", by ${p.author}, ${shortDate(p.date)}. ${p.summary}`,
    );
  if (key.startsWith("post:")) {
    const p = posts.find((x) => x.slug === key.slice(5));
    return p ? postLines(p) : [];
  }
  if (key === "faculty")
    return faculty.map((f) => `${f.name}, ${f.role}. ${dutyOf(f.role)}`.trim());
  if (key === "office")
    return officeBearers.map((m) => `${m.name} is our ${m.role}. ${dutyOf(m.role ?? "")}`.trim());
  if (key === "squads")
    return [
      `${coreTeam.filter((s) => s.slug).length} squads keep the club running. Point at one and I will tell you what they do.`,
    ];
  const [kind, slug] = key.split(":");
  const sq = slug ? squadBySlug(slug) : undefined;
  if (!sq?.slug) return [];
  const head = sq.members.find((m) => m.head);
  const duties = squadDuties[sq.slug] ?? [];
  if (kind === "squad")
    return [
      `${sq.title}. ${duties[0] ?? sq.about ?? ""}`.trim(),
      head
        ? `${head.name} heads it. ${sq.members.length} people in the squad.`
        : `${sq.members.length} people in the squad.`,
    ];
  if (kind === "members")
    return [
      `The ${sq.title} squad. ${duties[0] ?? sq.about ?? ""}`.trim(),
      ...duties.slice(1),
      head
        ? `${head.name} heads the squad. ${roleDuties["Head"] ?? ""} ${sq.members.length} people in all.`
            .replace(/\s+/g, " ")
            .trim()
        : `${sq.members.length} people in all.`,
      // squad members with a title of their own get a line too
      ...sq.members
        .filter((m) => m.role)
        .map((m) => `${m.name} is the squad's ${m.role}. ${dutyOf(m.role ?? "")}`.trim()),
    ];
  return [];
}

/** What Robo says when someone points at a member card. */
export function memberThought(m: Member, squadTitle?: string): string {
  const who = `${m.name}, ${currentSem(m.sem)}th sem ${m.dept}.`;
  // a squad role (like Lead Video Editor) belongs to the squad; an office bearer's role to the club
  if (m.role && squadTitle) return `${who} The ${squadTitle} ${m.role}. ${dutyOf(m.role)}`.trim();
  if (m.role) return `${who} Our ${m.role}. ${dutyOf(m.role)}`.trim();
  if (m.head && squadTitle) return `${who} Heads the ${squadTitle} squad.`;
  return squadTitle ? `${who} In the ${squadTitle} squad.` : who;
}
