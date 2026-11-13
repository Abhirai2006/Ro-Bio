import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { address, canonical } from "@/lib/seo";
import { PageIntro, Window } from "@/components/site/parts";
import { VenueMap } from "@/components/site/VenueMap";
import { contacts, eventDate, events, site, type ClubEvent } from "@/lib/site";
import { writeUpOf } from "@/lib/blog";

/** The college address gets the full map; any other venue gets its name and a Maps search, never a guessed pin. */
const atCollege = (e: ClubEvent) => e.venue === site.address;

export const Route = createFileRoute("/events/$slug")({
  loader: ({ params }) => {
    const event = events.find((e) => e.slug === params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e)
      return {
        meta: [{ title: "Event not found | RO-BIO" }, { name: "robots", content: "noindex" }],
      };
    const desc =
      e.about ??
      `${e.title} by RO-BIO at ${site.college}. ${eventDate(e)}. ${e.activities.map((a) => a.name).join(", ")}.`;
    const poster = e.poster
      ? [
          { property: "og:image", content: `${site.url}${e.poster}` },
          { property: "og:image:secure_url", content: `${site.url}${e.poster}` },
          { property: "og:image:type", content: "image/jpeg" },
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "1600" },
          { property: "og:image:alt", content: `The ${e.title} poster` },
          { name: "twitter:image", content: `${site.url}${e.poster}` },
        ]
      : [];
    return {
      links: [canonical(`/events/${e.slug}`)],
      meta: [
        { title: e.date ? `${e.title}, ${eventDate(e)} | RO-BIO` : `${e.title} | RO-BIO` },
        { name: "description", content: desc },
        { property: "og:title", content: `${e.title} | RO-BIO` },
        { property: "og:description", content: desc },
        ...poster,
      ],
    };
  },
  component: EventPage,
});

function EventPage() {
  const { event: e } = Route.useLoaderData();
  const place = atCollege(e)
    ? { "@type": "Place", name: site.college, address }
    : {
        "@type": "Place",
        name: e.venue,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mysuru",
          addressRegion: "Karnataka",
          addressCountry: "IN",
        },
      };
  return (
    <>
      {/* Google only accepts Event data with a date, so it waits until the date is fixed. */}
      {e.date && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Event",
            name: e.title,
            description:
              e.about ??
              `${e.title} by RO-BIO at ${site.college}. ${e.activities.map((a) => a.name).join(", ")}.`,
            startDate: e.date,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: place,
            organizer: { "@type": "Organization", name: "RO-BIO", url: site.url },
            url: `${site.url}/events/${e.slug}`,
            image: `${site.url}${e.poster ?? "/og-image.png"}`,
            subEvent: e.activities.map((a) => ({
              "@type": "Event",
              name: a.name,
              startDate: e.date,
            })),
          }}
        />
      )}
      <PageIntro label={`${e.kind.toUpperCase()} / RO-BIO HUB PRESENTS`} title={e.title}>
        <span className="font-display text-2xl font-bold text-primary">{eventDate(e)}</span>
        {e.date && (
          <span className="mt-1 block font-mono text-base">
            {e.time ?? "Start time to be announced."}
          </span>
        )}
        {e.audience && (
          <span className="mt-1 block text-base">
            For {e.audience.charAt(0).toLowerCase() + e.audience.slice(1)}.
          </span>
        )}
      </PageIntro>
      <section
        className={`mx-auto max-w-6xl px-4 pt-14 ${e.poster ? "grid items-start gap-8 md:grid-cols-[2fr_1fr]" : ""}`}
      >
        <div>
          {e.about && <p className="max-w-2xl text-lg">{e.about}</p>}
          {e.slug === "robo-spark" && (
            <div className="mt-6 flex flex-wrap gap-3">
              {writeUpOf(e.slug) && (
                <Link
                  to="/blog/$slug"
                  params={{ slug: writeUpOf(e.slug)!.slug }}
                  className="border-2 border-border bg-ink px-4 py-2 font-bold text-paper shadow-hard"
                >
                  Read the write-up
                </Link>
              )}
              <Link
                to="/certificates"
                className="border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard"
              >
                Get your certificate
              </Link>
              <Link
                to="/events/robo-spark/present"
                className="border-2 border-border bg-card px-4 py-2 font-bold shadow-hard"
              >
                Open the presentation
              </Link>
              <Link
                to="/events/robo-spark/missions"
                className="border-2 border-border bg-card px-4 py-2 font-bold shadow-hard"
              >
                Missions and judging guide
              </Link>
              <Link
                to="/events/robo-spark/judge"
                className="border-2 border-border bg-card px-4 py-2 font-bold shadow-hard"
              >
                Judge scoring
              </Link>
            </div>
          )}
          <h2 className={`text-2xl font-black ${e.about ? "mt-8" : ""}`}>
            {e.poster ? "What happens" : "Activities"}
          </h2>
          <ul className={`mt-5 grid gap-4 ${e.poster ? "" : "sm:grid-cols-2"}`}>
            {e.activities.map((a) => (
              <li key={a.name}>
                <Window tag={a.tag} title={a.name} className="h-full">
                  {a.tag === "EVENT" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rules and details coming soon.
                    </p>
                  )}
                </Window>
              </li>
            ))}
          </ul>
        </div>
        {e.poster && (
          <figure className="border-2 border-border bg-card p-2 shadow-hard-violet">
            <img
              src={e.poster}
              alt={`The ${e.title} poster: ${e.kind.toLowerCase()}, ${eventDate(e)}${e.time ? `, ${e.time}` : ""}`}
              width={1200}
              height={1600}
              className="block h-auto w-full"
            />
          </figure>
        )}
      </section>
      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
        {atCollege(e) ? (
          <VenueMap />
        ) : (
          <div className="border-2 border-border bg-card p-5 shadow-hard">
            <p className="font-pixel text-[11px] text-primary">VENUE</p>
            <p className="mt-2 font-display text-xl font-bold">{e.venue}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block border-2 border-border bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
            >
              Find it on Google Maps
            </a>
          </div>
        )}
        <aside className="grid gap-6">
          {e.registration !== "none" && (
            <div className="border-2 border-border bg-ink p-5 text-paper shadow-hard-violet">
              <p className="font-pixel text-[11px] text-lilac">REGISTRATION</p>
              <p className="mt-2 font-display text-xl font-bold">
                {e.registration === "open"
                  ? "Open"
                  : e.registration === "closed"
                    ? "Closed"
                    : "Coming soon"}
              </p>
              <p className="mt-2 text-sm opacity-80">
                Team size, deadline and rules aren't final yet. {e.title} is for students of our
                college. Keep an eye on{" "}
                <a
                  href={site.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lens underline"
                >
                  {site.instagramHandle}
                </a>
                .
              </p>
            </div>
          )}
          <div className="border-2 border-border bg-card p-5 shadow-hard">
            <p className="font-pixel text-[11px] text-primary">CLUB COORDINATORS</p>
            <ul className="mt-3 space-y-3">
              {contacts.map((c) => (
                <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    <span className="font-bold">{c.name}</span>{" "}
                    <span className="text-sm text-muted-foreground">({c.role})</span>
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
