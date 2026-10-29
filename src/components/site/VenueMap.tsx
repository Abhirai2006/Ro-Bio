import { site } from "@/lib/site";

/**
 * The venue map. Google Maps shows straight away, with a drawn blueprint behind it that you only see while it loads
 * (or if Google is blocked). The address is always written out underneath.
 */
export function VenueMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className="border-2 border-border bg-card shadow-hard">
      <div className={`relative overflow-hidden border-b-2 border-border bg-ink ${compact ? "aspect-[4/3]" : "aspect-[4/3] md:aspect-[16/10]"}`}>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="vm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#a979fa" strokeOpacity=".12" />
            </pattern>
          </defs>
          <rect width="400" height="300" fill="url(#vm-grid)" />
          {/* roads, drawn like a blueprint: not a real street plan */}
          <path d="M-10 210 C 90 190, 150 230, 250 180 S 360 120, 420 130" fill="none" stroke="#fffffa" strokeOpacity=".22" strokeWidth="14" />
          <path d="M120 -10 C 130 80, 170 140, 190 310" fill="none" stroke="#fffffa" strokeOpacity=".16" strokeWidth="9" />
          <path d="M260 -10 L 300 120 L 410 170" fill="none" stroke="#fffffa" strokeOpacity=".12" strokeWidth="6" />
          <path d="M-10 90 L 140 110 L 300 60" fill="none" stroke="#fffffa" strokeOpacity=".1" strokeWidth="5" strokeDasharray="10 8" />
          <g transform="translate(205 150)">
            <circle r="34" fill="none" stroke="#6294ff" strokeWidth="2" className="vm-ping" />
            <ellipse cy="4" rx="12" ry="4" fill="#000" opacity=".35" />
            <path d="M0 2 C -4 -10, -18 -16, -18 -30 A 18 18 0 1 1 18 -30 C 18 -16, 4 -10, 0 2 Z" fill="#725dff" stroke="#fffffa" strokeWidth="2.5" />
            <circle cy="-30" r="7" fill="#fffffa" />
          </g>
          <text x="200" y="250" textAnchor="middle" fill="#fffffa" fillOpacity=".7" fontSize="11" className="font-pixel">
            LOADING MAP
          </text>
        </svg>
        <iframe
          title={`Map of ${site.college}, Manasa Gangotri, Mysuru`}
          src={site.mapEmbed}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "p-4" : "p-5"}`}>
        <div className="min-w-0">
          <p className="font-pixel text-[11px] text-primary">VENUE</p>
          <p className={`mt-1 ${compact ? "text-sm" : ""}`}>{site.address}</p>
        </div>
        <a href={site.mapUrl} target="_blank" rel="noreferrer" className="shrink-0 border-2 border-border bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
