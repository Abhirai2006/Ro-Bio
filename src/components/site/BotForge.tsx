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
  const [first, second] = botForgeInfo.contests[0]!.prizes;
  const same = botForgeInfo.contests.every((c) => c.prizes[0] === first && c.prizes[1] === second);
  return (
    <section
      className="relative border-2 border-border bg-ink p-5 text-paper shadow-hard-violet md:p-8"
      aria-labelledby="prizes"
    >
      {/* The poster's robot, arms out, presenting the prizes. */}
      <img
        src={botForgeInfo.art.heroBot}
        alt=""
        width={296}
        height={154}
        className="bf-presenter pointer-events-none absolute -top-10 right-2 w-32 sm:w-44 md:-top-14 md:right-4 md:w-56"
      />
      <p className="font-pixel text-[11px] text-lens">BOT FORGE CASH PRIZES</p>
      <h2 id="prizes" className="mt-2 font-display font-black leading-none">
        <span className="bf-glow block text-6xl text-lilac sm:text-7xl md:text-8xl">
          {rupees(botForgePrizeTotal)}
        </span>
        <span className="mt-3 block text-2xl md:text-3xl">in cash prizes to win</span>
      </h2>
      {same && (
        <p className="mt-3 max-w-xl text-lg opacity-90">
          {rupees(first)} for first place and {rupees(second)} for second, in every one of the{" "}
          {botForgeInfo.contests.length} contests.
        </p>
      )}
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

/** A slide with a rising chart: Shark Tank's card. No shark here: the shark lives on its own page. */
export function PitchArt({ className = "" }: { className?: string }) {
  return (
    <div className={`bf-mesh grid place-items-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 120" className="h-[70%] w-auto">
        <rect x="10" y="8" width="180" height="96" fill="#fff" stroke="#201e2d" strokeWidth="4" />
        <rect
          x="10"
          y="8"
          width="180"
          height="16"
          fill="#efeafe"
          stroke="#201e2d"
          strokeWidth="4"
        />
        <rect
          x="34"
          y="72"
          width="22"
          height="22"
          fill="#6294ff"
          stroke="#201e2d"
          strokeWidth="3"
        />
        <rect
          x="70"
          y="58"
          width="22"
          height="36"
          fill="#a979fa"
          stroke="#201e2d"
          strokeWidth="3"
        />
        <rect
          x="106"
          y="44"
          width="22"
          height="50"
          fill="#725dff"
          stroke="#201e2d"
          strokeWidth="3"
        />
        <path d="M30 60 L80 46 L112 34 L160 22" fill="none" stroke="#5a3fe6" strokeWidth="5" />
        <path d="M148 18 L164 21 L156 34" fill="none" stroke="#5a3fe6" strokeWidth="5" />
        <rect
          x="140"
          y="60"
          width="38"
          height="34"
          fill="#fffffa"
          stroke="#201e2d"
          strokeWidth="3"
        />
        <text x="159" y="84" textAnchor="middle" fontSize="18" fontWeight="900" fill="#201e2d">
          ₹
        </text>
        <rect x="88" y="104" width="24" height="12" fill="#201e2d" />
      </svg>
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
              <span className="font-pixel text-[10px] tracking-wider">CONTEST</span>
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
