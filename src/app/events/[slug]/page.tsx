import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/config/site";
import { EVENTS, getEvent, formatDate } from "@/lib/events";

export const dynamicParams = false;
export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = getEvent((await params).slug);
  if (!e) return {};
  return {
    title: e.title,
    description: `${e.title} at ${SITE.parent} on ${formatDate(e.startsOn)}.`,
    alternates: { canonical: `/events/${e.slug}` },
  };
}

export default async function EventPage({ params }: Props) {
  const e = getEvent((await params).slug);
  if (!e) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: e.startsOn,
    ...(e.previousStartsOn
      ? { previousStartDate: e.previousStartsOn, eventStatus: "https://schema.org/EventRescheduled" }
      : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: SITE.parent,
      address: { "@type": "PostalAddress", streetAddress: "Manasa Gangotri Campus", addressLocality: "Mysuru", addressRegion: "Karnataka", postalCode: "570006", addressCountry: "IN" },
    },
    organizer: { "@type": "Organization", name: SITE.name, url: SITE.baseUrl },
    isAccessibleForFree: true,
  };
  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h1>{e.title}</h1>
      <p><strong>{formatDate(e.startsOn, true)}</strong>. Moved from {formatDate(e.previousStartsOn!)}.</p>
      <p>{e.venue}</p>

      <section aria-labelledby="reg">
        <div className="win soon">
          <div className="tab"><span>REGISTRATION</span><span aria-hidden="true">x</span></div>
          <div className="body">
            <h2 id="reg">Registration details coming soon</h2>
            <p>The rules and the sign-up form are not out yet. We will post them here and on <a href={SITE.instagram}>Instagram</a>.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="acts">
        <h2 id="acts">What is on</h2>
        <div className="grid">
          {e.activities.map((a) => (
            <div className="win" key={a.slug}>
              <div className="tab"><span>{a.kind}</span><span aria-hidden="true">x</span></div>
              <div className="body"><h3>{a.title}</h3></div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="who">
        <h2 id="who">Who to ask</h2>
        <ul>
          {e.contacts.map((c) => (
            <li key={c.phone}>{c.name}, {c.role}: <a href={`tel:+91${c.phone}`}>{c.phone}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
