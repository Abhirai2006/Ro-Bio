import { useRef, useState } from "react";
import { currentSem, teamLinkedIn, teamPhotos, type Member } from "@/lib/site";
import { memberThought } from "@/lib/robo-talk";
import "./team-cards.css";

/** "Dr. Nithin S K" becomes "NS": titles like Dr. are left out. */
const initials = (name: string) =>
  name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/** A square photo, or the person's initials on the blueprint grid until a photo arrives. */
export function Portrait({ name, className = "" }: { name: string; className?: string }) {
  const photo = teamPhotos[name];
  return (
    <div className={`blueprint relative aspect-square overflow-hidden ${className}`}>
      {photo ? (
        <img
          src={photo}
          alt={`Photo of ${name}`}
          width={640}
          height={640}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          className="absolute inset-0 grid place-items-center font-display text-5xl font-black italic text-primary"
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/** The part of a LinkedIn link after /in/, like "anagha-a-raichurkar-51b349291". */
const linkedInId = (url: string) => url.replace(/^.*\/in\//, "").replace(/[/?#].*$/, "");

/**
 * One team member: photo, name, role or HEAD badge, semester and branch. Someone who gave a LinkedIn
 * link gets a card that flips over when tapped, with their LinkedIn ID and a button to open it.
 */
export function MemberCard({
  member,
  index = 0,
  squadTitle,
}: {
  member: Member;
  index?: number;
  /** the squad the card sits in, for what Robo says about the person */
  squadTitle?: string;
}) {
  const thought = memberThought(member, squadTitle);
  const link = teamLinkedIn[member.name];
  const badge = member.role ?? (member.head ? "Head" : undefined);
  const [flipped, setFlipped] = useState(false);
  const flipBtn = useRef<HTMLButtonElement>(null);
  const openBtn = useRef<HTMLAnchorElement>(null);
  const flip = (to: boolean, focus = false) => {
    setFlipped(to);
    // keyboard users land on the side they just turned to
    if (focus) requestAnimationFrame(() => (to ? openBtn : flipBtn).current?.focus());
  };
  const front = (
    <>
      <div className="relative border-b-2 border-border">
        <Portrait name={member.name} />
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 font-pixel text-[9px] text-primary-foreground">
            {badge.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-display text-lg font-bold leading-tight">{member.name}</h3>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {currentSem(member.sem)}th sem {member.dept}
        </p>
        {link && (
          <button
            ref={flipBtn}
            type="button"
            className="mcard-flip"
            aria-expanded={flipped}
            aria-label={`Show ${member.name}'s LinkedIn`}
            onClick={(e) => {
              e.stopPropagation();
              flip(true, e.detail === 0);
            }}
          >
            <span className="mcard-in" aria-hidden="true">
              in
            </span>
            LinkedIn
            <span className="mcard-turn" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path
                  d="M3 6a5 5 0 0 1 9-2M13 10a5 5 0 0 1-9 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 1v3.5H8.5M4 15v-3.5h3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
          </button>
        )}
      </div>
    </>
  );
  const style = { animationDelay: `${Math.min(index, 10) * 70}ms` };
  if (!link)
    return (
      <article
        data-thought={thought}
        className="team-rise flex h-full flex-col border-2 border-border bg-card shadow-hard"
        style={style}
      >
        {front}
      </article>
    );
  const id = linkedInId(link);
  return (
    <article
      data-thought={thought}
      className={`team-rise mcard h-full ${flipped ? "is-flipped" : ""}`}
      style={style}
      onClick={(e) => {
        // a tap anywhere on the card turns it, except on its own links and buttons
        if ((e.target as Element).closest("a, button")) return;
        flip(!flipped);
      }}
    >
      <div className="mcard-inner">
        <div className="mcard-face mcard-front" inert={flipped}>
          {front}
        </div>
        <div
          className="mcard-face mcard-back"
          inert={!flipped}
          aria-label={`${member.name} on LinkedIn`}
          role="group"
        >
          <p className="font-pixel text-[10px] tracking-widest">LINKEDIN</p>
          <p className="mcard-name font-display">{member.name}</p>
          <p className="mcard-id font-mono">
            <span>linkedin.com/in/</span>
            {id}
          </p>
          <a
            ref={openBtn}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mcard-open"
            aria-label={`Open ${member.name}'s LinkedIn profile (opens in a new tab)`}
          >
            Open profile <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="mcard-back-btn font-pixel"
            onClick={(e) => {
              e.stopPropagation();
              flip(false, e.detail === 0);
            }}
          >
            FLIP BACK
          </button>
        </div>
      </div>
    </article>
  );
}
