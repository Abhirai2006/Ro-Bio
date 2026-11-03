import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { canonical } from "@/lib/seo";
import { certApi, cleanEmail, isEmail, type Cert } from "@/lib/certificates";
import { CertificateCard, CertificatePrintStyle } from "@/components/site/CertificateCard";
import { PageIntro } from "@/components/site/parts";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "Get your Robo Spark certificate | RO-BIO" },
      {
        name: "description",
        content: "Find your Robo Spark certificate with the email you used in the form.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [canonical("/certificates")],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ email: string; certs: Cert[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Someone on a slow phone may type before the page has started: keep what they typed.
  useEffect(() => {
    if (input.current?.value) setEmail(input.current.value);
    setReady(true);
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const typed = cleanEmail(new FormData(e.currentTarget).get("email"));
    setEmail(typed);
    if (!isEmail(typed)) return setError("Type the full email address, like yourname@gmail.com.");
    setBusy(true);
    setError("");
    try {
      const { certs } = await certApi<{ certs: Cert[] }>("lookup", {
        method: "POST",
        body: JSON.stringify({ email: typed }),
      });
      setFound({ email: typed, certs });
    } catch (err) {
      setFound(null);
      setError((err as Error).message || "Could not reach the server. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CertificatePrintStyle />
      <PageIntro label="ROBO SPARK 2026 / CERTIFICATES" title="Get your certificate">
        Type the email you signed in to the Robo Spark certificate form with. Your certificate opens
        here, ready to save as a PDF or a picture.
      </PageIntro>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10">
        <form
          onSubmit={submit}
          className="max-w-xl space-y-4 border-2 border-border bg-card p-5 shadow-hard"
        >
          <label className="block">
            <span className="font-bold">Your email</span>
            <input
              ref={input}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="yourname@gmail.com"
              className="mt-1 block w-full border-2 border-border bg-background px-3 py-3 text-lg"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold"
            >
              {error}
            </p>
          )}
          <button
            disabled={!ready || busy}
            className="w-full border-2 border-border bg-primary px-4 py-3 text-lg font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Looking…" : "Find my certificate"}
          </button>
        </form>

        {found && found.certs.length === 0 && (
          <div role="status" className="mt-8 max-w-xl border-2 border-border bg-secondary p-5">
            <p className="font-pixel text-xs text-primary">NOTHING FOUND YET</p>
            <p className="mt-2">
              We could not find a certificate for <b>{found.email}</b>. Check it is the same email
              you signed in to the form with. Certificates are added after the event, so if yours is
              not here yet, look again later.
            </p>
            <p className="mt-2">
              Still stuck? Ask an organiser on the{" "}
              <Link to="/contact" className="font-bold text-primary underline">
                contact page
              </Link>
              .
            </p>
          </div>
        )}

        {found && found.certs.length > 0 && (
          <div className="mt-10 space-y-12">
            <p role="status" className="font-pixel text-xs text-primary">
              {found.certs.length === 1
                ? "1 CERTIFICATE FOUND"
                : `${found.certs.length} CERTIFICATES FOUND`}
            </p>
            {found.certs.map((c) => (
              <CertificateCard key={c.no} cert={c} banner />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
