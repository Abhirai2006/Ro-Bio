import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Window, useToday } from "@/components/site/parts";
import { eventDate, events, pastEvents, todayInIndia, upcomingEvents, type ClubEvent } from "@/lib/site";

export const Route = createFileRoute("/events/")({
  head: () => ({
    links: [canonical("/events")],
    meta: [
      { title: "Events | RO-BIO" },
      { name: "description", content: `RO-BIO events at Mysore University School of Engineering: ${events.map((e) => `${e.title}, ${e.date ? eventDate(e) : "date coming soon"}`).join("; ")}.` },
      { property: "og:title", content: "Events | RO-BIO" },
      { property: "og:description", content: `${events.map((e) => e.title).join(", ")} and other RO-BIO events.` },
    ],
  }),
  component: Events,
});

function EventCard({ e, past }: { e: ClubEvent; past: boolean }) {
  return (
    <Window tag={past ? "PAST" : e.kind.toUpperCase()} className="h-full">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-black italic">{e.title}</h2>
          <p className="mt-2 font-display text-lg font-bold text-primary">{eventDate(e)}</p>
          {e.time && <p className="font-mono text-sm">{e.time}</p>}
          <p className="mt-3 text-sm">{e.activities.map((a) => a.name).join(" · ")}</p>
          {past && <p className="mt-2 text-sm text-muted-foreground">Recap and photos coming soon.</p>}
          <Link to="/events/$slug" params={{ slug: e.slug }} className="mt-5 inline-block border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground">
            Details
          </Link>
        </div>
        {e.poster && <img src={e.poster} alt="" width={1200} height={1600} loading="lazy" className="hidden h-auto w-28 shrink-0 self-start border-2 border-border sm:block" />}
      </div>
    </Window>
  );
}

function Events() {
  // Same "today" on the server and in the browser, so an event moves to Past events the morning after it ends.
  const today = useToday() ?? todayInIndia();
  const coming = upcomingEvents(today), done = pastEvents(today);
  return (
    <>
      <PageIntro label="EVENTS / UPCOMING" title="What's coming up." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <ul className="grid gap-6 md:grid-cols-2">
          {coming.map((e) => (
            <li key={e.slug}>
              <EventCard e={e} past={false} />
            </li>
          ))}
          {done.map((e) => (
            <li key={e.slug}>
              <EventCard e={e} past />
            </li>
          ))}
          {done.length === 0 && (
            // Spans the row when the cards above already fill it, so it never leaves half a row empty.
            <li className={`border-2 border-dashed border-border bg-muted p-5 ${coming.length % 2 === 0 ? "md:col-span-2" : ""}`}>
              <h2 className="text-2xl font-black">Past events</h2>
              <p className="mt-2 text-muted-foreground">Nothing in the archive yet. Recaps and photos land here after each event.</p>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}
