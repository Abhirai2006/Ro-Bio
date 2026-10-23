import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Pending, Uptime } from "@/components/site/parts";
import { site } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    links: [canonical("/about")],
    meta: [
      { title: "About RO-BIO | Biomedical and Robotic Engineering club" },
      { name: "description", content: "Who RO-BIO is: the student club of Biomedical and Robotic Engineering at MUSE, Mysuru, since 20 May 2026." },
      { property: "og:title", content: "About RO-BIO" },
      { property: "og:description", content: "The student club of Biomedical and Robotic Engineering at MUSE, Mysuru." },
    ],
  }),
  component: About,
});

const loops = [
  { title: "A robot", steps: ["Sensor", "Controller", "Actuator"] },
  { title: "A body", steps: ["Senses", "Brain", "Muscle"] },
];

function About() {
  return (
    <>
      <PageIntro label="ABOUT / WHO WE ARE" title="One branch. Two kinds of machine.">
        RO-BIO is the club of the {site.branch} branch at {site.college}. We started on 20 May 2026 and we're about{" "}
        {site.memberCount} people right now.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-black md:text-3xl">Sense, decide, act, feed back.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Our branch studies both. A servo and a muscle solve the same kind of problem, so we put them side by side.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {loops.map((l) => (
            <div key={l.title} className="border-2 border-border bg-card p-6 shadow-hard">
              <p className="font-pixel text-xs text-primary">{l.title.toUpperCase()}</p>
              <ol className="mt-4 flex flex-wrap items-center gap-2 font-display font-bold">
                {l.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="border-2 border-border bg-secondary px-3 py-2">{s}</span>
                    <span aria-hidden="true" className="text-primary">
                      {i < l.steps.length - 1 ? "→" : "↺"}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">The last step loops back to the first. That's the feedback.</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        <div className="border-2 border-border p-5">
          <p className="font-pixel text-[11px] text-primary">STARTED</p>
          <p className="mt-1 font-display text-2xl font-bold">20 May 2026</p>
        </div>
        <div className="border-2 border-border p-5">
          <p className="font-pixel text-[11px] text-primary">UPTIME</p>
          <p className="mt-1 font-display text-2xl font-bold">
            <Uptime />
          </p>
        </div>
        <div className="border-2 border-border p-5">
          <p className="font-pixel text-[11px] text-primary">FACULTY COORDINATOR</p>
          <p className="mt-1 font-display text-2xl font-bold">Archana G</p>
        </div>
      </section>
      <section className="mx-auto mt-12 max-w-6xl px-4">
        <Pending title="Our story, in our own words">
          The club is writing this part. Until then we'd rather leave a gap than make something up.
        </Pending>
      </section>
    </>
  );
}
