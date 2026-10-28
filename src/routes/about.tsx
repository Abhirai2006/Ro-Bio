import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Pending, Uptime } from "@/components/site/parts";
import { site } from "@/lib/site";
import { FeedbackLoops, type Loop } from "@/components/site/FeedbackLoop";

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

const loops: Loop[] = [
  {
    title: "A robot",
    steps: [
      { stage: "Sense", part: "Sensor", what: "An IR sensor under a line follower sees where the black line is." },
      { stage: "Decide", part: "Controller", what: "The microcontroller works out how far off the line the robot has drifted." },
      { stage: "Act", part: "Motors", what: "One wheel speeds up, the other slows down, and the robot steers back." },
      { stage: "Feed back", part: "Sensor again", what: "The sensor reads the new position. Smaller error, smaller correction. Round it goes." },
    ],
  },
  {
    title: "A body",
    steps: [
      { stage: "Sense", part: "Eyes", what: "You see the cup in your hand starting to slip." },
      { stage: "Decide", part: "Brain", what: "The brain decides to grip harder, in a fraction of a second." },
      { stage: "Act", part: "Muscles", what: "The muscles in your hand and forearm tighten." },
      { stage: "Feed back", part: "Nerves", what: "Touch and stretch receptors report the new grip, so the brain can ease off once the cup is steady." },
    ],
  },
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
          Our branch studies both. A line-following robot and a hand holding a cup solve the same kind of problem, so we put them side by side.
        </p>
        <FeedbackLoops loops={loops} />
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
