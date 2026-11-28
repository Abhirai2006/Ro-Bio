// The pieces the Bot Forge pages share: the prize banner, the register button, the contest cards with the
// poster's robots moving on the blueprint mesh, the day's schedule and the rules.
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Window } from "@/components/site/parts";
import { registrationState, type RuleSection } from "@/lib/bot-forge";
import {
  botForgeInfo,
  botForgePrizeTotal,
  contacts,
  rupees,
  type Contest,
  type ContestSlug,
} from "@/lib/site";
import "./bot-forge.css";

/** Where registration stands, checked again every 30 seconds, so the button changes at the exact minute. */
export function useRegState() {
  const [state, setState] = useState(() => registrationState());
  useEffect(() => {
    const tick = () => setState(registrationState());
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);
  return state;
}

export const bigBtn =
  "inline-block border-2 border-border bg-primary px-6 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5";
export const plainBtn =
  "inline-block border-2 border-border bg-card px-6 py-3 font-bold shadow-hard transition-transform hover:-translate-y-0.5";

/** The register button. Before registration opens it says when; after it closes it says so. */
export function RegisterButton({ contest }: { contest?: ContestSlug }) {
  const state = useRegState();
  const label =
    state === "open"
      ? "Register your team"
      : state === "coming-soon"
        ? `Registration opens ${botForgeInfo.opensLabel}`
        : "Registration is closed";
  return (
    <Link
      to="/events/bot-forge/register"
      search={contest ? { contest } : {}}
      className={state === "open" ? bigBtn : plainBtn}
    >
      {label}
    </Link>
  );
}

/** Two prize chips: first and second place. */
export function PrizePair({ c, dark = false }: { c: Contest; dark?: boolean }) {
  const chip = `border-2 px-3 py-2 ${dark ? "border-paper/70" : "border-border"}`;
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`${chip} ${dark ? "bg-lilac text-ink" : "bg-lens text-ink"}`}>
        <span className="block font-pixel text-[9px]">1ST PRIZE</span>
        <span className="font-display text-2xl font-black">{rupees(c.prizes[0])}</span>
      </span>
      <span className={`${chip} ${dark ? "bg-paper text-ink" : "bg-card"}`}>
        <span className="block font-pixel text-[9px]">2ND PRIZE</span>
        <span className="font-display text-2xl font-black">{rupees(c.prizes[1])}</span>
      </span>
    </div>
  );
}

