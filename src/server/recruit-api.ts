// /api/recruit/*: core member recruitment. apply is the public /join form. judge/* needs the judge passcode
// and admin/* the admin passcode.
// Both live only in Cloudflare (Settings, Variables and Secrets: RECRUIT_JUDGE_PASSCODE and RECRUIT_ADMIN_PASSCODE),
// never in this public repo. Judges never get a student's email or phone, or another judge's marks.
import {
  canJudge,
  isJudgeSquad,
  isStatus,
  MAX_ROWS,
  parseSheet,
  toJudgeView,
  validateApplication,
  validateCandidate,
  type NewCandidate,
} from "@/lib/recruit";
import { recruitment, recruitmentOpen } from "@/lib/site";
import { cleanName } from "@/lib/judging";
import type { RecruitStore } from "./recruit-store";

export type RecruitEnv = {
  RECRUIT_STORE?: DurableObjectNamespace<RecruitStore>;
  RECRUIT_ADMIN_PASSCODE?: string;
  RECRUIT_JUDGE_PASSCODE?: string;
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

const readBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  const b = (await request.json().catch(() => null)) as unknown;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};

/** The address, only as a salted hash: enough to slow a flood down, never stored in the clear. */
async function scramble(ip: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`robio-recruit:${ip}`));
  return [...new Uint8Array(d)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Store = ReturnType<DurableObjectNamespace<RecruitStore>["get"]>;

/** Why the /join form is not taking sign-ups right now, or "" when it is. */
async function closedReason(store: Store, now: number): Promise<string> {
  if (recruitment.status !== "open") return "Sign-ups for this round are closed.";
  if (!recruitmentOpen(now))
    return `Sign-ups closed on ${recruitment.closesLabel}. If you still want to apply, come to the interview room and ask an organiser.`;
  if (await store.isPaused())
    return "Sign-ups are paused for now. Check the WhatsApp group, or ask an organiser at the interview room.";
  return "";
}

/** GET tells the /join page whether it is open; POST signs a student up. No passcode. */
async function handleApply(request: Request, store: Store, now: number): Promise<Response> {
  if (request.method === "GET") {
    const reason = await closedReason(store, now);
    return json({ open: !reason, reason });
  }
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const body = await readBody(request);
  if (!body) return json({ error: "Fill in the form first." }, 400);
  const reason = await closedReason(store, now);
  if (reason) return json({ error: reason }, 403);
  if (await store.signupLimited(await scramble(request.headers.get("cf-connecting-ip") ?? "local")))
    return json(
      { error: "Too many sign-ups from this network. Wait 10 minutes and try again." },
      429,
    );
  // A field people never see. Bots fill it in; they get a polite answer and nothing is saved.
  if (typeof body["website"] === "string" && body["website"].trim()) return json({ ok: true });
  const v = validateApplication(body);
  if (!v.ok) return json({ error: v.error }, 400);
  const saved = await store.register(v.candidate);
  if ("duplicate" in saved)
    return json(
      {
        error:
          "You are already registered: we found your USN or email. To change your squad, tell an organiser at the interview room.",
      },
      409,
    );
  if ("full" in saved)
    return json({ error: "The list is full. Please ask an organiser at the interview room." }, 503);
  const c = v.candidate;
  return json({ ok: true, name: c.name, first: c.first, day: c.day });
}

export async function handleRecruitApi(
  request: Request,
  env: RecruitEnv,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/recruit\/?/, "");
  const role = route.startsWith("judge/") ? "judge" : route.startsWith("admin/") ? "admin" : null;
  if (!role && route !== "apply") return json({ error: "Not found." }, 404);
  if (!env.RECRUIT_STORE)
    return json(
      {
        error:
          "Recruitment storage is not connected. Check the durable_objects entry in wrangler.jsonc.",
      },
      503,
    );
  if (!role)
    return handleApply(
      request,
      env.RECRUIT_STORE.get(env.RECRUIT_STORE.idFromName("core-2026")),
      now,
    );

  const secret = role === "admin" ? "RECRUIT_ADMIN_PASSCODE" : "RECRUIT_JUDGE_PASSCODE";
  const expected = (env[secret] ?? "").trim();
  if (!expected)
    return json(
      {
        error: `The ${role} passcode is not set up yet. Add ${secret} in the Cloudflare dashboard.`,
      },
      503,
    );

  const store = env.RECRUIT_STORE.get(env.RECRUIT_STORE.idFromName("core-2026"));
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (await store.limited(ip))
    return json({ error: "Too many wrong passcodes. Wait 10 minutes and try again." }, 429);
  const given = (request.headers.get(`x-${role}-passcode`) ?? "").trim();
  if (!given || !same(given, expected)) {
    await store.hit(ip);
    return json(
      {
        error:
          role === "admin"
            ? "That passcode is not right."
            : "That passcode is not right. Ask the admin.",
      },
      401,
    );
  }

  const action = route.slice(role.length + 1);
  const method = request.method;
  const id = Number(url.searchParams.get("id"));

  if (role === "judge") {
    if (action === "check" && method === "GET")
      return json({ ok: true, locked: await store.isLocked() });

    if (action === "candidates" && method === "GET") {
      const squad = url.searchParams.get("squad");
      if (!isJudgeSquad(squad)) return json({ error: "Pick your squad." }, 400);
      const judge = cleanName(url.searchParams.get("judge"));
      const candidates = (await store.list()).filter((c) => canJudge(squad, c));
      const allowed = new Set(candidates.map((c) => c.id));
      const mine = judge
        ? (await store.sheetsBy(judge)).filter((s) => allowed.has(s.candidateId))
        : [];
      return json({
        candidates: candidates.map(toJudgeView),
        mine,
        locked: await store.isLocked(),
      });
    }

    if (action === "sheet" && method === "PUT") {
      const parsed = parseSheet(await readBody(request));
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      if (await store.isLocked())
        return json(
          { error: "Marking is locked. Ask the admin if you still need to change marks." },
          423,
        );
      const student = await store.get(parsed.sheet.candidateId);
      if (!student)
        return json({ error: "That student is not on the list any more. Reload the page." }, 404);
      if (!canJudge(parsed.sheet.squad, student))
        return json(
          { error: `${student.name} is being interviewed by the ${student.first} squad.` },
          403,
        );
      return json({ sheet: await store.saveSheet(parsed.sheet) });
    }

    return json({ error: "Not found." }, 404);
  }

  if (action === "check" && method === "GET") return json({ ok: true });
  if (action === "list" && method === "GET")
    return json({
      candidates: await store.list(),
      sheets: await store.sheets(),
      locked: await store.isLocked(),
      paused: await store.isPaused(),
      signups: { reason: await closedReason(store, now) },
    });

  if (action === "signups" && method === "PUT") {
    const paused = (await readBody(request))?.["paused"];
    if (typeof paused !== "boolean") return json({ error: "Send paused as true or false." }, 400);
    await store.setPaused(paused);
    return json({ paused });
  }

  if (action === "add") {
    if (method !== "POST") return json({ error: "Use POST." }, 405);
    const rows = (await readBody(request))?.["rows"];
    if (!Array.isArray(rows) || !rows.length)
      return json({ error: "Send the students to add." }, 400);
    if (rows.length > MAX_ROWS)
      return json({ error: `At most ${MAX_ROWS} students at a time.` }, 400);
    const good: NewCandidate[] = [];
    for (const [i, raw] of rows.entries()) {
      const v = validateCandidate(raw);
      if (!v.ok) return json({ error: `Row ${i + 1}: ${v.error}` }, 400);
      good.push(v.candidate);
    }
    return json(await store.add(good));
  }

  if (action === "candidate") {
    if (!Number.isInteger(id) || id < 1) return json({ error: "Say which student." }, 400);
    if (method === "DELETE") {
      const removed = await store.remove(id);
      return removed ? json({ removed }) : json({ error: "No such student." }, 404);
    }
    if (method === "PUT") {
      const v = validateCandidate(await readBody(request));
      if (!v.ok) return json({ error: v.error }, 400);
      try {
        const candidate = await store.edit(id, v.candidate);
        return candidate ? json({ candidate }) : json({ error: "No such student." }, 404);
      } catch {
        return json({ error: `Another student already has the USN ${v.candidate.usn}.` }, 409);
      }
    }
    return json({ error: "Use PUT or DELETE." }, 405);
  }

  if (action === "status" && method === "PUT") {
    if (!Number.isInteger(id) || id < 1) return json({ error: "Say which student." }, 400);
    const status = (await readBody(request))?.["status"];
    if (!isStatus(status))
      return json({ error: "Status must be undecided, core, supporting or not-selected." }, 400);
    return (await store.setStatus(id, status))
      ? json({ ok: true })
      : json({ error: "No such student." }, 404);
  }

  if (action === "lock" && method === "PUT") {
    const locked = (await readBody(request))?.["locked"];
    if (typeof locked !== "boolean") return json({ error: "Send locked as true or false." }, 400);
    await store.setLocked(locked);
    return json({ locked });
  }

  if (action === "all" && method === "DELETE") {
    if ((await readBody(request))?.["confirm"] !== "DELETE")
      return json(
        { error: "Type DELETE to confirm. This removes every student and every mark." },
        400,
      );
    await store.wipe();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
