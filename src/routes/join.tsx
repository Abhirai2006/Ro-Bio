import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BRANCHES } from "@/lib/certificates";
import {
  CRITERIA,
  DAY_NOTES,
  DAYS,
  ROOMS,
  SQUADS,
  type CriterionKey,
  type Squad,
} from "@/lib/recruit";
import { canonical } from "@/lib/seo";
import { coreTeam, recruitment, site, squadDuties } from "@/lib/site";
import { PageIntro, Window } from "@/components/site/parts";

const description = `RO-BIO is picking new core members from ${recruitment.who} at ${site.college}. See what each squad looks for, what the interview is like, and sign up by ${recruitment.closesLabel}.`;

export const Route = createFileRoute("/join")({
  head: () => ({
    links: [canonical("/join")],
    meta: [
      { title: "Join a squad | RO-BIO" },
      { name: "description", content: description },
      { property: "og:title", content: "Join a RO-BIO squad" },
      { property: "og:description", content: description },
    ],
  }),
  component: Join,
});

/** What each thing the judges mark means, said to the student. The judges' own scale is in the handbook. */
const LOOK_AT: Record<CriterionKey, string> = {
  communication: "Say what you mean clearly and answer what was asked. Short and clear beats long.",
  teamwork:
    "In the group question, listen, build on other people's ideas and help the group decide.",
  commitment:
    "Know why you want this squad, and be honest about how much time you can give each week.",
  skill: "Your squad's own kind of thinking. Each squad below says what it looks like for them.",
  attitude: "Stay curious. If a judge gives you a hint, use it. Nobody expects you to know it all.",
};

/** The site's squad (title, page, about line) for a recruitment squad, matched by its title. */
const squadInfo = (s: Squad) => coreTeam.find((t) => t.title === s);

const btn =
  "inline-block rounded-full border-2 border-border bg-primary px-6 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5 disabled:opacity-60";
const field = "mt-1 block w-full border-2 border-border bg-background px-3 py-2.5 text-base";
const choice = (on: boolean) =>
  `flex cursor-pointer items-start gap-2 border-2 border-border px-4 py-2.5 ${on ? "bg-primary text-primary-foreground" : "bg-background"}`;

function Join() {
  if (recruitment.status !== "open")
    return (
      <PageIntro label="CORE RECRUITMENT" title="Join a RO-BIO squad.">
        {recruitment.status === "closed"
          ? "This round of recruitment is closed. Follow us on Instagram to hear about the next one."
          : `Recruitment opens soon, for ${site.openTo}. Follow us on Instagram to hear first.`}{" "}
        <a href={site.instagram} className="underline" target="_blank" rel="noreferrer">
          {site.instagramHandle}
        </a>
      </PageIntro>
    );
  return (
    <>
      <PageIntro label="CORE RECRUITMENT 2026" title="Join a RO-BIO squad.">
        <p>
          We are picking new core members from <b>{recruitment.who}</b>. Read what each squad does
          and looks for, then sign up below. It takes two minutes.
        </p>
        <p className="mt-5 flex flex-wrap gap-3">
          <a href="#signup" className={btn}>
            Sign up now
          </a>
          <a
            href="#squads"
            className="inline-block rounded-full border-2 border-border bg-card px-6 py-3 font-bold transition-transform hover:-translate-y-0.5"
          >
            See the squads
          </a>
        </p>
      </PageIntro>
      <Facts />
      <HowItWorks />
      <Squads />
      <SignUp />
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-2 border-border bg-card p-4 shadow-hard">
      <p className="font-pixel text-[10px] text-primary">{label}</p>
      <div className="mt-2 font-bold leading-snug">{children}</div>
    </div>
  );
}