/** The cash prize banner: the total, then first and second for every contest. The page's main message. */
export function PrizeBanner() {
  return (
    // Room above the banner for the robot, so he never covers the text above it.
    <div className="relative pt-[78px] sm:pt-[96px] md:pt-[120px]">
      {/*
        The poster's robot, arms out. He sits behind the banner and pops up from behind its top edge, until his
        whole jacket shows above it.
      */}
      <img
        src={botForgeInfo.art.heroBot}
        alt=""
        width={296}
        height={154}
        className="bf-presenter pointer-events-none absolute right-3 top-0 z-0 w-36 sm:w-44 md:right-6 md:w-56"
      />
      <section
        className="relative z-10 border-2 border-border bg-ink p-5 text-paper shadow-hard-violet md:p-8"
        aria-labelledby="prizes"
      >
        <p className="font-pixel text-[11px] text-lens">BOT FORGE CASH PRIZES</p>
        <h2 id="prizes" className="mt-2 font-display font-black leading-none">
          <span className="bf-glow block text-6xl text-lilac sm:text-7xl md:text-8xl">
            {rupees(botForgePrizeTotal)}
          </span>
          <span className="mt-3 block text-2xl md:text-3xl">in cash prizes to win</span>
        </h2>
        <p className="mt-4 inline-block border-2 border-dashed border-lens px-3 py-2 font-bold">
          Every participant gets {botForgeInfo.forEveryone}.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {botForgeInfo.contests.map((c) => (
            <li key={c.slug} className="border-2 border-paper/40 p-4">
              <Link
                to="/events/bot-forge/$contest"
                params={{ contest: c.slug }}
                className="font-display text-xl font-black underline decoration-lilac underline-offset-4"
              >
                {c.title}
              </Link>
              <div className="mt-3">
                <PrizePair c={c} dark />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** The yellow "these rules are a draft" box. */
export function DraftNote() {
  if (!botForgeInfo.rulesDraft) return null;
  return (
    <p
      role="note"
      className="border-2 border-dashed border-border bg-[#fff3c4] p-4 font-bold text-ink"
    >
      <span className="font-pixel text-[11px]">DRAFT RULES</span>
      <span className="mt-1 block font-normal">
        These rules are a draft and may change before Bot Forge. The final rules will go up on this
        page.
      </span>
    </p>
  );
}

/** The poster's racer, crossing its lane on the blueprint mesh. */
export function RaceArt({ className = "" }: { className?: string }) {
  return (
    <div className={`bf-mesh ${className}`} aria-hidden="true">
      <div className="bf-lane" />
      <div className="bf-racer">
        <img src={botForgeInfo.art.raceBot} alt="" width={187} height={258} loading="lazy" />
      </div>
    </div>
  );
}

/** The poster's sumo wrestler, shoving on the edge of the ring. */
export function SumoArt({ className = "" }: { className?: string }) {
  return (
    <div className={`bf-mesh ${className}`} aria-hidden="true">
      <div className="bf-ring" />
      <div className="bf-sumo">
        <img src={botForgeInfo.art.sumoBot} alt="" width={298} height={217} loading="lazy" />
      </div>
    </div>
  );
}

/**
 * The poster's two line-art mechs, peeking in from the top corners of a section, as on the poster. They hover
 * slowly while a scanner glow runs along their lines. Put inside a section that is `relative overflow-hidden`.
 */
export function MechCorners() {
  const mech = (src: string, side: "left" | "right", w: number, h: number) => (
    <div className={`bf-mech bf-mech-${side}`} aria-hidden="true">
      <img src={src} alt="" width={w} height={h} />
      <span className="bf-mech-scan" style={{ "--mech": `url(${src})` } as React.CSSProperties} />
    </div>
  );
  return (
    <>
      {mech(botForgeInfo.art.mechLeft, "left", 399, 581)}
      {mech(botForgeInfo.art.mechRight, "right", 294, 495)}
    </>
  );
}

/** Shark Tank's card: the Design squad's judges at their desk, saying "I'm out". */
export function PitchArt({ className = "" }: { className?: string }) {
  return (
    <div className={`bf-mesh ${className}`} aria-hidden="true">
      <img
        src={botForgeInfo.art.judges}
        alt=""
        width={900}
        height={713}
        loading="lazy"
        className="bf-judges absolute inset-x-[6%] inset-y-[7%] h-[86%] w-[88%] object-contain"
      />
    </div>
  );
}

/** The moving art for a contest: the racer, the sumo wrestler, or the pitch slide. */
export function ContestArt({ slug, className = "" }: { slug: ContestSlug; className?: string }) {
  if (slug === "robo-race") return <RaceArt className={className} />;
  if (slug === "robo-sumo") return <SumoArt className={className} />;
  return <PitchArt className={className} />;
}

/** The three contests, each with its prizes, team size and moving art. */
export function ContestCards() {
  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {botForgeInfo.contests.map((c) => (
        <li key={c.slug}>
          <div
            data-robo-perch
            className="flex h-full flex-col border-2 border-border bg-card shadow-hard"
          >
            <div className="flex items-center justify-between border-b-2 border-border bg-secondary px-2 py-1">
              <span className="font-pixel text-[10px] tracking-wider">EVENT</span>
              <span className="font-pixel text-[10px]">
                TEAMS OF {c.team[0]} TO {c.team[1]}
              </span>
            </div>
            <ContestArt slug={c.slug} className="aspect-[16/9] border-b-2 border-border" />
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-display text-2xl font-black">{c.title}</h3>
              <p className="mt-1 text-muted-foreground">{c.pitch}</p>
              <div className="mt-4">
                <PrizePair c={c} />
              </div>
              {c.kits > 0 && (
                <p className="mt-3 text-sm">
                  {c.kits} club kits for the first {c.kits} teams that ask.
                </p>
              )}
              <Link
                to="/events/bot-forge/$contest"
                params={{ contest: c.slug }}
                className="mt-auto pt-4 font-bold text-primary underline underline-offset-4"
              >
                {c.title} rules
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The day, from the inauguration to the prizes. */
export function Schedule() {
  return (
    <ol className="border-2 border-border bg-card shadow-hard">
      {botForgeInfo.schedule.map((s, i) => (
        <li
          key={s.what}
          className={`grid gap-1 p-4 sm:grid-cols-[11rem_1fr] sm:gap-4 ${i ? "border-t-2 border-border" : ""}`}
        >
          <span className="font-mono font-bold text-primary">{s.time}</span>
          <span>{s.what}.</span>
        </li>
      ))}
    </ol>
  );
}

export function RuleBlock({ sections }: { sections: RuleSection[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {sections.map((s) => (
        <Window key={s.title} tag="RULES" title={s.title}>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Window>
      ))}
    </div>
  );
}

export function Coordinators() {
  return (
    <div className="border-2 border-border bg-card p-5 shadow-hard">
      <p className="font-pixel text-[11px] text-primary">QUESTIONS? CALL A COORDINATOR</p>
      <ul className="mt-3 space-y-3">
        {contacts.map((c) => (
          <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>
              <span className="font-bold">{c.name}</span>{" "}
              <span className="text-sm text-muted-foreground">({c.role})</span>
            </span>
            <a href={`tel:+91${c.phone}`} className="font-mono text-primary underline">
              {c.phone}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionHead({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <>
      <p className="font-pixel text-xs text-primary">{label}</p>
      <h2 id={id} className="mt-2 text-3xl font-black md:text-4xl">
        {children}
      </h2>
    </>
  );
}
