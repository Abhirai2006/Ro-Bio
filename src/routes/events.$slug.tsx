import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { address, canonical } from "@/lib/seo";
import { PageIntro, Window } from "@/components/site/parts";
import { contacts, events, formatDate, site } from "@/lib/site";

export const Route = createFileRoute("/events/$slug")({
  loader: ({ params }) => {
    const event = events.find((e) => e.slug === params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Event not found | RO-BIO" }, { name: "robots", content: "noindex" }] };
    const desc = `${e.title} by RO-BIO on ${formatDate(e.date)} at ${site.college}. ${e.activities.map((a) => a.name).join(", ")}.`;
    return {
      links: [canonical(`/events/${e.slug}`)],
      meta: [
        { title: `${e.title}, ${formatDate(e.date)} | RO-BIO` },
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
      <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "Event", name: e.title,
          description: `${e.title} by RO-BIO at ${site.college}. ${e.activities.map((a) => a.name).join(", ")}.`,
          startDate: e.date,
          ...(e.previousDates?.length ? { previousStartDate: e.previousDates, eventStatus: "https://schema.org/EventRescheduled" } : { eventStatus: "https://schema.org/EventScheduled" }),
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: site.college, address },
          organizer: { "@type": "Organization", name: "RO-BIO", url: site.url },
          url: `${site.url}/events/${e.slug}`, image: `${site.url}/og-image.png`,
          subEvent: e.activities.map((a) => ({ "@type": "Event", name: a.name, startDate: e.date })),
        }}
      />
      <PageIntro label={`${e.kind.toUpperCase()} / ROBIO HUB PRESENTS`} title={e.title}>
        <span className="font-display text-2xl font-bold text-primary">{formatDate(e.date)}</span>
        {e.previousDates?.length ? (
          <span className="mt-1 block text-base">
            Rescheduled. It was set for {e.previousDates.map(formatDate).join(", then ")}. Start time to be announced.
          </span>
        ) : null}
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-black">Activities</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {e.activities.map((a) => (
              <li key={a.name}>
                <Window tag={a.tag} title={a.name}>
                  <p className="mt-1 text-sm text-muted-foreground">Rules and details coming soon.</p>
                </Window>
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-6">
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
          <div className="border-2 border-border p-5">
            <p className="font-pixel text-[11px] text-primary">VENUE</p>
            <p className="mt-2">{e.venue}</p>
            <a href={site.mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-primary underline">
              Open in Maps
            </a>
          </div>
          <div className="border-2 border-border p-5">
            <p className="font-pixel text-[11px] text-primary">COORDINATORS</p>
            <ul className="mt-2 space-y-2">
              {contacts.map((c) => (
                <li key={c.name}>
                  <span className="font-bold">{c.name}</span> <span className="text-sm text-muted-foreground">({c.role})</span>
                  <br />
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
