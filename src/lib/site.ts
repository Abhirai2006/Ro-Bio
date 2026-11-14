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
};

export const events: ClubEvent[] = [
  {
    slug: "bot-forge",
    title: "Bot Forge",
    kind: "Competition",
    date: null,
    venue: site.address,
    activities: [
      { name: "Robo Sumo", tag: "EVENT" },
      { name: "Robot Race", tag: "EVENT" },
    ],
    registration: "coming-soon",
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
      m("Kartik Kushalappa", 6),
      m("Abhijna Samanth", 6),
      m("Abdul Muhaymin Khan", 6),
      m("Tejaswini", 4),
      m("Srishant", 4),
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
      m("Kulsum", 4, "AIML"),
      m("Siddharth A", 4, "CS&D"),
      m("Siddharth", 4),
      m("Deeksha B H", 4),
      m("Nishanth Raj", 4, "CS&D"),
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
  "Abdul Muhaymin Khan": "/team/people/abdul-muhaymin-khan.webp",
  Tejaswini: "/team/people/tejaswini.webp",
  "Brunda H S": "/team/people/brunda-h-s.webp",
  "Pushkal Sai A": "/team/people/pushkal-sai-a.webp",
  "Monica S": "/team/people/monica-s.webp",
  "Gagan Yadav A": "/team/people/gagan-yadav-a.webp",
  "Deeksha B H": "/team/people/deeksha-b-h.webp",
  "Viren Biddappa K A": "/team/people/viren-biddappa-k-a.webp",
  "Preetham Gowda S R": "/team/people/preetham-gowda-s-r.webp",
};

/** LinkedIn profile links, by name. Only people who gave one in the team form are listed. */
export const teamLinkedIn: Record<string, string> = {
  "Abhishek Rai A": "https://www.linkedin.com/in/abhishek-rai-a-00067238b",
  "Anagha A Raichurkar": "https://www.linkedin.com/in/anagha-a-raichurkar-51b349291",
  "Abdul Muhaymin Khan": "https://www.linkedin.com/in/abdul-muhaymin-khan-18103b2a8",
  "Gagan Yadav A": "https://www.linkedin.com/in/gagan-yadav-8317a629a",
  "Viren Biddappa K A": "https://www.linkedin.com/in/viren-biddappa-k-a-634430304",
  "Preetham Gowda S R": "https://www.linkedin.com/in/preetham-gowda-sr-3aa8103b7",
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

/**
 * Core member recruitment, for the "Join a squad" tile at the end of the squad list on /team.
 * "soon": opens soon, follow Instagram. "open": shows an Apply button to `formUrl`. "closed": this round is over.
 */
export const recruitment: { status: "soon" | "open" | "closed"; formUrl?: string } = {
  status: "soon",
};

/**
 * The gallery page. Put the files in public/gallery/ and add one line each, newest first.
 * A photo: { kind: "photo", src: "/gallery/robo-spark-1.webp", alt: "What is in the photo", caption: "Robo Spark, the final round", event: "Robo Spark" }
 * A clip: { kind: "clip", src: "/gallery/robo-spark-1.mp4", poster: "/gallery/robo-spark-1.webp", alt: "...", caption: "..." }
 * Clips play once when they come on screen, muted, then show Replay. Keep each clip under about 4 MB.
 */
export type GalleryItem = {
  kind: "photo" | "clip";
  src: string;
  /** clips only: the still shown before it plays, usually its first frame */ poster?: string;
  alt: string;
  caption: string;
  event?: string;
};
export const gallery: GalleryItem[] = [];

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
 * Club merch, shown on /merch. It is a draft for members to look at, like and comment on, not a shop yet:
 * the page is left out of the menu and of search engines while `draft` is true. Prices are per piece in rupees
 * and still open to talk about. `gsm` is the fabric weight, left out until the vendor confirms it.
 */
export type MerchKind = "jacket" | "hoodie" | "tee" | "polo";
export const merch = {
  drop: "Drop 01",
  draft: true,
  draftNote:
    "Draft kit with the artwork from our design team. Tell us what you think before it goes to print.",
  priceNote: "Price is negotiable",
  /** The demo name and number on the 3D models. Members can type their own to see how it looks. */
  demoName: "Abhirai",
  demoNumber: "07",
  /** Zip hoodie and hoodie first: the club's own favourites. */
  products: [
    {
      kind: "jacket",
      name: "Zip Hoodie",
      price: 580,
      fabric: "Fleece",
      details: ["Full front zip", "Hood with drawcords", "Front pockets", "Rib cuffs and hem"],
    },
    {
      kind: "hoodie",
      name: "Hoodie",
      price: 550,
      fabric: "Fleece",
      details: ["Hood with drawcords", "Kangaroo pocket", "Rib cuffs and hem"],
    },
    {
      kind: "tee",
      name: "Round Neck Tee",
      price: 300,
      gsm: 180,
      fabric: "Cotton jersey",
      details: ["Crew neck", "Short sleeves", "Regular fit"],
    },
    {
      kind: "polo",
      name: "Polo",
      price: 380,
      gsm: 220,
      fabric: "Cotton pique",
      details: ["Knit collar", "Button placket", "Raglan sleeves"],
    },
  ] as {
    kind: MerchKind;
    name: string;
    price: number;
    gsm?: number;
    fabric: string;
    details: string[];
  }[],
  /** `lower` makes a colour two-tone: `hex` on top, `lower` from the waist down, like the design team's bomber. */
  colours: [
    { id: "black", name: "Ink Black", hex: "#1a191f" },
    { id: "white", name: "Paper White", hex: "#f1f0ec" },
    { id: "lilac", name: "Lilac", hex: "#b997ff" },
    { id: "duo", name: "Two-tone", hex: "#b997ff", lower: "#f1f0ec" },
  ] as { id: "black" | "white" | "lilac" | "duo"; name: string; hex: string; lower?: string }[],
  /**
   * The 3D garments are free models from Sketchfab under CC BY 4.0, which asks for this credit. We recoloured
   * them, took out the brand marks, lowered the arms and made the files smaller.
   */
  models: [
    {
      kind: "jacket",
      title: "Hooded Jacket",
      author: "ArtDevice",
      url: "https://sketchfab.com/3d-models/hooded-jacket-562280813fa74612a89369d4b791e011",
    },
    {
      kind: "hoodie",
      title: "Adidas Hoodie",
      author: "Garrett Marshall Art",
      url: "https://sketchfab.com/3d-models/adidas-hoodie-e4c89a5628db4c7abadbd18bb407a2a8",
    },
    {
      kind: "tee",
      title: "T Shirt",
      author: "funlab117",
      url: "https://sketchfab.com/3d-models/t-shirt-c1a3e5eb9b5445f4b7d4be82f1127eba",
    },
    {
      kind: "polo",
      title: "Mans Polo",
      author: "mrarrt95",
      url: "https://sketchfab.com/3d-models/mans-polo-8d8ffad8f85746f39b68f58629a8ce68",
    },
  ] as { kind: MerchKind; title: string; author: string; url: string }[],
};
