import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { daysBetween, site, todayInIndia } from "@/lib/site";
import logo from "@/assets/robio-logo.jpg";
import { HeaderEcg } from "@/components/site/HeaderEcg";

export const logoUrl = logo;

const nav = [
  { to: "/about", label: "About" },
  { to: "/events", label: "Events" },
  { to: "/workshops", label: "Workshops" },
  { to: "/projects", label: "Projects" },
  { to: "/team", label: "Team" },
  { to: "/gallery", label: "Gallery" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
] as const;

/** Today's date in India, available only after hydration to keep SSR stable. */
export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayInIndia()), []);
  return today;
}

export function Uptime() {
  const today = useToday();
  const days = today ? daysBetween(site.startedOn, today) : null;
  return <span>{days === null ? "since 20 May 2026" : `${days} days since 20 May 2026`}</span>;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("robio-theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("robio-theme", next ? "dark" : "light");
      }}
      className="font-pixel text-[11px] border-2 border-border px-2 py-1.5 hover:bg-secondary"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? "LIGHT" : "DARK"}
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 bg-card px-3 py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2" aria-label="RO-BIO home">
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-sm border-2 border-border bg-paper object-cover" />
          <span className="font-display text-lg font-black italic max-[420px]:hidden">RO-BIO</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="px-2.5 py-2 text-sm font-bold hover:text-primary"
                  activeProps={{ className: "px-2.5 py-2 text-sm font-bold text-primary underline decoration-2 underline-offset-4" }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <HeaderEcg />
          <ThemeToggle />
          <button
            type="button"
            className="lg:hidden font-pixel text-[11px] border-2 border-border bg-ink px-3 py-1.5 text-paper dark:bg-lilac dark:text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? "CLOSE" : "MENU"}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="lg:hidden border-t-2 border-border bg-card">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border">
            {nav.map((n) => (
              <li key={n.to} className="bg-card">
                <Link to={n.to} onClick={() => setOpen(false)} className="block px-4 py-4 font-bold">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function PulseLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 60" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M0 30 H200 L215 30 L222 22 L230 30 L245 30 L252 38 L262 2 L274 56 L282 30 L300 30 L318 18 L336 30 H600"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        className="pulse-draw"
      />
    </svg>
  );
}

export function Window({
  tag,
  title,
  children,
  className = "",
}: {
  tag: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-robo-perch className={`border-2 border-border bg-card shadow-hard ${className}`}>
      <div className="flex items-center justify-between border-b-2 border-border bg-secondary px-2 py-1">
        <span className="font-pixel text-[10px] tracking-wider">{tag}</span>
        <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center border-2 border-border text-[8px] leading-none">
          ×
        </span>
      </div>
      <div className="p-4">
        {title && <h3 className="text-lg font-bold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function PageIntro({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <section className="blueprint border-b-2 border-border">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 md:pt-20">
        <p className="font-pixel text-xs text-primary">{label}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] md:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-muted-foreground">{children}</div>}
      </div>
    </section>
  );
}

export function Pending({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-border bg-muted p-6 md:p-8">
      <p className="font-pixel text-[11px] text-primary">
        STATUS: PENDING<span className="blink">_</span>
      </p>
      <h2 className="mt-2 text-xl font-bold md:text-2xl">{title}</h2>
      <div className="mt-2 max-w-xl text-muted-foreground">{children}</div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-border bg-ink text-paper">
      <div className="hazard h-3" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-black italic">RO-BIO</p>
          <p className="mt-2 text-sm opacity-80">
            The student club of {site.branch}, {site.college}.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-pixel text-[11px] text-lilac">FIND US</p>
          <p className="mt-2 opacity-90">{site.address}</p>
          <a href={site.instagram} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-lens underline underline-offset-4">
            Instagram {site.instagramHandle}
          </a>
        </div>
        <div className="text-sm">
          <p className="font-pixel text-[11px] text-lilac">UPTIME</p>
          <p className="mt-2 font-mono">
            <Uptime />
          </p>
          <p className="mt-4 opacity-70">Built by students.</p>
        </div>
      </div>
            <div className="border-t border-current/20">
          <nav aria-label="Help and legal" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-4 text-sm font-semibold">
            <Link to="/faq" className="underline underline-offset-4">FAQ</Link>
            <Link to="/privacy" className="underline underline-offset-4">Privacy</Link>
            <Link to="/terms" className="underline underline-offset-4">Terms</Link>
            <Link to="/accessibility" className="underline underline-offset-4">Accessibility</Link>
            <a href="/sitemap.xml" className="underline underline-offset-4">Sitemap</a>
            <a href="/llms.txt" className="underline underline-offset-4">For AI assistants</a>
          </nav>
        </div>
      </footer>
  );
}
