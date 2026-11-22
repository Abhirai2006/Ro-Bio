import { describe, expect, it } from "vitest";
import { gmailLink, resultMail } from "./recruit-mail";
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
