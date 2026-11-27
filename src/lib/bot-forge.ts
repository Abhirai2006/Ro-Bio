// Bot Forge: the draft rules, the team form's checks and the UPI payment link. The numbers (team sizes, kits,
// prizes, fee, dates) come from botForgeInfo in src/lib/site.ts, so a change there shows up here too.
// The same checks run in the browser and on the server, so the form and the API never disagree.
import { BRANCHES, cleanEmail, cleanPersonName, isEmail, tidyNameCase } from "@/lib/certificates";
import { cleanMobile, cleanUsn } from "@/lib/recruit";
import {
  botForge,
  botForgeInfo,
  contestBySlug,
  registrationNow,
  rupees,
  type Contest,
  type ContestSlug,
} from "@/lib/site";

export const CONTEST_SLUGS = botForgeInfo.contests.map((c) => c.slug);
export const isContest = (v: unknown): v is ContestSlug =>
  typeof v === "string" && (CONTEST_SLUGS as string[]).includes(v);

/** Every semester a MUSE student can be in. */
export const BF_SEMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const TEAM_NAME_MAX = 40;

// ---- the rules ---------------------------------------------------------------------------------

export type RuleSection = { title: string; points: string[] };

const kitLines = (c: Contest): string[] =>
  c.kits
    ? [
        `The club has ${c.kits} kits for ${c.title}. They go to the first ${c.kits} teams that ask for one when they register. Every other team brings its own components and materials.`,
        "If your team damages any part of a club kit, your team pays for it.",
      ]
    : [];

const fair = [
  "Misconduct, damaging the venue or another team's robot, or ignoring the referee can get a team disqualified.",
  "The referee's decision is final.",
];

/** The draft rules for each contest. */
export function contestRules(slug: ContestSlug): RuleSection[] {
  const c = contestBySlug(slug)!;
  if (slug === "robo-sumo")
    return [
      {
        title: "The robot",
        points: [
          "It fits inside a 25 x 25 x 25 cm box at all times, including any part that moves or opens out.",
          "It weighs 3 kg or less, battery included.",
          "Electric power only, at no more than 12 V nominal.",
          "It can be autonomous, wired or wireless. A wire must stay slack through the whole match.",
          "Not allowed: weapons, sharp or pinching parts, flipping parts, anything fired or thrown, liquids, fire, smoke, signal jammers, or any part made to damage the other robot or the ring.",
        ],
      },
      {
        title: "Building it",
        points: [
          "You build your robot at the venue on the day, in the build time after the inauguration.",
          ...kitLines(c),
          "Every robot is checked for size, weight and voltage before its first match. A robot that fails can be fixed and checked again.",
        ],
      },
      {
        title: "The ring",
        points: [
          "A circular ring about 150 cm across, with a clear boundary line.",
          "A robot is out the moment any part of it, even one wheel, crosses the boundary line.",
        ],
      },
      {
        title: "The match",
        points: [
          "One robot against one, starting from opposite sides of the ring on the referee's signal.",
          "A match lasts up to 2 minutes. The first robot to push the other one out wins.",
          "If neither robot is out when time runs out, up to 2 sudden death restarts are played. If there is still no result, the referee picks the winner on control and dominance.",
          "Once your robot is in the ring, nobody touches it unless the referee says so.",
          "If one robot stops working, the other one wins the match. If both stop, both teams get 2 minutes to fix them. If neither can fight after that, both teams are out.",
          "Matches run as a knockout bracket: the winner goes through and the loser is out.",
        ],
      },
      { title: "Fair play", points: fair },
    ];
  if (slug === "robo-race")
    return [
      {
        title: "The robot",
        points: [
          "Manually controlled, wired or wireless. If it is wireless, each team uses its own channel so remotes do not clash.",
          "It fits inside a 20 x 15 x 15 cm box.",
          "It weighs 1.5 kg or less, battery included.",
          "Electric power only, at no more than 12 V nominal.",
          "Not allowed: any part made to block or damage the track, sharp or sticking out parts, and anything fired or thrown.",
        ],
      },
      {
        title: "Building it",
        points: [
          "You build your robot at the venue on the day, in the build time after the inauguration.",
          ...kitLines(c),
          "Every robot is checked for size, weight and voltage before its first run.",
        ],
      },
      {
        title: "The track",
        points: [
          "One track with a start line, a finish line, sharp turns, obstacles and some uneven patches. You see it on the day.",
          "Checkpoints are marked along the track.",
        ],
      },
      {
        title: "The run",
        points: [
          "One team at a time, against the clock. The clock starts when your robot leaves the start line and stops when it fully crosses the finish line.",
          "Each team gets 2 runs. The faster one counts.",
          "Up to 2 members control and handle the robot. The rest of the team waits outside the track area.",
          "A robot that does not move for 3 minutes is out of that run.",
        ],
      },
      {
        title: "Penalties, added to your time",
        points: [
          "5 seconds: one wheel goes off the track.",
          "20 seconds: the whole robot leaves the track. It restarts from the last checkpoint, and the clock keeps running.",
          "30 seconds: anyone touches the robot without the referee's say.",
          "30 seconds: the robot skips an obstacle.",
        ],
      },
      {
        title: "Winning",
        points: [
          "The fastest time after penalties wins. If two teams tie, they run once more.",
          ...fair,
        ],
      },
    ];
  return [
    {
      title: "The pitch",
      points: [
        "Pick any problem you care about and pitch your solution, as if to investors: what the problem is, who it hurts, what you would make, and why it would work.",
        "Make your PPT at home before the day. Bring it on a pen drive, with a PDF copy in case.",
        "Come at 2 pm, when the evaluation starts. There is no build time for Shark Tank.",
        "Each team gets 5 minutes to pitch, then 2 minutes of questions from the judge. Time is kept strictly.",
      ],
    },
    {
      title: "Marks, out of 100",
      points: [
        "Problem and idea: 30. Is the problem real and clearly explained, and is the idea fresh?",
        "Technical feasibility: 30. Could it actually be built, and does the team know how?",
        "Real world impact: 20. Who would it help, and how much?",
        "Pitch and answers: 20. A clear, confident pitch, and straight answers to the judge.",
      ],
    },
    {
      title: "Fair play",
      points: [
        "The idea and the slides must be your team's own work.",
        "The judge's decision is final.",
      ],
    },
  ];
}

