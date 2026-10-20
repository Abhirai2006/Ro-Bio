import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SITE } from "@/lib/config/site";
import { MEMBER_COUNT, formatDate } from "@/lib/events";

export const metadata: Metadata = {
  title: "About",
  description: "RO-BIO is the Biomedical and Robotic Engineering club at Mysore University School of Engineering.",
  alternates: { canonical: "/about" },
};

const LOOPS = [
  { name: "A robot", steps: ["Sensor", "Controller", "Motor"] },
  { name: "A body", steps: ["Nerve ending", "Brain", "Muscle"] },
];

export default function About() {
  return (
    <div className="wrap">
      <h1>About</h1>
      <p>
        RO-BIO is the Biomedical and Robotic Engineering club at {SITE.parent}, Mysuru. The club
        started on {formatDate(SITE.startedOn)} and has about {MEMBER_COUNT} members for now.
      </p>
      <p>
        Our first event is Bot Forge on {formatDate("2026-10-28")}. It has five parts: Line Follower,
        Robot Race, Robo Sumo, Bot Expo and Shark Tank.
      </p>

      <div className="divider" aria-hidden="true" />

      <section aria-labelledby="loop">
        <h2 id="loop">One loop, twice</h2>
        <p>
          A robot and a body run the same loop. They sense something, decide what to do, and act.
          Then they sense again and correct themselves. That feedback is why a line follower stays on its line
          and why your hand stops before it hits the table.
        </p>
        <div className="loops">
          {LOOPS.map((l) => (
            <div className="loop" key={l.name}>
              <h3>{l.name}</h3>
              <ol>
                {l.steps.map((s, i) => (
                  <li key={s} style={{ "--i": i } as CSSProperties}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
