// The result emails for core recruitment, written from the club facts in site.ts. The admin page opens each one
// as a Gmail draft in the club account, so a person reads it before pressing Send. Nothing is sent by the site.
import type { Candidate, Status } from "@/lib/recruit";
import { coreTeam, recruitment, site } from "@/lib/site";

export type Mail = { to: string; subject: string; body: string };

/** The statuses that get a result email. "undecided" gets nothing until the club decides. */
export const MAILED: Exclude<Status, "undecided">[] = ["core", "supporting", "not-selected"];

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const people = coreTeam.flatMap((s) => s.members.map((m) => ({ ...m, squad: s.title })));
/** Who signs the emails: the Secretary, from the Office Bearers in site.ts. */
const signer = people.find((m) => m.role === "Secretary");
const headOf = (squad: string) => people.find((m) => m.squad === squad && m.head)?.name;

function signOff(): string {
  return [
    "Warm regards,",
    signer ? signer.name : site.name,
    signer ? `Secretary, ${site.name}` : "",
    site.college,
    `Instagram: ${site.instagramHandle}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The result email for one student, or null when they are still undecided or have no email. */
export function resultMail(
  c: Pick<Candidate, "name" | "email" | "first" | "status"> & { placedIn?: Candidate["placedIn"] },
): Mail | null {
  // The squad that picked them: their second interview's squad when that one chose them.
  const squad = c.placedIn ?? c.first;
  if (!c.email || c.status === "undecided") return null;
  const hi = `Dear ${firstName(c.name)},`;
  const reply = `Please reply to this email within ${recruitment.replyWithinDays} days`;
  const head = headOf(squad);
  let subject: string;
  let lines: string[];
  if (c.status === "core") {
    subject = `Welcome to the ${site.name} ${squad} squad`;
    lines = [
      hi,
      "",
      `Congratulations! After the interviews, we are happy to tell you that you have been selected as a core member of ${site.name}, in the ${squad} squad.`,
      "",
      "What happens next:",
      `1. ${reply} to confirm that you accept.`,
      "2. We will add you to the core team WhatsApp group and share the date of your first squad meeting there.",
      head
        ? `3. ${head}, who heads the ${squad} squad, will help you get started.`
        : `3. The ${squad} squad seniors will help you get started.`,
      "",
      `${site.name} is a club for ${site.openTo}, and we are glad to have you on the team.`,
    ];
  } else if (c.status === "supporting") {
    subject = `Your ${site.name} recruitment result: an invitation to join`;
    lines = [
      hi,
      "",
      `Thank you for coming to the ${site.name} interviews. We would like to invite you to join the club as a supporting member of the ${squad} squad.`,
      "",
      "Supporting members work alongside the core team at our events and sessions, learn by doing, and are the first people we look to when the core team grows.",
      "",
      `${reply} to tell us whether you would like to join. We will then add you to the WhatsApp group.`,
    ];
  } else {
    subject = `Your ${site.name} recruitment result`;
    lines = [
      hi,
      "",
      `Thank you for applying to ${site.name} and for coming to the interview. We had many good applicants for a small number of places, and we are not able to offer you a place in this round.`,
      "",
      `Please do not let this stop you. Our events are open to ${site.openTo}, and we will run recruitment again. Follow us on Instagram (${site.instagramHandle}) to hear first. We hope to see you at our next event.`,
    ];
  }
  return { to: c.email, subject, body: [...lines, "", signOff()].join("\n") };
}

/** A link that opens the email as a Gmail draft in the club account, ready to read and send. */
export function gmailLink(m: Mail): string {
  const q = new URLSearchParams({
    authuser: recruitment.mailFrom,
    view: "cm",
    fs: "1",
    to: m.to,
    su: m.subject,
    body: m.body,
  });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

/**
 * The squad a student's result is about: for core and supporting, the squad that picked them (which can be
 * their second interview's squad); otherwise their first choice.
 */
export function resultSquad(c: Pick<Candidate, "first" | "status" | "placedIn">): string {
  return c.status === "core" || c.status === "supporting" ? (c.placedIn ?? c.first) : c.first;
}

/** The columns of the mail list the admin page downloads. The Apps Script finds them by these headings. */
export const MAIL_LIST_HEADINGS = [
  "Name",
  "Email",
  "WhatsApp",
  "Squad",
  "Result",
  "Role",
  "First choice",
  "Subject",
  "Message",
  "Sent",
] as const;

const RESULT_LABEL: Record<Status, string> = {
  core: "Core",
  supporting: "Supporting",
  "not-selected": "Not selected",
  undecided: "Undecided",
};
const ORDER: Status[] = ["core", "supporting", "not-selected", "undecided"];

/**
 * Every student as one row of the mail list: selected students first, then supporting, not selected and
 * undecided, each by squad and name. Role, Subject, Message and Sent start empty: the Apps Script in the
 * Google Sheet writes the emails and fills Sent.
 */
export function mailListRows(
  candidates: Pick<Candidate, "name" | "email" | "phone" | "first" | "status" | "placedIn">[],
): string[][] {
  const rows = [...candidates]
    .sort(
      (a, b) =>
        ORDER.indexOf(a.status) - ORDER.indexOf(b.status) ||
        resultSquad(a).localeCompare(resultSquad(b)) ||
        a.name.localeCompare(b.name),
    )
    .map((c) => [
      c.name,
      c.email,
      c.phone,
      resultSquad(c),
      RESULT_LABEL[c.status],
      "",
      c.first,
      "",
      "",
      "",
    ]);
  return [[...MAIL_LIST_HEADINGS], ...rows];
}
