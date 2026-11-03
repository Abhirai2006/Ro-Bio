import { useEffect, useMemo, useState } from "react";
import { certSummary, type Cert } from "@/lib/certificates";
import { downloadPng, pageSvg, printCertificate, PRINT_CSS } from "@/lib/cert-download";

/** The print rules for the "Save as PDF" button. Render once on a page that shows certificates. */
export function CertificatePrintStyle() {
  return <style>{PRINT_CSS}</style>;
}

/** One certificate with its two buttons. The buttons wait until the page has finished loading. */
export function CertificateCard({ cert, banner = false }: { cert: Cert; banner?: boolean }) {
  const svg = useMemo(() => pageSvg(cert), [cert]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setReady(true), []);

  const png = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadPng(cert);
    } catch (err) {
      setError((err as Error).message || "Could not make the picture. Try Save as PDF instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="space-y-4">
      {banner && (
        <div
          role="status"
          className="border-2 border-border bg-card p-4 shadow-hard md:flex md:items-center md:gap-5"
        >
          <p className="font-pixel text-xs text-primary md:shrink-0">VALID CERTIFICATE ✓</p>
          <div className="mt-2 md:mt-0">
            <p className="text-xl font-black">{cert.name}</p>
            <p className="text-sm text-muted-foreground">
              {certSummary(cert)}. Number <span className="font-mono">{cert.no}</span>.
            </p>
          </div>
        </div>
      )}
      <div
        className="overflow-hidden border-2 border-border bg-card shadow-hard [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        role="img"
        aria-label={`Robo Spark certificate for ${cert.name}, number ${cert.no}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={() => printCertificate(cert)}
          className="border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard disabled:opacity-60"
        >
          Save as PDF
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void png()}
          className="border-2 border-border bg-card px-4 py-2 font-bold shadow-hard disabled:opacity-60"
        >
          {busy ? "Making the picture…" : "Download picture (PNG)"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Save as PDF opens the print window: pick <b>Save as PDF</b> as the printer. The picture is
        3369 x 2382 pixels, good for sharing and printing.
      </p>
      {error && (
        <p
          role="alert"
          className="border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold"
        >
          {error}
        </p>
      )}
    </article>
  );
}
