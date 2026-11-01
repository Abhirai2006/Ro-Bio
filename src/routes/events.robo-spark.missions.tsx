import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/site/parts";
import { sceneTeam } from "@/art/scenes";
import { canonical } from "@/lib/seo";
import {
  cardMaking,
  commonTicks,
  judgeDo,
  judgeDont,
  judgeIfThen,
  judgeSteps,
  judgeTimeline,
  missionBlocks,
  missions,
  robotParts,
  TEAM_COUNT,
  type Mission,
} from "@/lib/robo-spark";

const desc = `All ${missions.length} Robo Spark missions with their judging points, the 10-tick checklist and a plain guide for judges.`;

export const Route = createFileRoute("/events/robo-spark/missions")({
  head: () => ({
    meta: [
      { title: "Robo Spark missions and judging guide | RO-BIO" },
      { name: "description", content: desc },
      { property: "og:title", content: "Robo Spark missions and judging guide | RO-BIO" },
      { property: "og:description", content: desc },
    ],
    links: [canonical("/events/robo-spark/missions")],
  }),
  component: Missions,
});

// Drawn once, with fixed ids, so the server and the browser produce exactly the same picture.
const teamArt = sceneTeam("mission-team");

const sections = [
  { id: "start", label: "Start here" },
  { id: "checklist", label: "10 ticks" },
  { id: "how", label: "How to judge" },
  ...missionBlocks.map((b) => ({
    id: `m${b[0]!.n}`,
    label: `Missions ${b[0]!.n} to ${b[b.length - 1]!.n}`,
  })),
  { id: "cards", label: "Making cards" },
];

