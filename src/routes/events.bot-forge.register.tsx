import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageIntro } from "@/components/site/parts";
import { bigBtn } from "@/components/site/BotForge";
import {
  BF_SEMS,
  botForgeApi,
  isContest,
  payNote,
  paymentsOpen,
  upiLink,
  upiReady,
} from "@/lib/bot-forge";
import { BRANCHES } from "@/lib/certificates";
import { qrPath } from "@/lib/certificate-svg";
import { canonical } from "@/lib/seo";
import {
  botForge,
  botForgeInfo,
  contestBySlug,
  eventDate,
  rupees,
  site,
  type ContestSlug,
} from "@/lib/site";

const description = `Register your team for Bot Forge, ${eventDate(botForge)} at ${site.college}. ${rupees(botForgeInfo.fee)} per team. Registration closes ${botForgeInfo.closesLabel}.`;

export const Route = createFileRoute("/events/bot-forge/register")({
  validateSearch: (s: Record<string, unknown>): { contest?: ContestSlug } =>
    isContest(s["contest"]) ? { contest: s["contest"] } : {},
  head: () => ({
    links: [canonical("/events/bot-forge/register")],
    meta: [
      { title: "Register for Bot Forge | RO-BIO" },
      { name: "description", content: description },
      { property: "og:title", content: "Register for Bot Forge | RO-BIO" },
      { property: "og:description", content: description },
      { property: "og:image", content: `${site.url}/events/bot-forge.jpg` },
    ],
  }),
  component: RegisterPage,
});

/** The last team registered on this phone: its number and name only, never anyone's details. */
const KEY = "robio-botforge-team";
type Saved = { code: string; name: string; contest: ContestSlug };
const readSaved = (): Saved | null => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    return v && typeof v.code === "string" ? v : null;
  } catch {
    return null;
  }
};
const writeSaved = (v: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage blocked: the success screen still shows the number */
  }
};

const field = "mt-1 block w-full border-2 border-border bg-background px-3 py-2.5 text-base";
const choice = (on: boolean) =>
  `flex cursor-pointer items-start gap-3 border-2 border-border p-4 ${on ? "bg-primary text-primary-foreground" : "bg-background"}`;

type MemberForm = { name: string; usn: string; branch: string; sem: string };
const blankMember = (): MemberForm => ({ name: "", usn: "", branch: "", sem: "" });
type Status = { open: boolean; reason: string; kits: Record<string, number> };
type Done = Saved & { kit: boolean; kitGone: boolean; phone: string };

