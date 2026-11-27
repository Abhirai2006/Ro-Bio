import { describe, expect, it } from "vitest";
import { handleBotForgeApi, type BotForgeEnv } from "./botforge-api";
import { BotForgeStore } from "./botforge-store";
import { sqliteState } from "@/test/sqlite-state";
import { botForge, botForgeInfo } from "@/lib/site";

const ADMIN = "admin-pass";
// Moments around the registration window, from site.ts.
const OPEN = Date.parse(botForge.opensAt!) + 60000;
const BEFORE = Date.parse(botForge.opensAt!) - 60000;
const AFTER = Date.parse(botForge.closesAt!) + 60000;

function setup(env: Partial<BotForgeEnv> = {}) {
  const store = new BotForgeStore(sqliteState(), {});
  const full: BotForgeEnv = {
    BOTFORGE_STORE: {
      idFromName: () => ({ toString: () => "bot-forge-2026" }),
      get: () => store as never,
    },
    BOTFORGE_ADMIN_PASSCODE: ADMIN,
    ...env,
  };
  const call = async (
    path: string,
    init: { method?: string; body?: unknown; pass?: string; ip?: string; now?: number } = {},
  ) => {
    const res = await handleBotForgeApi(
      new Request(`https://x.test/api/bot-forge/${path}`, {
        method: init.method ?? "GET",
        headers: {
          "content-type": "application/json",
          ...(init.pass !== undefined ? { "x-admin-passcode": init.pass } : {}),
          "cf-connecting-ip": init.ip ?? "1.1.1.1",
        },
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      }),
      full,
      init.now ?? OPEN,
    );
    return { status: res.status, data: (await res.json()) as Record<string, unknown> };
  };
  return { store, call };
}

const member = (n: number, extra: Record<string, unknown> = {}) => ({
  name: `Test Student ${String.fromCharCode(64 + n)}`,
  usn: `4MU00TS0${String(n).padStart(2, "0")}`,
  branch: "Computer Science & Design",
  sem: 3,
  ...extra,
});
let next = 1;
const team = (contest: string, extra: Record<string, unknown> = {}) => {
  const members = [member(next++), member(next++), member(next++)];
  return {
    contest,
    name: `Team ${next}`,
    members,
    phone: "9000000000",
    email: "leader@example.com",
    kit: false,
    consent: true,
    ...extra,
  };
};

describe("Bot Forge registration window", () => {
  it("opens and closes by itself at the times in site.ts", async () => {
    const { call } = setup();
    expect((await call("register", { now: BEFORE })).data["open"]).toBe(false);
    expect((await call("register", { now: OPEN })).data["open"]).toBe(true);
    expect((await call("register", { now: AFTER })).data["open"]).toBe(false);
    const early = await call("register", { method: "POST", body: team("robo-sumo"), now: BEFORE });
    expect(early.status).toBe(403);
    expect(early.data["error"]).toContain(botForgeInfo.opensLabel);
  });
  it("can be paused by the admin", async () => {
    const { call } = setup();
    await call("admin/signups", { method: "PUT", body: { paused: true }, pass: ADMIN });
    expect((await call("register", { method: "POST", body: team("robo-sumo") })).status).toBe(403);
  });
});

