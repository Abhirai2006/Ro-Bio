// Makes one PDF per certificate from the mail merge sheet that /admin/certificates gives you.
// Uses the same certificateSvg() as the website, so the PDFs match the online certificates.
//
//   npm install                          (once)
//   npm install --no-save playwright     (once, does not change package.json)
//   npx playwright install chromium      (once, downloads the browser that makes the PDFs)
//   node scripts/cert-pdfs.mjs "C:\Users\you\Downloads\robo-spark-mail-merge.csv"
//
// The PDFs go to a folder named certificate-pdfs next to where you run it (or give a second path).
// That folder holds student names: it is in .gitignore, never commit it.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [csvPath, outArg] = process.argv.slice(2);
if (!csvPath) {
  console.log("Usage: node scripts/cert-pdfs.mjs <mail-merge.csv> [output folder]");
  process.exit(1);
}
const outDir = path.resolve(outArg ?? "certificate-pdfs");

const { createServer } = await import("vite");
const vite = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { "@": path.join(root, "src") } },
});

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
  console.log(
    "Playwright is missing. Run: npm install --no-save playwright && npx playwright install chromium",
  );
  await vite.close();
  process.exit(1);
}

try {
  const certs = await vite.ssrLoadModule("/src/lib/certificates.ts");
  const draw = await vite.ssrLoadModule("/src/lib/certificate-svg.ts");

  const MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    svg: "image/svg+xml",
    webp: "image/webp",
    woff2: "font/woff2",
  };
  const dataUri = (rel) => {
    const file = path.join(root, "public", rel);
    const ext = path.extname(file).slice(1).toLowerCase();
    return `data:${MIME[ext] ?? "application/octet-stream"};base64,${readFileSync(file).toString("base64")}`;
  };
  const sig = (f) => (f ? dataUri(`certificates/${f}`) : null);
  const assets = {
    ...Object.fromEntries(Object.entries(draw.CERT_FILES).map(([k, rel]) => [k, dataUri(rel)])),
    signatures: {
      left: sig(certs.SIGNATURES.left),
      centre: sig(certs.SIGNATURES.centre),
      right: sig(certs.SIGNATURES.right),
    },
  };
  const fontCss = draw.certFontCss((f) => dataUri(`fonts/cert/${f}`));

  const rows = certs.parseCsv(readFileSync(csvPath, "utf8"));
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const at = {
    no: col("certificate number"),
    name: col("name"),
    kind: col("kind"),
    team: col("team"),
    branch: col("branch"),
    role: col("role"),
  };
  if (at.no < 0 || at.name < 0 || at.kind < 0) {
    throw new Error(
      'This is not the mail merge sheet: it needs "Certificate number", "Name" and "Kind" columns.',
    );
  }
  const cell = (r, i) => (i >= 0 ? (r[i] ?? "").replace(/^'(?=[=+\-@])/, "").trim() : "");

  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let made = 0;
  for (const r of rows.slice(1)) {
    const no = certs.cleanCertNo(cell(r, at.no));
    const kind = cell(r, at.kind) === "coordinator" ? "coordinator" : "student";
    if (!no) {
      console.log(`Skipped a row with no certificate number: ${r.join(", ")}`);
      continue;
    }
    const cert = {
      no,
      kind,
      name: cell(r, at.name),
      team: kind === "student" ? Number(cell(r, at.team)) || null : null,
      branch: cell(r, at.branch),
      role: cell(r, at.role),
    };
    const svg = draw.certificateSvg(cert, assets, fontCss);
    await page.setContent(
      `<!doctype html><html><head><style>@page{size:297mm 210mm;margin:0}html,body{margin:0;width:297mm;height:210mm;overflow:hidden}svg{display:block;width:297mm;height:210mm}</style></head><body>${svg}</body></html>`,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((i) =>
          i.complete ? null : new Promise((ok) => (i.onload = i.onerror = ok)),
        ),
      );
    });
    const file = path.join(outDir, certs.certFileName(cert));
    writeFileSync(file, await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    made++;
    console.log(`Made ${path.basename(file)}`);
  }
  await browser.close();
  console.log(`\nDone: ${made} PDF${made === 1 ? "" : "s"} in ${outDir}`);
} finally {
  await vite.close();
}
