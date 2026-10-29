import qrcode from "qrcode-generator";

/**
 * A QR code as one SVG path, one unit per module, with the 4-module quiet zone scanners need around it.
 * Error correction level M survives a scuffed or slightly folded poster.
 */
export function qrPath(text: string, margin = 4) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; ) {
      if (!qr.isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && qr.isDark(r, c)) c++;
      d += `M${start + margin} ${r + margin}h${c - start}v1h${start - c}z`;
    }
  return { size: n + margin * 2, modules: n, d, dark: (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) };
}
