import { qrPath } from "@/lib/qr";

/** A QR code drawn as crisp SVG. White behind it and a quiet zone around it, so it scans in the dark theme too. */
export function QrCode({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const qr = qrPath(text);
  return (
    <svg viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={label} className={className}>
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <path d={qr.d} fill="#201e2d" />
    </svg>
  );
}
