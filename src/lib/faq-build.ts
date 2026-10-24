// Builds the FAQ from the site's own facts. No imports, so Node scripts can use it too.
type Site = { branch: string; college: string; address: string; startedOn: string; memberCount: number; instagramHandle: string };
type Event = { kind: string; date: string; previousDate?: string; activities: { name: string }[] };

export function buildFaqs(site: Site, events: Event[], formatDate: (iso: string) => string): { q: string; a: string }[] {
  const bf = events[0]!;
  const parts = bf.activities.map((a) => a.name).join(", ");
  const plain = (iso: string) => formatDate(iso).replace(/^[A-Za-z]{3},\s*/, ""); // "20 May 2026", no weekday
  return [
    { q: "What is RO-BIO?", a: `RO-BIO is the student club for ${site.branch} at ${site.college} (MUSE), Mysuru, India. It started on ${plain(site.startedOn)} and has ${site.memberCount} students on its core team. It is also written Ro-Bio Hub.` },
    { q: "Where is RO-BIO based?", a: `${site.address}.` },
    { q: "What is Bot Forge?", a: `Bot Forge is RO-BIO's first event, a robotics ${bf.kind.toLowerCase()} and expo at ${site.college}. It has five parts: ${parts}.` },
    { q: "When is Bot Forge?", a: `Bot Forge is on ${formatDate(bf.date)}. It was first planned for ${plain(bf.previousDate ?? bf.date)} and moved. The start time has not been announced yet.` },
    { q: "How do I register for Bot Forge?", a: `Registration details are coming soon. Team size, deadline and rules are not final yet. They will be announced on the Bot Forge page and on Instagram ${site.instagramHandle}.` },
    { q: "How can I contact RO-BIO?", a: `The quickest way is a message on Instagram ${site.instagramHandle}. The Contact page lists the Bot Forge coordinators and the college address.` },
    { q: "What does BMRE mean?", a: "BMRE is short for Biomedical and Robotic Engineering. Most of the core team is from this branch, with some students from CS&D and AIML." },
    { q: "What can I try on this website?", a: "The home page has a robot arm that solves inverse kinematics, a Robo Sumo game against a CPU, and a live ECG in the header. A small robot called Robo lives on the whole site: it walks around, jumps onto things, follows your cursor, and travels with you from page to page." },
    { q: "Does this website collect my personal data?", a: "No. There are no accounts, forms or analytics, and the site sets no cookies. The Privacy Policy lists the little that is stored in your browser." },
  ];
}
