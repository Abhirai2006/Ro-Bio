// Real club facts supplied by the club. Edit here, not in components.
export const site = {
  name: "RO-BIO",
  url: "https://ro-bio.hub-muse.workers.dev", // change this when a custom domain is connected
  tagline: "Unauthorised innovation in progress!",
  // The department the club's faculty come from. RO-BIO itself is open to students of every branch: see `openTo`.
  branch: "Biomedical and Robotic Engineering",
  focus: "robotics and biomedical engineering", // what the club works on
  openTo: "students of every branch", // who can join
  college: "Mysore University School of Engineering",
  address: "Mysore University School of Engineering, Manasa Gangotri Campus, Mysore-570006",
  mapUrl: "https://maps.app.goo.gl/8douKdj7mEiE7aDKA", // the club's own pin
  // What the embedded map shows. To use the exact pin: Google Maps, Share, "Embed a map", copy the src="..." link here.
  mapEmbed:
    "https://www.google.com/maps?q=Mysore+University+School+of+Engineering,+Manasa+Gangotri,+Mysuru&output=embed",
  instagram: "https://www.instagram.com/ro_bio_hub/",
  instagramHandle: "@ro_bio_hub",
  linkedin: "https://www.linkedin.com/in/ro-bio-hub-606b5840b/",
  startedOn: "2026-05-20",
};

export type Contact = { name: string; role: string; phone: string };

export const contacts: Contact[] = [
  { name: "Archana G", role: "Faculty coordinator", phone: "9481832235" },
  { name: "Thushar K L", role: "Student coordinator", phone: "8217674366" },
  { name: "Shloka D Raj", role: "Student coordinator", phone: "9148020699" },
];

/** The faculty behind the club, shown first on the Team page. A phone number is optional. */
export const faculty: { name: string; role: string; phone?: string }[] = [
  { name: "Dr. Nithin S K", role: "Head of Department, BMRE" },
  { name: "Archana G", role: "Faculty coordinator", phone: "9481832235" },
];

export type Activity = { name: string; tag: "EVENT" | "EXPO" | "SESSION" };

export type ClubEvent = {
  slug: string;
  title: string;
  kind: string;
  date: string | null; // YYYY-MM-DD, India time. null shows "Date coming soon" everywhere
  time?: string; // like "11:45 am to 1:00 pm"; left out while it is not announced
  venue: string;
  audience?: string; // who it is for, when it is not open to everyone
  about?: string; // one or two plain sentences for the event page
  poster?: string; // a file in public/, like "/events/robo-spark.jpg"
  activities: Activity[];
  registration: "coming-soon" | "open" | "closed" | "none"; // "none": nothing to register for, so the page says nothing
  /** With registration "open": sign-ups open and close at these moments (India time), on their own. */
  opensAt?: string;
  closesAt?: string;
};

/** The three Bot Forge contests, by the address of their page: /events/bot-forge/robo-sumo and so on. */
export type ContestSlug = "robo-sumo" | "robo-race" | "shark-tank";

export type Contest = {
  slug: ContestSlug;
  title: string;
  /** One line for the cards and the page intro. */
  pitch: string;
  /** Smallest and largest team. */
  team: [number, number];
  /** Club kits lent to the first teams that ask, or 0 when the event needs none. */
  kits: number;
  /** Cash prizes in rupees: first place, then second. */
  prizes: [number, number];
  /** The code at the start of a team number, like SUMO-07. */
  code: string;
};

/**
 * Bot Forge 2026: the day, the contests, the prizes, the fee and the judge. The rules themselves are in
 * src/lib/bot-forge.ts, built from these numbers. Change a number here and every page follows.
 */
