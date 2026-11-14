import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { MemberCard, Portrait } from "@/components/site/TeamCards";
import { useHashSpotlight } from "@/components/site/use-hash-spotlight";
import { SquadLinks } from "@/components/site/SquadLinks";
import { coreTeam, faculty, personId, squadPages } from "@/lib/site";

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

const officeBearers = coreTeam.find((s) => s.title === "Office Bearers");

function Team() {
  useHashSpotlight();
  const squads = squadPages();
  return (
    <>
      <PageIntro label="TEAM / CREW" title="The people keeping it running." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-black md:text-3xl">Department and faculty</h2>
        <ul
          className="mt-5 grid gap-6 sm:grid-cols-2"
          data-robo-quiet
          data-robo-avoid
          data-robo-say="faculty"
        >
          {faculty.map((c) => (
            <li
              key={c.name}
              id={personId(c.name)}
              className="flex scroll-mt-28 border-2 border-border bg-card shadow-hard"
            >
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
            <ul
              className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-3xl"
              data-robo-quiet
              data-robo-avoid
              data-robo-say="office"
            >
              {officeBearers.members.map((m, i) => (
                <li key={m.name} id={personId(m.name)} className="scroll-mt-28">
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
        {/* One link per squad. Each opens with its own animated jump into the squad page. */}
        <div className="mt-6">
          <SquadLinks squads={squads} />
        </div>
      </section>
    </>
  );
}
