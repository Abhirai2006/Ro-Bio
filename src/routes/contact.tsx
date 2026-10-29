import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { VenueMap } from "@/components/site/VenueMap";
import { contacts, site } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    links: [canonical("/contact")],
    meta: [
      { title: "Contact | RO-BIO" },
      { name: "description", content: "Phone numbers, a venue map, Instagram and LinkedIn for RO-BIO at Mysore University School of Engineering, Manasa Gangotri." },
      { property: "og:title", content: "Contact RO-BIO" },
      { property: "og:description", content: "Call a coordinator, find us on the map, or follow us on Instagram and LinkedIn." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <PageIntro label="CONTACT / OPEN CHANNEL" title="Get in touch." />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
        <ul className="space-y-4">
          {contacts.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-4 border-2 border-border bg-card p-4 shadow-hard">
              <div>
                <p className="font-display text-lg font-bold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.role}</p>
              </div>
              <a href={`tel:+91${c.phone}`} className="border-2 border-border bg-primary px-3 py-2 font-mono text-primary-foreground">
                {c.phone}
              </a>
            </li>
          ))}
        </ul>
        <div className="space-y-6">
          <VenueMap />
          <div className="border-2 border-border bg-lilac p-5 text-ink">
            <p className="font-pixel text-[11px]">INSTAGRAM</p>
            <a href={site.instagram} target="_blank" rel="noreferrer" className="mt-2 block font-display text-2xl font-bold underline">
              {site.instagramHandle}
            </a>
          </div>
          <div className="border-2 border-border bg-card p-5">
            <p className="font-pixel text-[11px] text-primary">LINKEDIN</p>
            <a href={site.linkedin} target="_blank" rel="noreferrer" className="mt-2 block font-display text-2xl font-bold underline">
              RO-BIO Hub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
