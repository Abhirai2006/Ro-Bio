import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { site } from "@/lib/site";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    links: [canonical("/gallery")],
    meta: [
      { title: "Gallery | RO-BIO" },
      { name: "description", content: "Photos and hand-drawn art from RO-BIO, coming soon." },
      { property: "og:title", content: "Gallery | RO-BIO" },
      { property: "og:description", content: "Photos and the RO-BIO field notebook." },
    ],
  }),
  component: Gallery,
});

const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-3"];

function Gallery() {
  return (
    <>
      <PageIntro label="GALLERY / FIELD NOTEBOOK" title="Photos and drawings.">
        Our artists draw on paper. Their pages and our event photos will be pinned here. For now, the latest pictures are on{" "}
        <a href={site.instagram} target="_blank" rel="noreferrer" className="font-bold text-primary underline">
          Instagram
        </a>
        .
      </PageIntro>
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 md:grid-cols-3">
        {tilts.map((t, i) => (
          <div key={i} className={`${t} border-2 border-border bg-card p-3 pb-8 shadow-hard`} aria-hidden="true">
            <div className="blueprint grid aspect-square place-items-center border-2 border-dashed border-border">
              <span className="font-pixel text-[10px] text-muted-foreground">EMPTY FRAME</span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
