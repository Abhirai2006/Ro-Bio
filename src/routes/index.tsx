import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { SumoGame } from "@/components/site/SumoGame";
import { Typed } from "@/components/site/Typed";
import { LineFollower, RobotArm } from "@/components/site/RobotArm";
import { Uptime, Window, logoUrl, useToday } from "@/components/site/parts";
import { contacts, coreTeamSize, daysBetween, events, formatDate, shortDate, site } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [canonical("/")],
    meta: [
      { title: "RO-BIO | Biomedical and Robotic Engineering club, MUSE Mysuru" },
      {
        name: "description",
        content:
          `RO-BIO is the student club of Biomedical and Robotic Engineering at Mysore University School of Engineering. ${events[0]!.title} is on ${shortDate(events[0]!.date)}.`,
      },
      { property: "og:title", content: "RO-BIO | Unauthorised innovation in progress!" },
      {
        property: "og:description",
        content: "The student club of Biomedical and Robotic Engineering, Mysore University School of Engineering.",
      },
    ],
  }),
  component: Index,
});

function Hero() {
  const today = useToday();
  const next = events[0]!;
  const daysLeft = today ? daysBetween(today, next.date) : null;
  return (
    <section className="blueprint relative overflow-hidden border-b-2 border-border" aria-label="Intro">
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.05fr_1fr] md:py-20">
        <div>
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="RO-BIO logo" width={56} height={56} className="h-14 w-14 rounded-full border-2 border-border bg-paper object-cover shadow-hard" fetchPriority="high" />
            <p className="font-pixel text-[11px] leading-5 text-primary">
              {site.branch.toUpperCase()}
              <br />
              MUSE MYSURU
            </p>
          </div>
          <h1 className="mt-6 text-6xl font-black leading-[0.9] md:text-8xl">
            <span className="text-extrude italic">RO-BIO</span>
          </h1>
          <p className="mt-5 max-w-md text-xl font-semibold">
            Where circuits meet cells. Robots, sensors and the human body, built by students.
          </p>
          <p className="mt-4 inline-block hazard p-[3px]">
            <span className="block bg-paper px-3 py-1.5 font-pixel text-[11px] text-ink">⚠ {site.tagline.toUpperCase()}</span>
          </p>
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            At Bot Forge: <Typed words={next.activities.map((a) => a.name)} />
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/events/$slug" params={{ slug: next.slug }} className="rounded-full border-2 border-border bg-primary px-6 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5">
              {next.title}, {formatDate(next.date)}
            </Link>
            <Link to="/team" className="rounded-full border-2 border-border bg-card px-6 py-3 font-bold transition-transform hover:-translate-y-0.5">
              Meet the core team
            </Link>
          </div>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-2 font-mono text-[12px]">
            <div className="border-2 border-border bg-card p-2">
              <dt className="text-muted-foreground">T MINUS</dt>
              <dd className="text-lg font-bold">{daysLeft === null || daysLeft < 0 ? "..." : daysLeft === 0 ? "TODAY" : `${daysLeft}d`}</dd>
            </div>
            <div className="border-2 border-border bg-card p-2">
              <dt className="text-muted-foreground">MEMBERS</dt>
              <dd className="text-lg font-bold">{coreTeamSize}</dd>
            </div>
            <div className="border-2 border-border bg-card p-2">
              <dt className="text-muted-foreground">UPTIME</dt>
              <dd className="text-[11px] font-bold leading-tight"><Uptime /></dd>
            </div>
          </dl>
        </div>
        <div className="grid gap-6">
          <div data-robo-avoid data-thought="That arm solves inverse kinematics. Two joint angles, live.">
            <RobotArm />
            <p className="mt-3 text-sm text-muted-foreground">
              Aim with your mouse or finger, press to grip. Grab the sample vial and drop it in the tray. Joint angles are solved live with inverse kinematics.
            </p>
          </div>
        </div>
      </div>
      <LineFollower className="relative mx-auto -mb-1 h-16 w-full max-w-6xl px-4" />
    </section>
  );
}

function Index() {
  const next = events[0]!;
  return (
    <>
      <Hero />

      <section id="below" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <h2 className="text-3xl font-black leading-tight md:text-5xl">
            We're the students of {site.branch}, and this is our club.
          </h2>
          <p className="text-lg text-muted-foreground">
            RO-BIO started on 20 May 2026 at {site.college}. {coreTeamSize} of us so far. Most Saturdays, people
            from real companies come to campus and teach us things you don't get from a textbook.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4" aria-labelledby="next-event">
        <p className="font-pixel text-xs text-primary">NEXT ON THE BENCH</p>
        <div className="mt-4 grid gap-8 border-2 border-border bg-card p-6 shadow-hard-violet md:grid-cols-[1fr_1.2fr] md:p-10">
          <div>
            <h2 id="next-event" className="text-5xl font-black italic md:text-6xl">
              {next.title}
            </h2>
            <p className="mt-4 font-display text-2xl font-bold text-primary">{formatDate(next.date)}</p>
            <p className="mt-4 text-muted-foreground">{next.venue}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/events/$slug"
                params={{ slug: next.slug }}
                className="border-2 border-border bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5"
              >
                See Bot Forge
              </Link>
              <span className="border-2 border-dashed border-border px-4 py-3 font-pixel text-[11px] leading-6">
                REGISTRATION: COMING SOON
              </span>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 self-center">
            {next.activities.map((a, i) => (
              <li key={a.name} className={i === 2 ? "col-span-2" : ""}>
                <Window tag={a.tag}>
                  <p className="font-display font-extrabold">{a.name}</p>
                </Window>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4" aria-label="Robo Sumo game">
        <SumoGame />
      </section>

      <section className="mx-auto mt-20 grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        <div className="border-2 border-border bg-lens p-6 text-ink md:col-span-2">
          <p className="font-pixel text-xs">SATURDAYS AT RO-BIO</p>
          <h2 className="mt-2 text-3xl font-black">Real engineers, in our classroom.</h2>
          <p className="mt-3 max-w-xl">
            Most Saturdays, people from companies like L&amp;T come to campus to teach practical skills. The full list
            goes up here as we collect it.
          </p>
          <Link to="/workshops" className="mt-5 inline-block border-2 border-ink bg-paper px-4 py-2 font-bold">
            Workshops
          </Link>
        </div>
        <div className="border-2 border-border bg-lilac p-6 text-ink">
          <p className="font-pixel text-xs">SAY HI</p>
          <p className="mt-2 font-display text-xl font-extrabold">{site.instagramHandle}</p>
          <p className="mt-2 text-sm">Photos, event news and the odd blooper reel live on Instagram.</p>
          <a href={site.instagram} target="_blank" rel="noreferrer" className="mt-5 inline-block border-2 border-ink bg-paper px-4 py-2 font-bold">
            Open Instagram
          </a>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <p className="font-pixel text-xs text-primary">PEOPLE TO CALL</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {contacts.map((c) => (
            <li key={c.name} className="border-2 border-border p-4">
              <p className="text-xs text-muted-foreground">{c.role}</p>
              <p className="font-display text-lg font-bold">{c.name}</p>
              <a href={`tel:+91${c.phone}`} className="font-mono text-primary underline underline-offset-4">
                {c.phone}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
