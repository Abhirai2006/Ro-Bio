import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Pending } from "@/components/site/parts";
import { bylineOf, nextEvent, shortDate, teamPhotos, todayInIndia } from "@/lib/site";
import { sortedPosts } from "@/lib/blog";

export const Route = createFileRoute("/blog")({
  head: () => ({
    links: [canonical("/blog")],
    meta: [
      { title: "Blog | RO-BIO" },
      {
        name: "description",
        content:
          "News and write-ups from RO-BIO, the robotics and biomedical club for every branch at MUSE.",
      },
      { property: "og:title", content: "Blog | RO-BIO" },
      { property: "og:description", content: "News and write-ups from RO-BIO." },
    ],
  }),
  component: Blog,
});

function Blog() {
  const list = sortedPosts();
  return (
    <>
      <PageIntro label="BLOG / LAB NOTES" title="Lab notes." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        {list.length ? (
          <ol className="grid gap-6" data-robo-say="blog">
            {list.map((p) => {
              const photo = teamPhotos[p.author];
              const by = bylineOf(p.author);
              return (
                <li key={p.slug}>
                  <article className="grid gap-5 border-2 border-border bg-card p-5 shadow-hard md:grid-cols-[180px_1fr] md:p-6">
                    {p.cover && (
                      <img
                        src={p.cover.src}
                        alt=""
                        width={p.cover.width}
                        height={p.cover.height}
                        loading="lazy"
                        className="hidden h-auto w-full border-2 border-border md:block"
                      />
                    )}
                    <div className={p.cover ? "" : "md:col-span-2"}>
                      <p className="font-pixel text-[11px] text-primary">
                        <time dateTime={p.date}>{shortDate(p.date).toUpperCase()}</time>
                      </p>
                      <h2 className="mt-2 text-2xl font-black md:text-3xl">
                        <Link
                          to="/blog/$slug"
                          params={{ slug: p.slug }}
                          className="hover:underline hover:underline-offset-4"
                        >
                          {p.title}
                        </Link>
                      </h2>
                      <p className="mt-3 max-w-2xl text-muted-foreground">{p.summary}</p>
                      <p className="mt-4 flex items-center gap-3 text-sm">
                        {photo && (
                          <img
                            src={photo}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 border-2 border-border object-cover"
                          />
                        )}
                        <span>
                          <span className="font-bold">{p.author}</span>
                          {by && <span className="text-muted-foreground"> / {by.label}</span>}
                        </span>
                      </p>
                      <Link
                        to="/blog/$slug"
                        params={{ slug: p.slug }}
                        className="mt-5 inline-block border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard"
                        aria-label={`Read: ${p.title}`}
                      >
                        Read it
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <Pending title="No posts yet">
            The first write-up will probably be about {nextEvent(todayInIndia()).title}. Check back
            after it.
          </Pending>
        )}
      </section>
    </>
  );
}
