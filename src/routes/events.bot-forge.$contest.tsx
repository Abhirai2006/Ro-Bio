import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Coordinators,
  DraftNote,
  PrizePair,
  RegisterButton,
  RuleBlock,
  SectionHead,
  ContestArt,
} from "@/components/site/BotForge";
import { SharkBurst } from "@/components/site/SharkBurst";
import { contestRules, generalRules, isContest } from "@/lib/bot-forge";
import { canonical } from "@/lib/seo";
import { botForge, botForgeInfo, contestBySlug, eventDate, rupees, site } from "@/lib/site";

export const Route = createFileRoute("/events/bot-forge/$contest")({
  loader: ({ params }) => {
    if (!isContest(params.contest)) throw notFound();
    return { contest: contestBySlug(params.contest)! };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.contest;
    if (!c)
      return {
        meta: [{ title: "Not found | RO-BIO" }, { name: "robots", content: "noindex" }],
      };
    const desc = `${c.title} at Bot Forge, ${eventDate(botForge)}, ${site.college}. ${c.pitch} ${rupees(c.prizes[0])} for first place and ${rupees(c.prizes[1])} for second. Teams of ${c.team[0]} to ${c.team[1]}.`;
    return {
      links: [canonical(`/events/bot-forge/${c.slug}`)],
      meta: [
        { title: `${c.title} rules, Bot Forge | RO-BIO` },
        { name: "description", content: desc },
        { property: "og:title", content: `${c.title} at Bot Forge | RO-BIO` },
        { property: "og:description", content: desc },
        { property: "og:image", content: `${site.url}/events/bot-forge.jpg` },
      ],
    };
  },
  component: ContestPage,
});

function ContestPage() {
  const { contest: c } = Route.useLoaderData();
  const others = botForgeInfo.contests.filter((o) => o.slug !== c.slug);
  const isShark = c.slug === "shark-tank";
  return (
    <>
      {isShark ? (
        <SharkBurst />
      ) : (
        <section className="blueprint border-b-2 border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-14 md:grid-cols-[1.2fr_1fr] md:pt-20">
            <div>
              <p className="font-pixel text-xs text-primary">
                <Link to="/events/bot-forge" className="underline underline-offset-2">
                  BOT FORGE
                </Link>{" "}
                / CONTEST
              </p>
              <h1 className="mt-3 text-5xl font-black leading-[1.05] md:text-7xl">{c.title}</h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">{c.pitch}</p>
              <div className="mt-6">
                <PrizePair c={c} />
              </div>
            </div>
            <ContestArt
              slug={c.slug}
              className="aspect-[4/3] border-2 border-border shadow-hard-violet"
            />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-12" aria-label="Key facts">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="WHEN">
            {eventDate(botForge)}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {isShark
                ? "Come at 2 pm. The evaluation starts then."
                : "Build after the inauguration at 11 am. Matches from 2 pm."}
            </span>
          </Fact>
          <Fact label="TEAM">
            {c.team[0]} to {c.team[1]} members
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              Each student in one team only.
            </span>
          </Fact>
          <Fact label="ENTRY FEE">
            {rupees(botForgeInfo.fee)} per team
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              By UPI when you register. Not refundable.
            </span>
          </Fact>
          <Fact label={c.kits ? "CLUB KITS" : "BRING"}>
            {c.kits ? `${c.kits} kits, first come first served` : "Your PPT, on a pen drive"}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {c.kits
                ? "Ask for one on the form. Everyone else brings their own parts."
                : "With a PDF copy in case."}
            </span>
          </Fact>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <RegisterButton contest={c.slug} />
          <span className="text-sm text-muted-foreground">
            Register by {botForgeInfo.closesLabel}.
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="rules-h">
        <SectionHead label={`${c.title.toUpperCase()} RULES`} id="rules-h">
          How {c.title} works
        </SectionHead>
        <div className="mt-6">
          <DraftNote />
        </div>
        <div className="mt-6">
          <RuleBlock sections={contestRules(c.slug)} />
        </div>
      </section>

      {isShark && (
        <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="judge-h">
          <SectionHead label="THE JUDGE" id="judge-h">
            {botForgeInfo.judge.name}
          </SectionHead>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {botForgeInfo.judge.points.map((p) => (
              <li key={p} className="border-2 border-border bg-card p-4 shadow-hard">
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="general-h">
        <SectionHead label="FOR EVERY CONTEST" id="general-h">
          The rules everyone follows
        </SectionHead>
        <ul className="mt-6 list-disc space-y-2 border-2 border-border bg-card p-5 pl-10 shadow-hard">
          {generalRules().map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-16 md:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHead label="ALSO AT BOT FORGE" id="others-h">
            The other contests
          </SectionHead>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.slug} className="border-2 border-border bg-card p-4 shadow-hard">
                <Link
                  to="/events/bot-forge/$contest"
                  params={{ contest: o.slug }}
                  className="font-display text-xl font-black text-primary underline underline-offset-4"
                >
                  {o.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{o.pitch}</p>
                <p className="mt-2 font-bold">
                  {rupees(o.prizes[0])} + {rupees(o.prizes[1])}
                </p>
              </li>
            ))}
          </ul>
          <Link to="/events/bot-forge" className="mt-6 inline-block font-bold underline">
            Back to Bot Forge
          </Link>
        </div>
        <Coordinators />
      </section>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-border bg-card p-4 shadow-hard">
      <p className="font-pixel text-[10px] text-primary">{label}</p>
      <div className="mt-2 font-bold leading-snug">{children}</div>
    </div>
  );
}
