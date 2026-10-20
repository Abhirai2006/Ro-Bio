import Link from "next/link";
import { SITE } from "@/lib/config/site";
import { EVENTS, MEMBER_COUNT, formatDate } from "@/lib/events";
import SplitWord from "@/components/SplitWord";
import ScrollSequence from "@/components/ScrollSequence";
import Countdown from "@/components/Countdown";
import RobotArm from "@/components/RobotArm";
import Ecg from "@/components/Ecg";
import LineFollower from "@/components/LineFollower";

export default function Home() {
  const next = EVENTS[0];
  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <p className="warn"><span>Unauthorised innovation in progress!</span></p>
          <h1 aria-label="RO-BIO"><SplitWord text="RO-BIO" /></h1>
          <p className="lead">Biomedical and Robotic Engineering at {SITE.parent}. We build robots, sensors and the tech around the human body.</p>
          <p className="facts">Started {formatDate(SITE.startedOn)}. About {MEMBER_COUNT} members for now.</p>
          <div className="cta">
            <Link className="btn" href="/team">Meet the team</Link>
            <Link className="btn alt" href="/events/bot-forge">Bot Forge, 28 Oct</Link>
          </div>
        </div>
        <RobotArm />
      </section>

      <section aria-labelledby="bench">
        <h2 id="bench">On the bench</h2>
        <p className="lead">One side is the body. The other is the machine. Both are yours to poke.</p>
        <div className="grid wide">
          <Ecg />
          <LineFollower />
        </div>
      </section>

      <ScrollSequence />

      <div className="divider" aria-hidden="true" />

      <section aria-labelledby="next-up">
        <h2 id="next-up">Next up</h2>
        <div className="win">
          <div className="tab"><span>EVENT</span><span aria-hidden="true">x</span></div>
          <div className="body">
            <h3>{next.title}</h3>
            <p>{formatDate(next.startsOn, true)} at the college. It moved from {formatDate(next.previousStartsOn!)}.</p>
            <p><Countdown date={next.startsOn} /></p>
            <p className="muted">Registration details coming soon.</p>
            <p><Link className="btn" href={`/events/${next.slug}`}>See Bot Forge</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
