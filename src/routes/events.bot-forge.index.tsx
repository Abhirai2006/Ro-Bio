import { createFileRoute, Link } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { VenueMap } from "@/components/site/VenueMap";
import {
  ContestCards,
  Coordinators,
  DraftNote,
  MechCorners,
  PrizeBanner,
  RegisterButton,
  Schedule,
  SectionHead,
  plainBtn,
  useRegState,
} from "@/components/site/BotForge";
import { generalRules } from "@/lib/bot-forge";
import { address, canonical } from "@/lib/seo";
import { botForge, botForgeInfo, botForgePrizeTotal, eventDate, rupees, site } from "@/lib/site";

const e = botForge;
const description = `Bot Forge by RO-BIO, ${eventDate(e)} at ${site.college}: ${botForgeInfo.contests.map((c) => c.title).join(", ")}. ${rupees(botForgePrizeTotal)} in cash prizes. Open to ${botForgeInfo.openTo}.`;

export const Route = createFileRoute("/events/bot-forge/")({
  head: () => ({
    links: [canonical("/events/bot-forge")],
    meta: [
      { title: `Bot Forge, ${eventDate(e)} | RO-BIO` },
      { name: "description", content: description },
      { property: "og:title", content: `Bot Forge: ${rupees(botForgePrizeTotal)} in cash prizes` },
      { property: "og:description", content: description },
      { property: "og:image", content: `${site.url}/events/bot-forge.jpg` },
      { property: "og:image:secure_url", content: `${site.url}/events/bot-forge.jpg` },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "604" },
      { property: "og:image:height", content: "1024" },
      { property: "og:image:alt", content: "The Bot Forge poster" },
      { name: "twitter:image", content: `${site.url}/events/bot-forge.jpg` },
    ],
  }),
  component: BotForgePage,
});

const STEPS: [string, string][] = [
  [
    "Form your team",
    `${botForgeInfo.contests.map((c) => `${c.team[0]} to ${c.team[1]} for ${c.title}`).join(", ")}. Each student in one team only.`,
  ],
  [
    "Fill in the form",
    "Pick your contest, add every member, and ask for a club kit if you want one.",
  ],
  ["Pay the fee", `${rupees(botForgeInfo.fee)} per team by UPI. It is not refundable.`],
  [
    "Send the UTR",
    "Type the UPI transaction number from your payment app. We check it and mark your team paid.",
  ],
];

function BotForgePage() {
  const state = useRegState();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.title,
          description,
          startDate: `${e.date}T11:00:00+05:30`,
          endDate: `${e.date}T17:30:00+05:30`,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: site.college, address },
          organizer: { "@type": "Organization", name: "RO-BIO", url: site.url },
          url: `${site.url}/events/bot-forge`,
          image: `${site.url}/events/bot-forge.jpg`,
          offers: {
            "@type": "Offer",
            price: botForgeInfo.fee,
            priceCurrency: "INR",
            url: `${site.url}/events/bot-forge/register`,
            validFrom: e.opensAt,
          },
          subEvent: botForgeInfo.contests.map((c) => ({
            "@type": "Event",
            name: c.title,
            startDate: `${e.date}T14:00:00+05:30`,
            url: `${site.url}/events/bot-forge/${c.slug}`,
          })),
        }}
      />
      <section className="blueprint relative overflow-hidden border-b-2 border-border">
        <MechCorners />
        <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-4 pb-14 pt-14 md:grid-cols-[1.5fr_1fr] md:pt-20">
          <div>
            <p className="font-pixel text-xs text-primary">COMPETITION / RO-BIO HUB PRESENTS</p>
            <div className="mt-3 flex items-center gap-4">
              <img
                src={botForgeInfo.art.crest}
                alt=""
                width={600}
                height={584}
                className="h-20 w-auto md:h-28"
              />
              <h1 className="text-5xl font-black leading-[1.05] md:text-7xl">Bot Forge</h1>
            </div>
            <p className="mt-4 font-display text-2xl font-bold text-primary">{eventDate(e)}</p>
            <p className="mt-1 font-mono text-base">{e.time}</p>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">
              RO-BIO's first robotics competition, at {site.college}. Open to {botForgeInfo.openTo}.
            </p>
            <div className="mt-8">
              <PrizeBanner />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <RegisterButton />
              <a href="#contests" className={plainBtn}>
                See the contests
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {state === "coming-soon"
                ? `Registration opens ${botForgeInfo.opensLabel} and closes ${botForgeInfo.closesLabel}.`
                : state === "open"
                  ? `Registration is open until ${botForgeInfo.closesLabel}.`
                  : "Registration is closed."}{" "}
              {rupees(botForgeInfo.fee)} per team.
            </p>
          </div>
          <figure className="border-2 border-border bg-card p-2 shadow-hard-violet">
            <img
              src={e.poster}
              alt={`The Bot Forge poster: ${eventDate(e)} at ${site.college}. Robo Sumo, Robo Race and Shark Tank, with a QR code to sign up.`}
              width={604}
              height={1024}
              className="block h-auto w-full"
            />
          </figure>
        </div>
      </section>

      <section
        id="contests"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16"
        aria-labelledby="contests-h"
      >
        <SectionHead label="PICK ONE" id="contests-h">
          {botForgeInfo.contests.length} contests, {rupees(botForgePrizeTotal)} to win
        </SectionHead>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Each team enters one contest. Open a contest for its full rules.
        </p>
        <div className="mt-8">
          <ContestCards />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="day-h">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionHead label="ON THE DAY" id="day-h">
              {eventDate(e)}
            </SectionHead>
            <div className="mt-6">
              <Schedule />
            </div>
          </div>
          <div className="border-2 border-border bg-lens p-6 text-ink md:mt-16">
            <p className="font-pixel text-xs">
              TECH EXPO, {botForgeInfo.techExpo.time.toUpperCase()}
            </p>
            <h3 className="mt-2 text-2xl font-black">Senior students' projects, on show</h3>
            <p className="mt-3">{botForgeInfo.techExpo.about}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="how-h">
        <SectionHead label="HOW TO ENTER" id="how-h">
          Register your team in four steps
        </SectionHead>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-2 border-border bg-card p-4 shadow-hard">
              <span className="font-pixel text-[11px] text-primary">STEP {i + 1}</span>
              <p className="mt-1 font-display text-lg font-bold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <RegisterButton />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="rules-h">
        <SectionHead label="FOR EVERY CONTEST" id="rules-h">
          The rules everyone follows
        </SectionHead>
        <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <ul className="list-disc space-y-2 border-2 border-border bg-card p-5 pl-10 shadow-hard">
            {generalRules().map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="space-y-6">
            <DraftNote />
            <p className="text-muted-foreground">
              Each contest has its own rules:{" "}
              {botForgeInfo.contests.map((c, i) => (
                <span key={c.slug}>
                  {i ? (i === botForgeInfo.contests.length - 1 ? " and " : ", ") : ""}
                  <Link
                    to="/events/bot-forge/$contest"
                    params={{ contest: c.slug }}
                    className="font-bold text-primary underline underline-offset-2"
                  >
                    {c.title}
                  </Link>
                </span>
              ))}
              .
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-16 md:grid-cols-[1.4fr_1fr]">
        <VenueMap />
        <aside className="grid gap-6">
          <Coordinators />
          <Link to="/events" className="inline-block font-bold underline">
            All events
          </Link>
        </aside>
      </section>
    </>
  );
}
