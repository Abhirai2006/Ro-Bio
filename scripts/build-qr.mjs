// Writes the printable QR codes in public/qr/ from qrLink in src/lib/site.ts, so a poster never points at an old address.
// Runs before every build, and by hand with `npm run qr`. Never fails the build.
//   robio-qr.svg       the plain code, sharp at any size
//   robio-qr.png       the plain code as a 1200 px image, for WhatsApp, slides and Canva
//   robio-qr-card.svg  a poster card with the logo, the code and the address
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

try {
  const { qrLink } = await import("../src/lib/site.ts");
  const { qrPath } = await import("../src/lib/qr.ts");
  const qr = qrPath(qrLink);
  mkdirSync("public/qr", { recursive: true });

  const plain = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${qr.d}" fill="#201e2d"/></svg>\n`;
  writeFileSync("public/qr/robio-qr.svg", plain);

  // PNG: 8-bit greyscale, each module drawn as a square block of pixels.
  const scale = Math.floor(1200 / qr.size), px = qr.size * scale, margin = (qr.size - qr.modules) / 2;
  const raw = Buffer.alloc((px + 1) * px, 255);
  for (let y = 0; y < px; y++) {
    raw[y * (px + 1)] = 0; // filter type: none
    for (let x = 0; x < px; x++)
      if (qr.dark(Math.floor(y / scale) - margin, Math.floor(x / scale) - margin)) raw[y * (px + 1) + 1 + x] = 0x20;
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "ascii");
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0);
  ihdr.writeUInt32BE(px, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync("public/qr/robio-qr.png", png);

  // Poster card, 600 x 860, in the site's colours. The logo is embedded so the file works on its own.
  const logo = readFileSync("src/assets/robio-logo.jpg").toString("base64");
  const host = qrLink.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const box = 440, unit = box / qr.size;
  const card = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 860" width="600" height="860">
  <rect width="600" height="860" fill="#201e2d"/>
  <rect x="16" y="16" width="568" height="828" fill="none" stroke="#725dff" stroke-width="4"/>
  <defs><clipPath id="logo"><circle cx="300" cy="104" r="56"/></clipPath></defs>
  <circle cx="300" cy="104" r="60" fill="#fffffa"/>
  <image xlink:href="data:image/jpeg;base64,${logo}" x="244" y="48" width="112" height="112" clip-path="url(#logo)"/>
  <text x="300" y="214" text-anchor="middle" font-family="Tektur, Arial Black, Arial, sans-serif" font-weight="900" font-style="italic" font-size="48" fill="#fffffa">RO-BIO</text>
  <text x="300" y="246" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#a979fa">Biomedical and Robotic Engineering, MUSE Mysuru</text>
  <rect x="80" y="276" width="${box}" height="${box}" fill="#ffffff"/>
  <path transform="translate(80 276) scale(${unit})" d="${qr.d}" fill="#201e2d" shape-rendering="crispEdges"/>
  <text x="300" y="768" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="30" fill="#6294ff" letter-spacing="2">SCAN TO JOIN US</text>
  <text x="300" y="806" text-anchor="middle" font-family="Courier New, monospace" font-size="17" fill="#fffffa" fill-opacity="0.8">${host}</text>
</svg>
`;
  writeFileSync("public/qr/robio-qr-card.svg", card);
  console.log(`build-qr: wrote public/qr (${qr.modules}x${qr.modules} code for ${qrLink})`);
} catch (e) {
  console.warn("build-qr skipped:", e.message);
}