export const botForgeInfo = {
  openTo: "MUSE students of every branch and every semester",
  /** Entry fee per team, in rupees. Paid by UPI when the team registers. Not refundable. */
  fee: 99,
  opensLabel: "Mon 30 Nov, 10 am",
  closesLabel: "Sun 6 Dec, 11:59 pm",
  /** Teams that registered can still send their UPI transaction number until this moment. */
  paymentsCloseAt: "2026-12-08T00:00:00+05:30",
  /**
   * Where teams pay. PLACEHOLDER: the President's UPI ID and the name a payment app shows for it.
   * While `id` is empty, the form takes registrations and says the payment details are coming soon.
   */
  upi: { id: "", payee: "" },
  /** True while the rules on the site are a draft. Every rules page says so in a banner. */
  rulesDraft: true,
  /** The Design squad's Bot Forge artwork, from the poster, shown on the Bot Forge pages. */
  art: {
    /** The Bot Forge crest. */
    crest: "/events/bot-forge/crest.webp",
    /** The sumo wrestler and the racer, cut out of the poster. They move on the contest cards. */
    sumoBot: "/events/bot-forge/sumo-bot.webp",
    raceBot: "/events/bot-forge/race-bot.webp",
    /** The two line-art mechs from the poster's top corners. They peek in at the top of the pages. */
    mechLeft: "/events/bot-forge/mech-left.webp",
    mechRight: "/events/bot-forge/mech-right.webp",
  },
  /** The 3D shark on the Shark Tank page, and the still picture shown on phones instead. */
  shark: {
    model: "/events/bot-forge/shark.glb",
    still: "/events/bot-forge/shark-still.webp",
    credit: {
      title: "Great White Shark Attack Bite Animation Loop",
      author: "LasquetiSpice",
      url: "https://sketchfab.com/3d-models/great-white-shark-attack-bite-animation-loop-936d4110b39945f5a46cb2d831ece920",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  contests: [
    {
      slug: "robo-sumo",
      title: "Robo Sumo",
      pitch: "Build a robot at the venue and push the other robot out of the ring.",
      team: [3, 5],
      kits: 5,
      prizes: [3000, 2000],
      code: "SUMO",
    },
    {
      slug: "robo-race",
      title: "Robo Race",
      pitch:
        "Build a remote controlled robot and race it round an obstacle track against the clock.",
      team: [3, 5],
      kits: 5,
      prizes: [3000, 2000],
      code: "RACE",
    },
    {
      slug: "shark-tank",
      title: "Shark Tank",
      pitch: "Pick any problem, pitch your solution with a PPT, and face the judge's questions.",
      team: [3, 4],
      kits: 0,
      prizes: [3000, 2000],
      code: "SHARK",
    },
  ] as Contest[],
  /** The day, in order. */
  schedule: [
    { time: "11:00 am", what: "Inauguration and the Bot Forge banner drop" },
    {
      time: "After the inauguration",
      what: "Robo Sumo and Robo Race teams build their robots at the venue",
    },
    {
      time: "2:00 pm",
      what: "Robo Sumo, Robo Race and Shark Tank begin. Shark Tank teams arrive now",
    },
    { time: "2:00 to 5:30 pm", what: "Tech Expo: senior students' projects on show" },
    { time: "5:30 pm", what: "Prize distribution, and the day ends" },
  ],
  techExpo: {
    time: "2:00 to 5:30 pm",
    about:
      "Senior students show the projects they built in earlier semesters, on benches with nameplates. Walk round, look closely and ask them how they made it. It is a showcase: no marks and no prizes.",
  },
  /** The Shark Tank judge, as he agreed to be introduced. No contact details on the site. */
  judge: {
    name: "Dr. Mohammed Nadeem M",
    points: [
      "PhD (VTU), and a Fellow of the Higher Education Academy (UK).",
      "Leap Education Officer at the Leap Education Society, IIT Madras Research Park, where he mentors students on finding problems, design reviews and product development.",
      "Over a decade of teaching robotics, automation and CAD/CAM, at ATME College of Engineering, Mysuru and the University of Bolton (UAE campus). He wrote the textbook CNC Programming and Robotics.",
    ],
  },
};

/** Every Bot Forge cash prize added up. */
export const botForgePrizeTotal = botForgeInfo.contests.reduce(
  (sum, c) => sum + c.prizes[0] + c.prizes[1],
  0,
);

/** Rupees the Indian way: 15000 becomes "₹15,000". */
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const contestBySlug = (slug: string) => botForgeInfo.contests.find((c) => c.slug === slug);

export const events: ClubEvent[] = [
  {
    slug: "bot-forge",
    title: "Bot Forge",
    kind: "Competition",
    date: "2026-12-08",
    time: "11 am to 5:30 pm",
    venue: site.address,
    audience: botForgeInfo.openTo,
    about: `RO-BIO's first robotics competition: ${botForgeInfo.contests.map((c) => c.title).join(", ")}, with ${rupees(botForgePrizeTotal)} in cash prizes. Plus a Tech Expo of senior students' projects.`,
    poster: "/events/bot-forge.webp",
    activities: [
      ...botForgeInfo.contests.map((c) => ({ name: c.title, tag: "EVENT" as const })),
      { name: "Tech Expo", tag: "EXPO" },
    ],
    registration: "open",
    opensAt: "2026-11-30T10:00:00+05:30",
    closesAt: "2026-12-07T00:00:00+05:30",
  },
  {
    slug: "robo-spark",
    title: "Robo Spark",
    kind: "Interactive group discussion",
    date: "2026-11-03",
    time: "11:45 am to 1:00 pm",
    venue:
      "Prof. K.S. Rangappa Auditorium, School of Planning and Architecture, University of Mysore",
    audience: "First year students of MUSE",
    about:
      "An interactive session for this year's first years. Teams of five take on a robotics problem, and a few teams present their solution on stage.",
    poster: "/events/robo-spark.jpg",
    activities: [
      { name: "Icebreaker", tag: "SESSION" },
      { name: "Group discussion on a robotics problem", tag: "SESSION" },
      { name: "Teams present on the podium", tag: "SESSION" },
    ],
    registration: "none",
  },
];

/** Bot Forge, the club's first competition. Named here because several pages talk about it whatever comes next. */
export const botForge = events.find((e) => e.slug === "bot-forge")!;

/**
 * Where an event's registration stands at `now` (milliseconds). An "open" event with opensAt and closesAt
 * is "coming-soon" before it opens and "closed" once it closes, so nobody has to change it by hand.
 */
export function registrationNow(
  e: Pick<ClubEvent, "registration" | "opensAt" | "closesAt">,
  now = Date.now(),
): ClubEvent["registration"] {
  if (e.registration !== "open" || !e.opensAt || !e.closesAt) return e.registration;
  if (now < Date.parse(e.opensAt)) return "coming-soon";
  if (now >= Date.parse(e.closesAt)) return "closed";
  return "open";
}

/** Events still to come on `today` (YYYY-MM-DD): dated ones in date order, then the ones whose date is not fixed yet. */
export function upcomingEvents(today: string) {
  const dated = events
    .filter((e) => e.date && e.date >= today)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  return [...dated, ...events.filter((e) => !e.date)];
}

/** Events whose date has passed, newest first. */
export function pastEvents(today: string) {
  return events
    .filter((e) => e.date && e.date < today)
    .sort((a, b) => b.date!.localeCompare(a.date!));
}

/** The event to put first on the home page: the next dated one, or Bot Forge while nothing is dated. */
export function nextEvent(today: string) {
  return upcomingEvents(today)[0] ?? botForge;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** The event's date, like "Fri, 6 Nov 2026", or "Date coming soon" while it is not fixed. */
export function eventDate(e: { date: string | null }) {
  return e.date ? formatDate(e.date) : "Date coming soon";
}

/** The date without the weekday, like "6 Nov 2026". */
export function shortDate(iso: string) {
  return formatDate(iso).replace(/^[A-Za-z]{3},\s*/, "");
}

/** Whole days between two YYYY-MM-DD dates, using India calendar dates. */
export function daysBetween(fromIso: string, toIso: string) {
  const a = Date.UTC(...(fromIso.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(toIso.split("-").map(Number) as [number, number, number]));
  return Math.round((b - a) / 86400000);
}

export function todayInIndia(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Core team, from the club's selection announcement. `sem` is the semester at announcement time. */
export type Member = {
  name: string;
  sem: number;
  dept: string;
  head?: boolean;
  role?: string | undefined;
};
/** A squad. The five working squads have their own page at /team/<slug>; Office Bearers stay on /team. */
export type Squad = {
  title: string;
  members: Member[];
  /** The squad page address, like "technical" for /team/technical. */
  slug?: "projects" | "events" | "technical" | "social-media" | "design";
  /** One line under the squad name. */
  about?: string;
};

/** "1st", "2nd", "3rd", "4th" ... for a semester number. */
export const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/** Everyone has moved up one semester since the announcement. */
export function currentSem(announcedSem: number) {
  return announcedSem + 1;
}

const m = (name: string, sem: number, dept = "BMRE", head = false, role?: string): Member => ({
  name,
  sem,
  dept,
  head,
  role,
});

export const coreTeam: Squad[] = [
  {
    title: "Office Bearers",
    members: [
      m("Thushar K L", 6, "BMRE", false, "President"),
      m("Shloka D Raj", 4, "BMRE", false, "Vice President"),
      m("Abhishek Rai A", 4, "AIML", false, "Secretary"),
    ],
  },
  {
    title: "Projects",
    slug: "projects",
    about:
      "Turns ideas into working robots, from the first sketch on the whiteboard to a tested prototype.",
    members: [
      m("Anagha A Raichurkar", 6, "BMRE", true),
      m("Ananya R", 6),
      m("Bhoomika S", 6),
      m("Varsha Yogesh", 4, "CS&D"),
      m("Rohan", 4, "CS&D"),
      m("Shivprasad", 6, "AIML"),
    ],
  },
  {
    title: "Events",
    slug: "events",
    about: "Plans and runs RO-BIO's events: the layout, the schedule, the crew and the volunteers.",
    members: [
      m("Tejaswini V", 6, "BMRE", true),
      m("Karthik Kushalappa", 6),
      m("Abhijna Samanth", 6),
      m("Abdul Muhaymin Khan", 6),
      m("Tejaswini", 4),
      m("Shrishant Bashetty", 4),
      m("Harshini", 4),
    ],
  },
  {
    title: "Technical",
    slug: "technical",
    about: "Builds and debugs the club's electronics, code and this website.",
    members: [
      m("Brunda H S", 6, "BMRE", true),
      m("Varsha H K", 6),
      m("Lahari", 4),
      m("Chirag", 4),
      m("Pushkal Sai A", 4, "CS&D"),
      m("Monica S", 4),
    ],
  },
  {
    title: "Social Media and Outreach",
    slug: "social-media",
    about: "Tells the campus what RO-BIO is up to, on Instagram, on LinkedIn and on the ground.",
    members: [
      m("Gagan Yadav A", 6, "BMRE", true),
      m("Sumith S", 4, "BMRE", false, "Lead Video Editor"),
      m("Kulsum Firdaus", 4, "AIML"),
      m("Siddharth A", 4, "CS&D"),
      m("Siddharth", 4),
      m("Deeksha B H", 4),
      m("Nishanth Rajachar", 4, "CS&D"),
    ],
  },
  {
    title: "Design",
    slug: "design",
    about: "Makes the club's posters, visuals and the look of everything RO-BIO puts out.",
    members: [
      m("Viren Biddappa K A", 6, "BMRE", true),
      m("Yashika B Ramesh", 6),
      m("Preetham Gowda S R", 4),
    ],
  },
];

/**
 * Photos for the team pages, by name exactly as it appears above (or in `faculty`).
 * Files live in public/team/people/ as square WebP pictures. Anyone without a photo shows initials.
 */
export const teamPhotos: Record<string, string> = {
  "Dr. Nithin S K": "/team/people/nithin-s-k.webp",
  "Archana G": "/team/people/archana-g.webp",
  "Abhishek Rai A": "/team/people/abhishek-rai-a.webp",
  "Anagha A Raichurkar": "/team/people/anagha-a-raichurkar.webp",
  "Ananya R": "/team/people/ananya-r.webp",
  "Karthik Kushalappa": "/team/people/karthik-kushalappa.webp",
  "Varsha Yogesh": "/team/people/varsha-yogesh.webp",
  "Abdul Muhaymin Khan": "/team/people/abdul-muhaymin-khan.webp",
  "Abhijna Samanth": "/team/people/abhijna-samanth.webp",
  Tejaswini: "/team/people/tejaswini.webp",
  "Shrishant Bashetty": "/team/people/shrishant-bashetty.webp",
  "Brunda H S": "/team/people/brunda-h-s.webp",
  "Varsha H K": "/team/people/varsha-h-k.webp",
  "Thushar K L": "/team/people/thushar-k-l.webp",
  "Shloka D Raj": "/team/people/shloka-d-raj.webp",
  "Pushkal Sai A": "/team/people/pushkal-sai-a.webp",
  "Monica S": "/team/people/monica-s.webp",
  "Gagan Yadav A": "/team/people/gagan-yadav-a.webp",
  "Kulsum Firdaus": "/team/people/kulsum-firdaus.webp",
  "Siddharth A": "/team/people/siddharth-a.webp",
  "Nishanth Rajachar": "/team/people/nishanth-rajachar.webp",
  "Deeksha B H": "/team/people/deeksha-b-h.webp",
  "Viren Biddappa K A": "/team/people/viren-biddappa-k-a.webp",
  "Preetham Gowda S R": "/team/people/preetham-gowda-s-r.webp",
};

/** LinkedIn profile links, by name. Only people who gave one in the team form are listed. */
export const teamLinkedIn: Record<string, string> = {
  "Abhishek Rai A": "https://www.linkedin.com/in/abhishek-rai-a-00067238b",
  "Anagha A Raichurkar": "https://www.linkedin.com/in/anagha-a-raichurkar-51b349291",
  "Ananya R": "https://www.linkedin.com/in/ananya-r-b77765318",
  "Karthik Kushalappa": "https://www.linkedin.com/in/karthik-kushalappa-841094377",
  "Varsha Yogesh": "https://www.linkedin.com/in/varsha-yogesh-6ab32740b",
  "Abdul Muhaymin Khan": "https://www.linkedin.com/in/abdul-muhaymin-khan-18103b2a8",
  "Abhijna Samanth": "https://www.linkedin.com/in/abhijna-samanth-k-m-6b4b49376",
  "Gagan Yadav A": "https://www.linkedin.com/in/gagan-yadav-8317a629a",
  "Nishanth Rajachar": "https://www.linkedin.com/in/nishanth-rajachar-40a392336",
  "Shrishant Bashetty": "https://www.linkedin.com/in/shrishant-bashetty-5442a732a",
  "Viren Biddappa K A": "https://www.linkedin.com/in/viren-biddappa-k-a-634430304",
  "Preetham Gowda S R": "https://www.linkedin.com/in/preetham-gowda-sr-3aa8103b7",
};

/**
 * Peerlist profile links, by name, for people who asked for Peerlist instead of LinkedIn.
 * Their card flips to show this link the same way. Someone in both lists shows LinkedIn.
 */
export const teamPeerlist: Record<string, string> = {
  "Thushar K L": "https://peerlist.io/kthushar032",
};

/**
 * What each role does, in plain words. Robo reads these out on the team pages, so keep each one short.
 * Drafted from what the site already says: correct them here and Robo follows.
 */
export const roleDuties: Record<string, string> = {
  "Head of Department": "Backs the club from the department side.",
  "Faculty coordinator": "Guides the club and signs off its events with the college.",
  President: "Leads the club, runs the core meetings and has the final say on plans.",
  "Vice President":
    "Works beside the President, keeps the squads in step and steps in when needed.",
  Secretary: "Keeps the club records and minutes, handles club mail and sends out notices.",
  Head: "Leads the squad and shares out its work.",
  "Lead Video Editor": "Cuts, colours and finishes every reel and video RO-BIO posts.",
};

/**
 * Squads whose picture is not ready yet: their page shows a "coming soon" box instead, and its link preview
 * uses the site's own image. The Design squad is drawing its own. When the files arrive in public/team/art
 * (the same names as the other squads'), take the squad out of this list.
 */
export const squadArtPending: NonNullable<Squad["slug"]>[] = ["design"];

/** What each squad does, a few short lines each. Robo says these as people scroll the team pages. */
export const squadDuties: Record<NonNullable<Squad["slug"]>, string[]> = {
  projects: [
    "They turn an idea into steps: what to build first, which parts to get, what could go wrong.",
    "Sketch it on the whiteboard, build it, test it, fix it. Then test it again.",
  ],
  events: [
    "They plan the layout, the schedule, the crew and the volunteers for every RO-BIO event.",
    "Speaker running late, queue at registration? They sort it out before you notice.",
  ],
  technical: [
    "They build and debug the club's electronics and code. This website too. And me.",
    "Circuit boards, bug lists and a lot of coffee.",
  ],
  "social-media": [
    "They tell the campus what RO-BIO is up to, on Instagram, on LinkedIn and on the ground.",
    "Captions, reels and QR flyers that make people stop scrolling.",
  ],
  design: [
    "They make the posters, the visuals and the look of everything RO-BIO puts out.",
    "A clear idea, a readable layout, and it fits the topic. That is their checklist.",
  ],
};

/** What one squad tells applicants on /join. Keyed by the squad page slug. */
export type SquadCall = {
  /** Who fits. Applicants need any one of these, not all. */
  lookFor: string[];
  /** Small hints about the interview, so nobody walks in blind. Never the actual questions. */
  expect: string[];
  /** Things this squad's applicants may bring. */
  bring?: string[];
  /** A rule in bold, like the Design squad's "no generative AI". */
  rule?: string;
};

/**
 * Core member recruitment: the /join page, the "Join" menu item, the home page strip and the
 * "Join a squad" tile on /team all read this.
 * "soon": opens soon, follow Instagram. "open": the /join sign-up form is live. "closed": this round is over.
 * The interview days and semesters are in src/lib/recruit.ts (DAYS and SEMS), because the judge page uses them too.
 */
export const recruitment: {
  status: "soon" | "open" | "closed";
  /** Who may apply. */
  who: string;
  /** Each interview day's time and when students should be at the door, by its name in DAYS (src/lib/recruit.ts). */
  schedule: Record<string, { time: string; arriveBy: string; note?: string }>;
  /** Where the interviews happen. Every squad sits in this one room, each in its own corner. */
  venue: string;
  /** Sign-ups stop at this moment (India time). The admin page can also pause them earlier. */
  closesAt: string;
  /** The same moment, as people read it. */
  closesLabel: string;
  /** The club Gmail the result emails go out from. The admin page opens Gmail drafts in this account. */
  mailFrom: string;
  /** How many days a selected student has to reply to the result email. */
  replyWithinDays: number;
  squads: Record<NonNullable<Squad["slug"]>, SquadCall>;
} = {
  status: "closed",
  who: "1st and 3rd semester students of every branch",
  schedule: {
    "Mon 23 Nov": {
      time: "12 to 1 pm",
      arriveBy: "12 pm",
      note: "If many students come, we keep going past 1 pm until everyone has been seen.",
    },
  },
  venue: "the classroom opposite the MUSE auditorium",
  closesAt: "2026-11-23T12:00:00+05:30",
  closesLabel: "Mon 23 Nov, 12 pm",
  mailFrom: "ro.bio.muse@gmail.com",
  replyWithinDays: 2,
  squads: {
    projects: {
      lookFor: [
        "You like building, fixing or taking things apart",
        "A school, hobby or college project you can talk about, even a small one",
        "A basic idea of Arduino, sensors or motors (not needed in 1st sem)",
        "You like planning: splitting work, keeping track, meeting a deadline",
      ],
      expect: [
        "Turning an idea into a small first version: what you would build first, and what parts it needs",
        "How you would split a project between a few people",
        "Something you tried that did not work, and what you did next",
      ],
      bring: [
        "Anything you built: the thing itself, or photos, a video, your notes or sketches of it",
        "A school, hobby or competition project, even a small or unfinished one",
        "Work you show counts in your favour in the marks and gives you a better chance of getting in",
      ],
    },
    events: {
      lookFor: [
        "You have helped run something: a school fest, a class event, a family function",
        "You are comfortable talking to people you do not know",
        "You stay calm when plans change at the last minute",
        "You can be there on event days, including Saturdays",
      ],
      expect: [
        '"What would you do if..." moments at an event: something breaks, a queue builds up, someone is late',
        "Planning a short session or a checklist out loud",
        "An event you were part of, and one thing that went wrong",
      ],
      bring: [
        "Photos, posters, schedules or checklists from an event you helped run",
        "A certificate or a thank you note from an event you organised or volunteered at",
        "Work you show counts in your favour in the marks and gives you a better chance of getting in",
      ],
    },
    technical: {
      lookFor: [
        "Curiosity about how things work inside",
        "Some programming in any language: C, Python, anything",
        "Electronics, Arduino, soldering or web development",
        "You have opened up or repaired a device just to see how it works",
      ],
      expect: [
        "Thinking out loud about how simple robots and sensors work. A sensible guess counts",
        "How you would find the fault when something stops working",
        "An honest answer about what you have used so far. Never built a robot? That is fine",
      ],
      bring: [
        "Code you wrote: a GitHub link, a project on your laptop, or screenshots",
        "A circuit, an Arduino build or a website you made. Photos or a short video are fine",
        "Work you show counts in your favour in the marks and gives you a better chance of getting in",
      ],
    },
    "social-media": {
      lookFor: [
        "You write captions, scripts or short posts people want to read",
        "Photography, or shooting and editing video (CapCut, Premiere, anything)",
        "You have run a page or a channel, for yourself or for someone else",
        "You are happy to speak to a class or a group of CRs",
      ],
      expect: [
        "Pitching RO-BIO, or writing a caption, in a few lines out loud",
        "Planning simple posts or a short reel for an event",
        "An account you follow, and why it makes you stop scrolling",
      ],
      bring: [
        "Your earlier work: posts, reels, photos, video edits, or a page you ran. Show it on your phone or laptop",
        "Edits count a lot: show the before and after, or walk us through how you cut it",
        "Work you show counts in your favour in the marks and gives you a better chance of getting in",
      ],
    },
    design: {
      lookFor: [
        "Graphic design skills",
        "Traditional (paper) or digital illustration, digital preferred",
        "3D design and modelling",
        "Animation skills",
      ],
      expect: [
        "You get a topic when you arrive and about 15 minutes to make it, on paper or on a device",
        "You present it in about 1 minute and say why you made each choice",
        "Questions about your tools, and about your work if you show some",
      ],
      bring: [
        "Your digital illustration device or tools, if you want them: iPad, laptop, colour pencils, anything",
        "Your portfolio: posters, illustrations, 3D models or animations you made yourself, on a device or on paper",
        "Work you show counts in your favour in the marks and gives you a better chance of getting in",
      ],
      rule: "Absolutely no generative AI.",
    },
  },
};

/** True while the /join sign-up form takes new students, on the clock `now` (milliseconds). */
export const recruitmentOpen = (now = Date.now()) =>
  recruitment.status === "open" && now < Date.parse(recruitment.closesAt);

/**
 * The gallery page. Put the files in public/gallery/ and add one line each, newest first.
 * A photo: { kind: "photo", src: "/gallery/robo-spark-1.webp", thumb: "/gallery/robo-spark-1-sm.webp", alt: "What is in the photo", caption: "Robo Spark, the final round", event: "Robo Spark" }
 * A clip: { kind: "clip", src: "/gallery/robo-spark-1.mp4", poster: "/gallery/robo-spark-1.webp", alt: "...", caption: "..." }
 * Clips play once when they come on screen, muted, then show Replay. Keep each clip under about 4 MB.
 */
export type GalleryItem = {
  kind: "photo" | "clip";
  src: string;
  /** clips only: the still shown before it plays, usually its first frame */ poster?: string;
  /** photos only: a smaller copy for the grid (about 800 px); the full `src` opens when tapped */
  thumb?: string;
  alt: string;
  caption: string;
  event?: string;
};
export const gallery: GalleryItem[] = [
  {
    kind: "clip",
    src: "/gallery/robo-spark-highlights.mp4",
    poster: "/gallery/robo-spark-highlights.webp",
    alt: "Clips from Robo Spark: speakers on stage, teams talking through their problem, the countdown on the screen and everyone on stage at the end.",
    caption: "Robo Spark in under half a minute. Turn the sound on to hear the hall.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-title.webp",
    thumb: "/gallery/robo-spark-title-sm.webp",
    alt: "The Robo Spark title screen in the hall: interactive group discussion, 3 November 2026.",
    caption: "The screen before the doors opened.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-welcome.webp",
    thumb: "/gallery/robo-spark-welcome-sm.webp",
    alt: "Faculty and student hosts at the podium on stage, welcoming the first years.",
    caption: "The welcome, with our faculty on stage.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-what-we-do.webp",
    thumb: "/gallery/robo-spark-what-we-do-sm.webp",
    alt: "A student speaks at the podium beside a screen listing robotics, electronics, biomedical, competitions and projects.",
    caption: "What RO-BIO does, in one slide.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-speaker.webp",
    thumb: "/gallery/robo-spark-speaker-sm.webp",
    alt: "A student in a white shirt speaks into the microphone at the podium.",
    caption: "One of our hosts on the mic.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-hall.webp",
    thumb: "/gallery/robo-spark-hall-sm.webp",
    alt: "A wide view of the hall, packed with first year students in blue seats.",
    caption: "A full hall of first years.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-audience.webp",
    thumb: "/gallery/robo-spark-audience-sm.webp",
    alt: "First year students in the hall, listening and talking among themselves.",
    caption: "Listening in.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-discussion.webp",
    thumb: "/gallery/robo-spark-discussion-sm.webp",
    alt: "Students in the front rows lean in and talk through their team problem.",
    caption: "Teams working through their problem.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-discussion-2.webp",
    thumb: "/gallery/robo-spark-discussion-2-sm.webp",
    alt: "A volunteer talks with a team of students in their seats.",
    caption: "A volunteer checks in on a team.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-countdown.webp",
    thumb: "/gallery/robo-spark-countdown-sm.webp",
    alt: "The countdown timer on the big screen while teams discuss in the hall.",
    caption: "The timer is on.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-thank-you.webp",
    thumb: "/gallery/robo-spark-thank-you-sm.webp",
    alt: "First year students line up on stage in front of the Thank You screen.",
    caption: "Everyone on stage at the end.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-core-team.webp",
    thumb: "/gallery/robo-spark-core-team-sm.webp",
    alt: "The RO-BIO team and faculty on stage in front of the Robo Spark screen, thumbs up.",
    caption: "The RO-BIO crew behind Robo Spark.",
    event: "Robo Spark",
  },
  {
    kind: "photo",
    src: "/gallery/robo-spark-steps.webp",
    thumb: "/gallery/robo-spark-steps-sm.webp",
    alt: "The RO-BIO team sits together on the steps outside the hall.",
    caption: "On the steps after the event.",
    event: "Robo Spark",
  },
];

/** The five squads that have their own page, in the order the team page shows them. */
export const squadPages = () =>
  coreTeam.filter((s): s is Squad & { slug: NonNullable<Squad["slug"]> } => !!s.slug);

/** How many people are on the core team, counted from the list above. */
export const coreTeamSize = coreTeam.reduce((n, s) => n + s.members.length, 0);

/** The squad someone is in, by their name exactly as it appears in `coreTeam`. */
export const squadOf = (name: string) =>
  coreTeam.find((s) => s.members.some((m) => m.name === name));

/** The anchor for someone's card on the team pages, like "preetham-gowda-s-r". */
export const personId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Where a mention of someone in a blog post links: their card on their squad's page, or on the Team page for
 * office bearers and faculty. The page scrolls to the card and lights it up. Null for a name not on the team.
 */
export function personLink(name: string): { to: string; hash: string } | null {
  const squad = squadOf(name);
  if (squad) return { to: squad.slug ? `/team/${squad.slug}` : "/team", hash: personId(name) };
  if (faculty.some((f) => f.name === name)) return { to: "/team", hash: personId(name) };
  return null;
}

/** What a byline says under someone's name: their role if they have one, otherwise their squad. */
export function bylineOf(name: string): { label: string; slug?: string | undefined } | null {
  const squad = squadOf(name);
  if (!squad) return null;
  const role = squad.members.find((m) => m.name === name)?.role;
  if (role) return { label: role };
  return { label: `${squad.title} squad`, slug: squad.slug };
}

/** What the club works on. From the club's own website brief, kept short. */
export const focusAreas: { tag: string; title: string; text: string }[] = [
  {
    tag: "ROBOTICS",
    title: "Robotics and automation",
    text: "Mobile robots, sensors, motor drivers and the control code that ties them together.",
  },
  {
    tag: "ELECTRONICS",
    title: "Embedded systems and electronics",
    text: "Microcontrollers, circuits, PCBs, and getting hardware and software to talk to each other.",
  },
  {
    tag: "BIOMEDICAL",
    title: "Biomedical engineering",
    text: "Medical instruments, assistive devices and sensors that read the body, like heart rate and muscle signals.",
  },
  {
    tag: "COMPETE",
    title: "Competitions and events",
    text: "Robotics challenges and technical events where you test what you built against other people's.",
  },
  {
    tag: "BUILD",
    title: "Projects",
    text: "Small teams taking an idea to a working prototype, and writing down what worked and what didn't.",
  },
];

export const vision =
  "A place on campus where students build real things in robotics and biomedical engineering, and use them to solve real problems.";

export const mission = [
  "Make hands-on work the normal way to learn.",
  "Work on robotics, automation, embedded systems and biomedical technology.",
  "Run workshops, competitions and demos for students.",
  "Help members get better at teamwork, leading and solving problems.",
  "Bring in engineers from industry to teach and mentor.",
];

/**
 * Club merch, shown on /merch: the club jacket, confirmed with the producer. While `draft` is true the page is a
 * hidden link for members with likes and notes; now it is public, in the menu and on the home page.
 */
export type MerchKind = "jacket";
export const merch = {
  drop: "Drop 01",
  draft: false,
  draftNote:
    "Draft kit with the artwork from our design team. Tell us what you think before it goes to print.",
  products: [
    {
      kind: "jacket",
      name: "Club Jacket",
      price: 570,
      details: [
        "Full front zip",
        "Stand-up rib collar",
        "Side pockets",
        "Rib cuffs and hem",
        "College crest as a peel-off sticker",
      ],
    },
  ] as { kind: MerchKind; name: string; price: number; details: string[] }[],
  /** The producer's heather grey, from the fabric swatch the club picked. */
  colours: [{ id: "grey", name: "Grey", hex: "#a3a5a7" }] as {
    id: "grey";
    name: string;
    hex: string;
    lower?: string;
  }[],
  /** The producer's size chart: chest width in inches, measured across the front. */
  sizes: [
    { size: "S", width: 20 },
    { size: "M", width: 21 },
    { size: "L", width: 22 },
    { size: "XL", width: 23 },
    { size: "XXL", width: 24 },
  ],
  /**
   * The 3D jacket is a free model from Sketchfab under CC BY 4.0, which asks for this credit. It is shown in
   * Credits on the Terms page. Keep it there while the model is on the site.
   */
  models: [
    {
      kind: "jacket",
      title: "AGC Project Bomber Jacket",
      author: "TaySlays93",
      url: "https://sketchfab.com/3d-models/agc-project-bomber-jacket-603f6559d0cc4152aadf0d8cd8e299e0",
    },
  ] as { kind: MerchKind; title: string; author: string; url: string }[],
};
