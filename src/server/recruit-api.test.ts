import { describe, expect, it } from "vitest";
import { handleRecruitApi, type RecruitEnv } from "./recruit-api";
import { RecruitStore } from "./recruit-store";
import { sqliteState } from "@/test/sqlite-state";

const ADMIN = "admin-pass";
const JUDGE = "judge-pass";

function setup(env: Partial<RecruitEnv> = {}, state = sqliteState()) {
  const store = new RecruitStore(state, {});
  const full: RecruitEnv = {
    RECRUIT_STORE: {
      idFromName: () => ({ toString: () => "core-2026" }),
      get: () => store as never,
    },
    RECRUIT_ADMIN_PASSCODE: ADMIN,
    RECRUIT_JUDGE_PASSCODE: JUDGE,
    ...env,
  };
  const call = async (
    role: "admin" | "judge",
    path: string,
    init: { method?: string; body?: unknown; pass?: string; ip?: string } = {},
  ) => {
    const res = await handleRecruitApi(
      new Request(`https://x.test/api/recruit/${role}/${path}`, {
        method: init.method ?? "GET",
        headers: {
          "content-type": "application/json",
          [`x-${role}-passcode`]: init.pass ?? (role === "admin" ? ADMIN : JUDGE),
          "cf-connecting-ip": init.ip ?? "1.1.1.1",
        },
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      }),
      full,
    );
    return {
      status: res.status,
      data: (await res.json()) as Record<string, unknown> & { [k: string]: never },
    };
  };
  return { store, call };
}

const student = (usn: string, first: string, extra: Record<string, unknown> = {}) => ({
  usn,
  name: `Student ${usn}`,
  email: `${usn.toLowerCase()}@x.in`,
  phone: "9000000000",
  branch: "Computer Science & Design",
  sem: 1,
  first,
  second: null,
  day: "Wed 11 Nov",
  ...extra,
});

async function withTwo() {
  const t = setup();
  await t.call("admin", "add", {
    method: "POST",
    body: { rows: [student("4MU24A001", "Events"), student("4MU24A002", "Design")] },
  });
  const list = await t.call("admin", "list");
  const all = list.data["candidates"] as unknown as { id: number; usn: string }[];
  const events = all.find((c) => c.usn === "4MU24A001")!;
  const design = all.find((c) => c.usn === "4MU24A002")!;
  return { ...t, events, design };
}
const marks = (candidateId: number, judge: string, squad: string, m = [3, 3, 3, 3, 3]) => ({
  method: "PUT",
  body: { candidateId, judge, squad, marks: m, note: "" },
});

describe("recruitment API passcodes", () => {
  it("refuses a wrong judge passcode", async () => {
    const { call } = setup();
    expect((await call("judge", "check", { pass: "nope" })).status).toBe(401);
  });
  it("keeps the two passcodes apart", async () => {
    const { call } = setup();
    expect((await call("judge", "check", { pass: ADMIN })).status).toBe(401);
    expect((await call("admin", "check", { pass: JUDGE })).status).toBe(401);
    expect((await call("admin", "check")).status).toBe(200);
  });
  it("says which secret is missing", async () => {
    const { call } = setup({ RECRUIT_JUDGE_PASSCODE: "" });
    const r = await call("judge", "check");
    expect(r.status).toBe(503);
    expect(String(r.data["error"])).toContain("RECRUIT_JUDGE_PASSCODE");
  });
  it("locks out an address after too many wrong passcodes", async () => {
    const { call } = setup();
    for (let i = 0; i < 15; i++) await call("judge", "check", { pass: "nope", ip: "9.9.9.9" });
    expect((await call("judge", "check", { ip: "9.9.9.9" })).status).toBe(429);
    expect((await call("judge", "check", { ip: "8.8.8.8" })).status).toBe(200);
  });
});

