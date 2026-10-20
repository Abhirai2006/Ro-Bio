import Link from "next/link";
import { SITE } from "@/lib/config/site";
import { EVENTS, MEMBER_COUNT, formatDate } from "@/lib/events";
import SplitWord from "@/components/SplitWord";
import ScrollSequence from "@/components/ScrollSequence";
import Countdown from "@/components/Countdown";

export default function Home() {
  const next = EVENTS[0];
  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <p className="warn"><span>Unauthorised innovation in progress!</span></p>
          <h1 aria-label="RO-BIO"><SplitWord text="RO-BIO" /></h1>
          <p>
            The Biomedical and Robotic Engineering club at {SITE.parent}. We build things that
            read the body and things that move.
          </p>
          <p className="facts">Started {formatDate(SITE.startedOn)}. About {MEMBER_COUNT} members for now.</p>
          <p><a className="btn" href={SITE.instagram}>Follow us on Instagram</a></p>
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
