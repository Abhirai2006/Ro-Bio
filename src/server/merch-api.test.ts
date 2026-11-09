import { describe, expect, it } from "vitest";
import { handleMerchApi, type MerchEnv } from "./merch-api";
import { MerchStore } from "./merch-store";
import { sqliteState } from "@/test/sqlite-state";

const ORIGIN = "https://x.test";
const ADMIN = "merch-pass";

function setup(env: Partial<MerchEnv> = {}) {
  const store = new MerchStore(sqliteState(), {});
  const full: MerchEnv = {
    MERCH_STORE: {
      idFromName: () => ({ toString: () => "m" }),
      get: () => store as never,
    } as never,
    MERCH_ADMIN_PASSCODE: ADMIN,
    ...env,
  };
  const call = async (
    path: string,
    init: {
      method?: string;
      body?: unknown;
      cookie?: string;
      origin?: string | null;
      pass?: string;
      ip?: string;
    } = {},
  ) => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "cf-connecting-ip": init.ip ?? "1.1.1.1",
    };
    if (init.cookie) headers["cookie"] = init.cookie;
    if (init.origin !== null) headers["origin"] = init.origin ?? ORIGIN;
    if (init.pass) headers["x-admin-passcode"] = init.pass;
    const res = await handleMerchApi(
      new Request(`${ORIGIN}/api/merch/${path}`, {
        method: init.method ?? "GET",
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      }),
      full,
    );
    return {
      status: res.status,
      cookie: res.headers.get("set-cookie"),
      data: (await res.json()) as Record<string, never> & {
        counts: Record<string, number>;
        mine: string[];
        notes: { id: number; text: string }[];
        voters: number;
        error: string;
      },
    };
  };
  return { call };
}

async function browser(t: ReturnType<typeof setup>) {
  const first = await t.call("tally");
  const id = first.cookie!.match(/robio_voter=([a-f0-9]{32})/)![1]!;
  return `robio_voter=${id}`;
}

describe("merch likes", () => {
  it("gives a new browser a secure, script-proof cookie", async () => {
    const t = setup();
    const r = await t.call("tally");
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/HttpOnly/);
    expect(r.cookie).toMatch(/SameSite=Strict/);
    expect(r.cookie).toMatch(/Secure/);
    expect(r.cookie).toMatch(/Path=\/api\/merch/);
  });

  it("counts one like per browser, however often it is sent", async () => {
    const t = setup();
    const cookie = await browser(t);
    for (let i = 0; i < 3; i++)
      await t.call("like", {
        method: "POST",
        cookie,
        body: { kind: "jacket", colour: "black", liked: true },
      });
    const r = await t.call("tally", { cookie });
    expect(r.data.counts["jacket:black"]).toBe(1);
    expect(r.data.mine).toEqual(["jacket:black"]);
    expect(r.cookie).toBeNull();
  });

  it("lets a browser take its like back", async () => {
    const t = setup();
    const cookie = await browser(t);
    await t.call("like", {
      method: "POST",
      cookie,
      body: { kind: "hoodie", colour: "lilac", liked: true },
    });
    const r = await t.call("like", {
      method: "POST",
      cookie,
      body: { kind: "hoodie", colour: "lilac", liked: false },
    });
    expect(r.data.counts["hoodie:lilac"]).toBeUndefined();
  });

  it("adds up likes from different browsers", async () => {
    const t = setup();
    for (let i = 0; i < 3; i++) {
      const cookie = await browser(t);
      await t.call("like", {
        method: "POST",
        cookie,
        body: { kind: "tee", colour: "white", liked: true },
      });
    }
    expect((await t.call("tally")).data.counts["tee:white"]).toBe(3);
  });

  it("refuses likes without the cookie, from other sites, or for things that do not exist", async () => {
    const t = setup();
    const cookie = await browser(t);
    const body = { kind: "jacket", colour: "black", liked: true };
    expect((await t.call("like", { method: "POST", body })).status).toBe(400);
    expect(
      (await t.call("like", { method: "POST", cookie, body, origin: "https://evil.test" })).status,
    ).toBe(403);
    expect((await t.call("like", { method: "POST", cookie, body, origin: null })).status).toBe(403);
    expect(
      (await t.call("like", { method: "POST", cookie, body: { ...body, kind: "socks" } })).status,
    ).toBe(400);
    expect(
      (await t.call("like", { method: "POST", cookie: "robio_voter=<script>", body })).status,
    ).toBe(400);
  });

  it("slows down a flood from one address", async () => {
    const t = setup();
    const cookie = await browser(t);
    let last = 200;
    for (let i = 0; i < 90; i++)
      last = (
        await t.call("like", {
          method: "POST",
          cookie,
          body: { kind: "polo", colour: "black", liked: i % 2 === 0 },
        })
      ).status;
    expect(last).toBe(429);
  });
});

describe("merch feedback", () => {
  it("keeps notes for the admin only, cleaned, five a day per browser", async () => {
    const t = setup();
    const cookie = await browser(t);
    const note = {
      kind: "jacket",
      colour: "lilac",
      name: "Asha",
      text: "Make the logo\u0000 smaller",
    };
    expect((await t.call("note", { method: "POST", cookie, body: note })).status).toBe(200);
    for (let i = 0; i < 4; i++) await t.call("note", { method: "POST", cookie, body: note });
    expect((await t.call("note", { method: "POST", cookie, body: note })).status).toBe(429);
    expect(
      (await t.call("note", { method: "POST", cookie, body: { ...note, text: " " } })).status,
    ).toBe(400);

    expect((await t.call("admin/list")).status).toBe(401);
    expect((await t.call("admin/list", { pass: "wrong" })).status).toBe(401);
    const list = await t.call("admin/list", { pass: ADMIN });
    expect(list.data.notes).toHaveLength(5);
    expect(list.data.notes[0]!.text).toBe("Make the logo smaller");
    // the public tally never carries notes
    expect((await t.call("tally", { cookie })).data.notes).toBeUndefined();
  });

  it("lets the admin delete a note and wipe everything", async () => {
    const t = setup();
    const cookie = await browser(t);
    await t.call("note", {
      method: "POST",
      cookie,
      body: { kind: "tee", colour: "black", text: "Nice" },
    });
    await t.call("like", {
      method: "POST",
      cookie,
      body: { kind: "tee", colour: "black", liked: true },
    });
    const id = (await t.call("admin/list", { pass: ADMIN })).data.notes[0]!.id;
    expect((await t.call(`admin/note?id=${id}`, { method: "DELETE", pass: ADMIN })).status).toBe(
      200,
    );
    expect((await t.call("admin/all", { method: "DELETE", pass: ADMIN, body: {} })).status).toBe(
      400,
    );
    await t.call("admin/all", { method: "DELETE", pass: ADMIN, body: { confirm: "DELETE" } });
    expect((await t.call("tally")).data.counts).toEqual({});
  });

  it("locks out an address after too many wrong passcodes", async () => {
    const t = setup();
    for (let i = 0; i < 15; i++) await t.call("admin/list", { pass: "nope" });
    expect((await t.call("admin/list", { pass: ADMIN })).status).toBe(429);
  });

  it("says so when the passcode is not set up", async () => {
    const t = setup({ MERCH_ADMIN_PASSCODE: "" });
    expect((await t.call("admin/list", { pass: "x" })).status).toBe(503);
  });
});
