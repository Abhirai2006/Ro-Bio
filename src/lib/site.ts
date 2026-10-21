// Real club facts supplied by the club. Edit here, not in components.
export const site = {
  name: "RO-BIO",
  url: "https://ro-bio.abhirai2006.workers.dev", // change this when a custom domain is connected
  tagline: "Unauthorised innovation in progress!",
  branch: "Biomedical and Robotic Engineering",
  college: "Mysore University School of Engineering",
  address: "Mysore University School of Engineering, Manasa Gangotri Campus, Mysore-570006",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Mysore+University+School+of+Engineering+Manasa+Gangotri",
  instagram: "https://www.instagram.com/ro_bio_hub/",
  instagramHandle: "@ro_bio_hub",
  startedOn: "2026-05-20",
  memberCount: 35,
};

export type Contact = { name: string; role: string; phone: string };

export const contacts: Contact[] = [
  { name: "Archana G", role: "Faculty coordinator", phone: "9481832235" },
  { name: "Thushar KL", role: "Student coordinator", phone: "8217674366" },
  { name: "Shloka D Raj", role: "Student coordinator", phone: "9148020699" },
];

export type Activity = { name: string; tag: "EVENT" | "EXPO" };

export type ClubEvent = {
  slug: string;
  title: string;
  kind: string;
  date: string; // YYYY-MM-DD, India time
  previousDate?: string;
  venue: string;
  activities: Activity[];
  registration: "coming-soon" | "open" | "closed";
};

export const events: ClubEvent[] = [
  {
    slug: "bot-forge",
    title: "Bot Forge",
    kind: "Competition",
    date: "2026-10-28",
    previousDate: "2026-06-25",
    venue: site.address,
    activities: [
      { name: "Line Follower", tag: "EVENT" },
      { name: "Robot Race", tag: "EVENT" },
      { name: "Bot Expo", tag: "EXPO" },
      { name: "Robo Sumo", tag: "EVENT" },
      { name: "Shark Tank", tag: "EVENT" },
    ],
    registration: "coming-soon",
  },
];

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
export type Member = { name: string; sem: number; dept: string; head?: boolean; role?: string | undefined };
export type Squad = { title: string; members: Member[] };

/** Everyone has moved up one semester since the announcement. */
export function currentSem(announcedSem: number) {
  return announcedSem + 1;
}

const m = (name: string, sem: number, dept = "BMRE", head = false, role?: string): Member => ({ name, sem, dept, head, role });

export const coreTeam: Squad[] = [
  { title: "President and Vice President", members: [m("Thushar K L", 6, "BMRE", false, "President"), m("Shloka D Raj", 4, "BMRE", false, "Vice President")] },
  { title: "Fundraising", members: [m("Parinitha Aradhya", 6, "BMRE", true), m("Rajalakshmi", 6), m("Manvith", 6), m("Vikas", 6)] },
  {
    title: "Projects",
    members: [m("Anagha A Raichurkar", 6, "BMRE", true), m("Ananya R", 6), m("Bhoomika S", 6), m("Varsha Yogesh", 4, "CS&D"), m("Rohan", 4, "CS&D"), m("Shivprasad", 6, "AIML")],
  },
  {
    title: "Events",
    members: [m("Tejaswini V", 6, "BMRE", true), m("Kartik Kushalappa", 6), m("Abhijna Samanth", 6), m("Tejaswini", 4), m("Srishant", 4), m("Harshini", 4)],
  },
  {
    title: "Technical",
    members: [m("Brunda H S", 6, "BMRE", true), m("Varsha H K", 6), m("Lahari", 4), m("Chirag", 4), m("Pushkal Sai A", 4, "CS&D"), m("Monica", 4)],
  },
  {
    title: "Social Media and Outreach",
    members: [m("Sumith S", 4, "BMRE", true), m("Deekshitha H", 6), m("Amina Aslam", 6), m("Kulsum", 4, "AIML"), m("Siddharth A", 4, "CS&D"), m("Siddharth", 4), m("Deeksha B H", 4), m("Nishanth Raj", 4, "CS&D")],
  },
  { title: "Design", members: [m("Viren Biddappa", 6, "BMRE", true), m("Yashika B Ramesh", 6), m("Preetham", 4)] },
];
