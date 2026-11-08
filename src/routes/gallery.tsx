import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { ClipPlayer } from "@/components/site/ClipPlayer";
import { gallery, site, type GalleryItem } from "@/lib/site";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    links: [canonical("/gallery")],
    meta: [
      { title: "Gallery | RO-BIO" },
      {
        name: "description",
        content: gallery.length
          ? "Photos and clips from RO-BIO events, like Robo Spark."
          : "Photos and clips from RO-BIO events, coming soon.",
      },
      { property: "og:title", content: "Gallery | RO-BIO" },
      { property: "og:description", content: "Photos, clips and the RO-BIO field notebook." },
    ],
  }),
  component: Gallery,
});

const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-3"];

/** A photo pinned like a print. Tapping it opens it big. */
function Photo({ item, tilt, onOpen }: { item: GalleryItem; tilt: string; onOpen: () => void }) {
  return (
    <figure
      className={`${tilt} border-2 border-border bg-card p-3 pb-4 shadow-hard transition-transform hover:rotate-0`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full border-2 border-border focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Open the photo: ${item.alt}`}
      >
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover"
        />
      </button>
      <figcaption className="mt-3 text-sm">
        {item.event && (
          <span className="block font-pixel text-[10px] text-primary">
            {item.event.toUpperCase()}
          </span>
        )}
        {item.caption}
      </figcaption>
    </figure>
  );
}

function Gallery() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const show = (item: GalleryItem) => {
    setOpen(item);
    dialog.current?.showModal();
  };
  return (
    <>
      <PageIntro label="GALLERY / FIELD NOTEBOOK" title="Photos and drawings.">
        {gallery.length
          ? "Photos and clips from our events. "
          : "Photos and clips from Robo Spark and our other events are coming soon. "}
        The latest pictures are always on{" "}
        <a
          href={site.instagram}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary underline"
        >
          Instagram
        </a>
        .
      </PageIntro>
      {gallery.length ? (
        <section
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 md:grid-cols-3"
          aria-label="Photos and clips"
        >
          {gallery.map((item, i) =>
            item.kind === "clip" ? (
              <figure
                key={item.src}
                className="col-span-2 border-2 border-border bg-card p-3 pb-4 shadow-hard"
              >
                <ClipPlayer
                  src={item.src}
                  poster={item.poster}
                  label={item.alt}
                  className="aspect-video border-2 border-border"
                />
                <figcaption className="mt-3 text-sm">
                  {item.event && (
                    <span className="block font-pixel text-[10px] text-primary">
                      {item.event.toUpperCase()}
                    </span>
                  )}
                  {item.caption}
                </figcaption>
              </figure>
            ) : (
              <Photo
                key={item.src}
                item={item}
                tilt={tilts[i % tilts.length]!}
                onOpen={() => show(item)}
              />
            ),
          )}
        </section>
      ) : (
        <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 md:grid-cols-3">
          {tilts.map((t, i) => (
            <div
              key={i}
              className={`${t} border-2 border-border bg-card p-3 pb-8 shadow-hard`}
              aria-hidden="true"
            >
              <div className="blueprint grid aspect-square place-items-center border-2 border-dashed border-border">
                <span className="font-pixel text-[10px] text-muted-foreground">EMPTY FRAME</span>
              </div>
            </div>
          ))}
        </section>
      )}
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          // a tap on the dark backdrop closes it
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto max-h-[92vh] w-[min(92vw,1100px)] border-2 border-border bg-card p-3 text-foreground shadow-hard backdrop:bg-ink/80"
        aria-label={open ? open.alt : "Photo"}
      >
        {open && (
          <figure>
            <img src={open.src} alt={open.alt} className="max-h-[78vh] w-full object-contain" />
            <figcaption className="mt-3 flex items-start justify-between gap-4 text-sm">
              <span>
                {open.event && (
                  <span className="block font-pixel text-[10px] text-primary">
                    {open.event.toUpperCase()}
                  </span>
                )}
                {open.caption}
              </span>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="sq-ctl"
                autoFocus
              >
                CLOSE
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
