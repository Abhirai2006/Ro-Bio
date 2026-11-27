// /api/bot-forge/*: Bot Forge registration. register and payment are the public form; admin/* needs the
// admin passcode, a secret named BOTFORGE_ADMIN_PASSCODE added in the Cloudflare dashboard (Settings,
// Variables and Secrets), never in this public repo.
import {
  cleanTeamCode,
  cleanUtr,
  isPayStatus,
  paymentsOpen,
  registrationState,
  validateTeam,
} from "@/lib/bot-forge";
import { cleanMobile } from "@/lib/recruit";
import { botForgeInfo } from "@/lib/site";
import type { BotForgeStore } from "./botforge-store";

export type BotForgeEnv = {
  BOTFORGE_STORE?: DurableObjectNamespace<BotForgeStore>;
  BOTFORGE_ADMIN_PASSCODE?: string;
};

type Store = ReturnType<DurableObjectNamespace<BotForgeStore>["get"]>;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Compares without stopping at the first different letter, so timing does not give the passcode away. */
function same(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const readBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  const b = (await request.json().catch(() => null)) as unknown;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};

/** The address, only as a salted hash: enough to slow a flood down, never stored in the clear. */
async function scramble(ip: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`robio-botforge:${ip}`));
  return [...new Uint8Array(d)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Why the form is not taking teams right now, or "" when it is. */
async function closedReason(store: Store, now: number): Promise<string> {
  const state = registrationState(now);
  if (state === "coming-soon") return `Registration opens on ${botForgeInfo.opensLabel}.`;
  if (state !== "open") return "Registration for Bot Forge is closed.";
  if (await store.isPaused())
    return "Registration is paused for a few minutes. Try again soon, or DM us on Instagram.";
  return "";
}

async function handleRegister(request: Request, store: Store, now: number): Promise<Response> {
  if (request.method === "GET") {
    const reason = await closedReason(store, now);
    return json({ open: !reason, reason, kits: await store.kitsLeft() });
  }
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const body = await readBody(request);
  if (!body) return json({ error: "Fill in the form first." }, 400);
  const reason = await closedReason(store, now);
  if (reason) return json({ error: reason }, 403);
  if (await store.signupLimited(await scramble(request.headers.get("cf-connecting-ip") ?? "local")))
    return json({ error: "Too many forms from this network. Wait 10 minutes and try again." }, 429);
  // A field people never see. Bots fill it in; they get a polite answer and nothing is saved.
  if (typeof body["website"] === "string" && body["website"].trim()) return json({ ok: true });
  const v = validateTeam(body);
  if (!v.ok) return json({ error: v.error }, 400);
  const saved = await store.register(v.value);
  if ("taken" in saved)
    return json(
      {
        error:
          saved.taken === "usn"
            ? `The USN ${saved.usn} is already in a Bot Forge team. Each student can be in one team only. If this is a mistake, call a student coordinator.`
            : "Another team already has that name. Pick a different team name.",
      },
      409,
    );
  if ("full" in saved)
    return json({ error: "The list is full. Please call a student coordinator." }, 503);
  const t = saved.team;
  return json({
    ok: true,
    code: t.code,
    name: t.name,
    contest: t.contest,
    kit: t.kit,
    kitGone: saved.kitGone,
  });
}

/** A registered team sends the UPI transaction number (UTR) of its fee. */
async function handlePayment(request: Request, store: Store, now: number): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!paymentsOpen(now)) return json({ error: "Payments for Bot Forge are closed." }, 403);
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (await store.limited(ip))
    return json({ error: "Too many tries. Wait 10 minutes and try again." }, 429);
  const body = await readBody(request);
  const code = cleanTeamCode(body?.["code"]);
  const phone = cleanMobile(body?.["phone"]);
  const utr = cleanUtr(body?.["utr"]);
  if (!code) return json({ error: "Type your team number, like SUMO-07." }, 400);
  if (!phone) return json({ error: "Type the team leader's 10 digit WhatsApp number." }, 400);
  if (!utr)
    return json(
      { error: "Type the 12 digit UPI transaction number (UTR) from your payment app." },
      400,
    );
  const r = await store.sendUtr(code, phone, utr);
  if ("error" in r) {
    if (r.error === "no-team") {
      await store.hit(ip);
      return json(
        {
          error:
            "We could not find that team number with that WhatsApp number. Use the team leader's number from the form.",
        },
        404,
      );
    }
    return json(
      {
        error:
          r.error === "already-paid"
            ? "Your payment is already checked and marked paid. Nothing more to do."
            : "That UTR is already used for another team. Check the number in your payment app.",
      },
      409,
    );
  }
  return json({ ok: true, code: r.team.code, pay: r.team.pay });
}

