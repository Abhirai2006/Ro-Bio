import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Window } from "@/components/site/parts";
import { eventDate, events } from "@/lib/site";

export const Route = createFileRoute("/events/")({
  head: () => ({
    links: [canonical("/events")],
    meta: [
      { title: "Events | RO-BIO" },
      { name: "description", content: `RO-BIO events at Mysore University School of Engineering. ${events[0]!.title}: ${eventDate(events[0]!).toLowerCase()}.` },
      { property: "og:title", content: "Events | RO-BIO" },
      { property: "og:description", content: "Bot Forge and other RO-BIO events." },
    ],
  }),
  component: Events,
});

function Events() {
  return (
    <>
      <PageIntro label="EVENTS / UPCOMING" title="What's coming up." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <ul className="grid gap-6 md:grid-cols-3">
          {events.map((e) => (
            <li key={e.slug} className="md:col-span-2">
              <Window tag={e.kind.toUpperCase()} className="h-full">
                <h2 className="text-3xl font-black italic">{e.title}</h2>
                <p className="mt-2 font-display text-lg font-bold text-primary">{eventDate(e)}</p>
                <p className="mt-3 text-sm">{e.activities.map((a) => a.name).join(" · ")}</p>
                <Link
                  to="/events/$slug"
                  params={{ slug: e.slug }}
                  className="mt-5 inline-block border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground"
                >
                  Details
                </Link>
              </Window>
            </li>
          ))}
          <li className="border-2 border-dashed border-border bg-muted p-5">
            <h2 className="text-2xl font-black">Past events</h2>
            <p className="mt-2 text-muted-foreground">Nothing in the archive yet. Recaps and photos land here after each event.</p>
          </li>
        </ul>
      </section>
    </>
  );
}
