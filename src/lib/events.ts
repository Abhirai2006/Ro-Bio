// Static for now. It mirrors supabase/seed.sql and moves to the database later.
export type Activity = { slug: string; title: string; kind: "EVENT" | "EXPO" };
export type Contact = { name: string; role: string; phone: string };
export type ClubEvent = {
  slug: string; title: string; startsOn: string; previousStartsOn?: string;
  venue: string; activities: Activity[]; contacts: Contact[];
};

// "About 35 for now" from the user. Admins will edit it in site settings later.
export const MEMBER_COUNT = 35;

export const EVENTS: ClubEvent[] = [
  {
    slug: "bot-forge",
    title: "Bot Forge",
    startsOn: "2026-10-28",
    previousStartsOn: "2026-06-25",
    venue: "Mysore University School of Engineering, Manasa Gangotri Campus, Mysore-570006",
    activities: [
      { slug: "line-follower", title: "Line Follower", kind: "EVENT" },
      { slug: "robot-race", title: "Robot Race", kind: "EVENT" },
      { slug: "bot-expo", title: "Bot Expo", kind: "EXPO" },
      { slug: "robo-sumo", title: "Robo Sumo", kind: "EVENT" },
      { slug: "shark-tank", title: "Shark Tank", kind: "EVENT" },
    ],
    // Numbers as printed on the poster. Check the digits before launch.
    contacts: [
      { name: "Thushar KL", role: "Student coordinator", phone: "8217674366" },
      { name: "Shloka D Raj", role: "Student coordinator", phone: "9148020699" },
      { name: "Archana G", role: "Faculty coordinator", phone: "9481832235" },
    ],
  },
];

export const getEvent = (slug: string) => EVENTS.find((e) => e.slug === slug);

// Dates have no time yet, so format them as plain calendar dates, never by the visitor's time zone.
export function formatDate(iso: string, weekday = false) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
    ...(weekday ? { weekday: "long" as const } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
