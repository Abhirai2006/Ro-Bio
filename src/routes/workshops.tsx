import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Pending } from "@/components/site/parts";

export const Route = createFileRoute("/workshops")({
  head: () => ({
    links: [canonical("/workshops")],
    meta: [
      { title: "Saturday workshops | RO-BIO" },
      { name: "description", content: "Most Saturdays, people from companies like L&T come to MUSE to teach RO-BIO practical skills." },
      { property: "og:title", content: "Saturday workshops | RO-BIO" },
      { property: "og:description", content: "Real engineers, teaching in our classroom." },
    ],
  }),
  component: Workshops,
});

function Workshops() {
  return (
    <>
      <PageIntro label="SATURDAYS AT RO-BIO" title="Real engineers, in our classroom.">
        Most Saturdays, someone from a company like L&amp;T comes to campus and teaches us practical skills. No sign-ups, just
        turn up when it's announced.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-black">Visitor badges</h2>
        <p className="mt-2 text-muted-foreground">Every speaker who teaches here gets a badge on this wall.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative border-2 border-dashed border-border bg-muted p-5 pt-8" aria-hidden={i > 0}>
              <span className="absolute left-1/2 top-2 h-2 w-12 -translate-x-1/2 rounded-full border-2 border-border bg-background" />
              <p className="font-pixel text-[10px] text-primary">VISITOR</p>
              <p className="mt-3 h-4 w-3/4 bg-border/20" />
              <p className="mt-2 h-3 w-1/2 bg-border/20" />
              <p className="mt-6 font-pixel text-[10px] text-muted-foreground">BADGE NOT PRINTED YET</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Pending title="Workshop list and photos are on the way">
            We're collecting the names, topics and photos from past Saturdays. They'll show up here once the club sends them.
          </Pending>
        </div>
      </section>
    </>
  );
}
