import { useEffect, useState } from "react";
import { squadFx, type SquadSlug } from "@/lib/squad-fx";
import "./squad-fx.css";

const ART = "/team/art";

/** What each illustration shows, for screen readers. */
const squadArtAlt: Record<SquadSlug, string> = {
  projects:
    "Drawing: a student presents robot sketches on a whiteboard, a sensor array, a battery module, a 3 DoF joint arm and a legged robot.",
  events:
    "Drawing: four students plan an event at a table, with an event layout on the board from the entrance to the stage.",
  technical:
    "Drawing: students build and debug in a lab lit by RGB strips, with a laptop, a circuit board and a gaming PC.",
  "social-media":
    "Drawing: students hand out QR code flyers on a street, one shouts into a megaphone and one films on a phone.",
  design:
    "Drawing: a design studio where students sketch on a tablet, lay out posters on a monitor and 3D print a robot.",
};

/**
 * A squad's illustration. With `fx`, the motion layer starts once the page is running in the browser
 * (and only if the visitor has not asked for reduced motion), so the server and browser render the same
 * still picture first. `name` lets the picture glide from the team page into the squad page.
 */
export function SquadArt({
  slug,
  fx = false,
  priority = false,
  className = "",
}: {
  slug: SquadSlug;
  fx?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!fx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setLive(true);
  }, [fx]);

  // The pencil redraws the whiteboard, so the picture under it is the board with the sketches removed.
  const base = live && slug === "projects" ? `${slug}-clean` : slug;
  return (
    <div
      className={`relative aspect-[16/9] overflow-hidden bg-secondary ${className}`}
      style={{ viewTransitionName: `squad-art-${slug}` }}
    >
      <img
        src={`${ART}/${base}-1600.webp`}
        srcSet={`${ART}/${base}-960.webp 960w, ${ART}/${base}-1600.webp 1600w`}
        sizes="(min-width: 1152px) 1120px, 100vw"
        width={1600}
        height={900}
        alt={squadArtAlt[slug]}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {live && (
        <svg
          className="sfx-layer pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1600 900"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: squadFx(slug, { ink: `${ART}/projects-ink.webp` }) }}
        />
      )}
    </div>
  );
}
