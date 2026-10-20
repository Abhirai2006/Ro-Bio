import type { Metadata } from "next";
import { SITE } from "@/lib/config/site";
import { EVENTS } from "@/lib/events";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach RO-BIO and the Bot Forge coordinators.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  const bf = EVENTS[0];
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;
  return (
    <div className="wrap">
      <h1>Contact</h1>
      <p>The quickest way to reach us is a message on Instagram.</p>
      <p><a className="btn" href={SITE.instagram}>Message @ro_bio_hub</a></p>

      <section aria-labelledby="bf">
        <h2 id="bf">About {bf.title}</h2>
        <p>Call the coordinators.</p>
        <ul>
          {bf.contacts.map((c) => (
            <li key={c.phone}>{c.name}, {c.role}: <a href={`tel:+91${c.phone}`}>{c.phone}</a></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="where">
        <h2 id="where">Where we are</h2>
        <p>{SITE.address}</p>
        <p><a href={map}>Open in Google Maps</a></p>
      </section>
    </div>
  );
}
