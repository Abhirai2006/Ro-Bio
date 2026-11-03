// /api/certificates/*: checking and finding Robo Spark certificates.
// verify/<no> and lookup are public. admin/* needs the passcode, which lives only in Cloudflare
// (Settings, Variables and Secrets, CERT_ADMIN_PASSCODE), never in this public repo.
import {
  cleanCertNo,
  cleanEmail,
  isEmail,
  MAX_ROWS,
  validateCert,
  type NewCert,
} from "@/lib/certificates";
import type { CertStore } from "./cert-store";

export type CertEnv = {
  CERT_STORE?: DurableObjectNamespace<CertStore>;
  CERT_ADMIN_PASSCODE?: string;
};

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

const body = async (request: Request): Promise<Record<string, unknown> | null> => {
  const b = (await request.json().catch(() => null)) as unknown;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};

export async function handleCertApi(request: Request, env: CertEnv): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/certificates\/?/, "");
  if (!env.CERT_STORE)
    return json(
      {
        error:
          "Certificate storage is not connected. Check the durable_objects entry in wrangler.jsonc.",
      },
      503,
    );
  const store = env.CERT_STORE.get(env.CERT_STORE.idFromName("robo-spark-2026"));
  const ip = request.headers.get("cf-connecting-ip") ?? "local";

  if (route.startsWith("verify/")) {
    if (request.method !== "GET") return json({ error: "Use GET." }, 405);
    const no = cleanCertNo(decodeURIComponent(route.slice("verify/".length)));
    const cert = no ? await store.get(no) : null;
    return cert ? json({ cert }) : json({ error: "No certificate with this number." }, 404);
  }

  if (route === "lookup") {
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (await store.limited(ip, "lookup"))
      return json({ error: "Too many searches from here. Wait 10 minutes and try again." }, 429);
    await store.hit(ip, "lookup");
    const email = cleanEmail((await body(request))?.["email"]);
    if (!isEmail(email))
      return json({ error: "Type the email address you used in the form." }, 400);
    return json({ certs: await store.byEmail(email) });
  }

  if (!route.startsWith("admin/")) return json({ error: "Not found." }, 404);

  const expected = (env.CERT_ADMIN_PASSCODE ?? "").trim();
  if (!expected)
    return json(
      {
        error:
          "The admin passcode is not set up yet. Add CERT_ADMIN_PASSCODE in the Cloudflare dashboard.",
      },
      503,
    );
  if (await store.limited(ip, "passcode"))
    return json({ error: "Too many wrong passcodes. Wait 10 minutes and try again." }, 429);
  const given = (request.headers.get("x-admin-passcode") ?? "").trim();
  if (!given || !same(given, expected)) {
    await store.hit(ip, "passcode");
    return json({ error: "That passcode is not right." }, 401);
  }

  const action = route.slice("admin/".length);
  if (action === "check" && request.method === "GET") return json({ ok: true });
  if (action === "list" && request.method === "GET") return json({ certs: await store.list() });

  if (action === "add") {
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    const rows = (await body(request))?.["rows"];
    if (!Array.isArray(rows) || !rows.length) return json({ error: "Send the rows to add." }, 400);
    if (rows.length > MAX_ROWS) return json({ error: `At most ${MAX_ROWS} rows at a time.` }, 400);
    const good: NewCert[] = [];
    for (const [i, raw] of rows.entries()) {
      const v = validateCert(raw);
      if (!v.ok) return json({ error: `Row ${i + 1}: ${v.error}` }, 400);
      good.push(v.cert);
    }
    return json(await store.add(good));
  }

  if (action === "cert") {
    const no = cleanCertNo(url.searchParams.get("no"));
    if (!no) return json({ error: "Say which certificate number." }, 400);
    if (request.method === "DELETE") {
      const removed = await store.remove(no);
      return removed ? json({ removed }) : json({ error: "No certificate with this number." }, 404);
    }
    if (request.method === "PUT") {
      const old = await store.get(no);
      if (!old) return json({ error: "No certificate with this number." }, 404);
      const v = validateCert({ ...(await body(request)), kind: old.kind });
      if (!v.ok) return json({ error: v.error }, 400);
      const cert = await store.edit(no, v.cert);
      if (cert === "missing") return json({ error: "No certificate with this number." }, 404);
      if (cert === "taken")
        return json({ error: "Another certificate of this kind already uses that email." }, 409);
      return json({ cert });
    }
    return json({ error: "Use PUT or DELETE." }, 405);
  }

  return json({ error: "Not found." }, 404);
}