describe("judging", () => {
  it("stops a senior marking a student from another squad", async () => {
    const { call, events } = await withTwo();
    expect((await call("judge", "sheet", marks(events.id, "Viren", "Design"))).status).toBe(403);
  });
  it("lets a teacher mark anyone", async () => {
    const { call, events } = await withTwo();
    expect((await call("judge", "sheet", marks(events.id, "Archana", "Teacher"))).status).toBe(200);
  });
  it("shows a senior only their squad's students, with no email or phone", async () => {
    const { call } = await withTwo();
    const r = await call("judge", "candidates?squad=Design&judge=Viren");
    const list = r.data["candidates"] as unknown as { usn: string }[];
    expect(list.map((c) => c.usn)).toEqual(["4MU24A002"]);
    expect(JSON.stringify(r.data)).not.toMatch(/9000000000|@x\.in/);
  });
  it("keeps one sheet per judge even when the name is typed differently", async () => {
    const { call, events } = await withTwo();
    await call("judge", "sheet", marks(events.id, "Brunda", "Events", [2, 2, 2, 2, 2]));
    await call("judge", "sheet", marks(events.id, "brunda ", "Events", [4, 4, 4, 4, 4]));
    const list = await call("admin", "list");
    const sheets = list.data["sheets"] as unknown as { marks: number[] }[];
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.marks).toEqual([4, 4, 4, 4, 4]);
  });
  it("gives a judge back only their own sheets after a reload", async () => {
    const { call, events } = await withTwo();
    await call("judge", "sheet", marks(events.id, "Brunda", "Events"));
    await call("judge", "sheet", marks(events.id, "Tejaswini", "Events", [5, 5, 5, 5, 5]));
    const r = await call("judge", "candidates?squad=Events&judge=BRUNDA");
    const mine = r.data["mine"] as unknown as { judge: string }[];
    expect(mine.map((s) => s.judge)).toEqual(["Brunda"]);
  });
  it("refuses marks once the admin locks marking", async () => {
    const { call, events } = await withTwo();
    await call("admin", "lock", { method: "PUT", body: { locked: true } });
    expect((await call("judge", "sheet", marks(events.id, "Archana", "Teacher"))).status).toBe(423);
  });
  it("says so when the student does not exist", async () => {
    const { call } = await withTwo();
    expect((await call("judge", "sheet", marks(999, "Archana", "Teacher"))).status).toBe(404);
  });
});

describe("admin", () => {
  it("keeps status and the wildcard flag when the sheet is imported again", async () => {
    const { call, events } = await withTwo();
    await call("admin", `status?id=${events.id}`, { method: "PUT", body: { status: "core" } });
    await call("admin", "add", {
      method: "POST",
      body: { rows: [student("4MU24C009", "Projects", { wildcard: true })] },
    });
    const again = await call("admin", "add", {
      method: "POST",
      body: {
        rows: [
          student("4MU24A001", "Events", { name: "New Name" }),
          student("4MU24C009", "Projects"),
        ],
      },
    });
    expect(again.data).toMatchObject({ added: 0, updated: 2 });
    const list = (await call("admin", "list")).data["candidates"] as unknown as {
      usn: string;
      status: string;
      name: string;
      wildcard: boolean;
    }[];
    expect(list.find((c) => c.usn === "4MU24A001")).toMatchObject({
      status: "core",
      name: "New Name",
    });
    expect(list.find((c) => c.usn === "4MU24C009")).toMatchObject({ wildcard: true });
  });
  it("names the bad row when an import has a mistake", async () => {
    const { call } = setup();
    const r = await call("admin", "add", {
      method: "POST",
      body: { rows: [student("4MU24A001", "Events"), student("x", "Events")] },
    });
    expect(r.status).toBe(400);
    expect(String(r.data["error"])).toContain("Row 2");
  });
  it("removes a student's sheets with the student", async () => {
    const { call, events } = await withTwo();
    await call("judge", "sheet", marks(events.id, "Archana", "Teacher"));
    await call("admin", `candidate?id=${events.id}`, { method: "DELETE" });
    const list = await call("admin", "list");
    expect(list.data["sheets"]).toEqual([]);
    expect(list.data["candidates"]).toHaveLength(1);
  });
  it("edits a student, for moving them to their second choice squad", async () => {
    const { call, events } = await withTwo();
    const r = await call("admin", `candidate?id=${events.id}`, {
      method: "PUT",
      body: student("4MU24A001", "Technical"),
    });
    expect(r.status).toBe(200);
    expect(r.data["candidate"]).toMatchObject({ first: "Technical" });
  });
  it("refuses an unknown status", async () => {
    const { call, events } = await withTwo();
    expect(
      (await call("admin", `status?id=${events.id}`, { method: "PUT", body: { status: "maybe" } }))
        .status,
    ).toBe(400);
  });
  it("deletes everything only with the typed confirmation", async () => {
    const { call } = await withTwo();
    expect((await call("admin", "all", { method: "DELETE", body: {} })).status).toBe(400);
    expect(
      (await call("admin", "all", { method: "DELETE", body: { confirm: "DELETE" } })).status,
    ).toBe(200);
    expect((await call("admin", "list")).data["candidates"]).toEqual([]);
  });
});