function Facts() {
  const room = (r: "G-07" | "G-09") => SQUADS.filter((s) => ROOMS[s] === r).join(", ");
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12" aria-label="When and where">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="WHEN">
          {DAYS[0]}, {recruitment.time}
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            {DAYS[1]} only if Friday is full. We confirm on WhatsApp.
          </span>
        </Fact>
        <Fact label="BE THERE BY">
          {recruitment.arriveBy}
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            So we can check you in and seat your group on time.
          </span>
        </Fact>
        <Fact label={`WHERE: ${recruitment.building.toUpperCase()}`}>
          <span className="block">G-07: {room("G-07")}</span>
          <span className="mt-1 block">G-09: {room("G-09")}</span>
        </Fact>
        <Fact label="SIGN UP BY">
          {recruitment.closesLabel}
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            Bring {recruitment.bring.join(" and ")}.
          </span>
        </Fact>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="how">
      <p className="font-pixel text-xs text-primary">NO SURPRISES</p>
      <h2 id="how" className="mt-2 text-3xl font-black md:text-4xl">
        What the interview is like
      </h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Window tag="ABOUT 15 MINUTES" title="You sit with a small group, not alone">
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Check in at the door with your name or USN. We send you to your squad's corner.</li>
            <li>You sit in a group of about 4 students, with 2 or 3 seniors from that squad.</li>
            <li>
              Introduce yourself: your name, branch and one thing you have made, fixed or organised.
            </li>
            <li>Answer a couple of questions about your squad's kind of work.</li>
            <li>
              Your group gets one question to talk through together. There is no single right
              answer.
            </li>
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            Design applicants also get a small design task when they arrive. See the Design squad
            below.
          </p>
        </Window>
        <Window tag="WHAT THE JUDGES LOOK AT" title="Five things, the same for everyone">
          <ul className="mt-3 space-y-2">
            {CRITERIA.map((c) => (
              <li key={c.key}>
                <b>{c.title}.</b> {LOOK_AT[c.key]}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            No marks for your branch, your semester or who you know. 1st semester students are not
            expected to know as much as 3rd semester students: we judge how you think.
          </p>
        </Window>
      </div>
      <div className="mt-6 border-2 border-dashed border-border bg-muted p-5">
        <p className="font-bold">
          Think about these before you come. Every squad asks them in some form:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Why RO-BIO, and why this squad?</li>
          <li>How many hours a week can you honestly give, including Saturdays and event days?</li>
          <li>Something you have made, fixed or organised, and what you did in it.</li>
        </ul>
      </div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <h4 className="mt-4 font-pixel text-[10px] text-primary">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </>
  );
}

function Squads() {
  return (
    <section
      id="squads"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16"
      aria-labelledby="squads-h"
    >
      <p className="font-pixel text-xs text-primary">FIVE SQUADS</p>
      <h2 id="squads-h" className="mt-2 text-3xl font-black md:text-4xl">
        Pick the squad that fits you
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        You need any one of the things a squad looks for, not all of them. You can also give a
        second choice when you sign up.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {SQUADS.map((s) => {
          const info = squadInfo(s);
          const slug = info?.slug;
          if (!info || !slug) return null;
          const call = recruitment.squads[slug];
          return (
            <article
              key={s}
              id={`squad-${slug}`}
              className="flex flex-col border-2 border-border bg-card shadow-hard"
            >
              <header className="flex items-center justify-between gap-3 border-b-2 border-border bg-secondary px-4 py-3">
                <h3 className="text-xl font-black">{s}</h3>
                <span className="shrink-0 border-2 border-border bg-background px-2 py-0.5 font-pixel text-[10px]">
                  ROOM {ROOMS[s]}
                </span>
              </header>
              <div className="flex flex-1 flex-col p-4">
                <p>{info.about}</p>
                <p className="mt-1 text-sm text-muted-foreground">{squadDuties[slug][1]}</p>
                {call.rule && (
                  <p className="mt-3 border-2 border-destructive bg-destructive/10 px-3 py-2 font-bold">
                    {call.rule}
                  </p>
                )}
                <List title="WE LOOK FOR (ANY ONE)" items={call.lookFor} />
                <List title="WHAT TO EXPECT" items={call.expect} />
                {call.bring && <List title="BRING" items={call.bring} />}
                <p className="mt-auto pt-4">
                  <Link
                    to="/team/$squad"
                    params={{ squad: slug }}
                    className="font-bold text-primary underline underline-offset-4"
                  >
                    Meet the {s} squad
                  </Link>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const blank = {
  name: "",
  sem: "",
  usn: "",
  branch: "",
  email: "",
  phone: "",
  first: "",
  second: "",
  day: DAYS[0] as string,
  consent: false,
  website: "",
};
type Done = { name: string; first: Squad; room: string; day: string | null };

function SignUp() {
  const [form, setForm] = useState(blank);
  const [state, setState] = useState<{ open: boolean; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    fetch("/api/recruit/apply")
      .then((r) => r.json() as Promise<{ open?: boolean; reason?: string }>)
      .then((r) => setState({ open: r.open === true, reason: r.reason ?? "" }))
      // If the check itself fails, show the form: the server still refuses a sign-up when it is closed.
      .catch(() => setState({ open: true, reason: "" }));
  }, []);

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/recruit/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, sem: Number(form.sem), second: form.second || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<Done>;
      if (!res.ok)
        throw new Error(data.error ?? `Something went wrong (${res.status}). Try again.`);
      setDone({
        name: data.name ?? form.name,
        first: (data.first ?? form.first) as Squad,
        room: data.room ?? ROOMS[form.first as Squad],
        day: data.day ?? form.day,
      });
      setForm(blank);
      document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="signup"
      className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 pt-16"
      aria-labelledby="signup-h"
    >
      <p className="font-pixel text-xs text-primary">SIGN UP</p>
      <h2 id="signup-h" className="mt-2 text-3xl font-black md:text-4xl">
        Register for the interview
      </h2>
      {done ? (
        <div role="status" className="mt-6 border-2 border-border bg-card p-5 shadow-hard">
          <p className="font-pixel text-[10px] text-primary">YOU ARE REGISTERED</p>
          <p className="mt-2 text-2xl font-black">See you there, {done.name.split(" ")[0]}.</p>
          <p className="mt-3">
            <b>{done.first}</b> squad interviews are in room <b>{done.room}</b>,{" "}
            {recruitment.building}. Come on <b>{done.day}</b> by <b>{recruitment.arriveBy}</b>, with{" "}
            {recruitment.bring.join(" and ")}.
          </p>
          {done.day === DAYS[1] && (
            <p className="mt-2">
              {DAYS[1]} runs only if Friday is full. We will confirm on WhatsApp. If it does not
              run, please come on {DAYS[0]}.
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Take a screenshot of this. To change your squad or day, tell an organiser at the door.
          </p>
          <button
            type="button"
            className="mt-4 font-bold text-primary underline"
            onClick={() => setDone(null)}
          >
            Register someone else on this phone
          </button>
        </div>
      ) : state && !state.open ? (
        <p role="status" className="mt-6 border-2 border-border bg-muted p-5 font-bold">
          {state.reason}
        </p>
      ) : (
        <form
          onSubmit={(e) => void submit(e)}
          className="relative mt-6 space-y-5 border-2 border-border bg-card p-5 shadow-hard"
        >
          <p className="text-sm text-muted-foreground">
            Everything marked * is needed. Sign-ups close on {recruitment.closesLabel}.
          </p>
          <label className="block">
            <span className="font-bold">Full name *</span>
            <input
              id="join-name"
              required
              maxLength={60}
              autoComplete="name"
              className={field}
              value={form.name}
              onChange={set("name")}
            />
          </label>
          <fieldset>
            <legend className="font-bold">Semester *</legend>
            <div className="mt-1 flex gap-3">
              {["1", "3"].map((v) => (
                <label key={v} className={choice(form.sem === v)}>
                  <input
                    type="radio"
                    name="sem"
                    value={v}
                    required
                    checked={form.sem === v}
                    onChange={set("sem")}
                    className="mt-1"
                  />
                  {v === "1" ? "1st sem" : "3rd sem"}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="font-bold">USN{form.sem === "3" ? " *" : ""}</span>
            <span className="block text-sm text-muted-foreground">
              1st semester and no USN yet? Leave it blank.
            </span>
            <input
              id="join-usn"
              required={form.sem === "3"}
              maxLength={20}
              autoCapitalize="characters"
              className={`${field} uppercase`}
              value={form.usn}
              onChange={set("usn")}
            />
          </label>
          <label className="block">
            <span className="font-bold">Branch *</span>
            <select
              id="join-branch"
              required
              className={field}
              value={form.branch}
              onChange={set("branch")}
            >
              <option value="">Pick your branch</option>
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-bold">WhatsApp number *</span>
              <input
                id="join-phone"
                type="tel"
                inputMode="tel"
                required
                maxLength={16}
                autoComplete="tel"
                placeholder="10 digits"
                className={field}
                value={form.phone}
                onChange={set("phone")}
              />
            </label>
            <label className="block">
              <span className="font-bold">Email *</span>
              <input
                id="join-email"
                type="email"
                required
                maxLength={120}
                autoComplete="email"
                className={field}
                value={form.email}
                onChange={set("email")}
              />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-bold">First choice squad *</span>
              <select
                id="join-first"
                required
                className={field}
                value={form.first}
                onChange={set("first")}
              >
                <option value="">Pick a squad</option>
                {SQUADS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold">Second choice squad</span>
              <select
                id="join-second"
                className={field}
                value={form.second}
                onChange={set("second")}
              >
                <option value="">No second choice</option>
                {SQUADS.filter((s) => s !== form.first).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            Your first choice squad interviews you. If they cannot take you, your second choice may.
          </p>
          <fieldset>
            <legend className="font-bold">Which day suits you? *</legend>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              {DAYS.map((d) => (
                <label key={d} className={choice(form.day === d)}>
                  <input
                    type="radio"
                    name="day"
                    value={d}
                    required
                    checked={form.day === d}
                    onChange={set("day")}
                    className="mt-1.5"
                  />
                  <span>
                    <b>{d}</b>
                    <span className="block text-sm">{DAY_NOTES[d]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {/* People never see this box. Bots fill it in, and the server then saves nothing. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set("website")}
              />
            </label>
          </div>
          <label className="flex items-start gap-3">
            <input
              id="join-consent"
              type="checkbox"
              required
              className="mt-1 h-5 w-5 shrink-0"
              checked={form.consent}
              onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
            />
            <span className="text-sm">
              I agree that RO-BIO may use these details only for this recruitment: to plan the
              interviews and to send me my result by email and WhatsApp. Judges see my name, USN,
              branch and squad, never my phone or email. The club deletes them after recruitment.{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {error && (
            <p role="alert" className="border-2 border-destructive bg-destructive/10 p-3 font-bold">
              {error}
            </p>
          )}
          <button type="submit" className={btn} disabled={busy}>
            {busy ? "Sending..." : "Register"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Questions? Ask on the WhatsApp group, or DM us on Instagram{" "}
        <a href={site.instagram} className="underline" target="_blank" rel="noreferrer">
          {site.instagramHandle}
        </a>
        .
      </p>
    </section>
  );
}