/** The rules that apply to every Bot Forge contest. */
export function generalRules(): string[] {
  const sizes = botForgeInfo.contests
    .map((c) => `${c.team[0]} to ${c.team[1]} members for ${c.title}`)
    .join(", ");
  return [
    `Open to ${botForgeInfo.openTo}. Bring your college ID card.`,
    `Teams of ${sizes}.`,
    "Each team enters one contest only, and each student is in one team only.",
    `The entry fee is ${rupees(botForgeInfo.fee)} per team, paid by UPI when you register. It is not refundable.`,
    `Register on this website by ${botForgeInfo.closesLabel}.`,
    `Every participant gets ${botForgeInfo.forEveryone}.`,
    "The club may change these rules before the event. The final rules go up on this site.",
  ];
}

// ---- the team form -----------------------------------------------------------------------------

export type TeamMember = { name: string; usn: string; branch: string; sem: number };

export type NewTeam = {
  contest: ContestSlug;
  name: string;
  members: TeamMember[];
  /** The team leader's (first member's) WhatsApp number and email. */
  phone: string;
  email: string;
  /** The team asked for a club kit. */
  kit: boolean;
};

export type PayStatus = "unpaid" | "sent" | "paid";
export const PAY_LABEL: Record<PayStatus, string> = {
  unpaid: "Not paid yet",
  sent: "Payment sent, being checked",
  paid: "Paid",
};
export const isPayStatus = (v: unknown): v is PayStatus =>
  v === "unpaid" || v === "sent" || v === "paid";

/** A team as the admin page sees it. */
export type Team = NewTeam & {
  id: number;
  code: string;
  utr: string;
  pay: PayStatus;
  addedAt: number;
};

/** A team name with single spaces and no odd characters, or "" when there is nothing left. */
export function cleanTeamName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return [...raw]
    .map((ch) => (ch < " " || ch === "\u007f" || ch === "<" || ch === ">" ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TEAM_NAME_MAX)
    .trim();
}

/** How two team names are compared: "Robo  Rangers" and "robo rangers" are the same team name. */
export const teamNameKey = (name: string) => cleanTeamName(name).toLowerCase();

/** A team's number, like SUMO-07. */
export const teamCode = (c: Pick<Contest, "code">, n: number) =>
  `${c.code}-${String(n).padStart(2, "0")}`;

/** A team number as typed: "sumo 7" or "SUMO-07" both become "SUMO-07". "" when it is not one. */
export function cleanTeamCode(raw: unknown): string {
  const s = typeof raw === "string" ? raw.toUpperCase().replace(/[\s_]+/g, "-") : "";
  const m = /^([A-Z]+)-?(\d{1,3})$/.exec(s);
  if (!m || !botForgeInfo.contests.some((c) => c.code === m[1])) return "";
  return `${m[1]}-${m[2]!.padStart(2, "0")}`;
}