function Missions() {
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    if (/^\d+$/.test(s)) return missions.filter((m) => m.n === Number(s));
    return missions.filter((m) =>
      [m.title, m.card, m.means, ...m.ticks, m.ask].join(" ").toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <>
      <PageIntro label="ROBO SPARK / JUDGES AND COORDINATORS" title="Missions and judging guide.">
        Team N gets mission card N. Each mission below says what a strong answer looks like, so you
        do not need to know robotics to judge it.
      </PageIntro>
      <div className="border-b-2 border-border bg-violet">
        <div
          className="mx-auto max-w-2xl px-4 pt-6"
          dangerouslySetInnerHTML={{ __html: teamArt }}
        />
      </div>

      <nav
        aria-label="Sections"
        className="sticky top-0 z-20 border-b-2 border-border bg-background/95 backdrop-blur print:hidden"
      >
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 border-2 border-border bg-card px-3 py-1.5 text-sm font-bold hover:bg-primary hover:text-primary-foreground"
            >
              {s.label}
            </a>
          ))}
          <Link
            to="/events/robo-spark/judge"
            className="shrink-0 border-2 border-border bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
          >
            Score teams
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4">
        <section id="start" className="scroll-mt-20 pt-12">
          <h2 className="text-3xl font-black">Your job in one minute</h2>
          <p className="mt-3 max-w-3xl text-lg">
            You watch 2 to 3 teams for 20 minutes and tick a 10-point checklist for each one on the{" "}
            <Link to="/events/robo-spark/judge" className="font-bold text-primary underline">
              score page
            </Link>
            . The problem is on the front of each mission card. The team writes its solution on the
            back. You score what you hear and what is on the back.
          </p>
          <div className="mt-6 overflow-x-auto border-2 border-border bg-card shadow-hard">
            <table className="w-full text-left">
              <thead className="border-b-2 border-border bg-secondary font-pixel text-[11px]">
                <tr>
                  <th className="px-4 py-2">TIME</th>
                  <th className="px-4 py-2">WHAT YOU DO</th>
                </tr>
              </thead>
              <tbody>
                {judgeTimeline.map((t) => (
                  <tr key={t.at} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-primary">
                      {t.at}
                    </td>
                    <td className="px-4 py-3">{t.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 text-2xl font-black">A robot in 4 parts</h3>
          <p className="mt-2 max-w-3xl">
            Every robot idea has the same four parts. If a team explains all four, it is a strong
            answer, even if the idea is simple. Also listen for two things: who does it help, and is
            it safe for people around it? &quot;A sensor that feels if the soil is dry&quot; is a
            full answer. No exact parts or brand names needed.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {robotParts.map((p) => (
              <div key={p.part} className="border-2 border-border bg-card p-4 shadow-hard">
                <p className="font-display text-xl font-black text-primary">{p.part}</p>
                <p className="mt-1 font-bold">{p.plain}</p>
                <p className="mt-2 text-sm text-muted-foreground">They might say: {p.say}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="checklist" className="scroll-mt-20 pt-14">
          <h2 className="text-3xl font-black">The 10-tick checklist</h2>
          <p className="mt-3 max-w-3xl text-lg">
            One tick for each YES. The score is the number of ticks, out of 10. Ticks 1 to 6 are the
            same for every team. Ticks 7 to 10 come from the team&apos;s own mission.
          </p>
          <ol className="mt-6 grid gap-3 md:grid-cols-2">
            {commonTicks.map((t) => (
              <li key={t.n} className="flex gap-4 border-2 border-border bg-card p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-primary font-display text-lg font-black text-primary-foreground">
                  {t.n}
                </span>
                <span>
                  <span className="font-bold">{t.tick}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Yes looks like: {t.yes}
                  </span>
                </span>
              </li>
            ))}
            {[7, 8, 9, 10].map((n) => (
              <li key={n} className="flex gap-4 border-2 border-dashed border-border bg-muted p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border font-display text-lg font-black">
                  {n}
                </span>
                <span className="font-bold">
                  {n === 10
                    ? "They avoided the mission's trap. See the team's mission."
                    : `Strong point ${String.fromCharCode(58 + n)} from the team's mission.`}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section id="how" className="scroll-mt-20 pt-14">
          <h2 className="text-3xl font-black">How to judge, step by step</h2>
          <p className="mt-3 max-w-3xl text-lg">
            Spend about 6 minutes at each team in turns, and come back to each one before the end.
          </p>
          <ol className="mt-5 max-w-3xl list-decimal space-y-2 pl-6 text-lg">
            {judgeSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border-2 border-border bg-card p-5 shadow-hard">
              <p className="font-pixel text-[11px] text-primary">DO</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {judgeDo.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-border bg-card p-5 shadow-hard">
              <p className="font-pixel text-[11px] text-primary">DON&apos;T</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {judgeDont.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <h3 className="mt-10 text-2xl font-black">If this happens</h3>
          <dl className="mt-4 grid gap-3">
            {judgeIfThen.map((r) => (
              <div
                key={r.when}
                className="grid gap-1 border-2 border-border bg-card p-4 md:grid-cols-[1fr_1.6fr] md:gap-6"
              >
                <dt className="font-bold">{r.when}</dt>
                <dd className="text-muted-foreground">{r.then}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="scroll-mt-20 pt-14" aria-labelledby="find">
          <h2 id="find" className="text-3xl font-black">
            All {missions.length} missions
          </h2>
          <label className="mt-4 block max-w-xl">
            <span className="font-pixel text-[11px] text-primary">FIND A MISSION</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              inputMode="search"
              placeholder={`A team number (1 to ${TEAM_COUNT}) or a word, like "farm"`}
              className="mt-1 block w-full border-2 border-border bg-card px-3 py-3 text-lg"
            />
          </label>
          {found && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {found.length ? `${found.length} found.` : "Nothing matches. Try a team number."}
              </p>
              <div className="mt-3 grid gap-5 lg:grid-cols-2">
                {found.map((m) => (
                  <MissionCard key={m.n} m={m} />
                ))}
              </div>
            </div>
          )}
        </section>

        {!found &&
          missionBlocks.map((block) => (
            <section key={block[0]!.n} id={`m${block[0]!.n}`} className="scroll-mt-20 pt-12">
              <h3 className="font-pixel text-sm text-primary">
                MISSIONS {block[0]!.n} TO {block[block.length - 1]!.n}
              </h3>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                {block.map((m) => (
                  <MissionCard key={m.n} m={m} />
                ))}
              </div>
            </section>
          ))}

        <section id="cards" className="scroll-mt-20 pt-14">
          <h2 className="text-3xl font-black">Making the mission cards</h2>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 text-lg">
            {cardMaking.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 border-2 border-border bg-card px-4 py-2 font-bold shadow-hard print:hidden"
          >
            Print this page
          </button>
        </section>
      </div>
    </>
  );
}

function MissionCard({ m }: { m: Mission }) {
  return (
    <article
      id={`mission-${m.n}`}
      className="flex scroll-mt-20 flex-col border-2 border-border bg-card shadow-hard break-inside-avoid"
    >
      <header className="flex items-center gap-3 border-b-2 border-border bg-secondary px-4 py-2">
        <span className="grid h-10 min-w-10 place-items-center bg-primary px-2 font-display text-lg font-black text-primary-foreground">
          {m.n}
        </span>
        <h4 className="text-lg font-black">{m.title}</h4>
        <Link
          to="/events/robo-spark/judge"
          search={{ team: m.n }}
          className="ml-auto text-sm font-bold text-primary underline print:hidden"
        >
          Score team {m.n}
        </Link>
      </header>
      <div className="flex-1 p-4">
        <p className="font-pixel text-[10px] text-primary">ON THE CARD</p>
        <p className="mt-1 text-lg font-bold">{m.card}</p>
        <p className="mt-3 text-sm">
          <span className="font-bold">What it means: </span>
          {m.means}
        </p>
        <ol className="mt-4 space-y-2">
          {m.ticks.map((t, i) => (
            <li
              key={i}
              className={`flex gap-3 text-sm ${i === 3 ? "border-t-2 border-dashed border-border pt-2" : ""}`}
            >
              <span className="w-16 shrink-0 font-mono font-bold text-primary">Tick {i + 7}</span>
              <span>
                {i === 3 && <span className="font-bold">Trap avoided: </span>}
                {t}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-l-4 border-primary pl-3 text-sm">
          <span className="font-bold">Ask on stage: </span>&quot;{m.ask}&quot;
        </p>
      </div>
    </article>
  );
}
