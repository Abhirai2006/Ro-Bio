import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { merch } from "@/lib/site";
import { rupees } from "@/lib/merch";

const from = Math.min(...merch.products.map((p) => p.price));
const names = merch.colours.map((c) => c.name);

/**
 * "Wear the club" on the home page: a short loop of the zip hoodie turning and unzipping, and a way into the
 * 3D studio. A clip, not a second live 3D scene, so the home page stays quick next to the robot arm.
 * Hidden while the merch is still a draft for members (merch.draft in src/lib/site.ts).
 */
export function MerchTeaser() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    // people who ask for less motion get the still picture
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) video.current?.pause();
  }, []);
  if (merch.draft) return null;
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="wear-the-club">
      <p className="font-pixel text-xs text-primary">RO-BIO KIT / {merch.drop.toUpperCase()}</p>
      <div
        data-robo-perch
        className="mt-4 grid overflow-hidden border-2 border-border bg-card shadow-hard-violet md:grid-cols-[1.15fr_1fr]"
      >
        <div
          className="relative aspect-[5/4] border-b-2 border-border md:border-b-0 md:border-r-2"
          style={{
            background:
              // the same studio light the clip was filmed in, so its edges disappear
              "radial-gradient(70% 80% at 50% 45%, #e9e6ee 0%, #e2dee9 60%, #d6d2df 100%)",
          }}
        >
          <video
            ref={video}
            className="absolute inset-0 h-full w-full object-contain [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/merch/kit-loop.webp"
            aria-hidden="true"
          >
            <source src="/merch/kit-loop.webm" type="video/webm" />
            <source src="/merch/kit-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="flex flex-col justify-center p-6 md:p-10">
          <h2 id="wear-the-club" className="text-4xl font-black italic leading-none md:text-5xl">
            Wear the club.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A zip hoodie, a hoodie, a round neck tee and a polo in {names.slice(0, -1).join(", ")}{" "}
            and {names[names.length - 1]}. Our design team's Define the Future print on the back,
            their robot Mono and your name on the front, the college crest on one sleeve and your
            number on the other.
          </p>
          <p className="mt-5 font-mono text-2xl font-semibold">
            From {rupees(from)}{" "}
            <span className="font-pixel text-[10px] font-normal text-muted-foreground">
              {merch.priceNote.toUpperCase()}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/merch"
              className="border-2 border-border bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5"
            >
              Spin it in 3D
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Turn every piece, unzip the zip hoodie and try your own name and number.
          </p>
        </div>
      </div>
    </section>
  );
}
