import { describe, expect, it } from "vitest";
import {
  BRANCHES,
  certFileName,
  certNumber,
  CERT_NO,
  cleanCertNo,
  cleanEmail,
  cleanPersonName,
  COORDINATOR_ROLE,
  formRowsToCerts,
  mailMergeCsv,
  parseCsv,
  readFormCsv,
  validateCert,
  verifyUrl,
  type AdminCert,
  type Cert,
} from "@/lib/certificates";
import { certificateSvg, fitSize, textWidth, type CertAssets } from "@/lib/certificate-svg";

const HEAD =
  "Timestamp,Email Address,Full name,Team number,Branch,Phone number,How would you rate Robo Spark?,What did you enjoy most?,What could we do better?,Would you like to join RO-BIO's future events?";

describe("certificate numbers", () => {
  it("makes student and coordinator numbers", () => {
    expect(certNumber("student", 17, 42)).toBe("RS26-017-0042");
    expect(certNumber("student", 3, 1)).toBe("RS26-003-0001");
    expect(certNumber("coordinator", null, 3)).toBe("RS26-C00-0003");
    expect(CERT_NO.test("RS26-017-0042")).toBe(true);
    expect(CERT_NO.test("RS26-C00-0001")).toBe(true);
    expect(CERT_NO.test("RS26-17-0042")).toBe(false);
  });

  it("cleans what people type", () => {
    expect(cleanCertNo("No. rs26-017-0042")).toBe("RS26-017-0042");
    expect(cleanCertNo(" rs26-c00-0002 ")).toBe("RS26-C00-0002");
    expect(cleanCertNo("RS26-017-42")).toBeNull();
    expect(cleanCertNo(undefined)).toBeNull();
  });

  it("makes file names", () => {
    expect(certFileName({ no: "RS26-017-0042", name: "Asha K" })).toBe("RS26-017-0042_Asha_K.pdf");
    expect(certFileName({ no: "RS26-C00-0001", name: "K. S. Rao" }, "png")).toBe(
      "RS26-C00-0001_K_S_Rao.png",
    );
  });

  it("points the QR at the verify page", () => {
    expect(verifyUrl("RS26-017-0042")).toBe(
      "https://ro-bio.robiohub2026.workers.dev/verify/RS26-017-0042",
    );
  });
});

describe("cleaning", () => {
  it("cleans emails and names", () => {
    expect(cleanEmail("  Asha@Example.COM ")).toBe("asha@example.com");
    expect(cleanPersonName("  K.S.   Rao ")).toBe("K. S. Rao");
    expect(cleanPersonName("A".repeat(80))).toHaveLength(60);
    expect(cleanPersonName("<b>Asha</b>")).toBe("b Asha /b");
  });
});