describe("1st semester students without a USN", () => {
  const noUsn = (name: string, email: string, extra: Record<string, unknown> = {}) =>
    student("", "Events", { name, email, ...extra });
  type Row = { id: number; usn: string; name: string; email: string; day: string };
  const rowsOf = async (call: ReturnType<typeof setup>["call"]) =>
    (await call("admin", "list")).data["candidates"] as unknown as Row[];

  it("adds two students who both have no USN", async () => {
    const { call } = setup();
    const r = await call("admin", "add", {
      method: "POST",
      body: { rows: [noUsn("Gita", "gita@x.in"), noUsn("Hari", "hari@x.in")] },
    });
    expect(r.data).toMatchObject({ added: 2, updated: 0 });
    expect((await rowsOf(call)).map((c) => c.usn)).toEqual(["", ""]);
  });

  it("recognises them by email when the sheet is imported again", async () => {
    const { call } = setup();
    await call("admin", "add", { method: "POST", body: { rows: [noUsn("Gita", "gita@x.in")] } });
    const r = await call("admin", "add", {
      method: "POST",
      body: { rows: [noUsn("Gita R", "GITA@x.in", { day: "Thu 12 Nov" })] },
    });
    expect(r.data).toMatchObject({ added: 0, updated: 1 });
    const rows = await rowsOf(call);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Gita R", day: "Thu 12 Nov" });
  });

  it("fills in the USN when they get one later, keeping their marks", async () => {
    const { call } = setup();
    await call("admin", "add", { method: "POST", body: { rows: [noUsn("Gita", "gita@x.in")] } });
    const [gita] = await rowsOf(call);
    await call("judge", "sheet", marks(gita!.id, "Archana", "Teacher"));
    await call("admin", "add", {
      method: "POST",
      body: { rows: [student("4MU26CS050", "Events", { name: "Gita", email: "gita@x.in" })] },
    });
    const rows = await rowsOf(call);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: gita!.id, usn: "4MU26CS050" });
    expect((await call("admin", "list")).data["sheets"]).toHaveLength(1);
  });

  it("keeps a USN already known when a later import leaves it blank", async () => {
    const { call } = setup();
    await call("admin", "add", {
      method: "POST",
      body: { rows: [student("4MU26CS050", "Events", { email: "gita@x.in" })] },
    });
    await call("admin", "add", { method: "POST", body: { rows: [noUsn("Gita", "gita@x.in")] } });
    expect((await rowsOf(call))[0]).toMatchObject({ usn: "4MU26CS050" });
  });

  it("shows judges a student with no USN", async () => {
    const { call } = setup();
    await call("admin", "add", { method: "POST", body: { rows: [noUsn("Gita", "gita@x.in")] } });
    const r = await call("judge", "candidates?squad=Events&judge=X");
    expect(r.data["candidates"]).toMatchObject([{ name: "Gita", usn: "" }]);
  });
});

describe("upgrading a store made by the first version", () => {
  it("keeps the students and marks already saved in the old table", async () => {
    const state = sqliteState();
    const sql = state.storage.sql;
    sql.exec(
      "CREATE TABLE candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, usn TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', branch TEXT NOT NULL, sem INTEGER NOT NULL, first TEXT NOT NULL, second TEXT, day TEXT, wildcard INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'undecided', added_at INTEGER NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE sheets (candidate_id INTEGER NOT NULL, judge TEXT NOT NULL COLLATE NOCASE, squad TEXT NOT NULL, marks TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY (candidate_id, judge))",
    );
    sql.exec(
      "INSERT INTO candidates (id, usn, name, email, phone, branch, sem, first, day, wildcard, status, added_at) VALUES (7, '4MU24A001', 'Old Student', 'old@x.in', '', 'Computer Science & Design', 3, 'Events', 'Wed 11 Nov', 1, 'core', 1)",
    );
    sql.exec("INSERT INTO sheets VALUES (7, 'Archana', 'Teacher', '[3,3,3,3,3]', '', 1)");
    const { call } = setup({}, state);
    const list = (await call("admin", "list")).data;
    expect(list["candidates"]).toMatchObject([
      { id: 7, usn: "4MU24A001", status: "core", wildcard: true },
    ]);
    expect(list["sheets"]).toMatchObject([{ candidateId: 7, judge: "Archana" }]);
    const r = await call("admin", "add", {
      method: "POST",
      body: { rows: [student("", "Events", { name: "New", email: "new@x.in" })] },
    });
    expect(r.data).toMatchObject({ added: 1 });
  });
});
