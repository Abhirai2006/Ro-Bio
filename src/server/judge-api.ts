// /api/judge/*: the Robo Spark judges read and save scores here. Every call needs the judge passcode,
// which lives only in Cloudflare (Settings, Variables and Secrets, JUDGE_PASSCODE), never in this public repo.
import { parseScore, cleanName } from "@/lib/judging";
import { TEAM_COUNT } from "@/lib/robo-spark";
import type { JudgeScores } from "./judge-store";

export type JudgeEnv = {
  JUDGE_SCORES?: DurableObjectNamespace<JudgeScores>;
  JUDGE_PASSCODE?: string;
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

export async function handleJudgeApi(request: Request, env: JudgeEnv): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/judge\/?/, "");
  const expected = (env.JUDGE_PASSCODE ?? "").trim();
  if (!env.JUDGE_SCORES)
    return json(
      {
        error:
          "Scoring storage is not connected. Check the durable_objects entry in wrangler.jsonc.",
      },
      503,
    );
  if (!expected)
    return json(
      {
        error:
          "The judge passcode is not set up yet. Add JUDGE_PASSCODE in the Cloudflare dashboard.",
      },
      503,
    );

  const store = env.JUDGE_SCORES.get(env.JUDGE_SCORES.idFromName("robo-spark"));
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (await store.blocked(ip))
    return json({ error: "Too many wrong passcodes. Wait 10 minutes and try again." }, 429);
  const given = (request.headers.get("x-judge-passcode") ?? "").trim();
  if (!given || !same(given, expected)) {
    await store.failed(ip);
    return json({ error: "That passcode is not right. Ask the head judge." }, 401);
  }

  if (route === "check" && request.method === "GET") return json({ ok: true, teams: TEAM_COUNT });

  if (route === "scores") {
    if (request.method === "GET") return json({ scores: await store.list() });
    if (request.method === "PUT") {
      const body = await request.json().catch(() => null);
      const parsed = parseScore(body);
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      return json({ score: await store.save(parsed.score) });
    }
    if (request.method === "DELETE") {
      const team = Number(url.searchParams.get("team"));
      const judge = cleanName(url.searchParams.get("judge"));
      if (!Number.isInteger(team) || !judge)
        return json({ error: "Say which team and judge to remove." }, 400);
      return json({ removed: await store.remove(team, judge) });
    }
    return json({ error: "Use GET, PUT or DELETE." }, 405);
  }

  return json({ error: "Not found." }, 404);
}
