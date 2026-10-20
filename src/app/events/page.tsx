import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, formatDate } from "@/lib/events";

export const metadata: Metadata = {
  title: "Events",
  description: "Events run by RO-BIO at Mysore University School of Engineering.",
  alternates: { canonical: "/events" },
};

export default function Events() {
  return (
    <div className="wrap">
      <h1>Events</h1>
      <div className="grid">
        {EVENTS.map((e) => (
          <article className="win" key={e.slug}>
            <div className="tab"><span>EVENT</span><span aria-hidden="true">x</span></div>
            <div className="body">
              <h2><Link href={`/events/${e.slug}`}>{e.title}</Link></h2>
              <p>{formatDate(e.startsOn, true)}</p>
              <p className="muted">Was {formatDate(e.previousStartsOn!)}.</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
