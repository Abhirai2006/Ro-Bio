import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { MemberCard } from "@/components/site/TeamCards";
import { useHashSpotlight } from "@/components/site/use-hash-spotlight";
import { SquadArt } from "@/components/site/SquadArt";
import { SquadLinks } from "@/components/site/SquadLinks";
import { personId, site, squadArtPending, squadPages } from "@/lib/site";

// /team/technical and the other squad pages. The underscore keeps this page separate from /team.
export const Route = createFileRoute("/team_/$squad")({
  loader: ({ params }) => {
    const squad = squadPages().find((s) => s.slug === params.squad);
    if (!squad) throw notFound();
    return { squad };
  },
  head: ({ loaderData }) => {
    const sq = loaderData?.squad;
    if (!sq)
      return {
        meta: [{ title: "Squad not found | RO-BIO" }, { name: "robots", content: "noindex" }],
      };
    const desc = `${sq.title} squad of RO-BIO: ${sq.about} ${sq.members.length} members.`;
    const pending = squadArtPending.includes(sq.slug);
    const art = pending ? `${site.url}/og-image.png` : `${site.url}/team/art/${sq.slug}-1600.webp`;
    return {
      links: [canonical(`/team/${sq.slug}`)],
      meta: [
        { title: `${sq.title} squad | RO-BIO` },
        { name: "description", content: desc },
        { property: "og:title", content: `${sq.title} squad | RO-BIO` },
        { property: "og:description", content: desc },
        { property: "og:image", content: art },
        { property: "og:image:width", content: pending ? "1200" : "1600" },
        { property: "og:image:height", content: pending ? "630" : "900" },
        { name: "twitter:image", content: art },
      ],
    };
  },
  component: SquadPage,
});

function SquadPage() {
  const { squad } = Route.useLoaderData();
  useHashSpotlight();
  const others = squadPages().filter((s) => s.slug !== squad.slug);
  const members = [...squad.members].sort((a, b) => Number(!!b.head) - Number(!!a.head));
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <Link to="/team" viewTransition className="font-pixel text-xs text-primary hover:underline">
          ← ALL SQUADS
        </Link>
        {squadArtPending.includes(squad.slug) ? (
          <div className="mt-4 grid aspect-[16/9] place-items-center border-2 border-dashed border-border bg-muted p-6 text-center shadow-hard">
            <div>
              <p className="font-pixel text-[11px] text-primary">
                ARTWORK IN PROGRESS<span className="blink">_</span>
              </p>
              <p className="mt-2 text-xl font-bold md:text-2xl">
                The {squad.title} squad is drawing this one.
              </p>
            </div>
          </div>
        ) : (
          <SquadArt
            key={squad.slug}
            slug={squad.slug}
            priority
            className="mt-4 border-2 border-border shadow-hard"
          />
        )}
        <div className="team-rise mt-8 max-w-3xl">
          <h1 className="text-4xl font-black leading-[1.05] md:text-6xl">{squad.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{squad.about}</p>
          <p className="mt-2 font-mono text-sm">{squad.members.length} members</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-label={`${squad.title} members`}>
        <ul
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          data-robo-quiet
          data-robo-avoid
          data-robo-say={`members:${squad.slug}`}
        >
          {members.map((m, i) => (
            <li key={m.name + m.sem} id={personId(m.name)} className="scroll-mt-28">
              <MemberCard member={m} index={i} squadTitle={squad.title} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-2xl font-black">The other squads</h2>
        <div className="mt-5">
          <SquadLinks squads={others} compact />
        </div>
      </section>
    </>
  );
}
