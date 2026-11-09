// /api/merch/*: likes and feedback on the draft merch designs.
//   GET  tally          likes per piece and colour, and what this browser liked
//   POST like           { kind, colour, liked }
//   POST note           { kind, colour, name, text }
//   admin/*             needs the MERCH_ADMIN_PASSCODE secret (Cloudflare: Settings, Variables and Secrets)
// No accounts. Each browser gets a random id in an HttpOnly cookie the first time it asks for the tally, and
// the database keeps one like per id, piece and colour, so reloading the page never adds a second like.
import { AUTHOR_MAX, NOTE_MAX, cleanText, isColour, isKind } from "@/lib/merch";
import type { MerchStore } from "./merch-store";

export type MerchEnv = {
  MERCH_STORE?: DurableObjectNamespace<MerchStore>;
  MERCH_ADMIN_PASSCODE?: string;
};

const COOKIE = "robio_voter";
const TWO_YEARS = 63072000;

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
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
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return null;
  const b = (await request.json().catch(() => null)) as unknown;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};

/** The browser's voter id from its cookie, if it has a valid one. */
function voterOf(request: Request) {
  const raw = request.headers.get("cookie") ?? "";
  const m = raw.match(/(?:^|;\s*)robio_voter=([a-f0-9]{32})(?:;|$)/);
  return m ? m[1]! : null;
}

function newVoter() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const voterCookie = (id: string, secure: boolean) =>
  `${COOKIE}=${id}; Path=/api/merch; Max-Age=${TWO_YEARS}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;

/** The address, only as a salted hash: enough to slow a flood down, never stored in the clear. */
async function ipKey(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`robio-merch:${ip}`));
  return [...new Uint8Array(d)]
    .slice(0, 12)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/** Writes must come from this site's own pages, never from a form on another site. */
function sameOrigin(request: Request, url: URL) {
  const origin = request.headers.get("origin");
  return origin === url.origin;
}

export async function handleMerchApi(request: Request, env: MerchEnv): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/merch\/?/, "");
  const method = request.method;
  if (!env.MERCH_STORE)
    return json(
      {
        error: "Merch storage is not connected. Check the durable_objects entry in wrangler.jsonc.",
      },
      503,
    );
  const store = env.MERCH_STORE.get(env.MERCH_STORE.idFromName("merch-drop-01"));
  const secure = url.protocol === "https:";

  if (route === "tally" && method === "GET") {
    const voter = voterOf(request);
    const tally = await store.tally(voter);
    if (voter) return json(tally);
    return json(tally, 200, { "set-cookie": voterCookie(newVoter(), secure) });
  }

  if (route === "like" || route === "note") {
    if (method !== "POST") return json({ error: "Use POST." }, 405);
    if (!sameOrigin(request, url)) return json({ error: "Send this from the merch page." }, 403);
    const voter = voterOf(request);
    if (!voter)
      return json(
        {
          error:
            "Your browser blocked the cookie that keeps likes to one each. Allow cookies for this site and reload.",
        },
        400,
      );
    const body = await readBody(request);
    if (!body) return json({ error: "Send the details as JSON." }, 400);
    const { kind, colour } = body;
    if (!isKind(kind) || !isColour(colour))
      return json({ error: "Pick a piece and a colour." }, 400);
    if (await store.busy(await ipKey(request)))
      return json(
        { error: "Lots of taps from your network. Wait a few minutes and try again." },
        429,
      );

    if (route === "like") {
      if (typeof body["liked"] !== "boolean")
        return json({ error: "Send liked as true or false." }, 400);
      return json(await store.setLike(voter, kind, colour, body["liked"]));
    }
    const text = cleanText(body["text"], NOTE_MAX);
    if (text.length < 2) return json({ error: "Write a few words first." }, 400);
    const name = cleanText(body["name"], AUTHOR_MAX).replace(/\n/g, " ");
    const ok = await store.addNote(voter, { kind, colour, name, text });
    if (!ok)
      return json(
        { error: "That is five notes from this browser today. Thank you! Try again tomorrow." },
        429,
      );
    return json({ ok: true });
  }

  if (route.startsWith("admin/")) {
    const expected = (env.MERCH_ADMIN_PASSCODE ?? "").trim();
    if (!expected)
      return json(
        {
          error:
            "The admin passcode is not set up yet. Add MERCH_ADMIN_PASSCODE in the Cloudflare dashboard.",
        },
        503,
      );
    const ip = await ipKey(request);
    if (await store.limited(ip))
      return json({ error: "Too many wrong passcodes. Wait 10 minutes and try again." }, 429);
    const given = (request.headers.get("x-admin-passcode") ?? "").trim();
    if (!given || !same(given, expected)) {
      await store.hit(ip);
      return json({ error: "That passcode is not right." }, 401);
    }
    const action = route.slice("admin/".length);
    if (action === "list" && method === "GET")
      return json({
        ...(await store.tally(null)),
        voters: await store.voters(),
        notes: await store.notes(),
      });
    if (action === "note" && method === "DELETE") {
      const id = Number(url.searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1) return json({ error: "Say which note." }, 400);
      return (await store.removeNote(id))
        ? json({ ok: true })
        : json({ error: "No such note." }, 404);
    }
    if (action === "all" && method === "DELETE") {
      if ((await readBody(request))?.["confirm"] !== "DELETE")
        return json(
          { error: "Type DELETE to confirm. This removes every like and every note." },
          400,
        );
      await store.wipe();
      return json({ ok: true });
    }
  }

  return json({ error: "Not found." }, 404);
}
