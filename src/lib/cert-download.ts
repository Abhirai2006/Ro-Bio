// Browser only: the "Save as PDF" and "Download picture (PNG)" buttons on the certificate pages.
import { certFileName, SIGNATURES, type Cert } from "@/lib/certificates";
import {
  CERT_FILES,
  CERT_FONTS,
  CERT_H,
  CERT_W,
  certAssetUrls,
  certFontCss,
  certificateSvg,
  type CertAssets,
} from "@/lib/certificate-svg";

/** The certificate as drawn on the site pages (pictures and fonts loaded from the site). */
export function pageSvg(cert: Cert): string {
  return certificateSvg(cert, certAssetUrls(SIGNATURES), certFontCss());
}

const dataUris = new Map<string, Promise<string>>();
function dataUri(url: string): Promise<string> {
  let p = dataUris.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url}`);
        return r.blob();
      })
      .then(
        (b) =>
          new Promise<string>((ok, fail) => {
            const fr = new FileReader();
            fr.onload = () => ok(String(fr.result));
            fr.onerror = () => fail(fr.error);
            fr.readAsDataURL(b);
          }),
      );
    p.catch(() => dataUris.delete(url));
    dataUris.set(url, p);
  }
  return p;
}

/** The certificate as one file with every picture and font inside it. */
export async function standaloneSvg(cert: Cert): Promise<string> {
  const urls = certAssetUrls(SIGNATURES);
  const keys = Object.keys(CERT_FILES) as (keyof typeof CERT_FILES)[];
  const pics = await Promise.all(keys.map((k) => dataUri(urls[k])));
  const sig = async (u: string | null) => (u ? dataUri(u) : null);
  const [left, centre, right] = await Promise.all([
    sig(urls.signatures.left),
    sig(urls.signatures.centre),
    sig(urls.signatures.right),
  ]);
  const assets = {
    ...Object.fromEntries(keys.map((k, i) => [k, pics[i] ?? ""])),
    signatures: { left, centre, right },
  } as CertAssets;
  const fonts = await Promise.all(CERT_FONTS.map((f) => dataUri(`/fonts/cert/${f.file}`)));
  const byFile = new Map(CERT_FONTS.map((f, i) => [f.file as string, fonts[i] ?? ""]));
  return certificateSvg(
    cert,
    assets,
    certFontCss((f) => byFile.get(f) ?? ""),
  );
}

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** A 3x picture: 3369 x 2382 px. */
export async function downloadPng(cert: Cert): Promise<void> {
  const svg = await standaloneSvg(cert);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = url;
    await img.decode();
    // Fonts inside an SVG picture can take a moment more than the picture itself.
    await new Promise((r) => setTimeout(r, 250));
    const canvas = document.createElement("canvas");
    canvas.width = CERT_W * 3;
    canvas.height = CERT_H * 3;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw pictures.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    if (!blob) throw new Error("This browser could not make the picture.");
    save(blob, certFileName(cert, "png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const PRINT_ROOT = "cert-print-root";

/** Opens the print window with only this certificate on one A4 landscape page. */
export function printCertificate(cert: Cert): void {
  document.getElementById(PRINT_ROOT)?.remove();
  const root = document.createElement("div");
  root.id = PRINT_ROOT;
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = pageSvg(cert);
  document.body.append(root);
  const title = document.title;
  document.title = certFileName(cert, "pdf").replace(/\.pdf$/, "");
  const done = () => {
    document.title = title;
    root.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

/** The print rules: only the certificate, one page, no margins. Put once on each certificate page. */
export const PRINT_CSS = `
#${PRINT_ROOT}{display:none}
@page{size:297mm 210mm;margin:0}
@media print{
  html,body{width:297mm!important;height:210mm!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;background:#fff!important}
  body>*:not(#${PRINT_ROOT}){display:none!important}
  #${PRINT_ROOT}{display:block!important;position:absolute;left:0;top:0;width:297mm;height:210mm;overflow:hidden}
  #${PRINT_ROOT} svg{display:block;width:297mm;height:210mm}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}`;
