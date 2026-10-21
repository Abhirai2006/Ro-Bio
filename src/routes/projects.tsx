import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/parts";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects | RO-BIO" },
      { name: "description", content: "What RO-BIO members are building. Project write-ups are coming soon." },
      { property: "og:title", content: "Projects | RO-BIO" },
      { property: "og:description", content: "What RO-BIO members are building." },
    ],
  }),
  component: Projects,
});

function Projects() {
  return (
    <>
      <PageIntro label="PROJECTS / ON THE BENCH" title="Stuff we're building.">
        Write-ups are being put together by the people who built them. Wiring will still be showing.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="font-pixel text-xs text-primary">BUILD REEL</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <figure key={n} className="group border-2 border-border bg-card shadow-hard">
              <div className="relative grid aspect-video place-items-center overflow-hidden border-b-2 border-border bg-ink text-paper">
                <div className="blueprint absolute inset-0 opacity-40" aria-hidden="true" />
                <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-paper transition-transform group-hover:scale-110" aria-hidden="true">
                  <svg viewBox="0 0 20 20" className="ml-1 h-5 w-5 fill-paper"><path d="M4 2l14 8-14 8z" /></svg>
                </span>
                <span className="absolute left-2 top-2 font-mono text-[10px] text-lens">REC 0{n}</span>
                <span className="absolute bottom-2 right-2 font-pixel text-[9px] opacity-70">VIDEO COMING SOON</span>
              </div>
              <figcaption className="p-4">
                <p className="font-display font-bold">Project details coming soon</p>
                <p className="mt-1 font-pixel text-[10px] text-muted-foreground">STATUS: TBA</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