/** A UPI transaction number (UTR): 12 digits. "" when it is not one. */
export function cleanUtr(raw: unknown): string {
  const d = typeof raw === "string" ? raw.replace(/\s+/g, "") : "";
  return /^\d{12}$/.test(d) ? d : "";
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Checks a team sent from the registration form. A 1st semester student may leave the USN blank, because
 * many do not have one yet, as on the recruitment form. Everyone else must give one.
 */
export function validateTeam(raw: unknown): Check<NewTeam> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Fill in the form first." };
  const b = raw as Record<string, unknown>;
  if (!isContest(b["contest"])) return { ok: false, error: "Pick the contest your team enters." };
  const c = contestBySlug(b["contest"])!;
  const name = cleanTeamName(b["name"]);
  if (name.length < 2) return { ok: false, error: "Give your team a name." };
  const list: unknown[] = Array.isArray(b["members"]) ? b["members"] : [];
  const [min, max] = c.team;
  if (list.length < min || list.length > max)
    return { ok: false, error: `A ${c.title} team has ${min} to ${max} members.` };
  const members: TeamMember[] = [];
  const seen = new Set<string>();
  for (const [i, m] of list.entries()) {
    const who = i === 0 ? "the team leader" : `member ${i + 1}`;
    const r = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    const person = tidyNameCase(cleanPersonName(r["name"]));
    if (!person) return { ok: false, error: `Type the name of ${who}.` };
    const sem = Number(r["sem"]);
    if (!(BF_SEMS as readonly number[]).includes(sem))
      return { ok: false, error: `Pick the semester of ${person}.` };
    const typed = typeof r["usn"] === "string" ? r["usn"].trim() : "";
    const usn = cleanUsn(typed);
    if (typed && !usn)
      return { ok: false, error: `The USN of ${person} should be 4 to 20 letters and numbers.` };
    if (!usn && sem !== 1) return { ok: false, error: `Type the USN of ${person}.` };
    if (usn && seen.has(usn)) return { ok: false, error: `The USN ${usn} is in this team twice.` };
    if (usn) seen.add(usn);
    const branch = typeof r["branch"] === "string" ? r["branch"].trim() : "";
    if (!(BRANCHES as readonly string[]).includes(branch))
      return { ok: false, error: `Pick the branch of ${person}.` };
    members.push({ name: person, usn, branch, sem });
  }
  const phone = cleanMobile(b["phone"]);
  if (!phone) return { ok: false, error: "Type the team leader's 10 digit WhatsApp number." };
  const email = cleanEmail(b["email"]);
  if (!email || !isEmail(email)) return { ok: false, error: "Type the team leader's email." };
  if (b["consent"] !== true)
    return { ok: false, error: "Tick the box to say we may use these details for Bot Forge." };
  return {
    ok: true,
    value: { contest: c.slug, name, members, phone, email, kit: c.kits > 0 && b["kit"] === true },
  };
}

// ---- registration window and payment -----------------------------------------------------------

/** Where Bot Forge registration stands at `now`. */
export const registrationState = (now = Date.now()) => registrationNow(botForge, now);

/** True while registered teams can still send their UPI transaction number. */
export const paymentsOpen = (now = Date.now()) =>
  now >= Date.parse(botForge.opensAt ?? "") && now < Date.parse(botForgeInfo.paymentsCloseAt);

/** True once the President's UPI ID is filled in, in site.ts. */
export const upiReady = () => !!botForgeInfo.upi.id.trim();

/** The note a team puts on its payment, so the club can match it to the team. */
export const payNote = (code: string) => `Bot Forge ${code}`;

/** The link a UPI app opens: it fills in who to pay, the fee and the note. */
export function upiLink(code: string): string {
  const q = new URLSearchParams({
    pa: botForgeInfo.upi.id.trim(),
    pn: botForgeInfo.upi.payee.trim() || "RO-BIO",
    am: botForgeInfo.fee.toFixed(2),
    cu: "INR",
    tn: payNote(code),
  });
  return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
}

// ---- talking to the server ---------------------------------------------------------------------

/** One call to /api/bot-forge/*. Throws with the server's own words when it says no. */
export async function botForgeApi<T>(
  path: string,
  init: RequestInit = {},
  passcode?: string,
): Promise<T> {
  const res = await fetch(`/api/bot-forge/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(passcode ? { "x-admin-passcode": passcode } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `The server said ${res.status}.`);
  return data;
}

/** One row per team for the admin's Excel file, with the members one per line in their cells. */
export function teamsSheet(teams: Team[]): string[][] {
  const head = [
    "Team number",
    "Contest",
    "Team name",
    "Members",
    "USNs",
    "Branches and semesters",
    "Leader WhatsApp",
    "Leader email",
    "Club kit",
    "UTR",
    "Payment",
    "Registered at",
  ];
  const rows = teams.map((t) => [
    t.code,
    contestBySlug(t.contest)?.title ?? t.contest,
    t.name,
    t.members.map((m) => m.name).join("\n"),
    t.members.map((m) => m.usn || "no USN yet").join("\n"),
    t.members.map((m) => `${m.branch}, sem ${m.sem}`).join("\n"),
    t.phone,
    t.email,
    t.kit ? "Yes" : "No",
    t.utr,
    PAY_LABEL[t.pay],
    new Date(t.addedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  ]);
  return [head, ...rows];
}
