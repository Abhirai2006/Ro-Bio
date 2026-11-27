// Builds the FAQ from the site's own facts. No imports, so Node scripts can use it too.
type Site = {
  branch: string;
  focus: string;
  openTo: string;
  college: string;
  address: string;
  startedOn: string;
  instagramHandle: string;
};
type Event = {
  slug: string;
  kind: string;
  date: string | null;
  time?: string;
  activities: { name: string }[];
};
/** The Bot Forge facts the answers need, from botForgeInfo in site.ts. */
type BotForgeFacts = {
  openTo: string;
  forEveryone: string;
  fee: number;
  opensLabel: string;
  closesLabel: string;
  contests: { title: string; team: [number, number]; prizes: [number, number] }[];
};

export function buildFaqs(
  site: Site,
  events: Event[],
  formatDate: (iso: string) => string,
  teamSize: number,
  info: BotForgeFacts,
): { q: string; a: string }[] {
  const bf = events.find((e) => e.slug === "bot-forge")!;
  const count = (n: number) => ["no", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
  const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const and = (xs: string[]) =>
    xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  const total = info.contests.reduce((s, c) => s + c.prizes[0] + c.prizes[1], 0);
  const prizeLine = info.contests.every(
    (c) =>
      c.prizes[0] === info.contests[0]!.prizes[0] && c.prizes[1] === info.contests[0]!.prizes[1],
  )
    ? `${rs(info.contests[0]!.prizes[0])} for first place and ${rs(info.contests[0]!.prizes[1])} for second in each event`
    : and(info.contests.map((c) => `${rs(c.prizes[0])} and ${rs(c.prizes[1])} in ${c.title}`));
  const sizes = and(info.contests.map((c) => `${c.team[0]} to ${c.team[1]} for ${c.title}`));
  const plain = (iso: string) => formatDate(iso).replace(/^[A-Za-z]{3},\s*/, ""); // "20 May 2026", no weekday
  return [
    {
      q: "What is RO-BIO?",
      a: `RO-BIO is a ${site.focus} club at ${site.college} (MUSE), Mysuru, India, open to ${site.openTo}. It started on ${plain(site.startedOn)} and has ${teamSize} students on its core team. It is also written Ro-Bio Hub.`,
    },
    {
      q: "Who can join RO-BIO?",
      a: `Any student of ${site.college}, from any branch. You do not have to study ${site.branch} to join.`,
    },
    { q: "Where is RO-BIO based?", a: `${site.address}.` },
    {
      q: "What is Bot Forge?",
      a: `Bot Forge is RO-BIO's first robotics ${bf.kind.toLowerCase()}, at ${site.college}. It has ${count(info.contests.length)} events: ${and(info.contests.map((c) => c.title))}. There are ${rs(total)} in cash prizes: ${prizeLine}. Every participant gets ${info.forEveryone}.`,
    },
    {
      q: "When is Bot Forge?",
      a: bf.date
        ? `Bot Forge is on ${formatDate(bf.date)}${bf.time ? `, ${bf.time}` : ""}, at ${site.college}. The inauguration is at 11 am and the events start at 2 pm.`
        : `The date for Bot Forge is coming soon. It will be announced on the Bot Forge page and on Instagram ${site.instagramHandle}.`,
    },
    {
      q: "How do I register for Bot Forge?",
      a: `Register your team on the Bot Forge page of this website, from ${info.opensLabel} to ${info.closesLabel}. It is open to ${info.openTo}. Teams of ${sizes}, and each student in one team only. The entry fee is ${rs(info.fee)} per team, paid by UPI, and it is not refundable.`,
    },
    {
      q: "How can I contact RO-BIO?",
      a: `The quickest way is a message on Instagram ${site.instagramHandle}. The Contact page lists the Bot Forge coordinators and the college address.`,
    },
    {
      q: "What does BMRE mean?",
      a: "BMRE is short for Biomedical and Robotic Engineering. Most of the core team is from this branch, with some students from CS&D and AIML.",
    },
    {
      q: "What can I try on this website?",
      a: "The home page has a 3D robot arm: tap a sample and then a spot, and it carries it there, a Robo Sumo game against a CPU, and a live ECG in the header. A small robot called Robo lives on the whole site: it walks around, jumps onto things, reads along with you, and travels from page to page as a stream of pixels. On your first visit you can watch him being built, and tap him to speed up his heart.",
    },
    {
      q: "Does this website collect my personal data?",
      a: "Only if you register a team for Bot Forge, or signed up for core recruitment. The Bot Forge form asks for each member's name, USN, branch and semester, the team leader's WhatsApp number and email, and your UPI transaction number, used only to run Bot Forge and deleted after it. If your team wins, its name and members' names appear on the results page. There are no accounts or analytics, and the site itself sets no cookies. The Google map on the Contact and Bot Forge pages comes from Google, under its own policy. The Privacy Policy has the details.",
    },
  ];
}