describe("CSV", () => {
  it("handles quotes, commas, doubled quotes and line breaks", () => {
    const rows = parseCsv('a,"b, c","say ""hi""","two\nlines"\r\nx,y,,z\r\n');
    expect(rows).toEqual([
      ["a", "b, c", 'say "hi"', "two\nlines"],
      ["x", "y", "", "z"],
    ]);
  });

  it("finds columns by heading and keeps only four fields", () => {
    const csv = [
      HEAD,
      '2026/11/03 10:00:00,Asha@Example.com,Asha K,17,Computer Science & Engineering,9876543210,5,"The robots, mostly",More time,Yes',
    ].join("\n");
    const { rows, missing } = readFormCsv(csv);
    expect(missing).toEqual([]);
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r).toEqual({
      line: 2,
      email: "asha@example.com",
      name: "Asha K",
      team: 17,
      branch: "Computer Science & Engineering",
      problems: [],
    });
    expect(JSON.stringify(rows)).not.toContain("9876543210");
    expect(JSON.stringify(formRowsToCerts(rows))).not.toContain("9876543210");
    expect(JSON.stringify(rows)).not.toContain("mostly");
  });

  it("works when the columns move", () => {
    const csv =
      "Branch,Full name,Team number,Email Address\nCivil Environmental Engineering,Ravi,3,ravi@example.com";
    const { rows } = readFormCsv(csv);
    expect(rows[0]).toMatchObject({
      name: "Ravi",
      team: 3,
      email: "ravi@example.com",
      problems: [],
    });
  });

  it("says which columns are missing", () => {
    expect(readFormCsv("Name,Email\nA,b@example.com").missing).toEqual([
      '"email address"',
      '"full name"',
      '"team number"',
      '"branch"',
    ]);
  });

  it("flags problems per row", () => {
    const csv = [
      HEAD,
      "t,asha@example.com,Asha K,17,Computer Science & Engineering,,5,,,Yes",
      "t,not-an-email,Bala,2,Computer Science & Engineering,,5,,,Yes",
      "t,c@example.com,,2,Computer Science & Engineering,,5,,,Yes",
      "t,d@example.com,Dev,61,Computer Science & Engineering,,5,,,Yes",
      "t,e@example.com,Esha,4,Mechanical,,5,,,Yes",
      "t,ASHA@example.com ,Asha Again,18,Computer Science & Engineering,,5,,,Yes",
    ].join("\n");
    const { rows } = readFormCsv(csv);
    expect(rows.map((r) => r.problems)).toEqual([
      [],
      ["no valid email"],
      ["no name"],
      ["team not 1 to 60"],
      ["branch not in the list"],
      ["same email as line 2"],
    ]);
    expect(formRowsToCerts(rows)).toHaveLength(1);
  });

  it("accepts every branch exactly as the form spells it", () => {
    for (const b of BRANCHES) {
      const { rows } = readFormCsv(`${HEAD}\nt,a@example.com,A,1,"${b}",,,,,`);
      expect(rows[0]?.branch).toBe(b);
      expect(rows[0]?.problems).toEqual([]);
    }
  });
});

describe("admin rows", () => {
  it("accepts good rows", () => {
    expect(
      validateCert({
        kind: "student",
        name: " Asha  K ",
        email: "ASHA@example.com",
        team: "17",
        branch: BRANCHES[0],
      }),
    ).toEqual({
      ok: true,
      cert: {
        kind: "student",
        name: "Asha K",
        email: "asha@example.com",
        team: 17,
        branch: BRANCHES[0],
        role: "",
      },
    });
    const c = validateCert({
      kind: "coordinator",
      name: "Ravi",
      email: "ravi@example.com",
      role: COORDINATOR_ROLE,
      team: 5,
    });
    expect(c).toMatchObject({ ok: true, cert: { team: null, role: COORDINATOR_ROLE, branch: "" } });
  });

  it("refuses bad rows", () => {
    const base = {
      kind: "student",
      name: "A",
      email: "a@example.com",
      team: 1,
      branch: BRANCHES[1],
    };
    expect(validateCert(null).ok).toBe(false);
    expect(validateCert({ ...base, kind: "judge" }).ok).toBe(false);
    expect(validateCert({ ...base, name: "  " }).ok).toBe(false);
    expect(validateCert({ ...base, email: "nope" }).ok).toBe(false);
    expect(validateCert({ ...base, team: 0 }).ok).toBe(false);
    expect(validateCert({ ...base, team: 61 }).ok).toBe(false);
    expect(validateCert({ ...base, team: 2.5 }).ok).toBe(false);
    expect(validateCert({ ...base, branch: "Mechanical" }).ok).toBe(false);
    expect(
      validateCert({ kind: "coordinator", name: "R", email: "r@example.com", role: "" }).ok,
    ).toBe(false);
  });
});

