import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { QrCode } from "@/components/site/QrCode";
import { contacts, events, formatDate, qrLink, site, whyJoin } from "@/lib/site";

const desc = `How to join RO-BIO, the ${site.branch} club at ${site.college}, Mysuru. Why people join, who to talk to, and a QR code to share.`;

export const Route = createFileRoute("/join")({
  head: () => ({
    links: [canonical("/join")],
    meta: [
      { title: "Join RO-BIO | Biomedical and Robotic Engineering club" },
      { name: "description", content: desc },
      { property: "og:title", content: "Join RO-BIO" },
      { property: "og:description", content: "Come build with us. Robots, sensors and the human body, at MUSE Mysuru." },
    ],
  }),
  component: Join,
});

function Join() {
  const next = events[0]!;
  const host = qrLink.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <>
      <PageIntro label="JOIN / COME BUILD WITH US" title="Want in? Good.">
        If you like taking things apart, wiring them back up, or working out how the body pulls off what it does, you'll fit in here.
      </PageIntro>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-2xl font-black md:text-3xl">Why people join</h2>
          <ol className="mt-6 space-y-4">
            {whyJoin.map((w, i) => (
              <li key={w.title} className="flex gap-4 border-2 border-border bg-card p-4 shadow-hard">
                <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-display text-lg font-bold">{w.title}</span>
                  <span className="mt-1 block text-muted-foreground">{w.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-6">
          <figure className="border-2 border-border bg-ink p-5 text-paper shadow-hard-violet">
            <p className="font-pixel text-[11px] text-lilac">SCAN TO OPEN THIS SITE</p>
            <div className="mt-4 bg-white p-2">
              <QrCode text={qrLink} label={`QR code that opens ${host}`} className="block h-auto w-full" />
            </div>
            <figcaption className="mt-3 break-all font-mono text-xs opacity-80">{host}</figcaption>
            <p className="mt-4 text-sm opacity-90">Show it on your phone, or print it for a notice board.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/qr/robio-qr-card.svg" download="robio-qr-poster.svg" className="border-2 border-paper bg-paper px-3 py-2 text-sm font-bold text-ink">
                Poster card
              </a>
              <a href="/qr/robio-qr.png" download="robio-qr.png" className="border-2 border-paper/60 px-3 py-2 text-sm font-bold">
                PNG
              </a>
              <a href="/qr/robio-qr.svg" download="robio-qr.svg" className="border-2 border-paper/60 px-3 py-2 text-sm font-bold">
                SVG
              </a>
            </div>
          </figure>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl font-black md:text-3xl">How to get in</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          There's no form yet. Message us on Instagram or call one of the coordinators, and they'll tell you what happens next.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a href={site.instagram} target="_blank" rel="noreferrer" className="border-2 border-border bg-lilac p-4 text-ink shadow-hard transition-transform hover:-translate-y-0.5">
            <span className="block font-pixel text-[10px]">QUICKEST</span>
            <span className="mt-1 block font-display text-lg font-bold">Instagram</span>
            <span className="block font-mono text-sm underline underline-offset-4">{site.instagramHandle}</span>
          </a>
          {contacts.map((c) => (
            <div key={c.name} className="border-2 border-border p-4">
              <span className="block text-xs text-muted-foreground">{c.role}</span>
              <span className="mt-1 block font-display text-lg font-bold">{c.name}</span>
              <a href={`tel:+91${c.phone}`} className="font-mono text-primary underline underline-offset-4">
                {c.phone}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-8 border-2 border-dashed border-border p-4">
          Next up:{" "}
          <Link to="/events/$slug" params={{ slug: next.slug }} className="font-bold underline underline-offset-4">
            {next.title}, {formatDate(next.date)}
          </Link>
          . It's for students of our college.
        </p>
      </section>
    </>
  );
}