function RegisterPage() {
  const { contest } = Route.useSearch();
  const [status, setStatus] = useState<Status | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    setSaved(readSaved());
    botForgeApi<Status>("register")
      .then(setStatus)
      .catch((e: Error) => setStatus({ open: false, reason: e.message, kits: {} }));
  }, []);

  return (
    <>
      <PageIntro label="BOT FORGE / REGISTRATION" title="Register your team.">
        <p>
          {eventDate(botForge)} at {site.college}. {rupees(botForgeInfo.fee)} per team, paid by UPI.
          Registration closes <b>{botForgeInfo.closesLabel}</b>.
        </p>
        <p className="mt-3 text-base">
          <Link to="/events/bot-forge" className="font-bold text-primary underline">
            Read about Bot Forge and the rules
          </Link>
        </p>
      </PageIntro>
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-12" aria-labelledby="form-h">
        <h2 id="form-h" className="sr-only">
          Team form
        </h2>
        {done ? (
          <Registered done={done} onAgain={() => setDone(null)} />
        ) : !status ? (
          <p className="font-pixel text-sm text-primary">LOADING…</p>
        ) : !status.open ? (
          <p role="status" className="border-2 border-border bg-muted p-5 font-bold">
            {status.reason}{" "}
            <a href={site.instagram} target="_blank" rel="noreferrer" className="underline">
              {site.instagramHandle}
            </a>
          </p>
        ) : (
          <TeamForm
            start={contest}
            kits={status.kits}
            onDone={(d) => {
              writeSaved({ code: d.code, name: d.name, contest: d.contest });
              setSaved({ code: d.code, name: d.name, contest: d.contest });
              setDone(d);
              document.getElementById("form-h")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}
      </section>
      {!done && paymentsOpen() && (
        <section className="mx-auto max-w-3xl px-4 pb-24" aria-labelledby="pay-later">
          <p className="font-pixel text-xs text-primary">ALREADY REGISTERED?</p>
          <h2 id="pay-later" className="mt-2 text-3xl font-black">
            Send your payment
          </h2>
          <p className="mt-2 text-muted-foreground">
            Paid after registering, or paying now? Use your team number and the team leader's
            WhatsApp number from the form.
          </p>
          <div className="mt-6 border-2 border-border bg-card p-5 shadow-hard">
            <PayBox code={saved?.code ?? ""} phone="" />
          </div>
        </section>
      )}
    </>
  );
}

function TeamForm({
  start,
  kits,
  onDone,
}: {
  start?: ContestSlug | undefined;
  kits: Record<string, number>;
  onDone: (d: Done) => void;
}) {
  const [contest, setContest] = useState<ContestSlug | "">(start ?? "");
  const c = contest ? contestBySlug(contest) : undefined;
  const [name, setName] = useState("");
  const [members, setMembers] = useState<MemberForm[]>(() =>
    Array.from({ length: (start && contestBySlug(start)?.team[0]) || 3 }, blankMember),
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [kit, setKit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const kitsLeft = c && c.kits ? (kits[c.slug] ?? 0) : 0;

  // A new contest: keep the members typed so far, within that contest's team size.
  const pick = (slug: ContestSlug) => {
    const next = contestBySlug(slug)!;
    setContest(slug);
    setKit(false);
    setMembers((m) => {
      const kept = m.slice(0, next.team[1]);
      while (kept.length < next.team[0]) kept.push(blankMember());
      return kept;
    });
  };
  const setMember = (i: number, k: keyof MemberForm, v: string) =>
    setMembers((m) => m.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!c) return setError("Pick the contest your team enters.");
    setBusy(true);
    setError("");
    try {
      const r = await botForgeApi<{
        code: string;
        name: string;
        contest: ContestSlug;
        kit: boolean;
        kitGone: boolean;
      }>("register", {
        method: "POST",
        body: JSON.stringify({
          contest: c.slug,
          name,
          members: members.map((m) => ({ ...m, sem: Number(m.sem) })),
          phone,
          email,
          kit,
          consent,
          website,
        }),
      });
      onDone({ ...r, phone });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="relative space-y-6 border-2 border-border bg-card p-5 shadow-hard"
    >
      <p className="text-sm text-muted-foreground">Everything marked * is needed.</p>
      <fieldset>
        <legend className="font-bold">Which contest? *</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {botForgeInfo.contests.map((o) => (
            <label key={o.slug} className={choice(contest === o.slug)}>
              <input
                type="radio"
                name="contest"
                required
                checked={contest === o.slug}
                onChange={() => pick(o.slug)}
                className="mt-1.5"
              />
              <span>
                <b className="block font-display text-lg">{o.title}</b>
                <span className="block text-sm">
                  Teams of {o.team[0]} to {o.team[1]}
                </span>
                <span className="block text-sm">
                  {rupees(o.prizes[0])} + {rupees(o.prizes[1])} prizes
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A team enters one contest only.{" "}
          {c && (
            <Link
              to="/events/bot-forge/$contest"
              params={{ contest: c.slug }}
              className="underline"
            >
              Read the {c.title} rules
            </Link>
          )}
        </p>
      </fieldset>

      <label className="block">
        <span className="font-bold">Team name *</span>
        <input
          id="bf-team"
          required
          minLength={2}
          maxLength={40}
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <fieldset className="space-y-4">
        <legend className="font-bold">
          Team members *{" "}
          {c && (
            <span className="font-normal text-muted-foreground">
              ({c.team[0]} to {c.team[1]}, the team leader first)
            </span>
          )}
        </legend>
        {members.map((m, i) => (
          <Member key={i} i={i} m={m} set={setMember}>
            {c && members.length > c.team[0] && i > 0 && (
              <button
                type="button"
                className="text-sm font-bold text-destructive underline"
                onClick={() => setMembers((all) => all.filter((_, j) => j !== i))}
              >
                Remove member {i + 1}
              </button>
            )}
          </Member>
        ))}
        {(!c || members.length < c.team[1]) && (
          <button
            type="button"
            className="border-2 border-border bg-secondary px-4 py-2 font-bold"
            onClick={() => setMembers((all) => [...all, blankMember()])}
            disabled={!c}
          >
            {c ? "Add a member" : "Pick a contest to add members"}
          </button>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="font-bold">Team leader's WhatsApp number *</span>
          <input
            id="bf-phone"
            type="tel"
            inputMode="tel"
            required
            maxLength={16}
            autoComplete="tel"
            placeholder="10 digits"
            className={field}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-bold">Team leader's email *</span>
          <input
            id="bf-email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>

      {c && c.kits > 0 && (
        <label className="flex items-start gap-3 border-2 border-dashed border-border p-4">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={kit}
            disabled={kitsLeft <= 0}
            onChange={(e) => setKit(e.target.checked)}
          />
          <span>
            <b>We want a club kit</b>{" "}
            <span className="text-sm">
              ({kitsLeft > 0 ? `${kitsLeft} of ${c.kits} left` : "all kits are taken"})
            </span>
            <span className="block text-sm text-muted-foreground">
              First come, first served. If your team damages any part of the kit, your team pays for
              it. {kitsLeft <= 0 && "Bring your own components and materials."}
            </span>
          </span>
        </label>
      )}

      {/* People never see this box. Bots fill it in, and the server then saves nothing. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-start gap-3">
        <input
          id="bf-consent"
          type="checkbox"
          required
          className="mt-1 h-5 w-5 shrink-0"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className="text-sm">
          I agree that RO-BIO may use these details only to run Bot Forge: to check our team in,
          contact our team leader and make our certificates. If our team wins, our team name and our
          members' names will be shown on the Bot Forge results page. Every member has agreed to
          this.{" "}
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
      <button type="submit" className={bigBtn} disabled={busy}>
        {busy ? "Sending..." : "Register our team"}
      </button>
      <p className="text-sm text-muted-foreground">
        Next you pay {rupees(botForgeInfo.fee)} by UPI and send us the transaction number.
      </p>
    </form>
  );
}

function Member({
  i,
  m,
  set,
  children,
}: {
  i: number;
  m: MemberForm;
  set: (i: number, k: keyof MemberForm, v: string) => void;
  children?: ReactNode;
}) {
  const id = (k: string) => `bf-m${i}-${k}`;
  return (
    <div className="border-2 border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel text-[10px] text-primary">
          {i === 0 ? "TEAM LEADER" : `MEMBER ${i + 1}`}
        </p>
        {children}
      </div>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold">Full name *</span>
          <input
            id={id("name")}
            required
            maxLength={60}
            className={field}
            value={m.name}
            onChange={(e) => set(i, "name", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Semester *</span>
          <select
            id={id("sem")}
            required
            className={field}
            value={m.sem}
            onChange={(e) => set(i, "sem", e.target.value)}
          >
            <option value="">Pick</option>
            {BF_SEMS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">USN{m.sem && m.sem !== "1" ? " *" : ""}</span>
          <input
            id={id("usn")}
            required={!!m.sem && m.sem !== "1"}
            maxLength={20}
            autoCapitalize="characters"
            placeholder={m.sem === "1" ? "Blank if you have none yet" : ""}
            className={`${field} uppercase`}
            value={m.usn}
            onChange={(e) => set(i, "usn", e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold">Branch *</span>
          <select
            id={id("branch")}
            required
            className={field}
            value={m.branch}
            onChange={(e) => set(i, "branch", e.target.value)}
          >
            <option value="">Pick the branch</option>
            {BRANCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Registered({ done, onAgain }: { done: Done; onAgain: () => void }) {
  const c = contestBySlug(done.contest)!;
  return (
    <div className="space-y-6">
      <div role="status" className="border-2 border-border bg-card p-5 shadow-hard-violet">
        <p className="font-pixel text-[10px] text-primary">STEP 1 DONE: YOU ARE REGISTERED</p>
        <p className="mt-2 text-2xl font-black">
          {done.name} is in {c.title}.
        </p>
        <p className="mt-3 text-lg">
          Your team number is{" "}
          <b className="border-2 border-border bg-secondary px-2 font-mono">{done.code}</b>. Take a
          screenshot of this.
        </p>
        {c.kits > 0 && (
          <p className="mt-3">
            {done.kit
              ? "A club kit is held for your team. If any part of it is damaged, your team pays for it."
              : done.kitGone
                ? "Sorry, the club kits ran out just before you. Bring your own components and materials."
                : "No club kit: bring your own components and materials."}
          </p>
        )}
      </div>
      <div className="border-2 border-border bg-card p-5 shadow-hard">
        <p className="font-pixel text-[10px] text-primary">STEP 2: PAY THE FEE</p>
        <PayBox code={done.code} phone={done.phone} />
      </div>
      <button type="button" className="font-bold text-primary underline" onClick={onAgain}>
        Register another team on this phone
      </button>
    </div>
  );
}

/** How to pay, the UPI QR code, and the box for the transaction number. */
function PayBox({ code: start, phone: startPhone }: { code: string; phone: string }) {
  const [code, setCode] = useState(start);
  const [phone, setPhone] = useState(startPhone);
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  useEffect(() => setCode(start), [start]);
  const ready = upiReady();
  const shown = code.trim().toUpperCase() || "YOUR-TEAM-NUMBER";
  const qr = useMemo(() => (ready ? upiLink(shown) : ""), [ready, shown]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await botForgeApi<{ code: string }>("payment", {
        method: "POST",
        body: JSON.stringify({ code, phone, utr }),
      });
      setSent(r.code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <p role="status" className="mt-3 text-lg">
        <b>Payment sent for {sent}.</b> We check it against the account and mark your team paid. If
        something does not match, a coordinator will call your team leader. See you on{" "}
        {eventDate(botForge)}!
      </p>
    );
  return (
    <div className="mt-3 space-y-5">
      {ready ? (
        <div className="grid items-start gap-5 sm:grid-cols-[180px_1fr]">
          <svg
            viewBox="-2 -2 41 41"
            className="w-full max-w-[180px] border-2 border-border bg-white p-1"
            role="img"
            aria-label={`UPI QR code to pay ${rupees(botForgeInfo.fee)}`}
            dangerouslySetInnerHTML={{ __html: qrPath(qr, 0, 0, 37, "#201e2d") }}
          />
          <div>
            <p>
              Pay <b>{rupees(botForgeInfo.fee)}</b> to <b>{botForgeInfo.upi.id}</b>
              {botForgeInfo.upi.payee && <> ({botForgeInfo.upi.payee})</>}. Scan the code, or on
              this phone:
            </p>
            <a href={qr} className={`${bigBtn} mt-3`}>
              Pay in a UPI app
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              Put <b>{payNote(shown)}</b> in the payment note. The fee is not refundable.
            </p>
          </div>
        </div>
      ) : (
        <p className="border-2 border-dashed border-border bg-muted p-4">
          <b>The UPI payment details go up here very soon.</b> Keep your team number. Come back to
          this page, pay {rupees(botForgeInfo.fee)}, and send the transaction number with the form
          below.
        </p>
      )}
      <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-bold">Team number *</span>
          <input
            required
            placeholder="SUMO-07"
            autoCapitalize="characters"
            className={`${field} uppercase`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Leader's WhatsApp *</span>
          <input
            required
            type="tel"
            inputMode="tel"
            maxLength={16}
            placeholder="10 digits"
            className={field}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">UPI transaction number (UTR) *</span>
          <input
            required
            inputMode="numeric"
            maxLength={16}
            placeholder="12 digits"
            className={field}
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground sm:col-span-3">
          The UTR is the 12 digit number on the payment's details screen in your UPI app (it may be
          called the UPI reference number).
        </p>
        {error && (
          <p
            role="alert"
            className="border-2 border-destructive bg-destructive/10 p-3 font-bold sm:col-span-3"
          >
            {error}
          </p>
        )}
        <div className="sm:col-span-3">
          <button type="submit" className={bigBtn} disabled={busy}>
            {busy ? "Sending..." : "Send the payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