describe("mail merge sheet", () => {
  it("quotes cells and adds the link", () => {
    const certs: AdminCert[] = [
      {
        no: "RS26-017-0042",
        kind: "student",
        name: 'Asha "AK" K',
        team: 17,
        branch: "Computer Science & Engineering",
        role: "",
        email: "asha@example.com",
        createdAt: 1,
        updatedAt: 1,
      },
      {
        no: "RS26-C00-0001",
        kind: "coordinator",
        name: "=Ravi",
        team: null,
        branch: "",
        role: COORDINATOR_ROLE,
        email: "ravi@example.com",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const csv = mailMergeCsv(certs);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual([
      "Email",
      "Name",
      "Kind",
      "Team",
      "Branch",
      "Role",
      "Certificate number",
      "Certificate link",
    ]);
    expect(rows[1]).toEqual([
      "asha@example.com",
      'Asha "AK" K',
      "student",
      "17",
      "Computer Science & Engineering",
      "",
      "RS26-017-0042",
      "https://ro-bio.robiohub2026.workers.dev/verify/RS26-017-0042",
    ]);
    expect(rows[2]?.[1]).toBe("'=Ravi");
    expect(rows[2]?.[5]).toBe(COORDINATOR_ROLE);
    expect(csv).toContain('"Student Coordinator, Robo Spark"');
  });
});

const assets: CertAssets = {
  robioLogo: "/l.png",
  crest: "/c.png",
  museLogo: "/m.png",
  participationArt: "/a.svg",
  participationSeal: "/s.svg",
  posterArt: "/p.webp",
  signatures: { left: "/sig-l.png", centre: null, right: null },
};
const student: Cert = {
  no: "RS26-017-0042",
  kind: "student",
  name: "Ananya <Patil> & Co",
  team: 17,
  branch: "Computer Science & Engineering",
  role: "",
};
const coordinator: Cert = {
  no: "RS26-C00-0001",
  kind: "coordinator",
  name: "Asha K",
  team: null,
  branch: "",
  role: COORDINATOR_ROLE,
};

describe("certificate pictures", () => {
  it("draws the student design with the name, number, team and signers", () => {
    const svg = certificateSvg(student, assets);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1123 794"');
    expect(svg).toContain("Ananya &lt;Patil&gt; &amp; Co");
    expect(svg).toContain("No. RS26-017-0042");
    expect(svg).toContain("As a member of Team 17,");
    for (const s of ["ARCHANA G", "DR. NITHIN S K", "PROF. H S KUMARA"]) expect(svg).toContain(s);
    expect(svg).toContain('href="/sig-l.png"');
    expect(
      new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror"),
    ).toBeNull();
  });

  it("draws the coordinator design", () => {
    const svg = certificateSvg(coordinator, assets, "@font-face{}");
    expect(svg).toContain("ASHA K");
    expect(svg).toContain("NO. RS26-C00-0001");
    expect(svg).toContain("STUDENT COORDINATOR, ROBO SPARK");
    expect(svg).toContain("OF APPRECIATION");
    expect(svg).toContain("<style>@font-face{}</style>");
    for (const s of ["ARCHANA G", "DR. NITHIN S K", "PROF. H S KUMARA"]) expect(svg).toContain(s);
    expect(
      new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror"),
    ).toBeNull();
  });

  it("never uses em or en dashes", () => {
    for (const c of [student, coordinator])
      expect(certificateSvg(c, assets)).not.toMatch(/[\u2013\u2014]/);
    expect(mailMergeCsv([])).not.toMatch(/[\u2013\u2014]/);
  });

  it("shrinks long names to fit", () => {
    expect(fitSize("Ananya Patil", "cormorantItalic", 60, 760)).toBe(60);
    const long = "Meenakshisundaram Venkataraghavan Iyer Subramanian";
    const size = fitSize(long, "cormorantItalic", 60, 760);
    expect(size).toBeLessThan(60);
    expect(textWidth(long, "cormorantItalic", size)).toBeLessThanOrEqual(760);
    expect(fitSize("ASHA K", "rubikMono", 40, 500)).toBe(40);
  });
});