describe("Bot Forge sign-up", () => {
  it("gives each contest its own team numbers", async () => {
    const { call } = setup();
    const a = await call("register", { method: "POST", body: team("robo-sumo") });
    const b = await call("register", { method: "POST", body: team("robo-sumo") });
    const c = await call("register", { method: "POST", body: team("shark-tank") });
    expect([a.data["code"], b.data["code"], c.data["code"]]).toEqual([
      "SUMO-01",
      "SUMO-02",
      "SHARK-01",
    ]);
  });
  it("saves nothing when the hidden field is filled", async () => {
    const { call, store } = setup();
    const r = await call("register", {
      method: "POST",
      body: { ...team("robo-race"), website: "spam" },
    });
    expect(r.data["ok"]).toBe(true);
    expect(store.list()).toHaveLength(0);
  });
  it("keeps each student to one team", async () => {
    const { call } = setup();
    const first = team("robo-sumo");
    await call("register", { method: "POST", body: first });
    const again = await call("register", {
      method: "POST",
      body: team("robo-race", { members: [first.members[0], member(next++), member(next++)] }),
    });
    expect(again.status).toBe(409);
    expect(again.data["error"]).toContain(first.members[0]!.usn);
  });
  it("refuses a team name that is taken, whatever the case", async () => {
    const { call } = setup();
    await call("register", { method: "POST", body: team("robo-sumo", { name: "Iron Bulls" }) });
    const r = await call("register", {
      method: "POST",
      body: team("robo-race", { name: "iron  BULLS" }),
    });
    expect(r.status).toBe(409);
  });
  it("checks team sizes per contest", async () => {
    const { call } = setup();
    const five = [1, 2, 3, 4, 5].map(() => member(next++));
    expect(
      (await call("register", { method: "POST", body: team("robo-sumo", { members: five }) }))
        .status,
    ).toBe(200);
    const r = await call("register", {
      method: "POST",
      body: team("shark-tank", { members: [1, 2, 3, 4, 5].map(() => member(next++)) }),
    });
    expect(r.status).toBe(400);
    expect(r.data["error"]).toMatch(/3 to 4/);
  });
  it("gives the kits to the first teams that ask, then says they ran out", async () => {
    const { call } = setup();
    const kits = botForgeInfo.contests.find((c) => c.slug === "robo-race")!.kits;
    for (let i = 0; i < kits; i++) {
      const r = await call("register", { method: "POST", body: team("robo-race", { kit: true }) });
      expect(r.data["kit"]).toBe(true);
    }
    const late = await call("register", { method: "POST", body: team("robo-race", { kit: true }) });
    expect(late.data["kit"]).toBe(false);
    expect(late.data["kitGone"]).toBe(true);
    expect(((await call("register")).data["kits"] as Record<string, number>)["robo-race"]).toBe(0);
    // Shark Tank has no kits: asking for one gives nothing.
    const shark = await call("register", {
      method: "POST",
      body: team("shark-tank", { kit: true }),
    });
    expect(shark.data["kit"]).toBe(false);
  });
});

describe("Bot Forge payment", () => {
  it("takes a UTR only with the right team number and leader number", async () => {
    const { call } = setup();
    const r = await call("register", { method: "POST", body: team("robo-sumo") });
    const code = r.data["code"] as string;
    const wrong = await call("payment", {
      method: "POST",
      body: { code, phone: "9111111111", utr: "123456789012" },
    });
    expect(wrong.status).toBe(404);
    const ok = await call("payment", {
      method: "POST",
      body: {
        code: code.toLowerCase().replace("-0", " "),
        phone: "9000000000",
        utr: "1234 5678 9012",
      },
    });
    expect(ok.data["pay"]).toBe("sent");
  });
  it("refuses a UTR used by another team", async () => {
    const { call } = setup();
    const a = (await call("register", { method: "POST", body: team("robo-sumo") })).data;
    const b = (await call("register", { method: "POST", body: team("robo-race") })).data;
    const utr = "999988887777";
    await call("payment", { method: "POST", body: { code: a["code"], phone: "9000000000", utr } });
    const r = await call("payment", {
      method: "POST",
      body: { code: b["code"], phone: "9000000000", utr },
    });
    expect(r.status).toBe(409);
  });
});

describe("Bot Forge admin", () => {
  it("needs the passcode, and says when the secret is missing", async () => {
    expect((await setup().call("admin/check", { pass: "nope" })).status).toBe(401);
    expect((await setup().call("admin/check", { pass: ADMIN })).status).toBe(200);
    expect(
      (await setup({ BOTFORGE_ADMIN_PASSCODE: "" }).call("admin/check", { pass: ADMIN })).status,
    ).toBe(503);
  });
  it("marks payments, moves kits and deletes teams", async () => {
    const { call } = setup();
    await call("register", { method: "POST", body: team("robo-sumo", { kit: true }) });
    const list = (await call("admin/list", { pass: ADMIN })).data["teams"] as { id: number }[];
    const id = list[0]!.id;
    const paid = await call(`admin/pay?id=${id}`, {
      method: "PUT",
      body: { pay: "paid" },
      pass: ADMIN,
    });
    expect((paid.data["team"] as { pay: string }).pay).toBe("paid");
    const off = await call(`admin/kit?id=${id}`, {
      method: "PUT",
      body: { on: false },
      pass: ADMIN,
    });
    expect((off.data["team"] as { kit: boolean }).kit).toBe(false);
    expect((await call(`admin/team?id=${id}`, { method: "DELETE", pass: ADMIN })).status).toBe(200);
    expect((await call("admin/list", { pass: ADMIN })).data["teams"]).toEqual([]);
  });
  it("frees a deleted team's students to join another team", async () => {
    const { call } = setup();
    const t = team("robo-sumo");
    await call("register", { method: "POST", body: t });
    const id = ((await call("admin/list", { pass: ADMIN })).data["teams"] as { id: number }[])[0]!
      .id;
    await call(`admin/team?id=${id}`, { method: "DELETE", pass: ADMIN });
    expect(
      (await call("register", { method: "POST", body: { ...t, name: "A New Name" } })).status,
    ).toBe(200);
  });
});
