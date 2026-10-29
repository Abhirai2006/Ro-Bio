import { Link, useRouterState } from "@tanstack/react-router";
import { POSES, rigMarkup } from "@/lib/robo-rig";
import { closestPage } from "@/lib/closest";

// Robo, puzzled: head tilted, hand on his chin. Ids renamed so they never clash with the Robo who roams the site.
const lost = rigMarkup({ ...POSES.think, hr: 16, lx: -2.4, ly: -1.2, shR: 2.5, shL: -2 }, false, false).replace(/id="rb-/g, 'id="nf-');

const QUICK = [
  { to: "/events/bot-forge", label: "Bot Forge" },
  { to: "/team", label: "Team" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

/** The 404 page. Robo looked for the page, could not find it, and is a little embarrassed about it. */
export function NotFound() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const guess = closestPage(path);
  return (
    <section data-page-404 className="blueprint border-b-2 border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <p className="font-pixel text-xs text-primary">ERROR 404 / FLATLINE</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] md:text-6xl">Robo looked everywhere. This page is not here.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            You asked for <code className="break-all border-2 border-border bg-card px-1.5 py-0.5 font-mono text-base text-foreground">{path}</code>. Maybe it moved, maybe it
            never existed, maybe Robo ate it. He says he did not.
          </p>
          {guess && (
            <p className="mt-5 inline-flex flex-wrap items-center gap-2 border-2 border-border bg-lilac px-4 py-3 text-ink shadow-hard">
              <span className="font-pixel text-[10px]">DID YOU MEAN</span>
              <Link to={guess as "/"} className="font-display text-lg font-bold underline underline-offset-4">
                {guess}
              </Link>
              <span>?</span>
            </p>
          )}
          <div className="nf-revive mt-8">
            <svg viewBox="0 0 320 50" className="h-12 w-full max-w-md text-primary" aria-hidden="true">
              <path className="nf-flat" d="M0 25 H320" fill="none" stroke="currentColor" strokeWidth="3" />
              <path
                className="nf-beat"
                d="M0 25 H110 L118 25 L124 19 L130 25 L140 25 L146 31 L156 3 L166 46 L172 25 L188 25 L198 17 L208 25 H320"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
            <Link to="/" className="mt-4 inline-block border-2 border-border bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5">
              Back to home, get a pulse back
            </Link>
          </div>
          <nav aria-label="Popular pages" className="mt-8">
            <p className="font-pixel text-[10px] text-muted-foreground">OR TRY ONE OF THESE</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <li key={q.to}>
                  <Link to={q.to as "/"} className="block border-2 border-border bg-card px-3 py-1.5 text-sm font-bold hover:bg-secondary">
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="relative mx-auto w-full max-w-[300px]" aria-hidden="true">
          <span className="absolute -top-2 right-0 z-10 border-2 border-border bg-paper px-3 py-2 font-pixel text-[10px] leading-4 text-ink shadow-hard">
            I checked every page.
            <br />
            Twice.
          </span>
          <div className="aspect-[260/284] w-full" dangerouslySetInnerHTML={{ __html: lost }} />
        </div>
      </div>
    </section>
  );
}
