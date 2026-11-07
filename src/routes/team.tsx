import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { MemberCard, Portrait } from "@/components/site/TeamCards";
import { SquadArt } from "@/components/site/SquadArt";
import { coreTeam, faculty, squadPages } from "@/lib/site";

export const Route = createFileRoute("/team")({
  head: () => ({
    links: [canonical("/team")],
    meta: [
      { title: "Team | RO-BIO" },
      {
        name: "description",
        content:
          "The RO-BIO team: Head of Department Dr. Nithin S K, faculty coordinator Archana G, President Thushar K L, Vice President Shloka D Raj, Secretary Abhishek Rai A and five squads: Projects, Events, Technical, Social Media and Outreach, and Design.",
      },
      { property: "og:title", content: "Team | RO-BIO" },
      { property: "og:description", content: "The people who keep RO-BIO running." },
    ],
  }),
  component: Team,
});

/** Centres the short last row: the fifth tile on two-column screens, the fourth and fifth on three. */
const tileStart = ["", "", "", "lg:col-start-2", "md:col-start-2 lg:col-start-auto"];

const officeBearers = coreTeam.find((s) => s.title === "Office Bearers");

function Team() {
  const squads = squadPages();
  return (
    <>
      <PageIntro label="TEAM / CREW" title="The people keeping it running." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-black md:text-3xl">Department and faculty</h2>
        <ul className="mt-5 grid gap-6 sm:grid-cols-2">
          {faculty.map((c) => (
            <li key={c.name} className="flex border-2 border-border bg-card shadow-hard">
              <Portrait name={c.name} className="w-32 shrink-0 border-r-2 border-border sm:w-40" />
              <div className="p-5">
                <p className="font-pixel text-[10px] text-primary">{c.role.toUpperCase()}</p>
                <p className="mt-1 font-display text-2xl font-bold">{c.name}</p>
                {c.phone && (
                  <a
                    href={`tel:+91${c.phone}`}
                    className="mt-1 inline-block font-mono text-primary underline"
                  >
                    {c.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        {officeBearers && (
          <>
            <h2 className="mt-16 text-2xl font-black md:text-3xl">Office bearers</h2>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-3xl">
              {officeBearers.members.map((m, i) => (
                <li key={m.name}>
                  <MemberCard member={m} index={i} />
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-16 text-3xl font-black md:text-4xl">Squads</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Five squads keep the club running. Open one to meet the people in it.
        </p>
        {/* Every squad gets the same size tile: two or three to a row, the last row centred. */}
        <ul className="mt-6 grid auto-rows-fr gap-6 md:grid-cols-4 lg:grid-cols-6">
          {squads.map((sq, i) => {
            const head = sq.members.find((m) => m.head);
            return (
              <li key={sq.slug} className={`md:col-span-2 ${tileStart[i] ?? ""}`}>
                <Link
                  to="/team/$squad"
                  params={{ squad: sq.slug }}
                  viewTransition
                  className="group flex h-full flex-col border-2 border-border bg-card shadow-hard transition-[box-shadow,translate] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--ink)] focus-visible:-translate-y-0.5"
                >
                  <SquadArt slug={sq.slug} fx className="border-b-2 border-border" />
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <div>
                      <h3 className="font-display text-2xl font-black">{sq.title}</h3>
                      <p className="mt-1 text-muted-foreground">{sq.about}</p>
                    </div>
                    <p className="font-mono text-sm">
                      {head ? `Head: ${head.name} · ` : ""}
                      {sq.members.length} members
                      <span className="ml-3 font-bold text-primary group-hover:underline">
                        Open →
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
