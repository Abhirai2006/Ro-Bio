import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { daysBetween, eventDate, events, site, todayInIndia } from "@/lib/site";
import logo from "@/assets/robio-logo.jpg";
import { HeaderEcg } from "@/components/site/HeaderEcg";

export const logoUrl = logo;

// `hint` is the one-liner under each link in the mobile menu. It repeats what that page already says.
const nav = [
  { to: "/about", label: "About", hint: "Who we are" },
  { to: "/events", label: "Events", hint: "What's coming up" },
  { to: "/workshops", label: "Workshops", hint: "Saturdays at RO-BIO" },
  { to: "/projects", label: "Projects", hint: "Stuff we're building" },
  { to: "/team", label: "Team", hint: "The people keeping it running" },
  { to: "/gallery", label: "Gallery", hint: "Photos and drawings" },
  { to: "/blog", label: "Blog", hint: "Lab notes" },
  { to: "/contact", label: "Contact", hint: "Call us or DM us" },
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
  const toggle = useRef<HTMLButtonElement>(null);
  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  };
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 bg-card px-3 py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2" aria-label="RO-BIO home" onClick={() => close()}>
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-sm border-2 border-border bg-paper object-cover" />
          <span className="whitespace-nowrap font-display text-lg font-black italic max-[420px]:hidden">RO-BIO</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex gap-0.5 xl:gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="px-2 py-2 text-sm font-bold hover:text-primary xl:px-2.5"
                  activeProps={{ className: "px-2 py-2 text-sm font-bold text-primary underline decoration-2 underline-offset-4 xl:px-2.5" }}
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
            ref={toggle}
            type="button"
            className="flex items-center gap-2 border-2 border-border bg-ink px-2.5 py-1.5 font-pixel text-[11px] text-paper lg:hidden dark:bg-lilac dark:text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span aria-hidden="true" className="relative block h-3 w-4">
              <span className={`absolute left-0 h-0.5 w-4 bg-current transition-transform duration-300 ${open ? "top-[5px] rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-[5px] h-0.5 bg-current transition-all duration-200 ${open ? "w-0 opacity-0" : "w-3"}`} />
              <span className={`absolute left-0 h-0.5 w-4 bg-current transition-transform duration-300 ${open ? "top-[5px] -rotate-45" : "top-[10px]"}`} />
            </span>
            {open ? "CLOSE" : "MENU"}
          </button>
        </div>
      </div>
      {open && <MobileNav onClose={close} toggle={toggle} />}
    </header>
  );
}

/** Full-height menu for phones. Rows slide in one after another; Esc closes; focus stays inside while it is open. */
function MobileNav({ onClose, toggle }: { onClose: (refocus?: boolean) => void; toggle: React.RefObject<HTMLButtonElement | null> }) {
  const panel = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const next = events[0]!;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["menu"] = "open"; // locks page scroll and tucks Robo away, see styles.css
    setTop(toggle.current?.closest("header")?.getBoundingClientRect().bottom ?? 0);
    (panel.current?.querySelector<HTMLElement>("[data-here]") ?? panel.current?.querySelector<HTMLElement>("a"))?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose(true);
      if (e.key !== "Tab" || !panel.current) return;
      const els = [toggle.current, ...panel.current.querySelectorAll<HTMLElement>("a, button")].filter(Boolean) as HTMLElement[];
      const i = els.indexOf(document.activeElement as HTMLElement);
      const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : i === els.length - 1 ? 0 : i + 1;
      e.preventDefault();
      els[to]!.focus();
    };
    const wide = matchMedia("(min-width: 1024px)");
    const grow = () => wide.matches && onClose();
    addEventListener("keydown", key);
    wide.addEventListener("change", grow);
    return () => {
      delete root.dataset["menu"];
      removeEventListener("keydown", key);
      wide.removeEventListener("change", grow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Portalled to <body>: the header's backdrop blur would otherwise trap a fixed panel inside the header box.
  return createPortal(
    <div
      ref={panel}
      id="mobile-nav"
      className="menu-panel blueprint fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain border-t-2 border-border bg-background lg:hidden"
      style={{ top }}
    >
      <div className="flex items-center gap-3 border-b-2 border-border bg-ink px-4 py-2 text-paper">
        <span className="shrink-0 font-pixel text-[10px] text-lilac">SELECT A PAGE</span>
        <PulseLine className="h-6 flex-1 text-lens" />
        <span className="shrink-0 font-mono text-[10px] opacity-70">{nav.length} PAGES</span>
      </div>
      <nav aria-label="Mobile">
        <ul>
          {nav.map((n, i) => {
            const here = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <li key={n.to} className="menu-row border-b-2 border-border" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  to={n.to}
                  data-here={here || undefined}
                  onClick={() => onClose()}
                  className={`group flex items-center gap-4 px-4 py-3 transition-colors active:bg-secondary ${here ? "bg-primary text-primary-foreground active:bg-primary" : "bg-card/80"}`}
                >
                  <span className={`font-mono text-xs ${here ? "" : "text-primary"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl font-black italic leading-tight">{n.label}</span>
                    <span className={`block text-xs ${here ? "opacity-90" : "text-muted-foreground"}`}>{here ? "You are here" : n.hint}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid h-10 w-10 shrink-0 place-items-center border-2 text-lg font-bold transition-transform group-active:translate-x-1 ${here ? "border-primary-foreground" : "border-border bg-background shadow-hard"}`}
                  >
                    {here ? "●" : "→"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="menu-row grid grid-cols-2 gap-3 p-4" style={{ "--i": nav.length } as React.CSSProperties}>
        <Link to="/events/$slug" params={{ slug: next.slug }} onClick={() => onClose()} className="border-2 border-border bg-ink p-3 text-paper shadow-hard-violet">
          <span className="block font-pixel text-[9px] text-lilac">NEXT UP</span>
          <span className="mt-1 block font-display text-lg font-black italic leading-tight">{next.title}</span>
          <span className="block font-mono text-[11px] opacity-80">{eventDate(next)}</span>
        </Link>
        <a href={site.instagram} target="_blank" rel="noreferrer" className="border-2 border-border bg-lilac p-3 text-ink shadow-hard">
          <span className="block font-pixel text-[9px]">SAY HI</span>
          <span className="mt-1 block font-display text-lg font-black leading-tight">Instagram</span>
          <span className="block font-mono text-[11px]">{site.instagramHandle}</span>
        </a>
      </div>
    </div>,
    document.body,
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
          <a href={site.linkedin} target="_blank" rel="noreferrer" className="mt-1 block font-bold text-lens underline underline-offset-4">
            LinkedIn RO-BIO Hub
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
