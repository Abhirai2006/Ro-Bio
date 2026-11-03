import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { canonical } from "@/lib/seo";
import { certApi, cleanCertNo, type Cert } from "@/lib/certificates";
import { CertificateCard, CertificatePrintStyle } from "@/components/site/CertificateCard";
import { PageIntro } from "@/components/site/parts";

export const Route = createFileRoute("/verify/$no")({
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.no.toUpperCase()} | RO-BIO` },
      { name: "description", content: "Check that a Robo Spark certificate from RO-BIO is real." },
      { name: "robots", content: "noindex" },
    ],
    links: [canonical(`/verify/${params.no}`)],
  }),
  component: VerifyPage,
});

type State =
  | { kind: "loading" }
  | { kind: "found"; cert: Cert }
  | { kind: "missing" }
  | { kind: "error"; text: string };

function VerifyPage() {
  const { no: raw } = Route.useParams();
  const no = cleanCertNo(raw);
  const [state, setState] = useState<State>(no ? { kind: "loading" } : { kind: "missing" });

  useEffect(() => {
    if (!no) return setState({ kind: "missing" });
    let live = true;
    setState({ kind: "loading" });
    certApi<{ cert: Cert }>(`verify/${encodeURIComponent(no)}`)
      .then(({ cert }) => live && setState({ kind: "found", cert }))
      .catch(
        (err: Error) =>
          live &&
          setState(
            /no certificate/i.test(err.message)
              ? { kind: "missing" }
              : { kind: "error", text: err.message || "Could not reach the server." },
          ),
      );
    return () => {
      live = false;
    };
  }, [no]);

  return (
    <>
      <CertificatePrintStyle />
      <PageIntro
        label="ROBO SPARK 2026 / CERTIFICATE CHECK"
        title={state.kind === "missing" ? "No certificate with this number" : "Certificate check"}
      >
        <span className="font-mono">{no ?? raw}</span>
      </PageIntro>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10">
        <div>
          {state.kind === "loading" && (
            <p className="font-pixel text-sm text-primary" role="status">
              CHECKING…
            </p>
          )}
          {state.kind === "found" && <CertificateCard cert={state.cert} banner />}
          {state.kind === "missing" && (
            <div className="max-w-xl border-2 border-border bg-card p-5 shadow-hard">
              <p>
                RO-BIO has not given a certificate with this number. Check the number on the
                certificate, or find yours with the email you used in the form.
              </p>
              <Link
                to="/certificates"
                className="mt-4 inline-block border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard"
              >
                Find my certificate
              </Link>
            </div>
          )}
          {state.kind === "error" && (
            <p
              role="alert"
              className="max-w-xl border-2 border-destructive bg-destructive/10 p-3 font-bold"
            >
              {state.text} Reload the page to try again.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
