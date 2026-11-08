import { Link, useNavigate } from "@tanstack/react-router";
import type { SquadSlug } from "@/lib/squad-fx";
import { playWarp, prefersStill } from "@/lib/squad-warp";
import { recruitment, site, teamPhotos, type Squad } from "@/lib/site";
import "./squad-links.css";

type SquadPage = Squad & { slug: SquadSlug };

/** Up to this many faces sit under a squad's name; the rest are a "+N". */
const FACES = 6;
const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/** A row of small member faces: their photo, or their initials until a photo arrives. Head first. */
function Faces({ members }: { members: Squad["members"] }) {
  const ordered = [...members].sort((a, b) => Number(!!b.head) - Number(!!a.head));
  const shown = ordered.slice(0, FACES);
  return (
    <span className="sq-faces" aria-hidden="true">
      {shown.map((m) => {
        const photo = teamPhotos[m.name];
        return (
          <span key={m.name + m.sem} className="sq-face" title={m.name}>
            {photo ? (
              <img src={photo} alt="" width={64} height={64} loading="lazy" decoding="async" />
            ) : (
              <span className="font-display">{initials(m.name)}</span>
            )}
          </span>
        );
      })}
      {ordered.length > FACES && (
        <span className="sq-face sq-more font-mono">+{ordered.length - FACES}</span>
      )}
    </span>
  );
}

/** The last tile on /team: how to join a squad, from `recruitment` in site.ts. */
function JoinTile() {
  const open = recruitment.status === "open" && recruitment.formUrl;
  const line = open
    ? "Recruitment is open. Pick a squad and apply."
    : recruitment.status === "closed"
      ? "This round of recruitment is closed. Follow us to hear about the next one."
      : `Recruitment opens soon, for ${site.openTo}. Follow us to hear first.`;
  return (
    <li>
      <a
        href={open ? recruitment.formUrl : site.instagram}
        target="_blank"
        rel="noreferrer"
        className="sq-link sq-join group"
      >
        <span className="sq-num font-pixel">+</span>
        <svg
          viewBox="0 0 48 48"
          className="sq-glyph"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path className="sq-plus" d="M24 12v24M12 24h24" />
        </svg>
        <span className="sq-body">
          <span className="sq-title font-display">Join a squad</span>
          <span className="sq-about">{line}</span>
          <span className="sq-meta font-mono">
            {open ? "Apply form" : `Instagram ${site.instagramHandle}`}
          </span>
        </span>
        <span className="sq-go font-pixel" aria-hidden="true">
          {open ? "APPLY" : "FOLLOW"}
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path d="M4 12L12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </span>
      </a>
    </li>
  );
}

/** A small drawing for each squad, in the club's line style. It moves a little when the row is hovered. */
function Glyph({ slug }: { slug: SquadSlug }) {
  const common = {
    viewBox: "0 0 48 48",
    className: "sq-glyph",
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (slug) {
    case "projects":
      return (
        <svg {...common}>
          <path d="M8 40h20M12 40l4-8h4l4 8" />
          <path className="sq-arm" d="M18 32l6-14 12-4" />
          <circle cx="24" cy="18" r="3" />
          <path className="sq-arm" d="M36 14l5-4M36 14l6 1" />
        </svg>
      );
    case "events":
      return (
        <svg {...common}>
          <path d="M12 42V8" />
          <path className="sq-flag" d="M12 9h24l-6 7 6 7H12" />
          <circle cx="12" cy="42" r="2" />
        </svg>
      );
    case "technical":
      return (
        <svg {...common}>
          <rect x="15" y="15" width="18" height="18" rx="2" />
          <path
            className="sq-trace"
            d="M20 15V7M28 15V7M20 41v-8M28 41v-8M15 20H7M15 28H7M41 20h-8M41 28h-8"
          />
          <circle cx="24" cy="24" r="3" fill="currentColor" />
        </svg>
      );
    case "social-media":
      return (
        <svg {...common}>
          <path d="M8 21v8l20 8V13z" />
          <path d="M14 30l2 9h5l-2-7" />
          <path className="sq-wave" d="M33 18c3 3 3 9 0 12M38 14c5 5 5 15 0 20" />
        </svg>
      );
    case "design":
      return (
        <svg {...common}>
          <g className="sq-pencil">
            <path d="M10 38l4-12 20-20 8 8-20 20z" />
            <path d="M30 10l8 8M14 26l8 8" />
          </g>
          <path className="sq-scribble" d="M8 44c6-4 10 2 16-2s10 2 16-2" />
        </svg>
      );
  }
}

/**
 * The squads as a list of links. Clicking one plays that squad's own jump (squad-warp.ts) into its page;
 * with reduced motion, or a middle click, a modified click or a tap on a slow device, it is a plain link.
 */
export function SquadLinks({
  squads,
  compact = false,
}: {
  squads: SquadPage[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <ul className={`sq-links ${compact ? "sq-compact" : ""}`} data-robo-quiet data-robo-avoid>
      {squads.map((sq, i) => {
        const head = sq.members.find((m) => m.head);
        return (
          <li key={sq.slug}>
            <Link
              to="/team/$squad"
              params={{ squad: sq.slug }}
              preload="intent"
              data-squad={sq.slug}
              className="sq-link group"
              onPointerEnter={() => {
                // warm up the poster so the page opens on a picture, not an empty box
                const img = new Image();
                img.src = `/team/art/${sq.slug}-poster-960.webp`;
              }}
              onClick={(e) => {
                if (
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                )
                  return;
                if (prefersStill()) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                // a keyboard press has no pointer position: start from the middle of the row
                const x = e.detail ? e.clientX : r.left + r.width / 2;
                const y = e.detail ? e.clientY : r.top + r.height / 2;
                void playWarp(sq.slug, x, y, sq.title, () =>
                  navigate({ to: "/team/$squad", params: { squad: sq.slug } }),
                );
              }}
            >
              <span className="sq-num font-pixel">{String(i + 1).padStart(2, "0")}</span>
              <Glyph slug={sq.slug} />
              <span className="sq-body">
                <span className="sq-title font-display">{sq.title}</span>
                {!compact && <span className="sq-about">{sq.about}</span>}
                <span className="sq-meta font-mono">
                  {head && !compact ? `Head: ${head.name} · ` : ""}
                  {sq.members.length} members
                </span>
                {!compact && <Faces members={sq.members} />}
              </span>
              <span className="sq-go font-pixel" aria-hidden="true">
                OPEN
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <path
                    d="M2 8h11M9 4l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                </svg>
              </span>
            </Link>
          </li>
        );
      })}
      {!compact && <JoinTile />}
    </ul>
  );
}
