// From the core team announcement. Semesters are one ahead of the announcement
// (4th is now 5th, 6th is now 7th), as the user asked on 2026-10-20.
export type Member = { name: string; sem: number; branch: string; head?: boolean };
export type Group = { slug: string; title: string; members: Member[] };

const m = (name: string, sem: number, branch: string, head = false): Member => ({ name, sem, branch, ...(head ? { head } : {}) });

export const PRESIDENT = m("Thushar K L", 7, "BMRE");
export const VICE_PRESIDENT = m("Shloka D Raj", 5, "BMRE");

export const GROUPS: Group[] = [
  { slug: "fundraising", title: "Fundraising", members: [
    m("Parinitha Aradhya", 7, "BMRE", true), m("Rajalakshmi", 7, "BMRE"), m("Manvith", 7, "BMRE"), m("Vikas", 7, "BMRE") ] },
  { slug: "projects", title: "Projects", members: [
    m("Anagha A Raichurkar", 7, "BMRE", true), m("Ananya R", 7, "BMRE"), m("Bhoomika S", 7, "BMRE"),
    m("Varsha Yogesh", 5, "CS&D"), m("Rohan", 5, "CS&D"), m("Shivprasad", 7, "AIML") ] },
  { slug: "events", title: "Events", members: [
    m("Tejaswini V", 7, "BMRE", true), m("Kartik Kushalappa", 7, "BMRE"), m("Abhijna Samanth", 7, "BMRE"),
    m("Tejaswini", 5, "BMRE"), m("Srishant", 5, "BMRE"), m("Harshini", 5, "BMRE") ] },
  { slug: "technical", title: "Technical", members: [
    m("Brunda H S", 7, "BMRE", true), m("Varsha H K", 7, "BMRE"), m("Lahari", 5, "BMRE"),
    m("Chirag", 5, "BMRE"), m("Pushkal Sai A", 5, "CS&D"), m("Monica", 5, "BMRE") ] },
  { slug: "social", title: "Social media and outreach", members: [
    m("Sumith S", 5, "BMRE", true), m("Deekshitha H", 7, "BMRE"), m("Amina Aslam", 7, "BMRE"), m("Kulsum", 5, "AIML"),
    m("Siddharth A", 5, "CS&D"), m("Siddharth", 5, "BMRE"), m("Deeksha B H", 5, "BMRE"), m("Nishanth Raj", 5, "CS&D") ] },
  { slug: "design", title: "Design", members: [
    m("Viren Biddappa", 7, "BMRE", true), m("Yashika B Ramesh", 7, "BMRE"), m("Preetham", 5, "BMRE") ] },
];

export const TEAM_SIZE = 2 + GROUPS.reduce((n, g) => n + g.members.length, 0);
export const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
