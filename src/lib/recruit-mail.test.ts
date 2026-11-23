import { describe, expect, it } from "vitest";
import {
  gmailLink,
  MAIL_LIST_HEADINGS,
  mailListRows,
  resultMail,
  resultSquad,
} from "./recruit-mail";
import { recruitment, site } from "./site";

const student = (
  status: "core" | "supporting" | "not-selected" | "undecided",
  email = "asha@x.in",
) => ({
  name: "Asha Rao",
  email,
  first: "Design" as const,
  status,
});

describe("result emails", () => {
  it("writes nothing for undecided students or students with no email", () => {
    expect(resultMail(student("undecided"))).toBeNull();
    expect(resultMail(student("core", ""))).toBeNull();
  });

  it("welcomes a core member to their squad and names the squad head", () => {
    const m = resultMail(student("core"))!;
    expect(m.to).toBe("asha@x.in");
    expect(m.subject).toBe(`Welcome to the ${site.name} Design squad`);
    expect(m.body).toMatch(/^Dear Asha,/);
    expect(m.body).toContain("core member");
    expect(m.body).toContain("Viren Biddappa K A");
    expect(m.body).toContain(`within ${recruitment.replyWithinDays} days`);
    expect(m.body).toContain("Abhishek Rai A\nSecretary, RO-BIO");
  });

  it("invites a supporting member without calling it a second place", () => {
    const m = resultMail(student("supporting"))!;
    expect(m.body).toContain("supporting member of the Design squad");
    expect(m.body).not.toMatch(/unfortunately|rejected|reserve/i);
  });

  it("is kind to students who were not selected", () => {
    const m = resultMail(student("not-selected"))!;
    expect(m.body).toContain("not able to offer you a place");
    expect(m.body).toContain(site.instagramHandle);
  });

  it("never uses an em or en dash", () => {
    for (const s of ["core", "supporting", "not-selected"] as const) {
      const m = resultMail(student(s))!;
      expect(`${m.subject} ${m.body}`).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("opens a Gmail draft in the club account", () => {
    const url = new URL(gmailLink(resultMail(student("core"))!));
    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("authuser")).toBe(recruitment.mailFrom);
    expect(url.searchParams.get("to")).toBe("asha@x.in");
    expect(url.searchParams.get("body")).toContain("Dear Asha,");
  });
});

describe("result emails after two interviews", () => {
  it("names the squad that picked the student, not their first choice", () => {
    const m = resultMail({
      name: "Asha Rao",
      email: "asha@x.in",
      first: "Technical",
      status: "core",
      placedIn: "Design",
    })!;
    expect(m.subject).toBe("Welcome to the RO-BIO Design squad");
    expect(m.body).toContain("in the Design squad");
  });
});

describe("mail list", () => {
  const s = (
    name: string,
    status: "core" | "supporting" | "not-selected" | "undecided",
    first: "Design" | "Projects" | "Events",
    placedIn: "Projects" | null = null,
  ) => ({
    name,
    email: `${name.toLowerCase()}@x.in`,
    phone: "9000000001",
    first,
    status,
    placedIn,
  });

  it("names the squad that picked a student, not their first choice", () => {
    expect(resultSquad(s("Ellen", "core", "Design", "Projects"))).toBe("Projects");
    expect(resultSquad(s("Ravi", "not-selected", "Design", "Projects"))).toBe("Design");
  });

  it("lists everyone under the headings the Apps Script reads, selected first", () => {
    const rows = mailListRows([
      s("Zed", "not-selected", "Events"),
      s("Undy", "undecided", "Events"),
      s("Ellen", "core", "Design", "Projects"),
      s("Sam", "supporting", "Design"),
    ]);
    expect(rows[0]).toEqual([...MAIL_LIST_HEADINGS]);
    expect(rows.slice(1).map((r) => [r[0], r[3], r[4], r[6]])).toEqual([
      ["Ellen", "Projects", "Core", "Design"],
      ["Sam", "Design", "Supporting", "Design"],
      ["Zed", "Events", "Not selected", "Events"],
      ["Undy", "Events", "Undecided", "Events"],
    ]);
    for (const r of rows) expect(r).toHaveLength(MAIL_LIST_HEADINGS.length);
  });
});
