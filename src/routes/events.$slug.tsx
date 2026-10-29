import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { address, canonical } from "@/lib/seo";
import { PageIntro, Window } from "@/components/site/parts";
import { VenueMap } from "@/components/site/VenueMap";
import { contacts, eventDate, events, site } from "@/lib/site";

export const Route = createFileRoute("/events/$slug")({
  loader: ({ params }) => {
    const event = events.find((e) => e.slug === params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Event not found | RO-BIO" }, { name: "robots", content: "noindex" }] };
    const desc = `${e.title} by RO-BIO at ${site.college}. ${eventDate(e)}. ${e.activities.map((a) => a.name).join(", ")}.`;
    return {
      links: [canonical(`/events/${e.slug}`)],
      meta: [
        { title: e.date ? `${e.title}, ${eventDate(e)} | RO-BIO` : `${e.title} | RO-BIO` },
        { name: "description", content: desc },
        { property: "og:title", content: `${e.title} | RO-BIO` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: EventPage,
});

function EventPage() {
  const { event: e } = Route.useLoaderData();
  return (
    <>
      {/* Google only accepts Event data with a date, so it waits until the date is fixed. */}
      {e.date && <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "Event", name: e.title,
          description: `${e.title} by RO-BIO at ${site.college}. ${e.activities.map((a) => a.name).join(", ")}.`,
          startDate: e.date,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: site.college, address },
          organizer: { "@type": "Organization", name: "RO-BIO", url: site.url },
          url: `${site.url}/events/${e.slug}`, image: `${site.url}/og-image.png`,
          subEvent: e.activities.map((a) => ({ "@type": "Event", name: a.name, startDate: e.date })),
        }}
      />}
      <PageIntro label={`${e.kind.toUpperCase()} / RO-BIO HUB PRESENTS`} title={e.title}>
        <span className="font-display text-2xl font-bold text-primary">{eventDate(e)}</span>
        {e.date && <span className="mt-1 block text-base">Start time to be announced.</span>}
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-2xl font-black">Activities</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {e.activities.map((a) => (
            <li key={a.name}>
              <Window tag={a.tag} title={a.name} className="h-full">
                <p className="mt-1 text-sm text-muted-foreground">Rules and details coming soon.</p>
              </Window>
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
        <VenueMap />
        <aside className="grid gap-6">
          <div className="border-2 border-border bg-ink p-5 text-paper shadow-hard-violet">
            <p className="font-pixel text-[11px] text-lilac">REGISTRATION</p>
            <p className="mt-2 font-display text-xl font-bold">Coming soon</p>
            <p className="mt-2 text-sm opacity-80">
              Team size, deadline and rules aren't final yet. Bot Forge is for students of our college. Keep an eye on{" "}
              <a href={site.instagram} target="_blank" rel="noreferrer" className="text-lens underline">
                {site.instagramHandle}
              </a>
              .
            </p>
          </div>
          <div className="border-2 border-border bg-card p-5 shadow-hard">
            <p className="font-pixel text-[11px] text-primary">COORDINATORS</p>
            <ul className="mt-3 space-y-3">
              {contacts.map((c) => (
                <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    <span className="font-bold">{c.name}</span> <span className="text-sm text-muted-foreground">({c.role})</span>
                  </span>
                  <a href={`tel:+91${c.phone}`} className="font-mono text-primary underline">
                    {c.phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <Link to="/events" className="inline-block font-bold underline">
            All events
          </Link>
        </aside>
      </section>
    </>
  );
}