export async function handleBotForgeApi(
  request: Request,
  env: BotForgeEnv,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/bot-forge\/?/, "");
  const admin = route.startsWith("admin/");
  if (!admin && route !== "register" && route !== "payment")
    return json({ error: "Not found." }, 404);
  if (!env.BOTFORGE_STORE)
    return json(
      {
        error:
          "Bot Forge storage is not connected. Check the durable_objects entry in wrangler.jsonc.",
      },
      503,
    );
  const store = env.BOTFORGE_STORE.get(env.BOTFORGE_STORE.idFromName("bot-forge-2026"));
  if (route === "register") return handleRegister(request, store, now);
  if (route === "payment") return handlePayment(request, store, now);

  const expected = (env.BOTFORGE_ADMIN_PASSCODE ?? "").trim();
  if (!expected)
    return json(
      {
        error:
          "The admin passcode is not set up yet. Add BOTFORGE_ADMIN_PASSCODE in the Cloudflare dashboard.",
      },
      503,
    );
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (await store.limited(ip))
    return json({ error: "Too many wrong passcodes. Wait 10 minutes and try again." }, 429);
  const given = (request.headers.get("x-admin-passcode") ?? "").trim();
  if (!given || !same(given, expected)) {
    await store.hit(ip);
    return json({ error: "That passcode is not right." }, 401);
  }

  const action = route.slice("admin/".length);
  const method = request.method;
  const id = Number(url.searchParams.get("id"));
  const needId = () => (!Number.isInteger(id) || id < 1 ? "Say which team." : "");

  if (action === "check" && method === "GET") return json({ ok: true });
  if (action === "list" && method === "GET")
    return json({
      teams: await store.list(),
      kits: await store.kitsLeft(),
      paused: await store.isPaused(),
      reason: await closedReason(store, now),
    });

  if (action === "signups" && method === "PUT") {
    const paused = (await readBody(request))?.["paused"];
    if (typeof paused !== "boolean") return json({ error: "Send paused as true or false." }, 400);
    await store.setPaused(paused);
    return json({ paused });
  }

  if (action === "pay" && method === "PUT") {
    if (needId()) return json({ error: needId() }, 400);
    const pay = (await readBody(request))?.["pay"];
    if (!isPayStatus(pay)) return json({ error: "Payment must be unpaid, sent or paid." }, 400);
    const team = await store.setPay(id, pay);
    return team ? json({ team }) : json({ error: "No such team." }, 404);
  }

  if (action === "kit" && method === "PUT") {
    if (needId()) return json({ error: needId() }, 400);
    const on = (await readBody(request))?.["on"];
    if (typeof on !== "boolean") return json({ error: "Send on as true or false." }, 400);
    const r = await store.setKit(id, on);
    if (r === null) return json({ error: "No such team." }, 404);
    if (r === "none") return json({ error: "This contest has no club kits." }, 400);
    if (r === "full")
      return json({ error: "Every kit for this contest is out. Take one back first." }, 409);
    return json({ team: r });
  }

  if (action === "team" && method === "DELETE") {
    if (needId()) return json({ error: needId() }, 400);
    return (await store.remove(id)) ? json({ removed: id }) : json({ error: "No such team." }, 404);
  }

  if (action === "all" && method === "DELETE") {
    if ((await readBody(request))?.["confirm"] !== "DELETE")
      return json({ error: "Type DELETE to confirm. This removes every team." }, 400);
    await store.wipe();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
