import { Link } from "@tanstack/react-router";
import { merch } from "@/lib/site";
import { rupees } from "@/lib/merch";

const jacket = merch.products[0]!;

/**
 * "Wear the club" on the home page: a picture of the club jacket and a way into the 3D studio. A still picture,
 * not a second live 3D scene, so the home page stays quick next to the robot arm.
 * Hidden while the merch is still a draft for members (merch.draft in src/lib/site.ts).
 */
export function MerchTeaser() {
  if (merch.draft) return null;
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="wear-the-club">
      <div
        data-robo-perch
        className="grid overflow-hidden border-2 border-border bg-card shadow-hard-violet md:grid-cols-[1.15fr_1fr]"
      >
        <div
          className="relative aspect-[5/4] border-b-2 border-border md:border-b-0 md:border-r-2"
          style={{
            background:
              // the same studio light the picture was taken in, so its edges disappear
              "linear-gradient(#e1dee8, #d6d3df)",
          }}
        >
          <img
            src="/merch/jacket-still.webp"
            alt="The grey club jacket from the front, with the stars and Mono on the chest"
            width={1000}
            height={800}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-col justify-center p-6 md:p-10">
          <h2 id="wear-the-club" className="text-4xl font-black italic leading-none md:text-5xl">
            Wear the club.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The {jacket.name}: a {merch.colours[0]!.name.toLowerCase()} bomber with a full zip. Our
            design team's Define the Future print on the back, their robot Mono and the stars on the
            front, and the college crest as a peel-off sticker for the sleeve.
          </p>
          <p className="mt-5 font-mono text-2xl font-semibold">{rupees(jacket.price)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/merch"
              className="border-2 border-border bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5"
            >
              Spin it in 3D
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Turn it around, unzip it and see every print up close.
          </p>
        </div>
      </div>
    </section>
  );
}
