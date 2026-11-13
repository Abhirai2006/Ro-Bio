import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { formatDate, site, squadOf, teamLinkedIn, teamPhotos } from "@/lib/site";
import { pieces, postBySlug } from "@/lib/blog";

export const Route = createFileRoute("/blog_/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p)
      return {
        meta: [{ title: "Post not found | RO-BIO" }, { name: "robots", content: "noindex" }],
      };
    const image = p.cover
      ? [
          { property: "og:image", content: `${site.url}${p.cover.src}` },
          { property: "og:image:width", content: String(p.cover.width) },
          { property: "og:image:height", content: String(p.cover.height) },
          { property: "og:image:alt", content: p.cover.alt },
          { name: "twitter:image", content: `${site.url}${p.cover.src}` },
        ]
      : [];
    return {
      links: [canonical(`/blog/${p.slug}`)],
      meta: [
        { title: `${p.title} | RO-BIO` },
        { name: "description", content: p.summary },
        { name: "author", content: p.author },
        { property: "og:type", content: "article" },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.summary },
        { property: "article:published_time", content: p.date },
        ...image,
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const { post: p } = Route.useLoaderData();
  const photo = teamPhotos[p.author];
  const squad = squadOf(p.author);
  const linkedIn = teamLinkedIn[p.author];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.summary,
          datePublished: p.date,
          author: {
            "@type": "Person",
            name: p.author,
            ...(linkedIn ? { sameAs: [linkedIn] } : {}),
          },
          publisher: { "@type": "Organization", name: "RO-BIO", url: site.url },
          mainEntityOfPage: `${site.url}/blog/${p.slug}`,
          ...(p.cover ? { image: `${site.url}${p.cover.src}` } : {}),
        }}
      />
      <PageIntro label="BLOG / LAB NOTES" title={p.title}>
        <span className="font-mono text-base">
          <time dateTime={p.date}>{formatDate(p.date)}</time>
        </span>
      </PageIntro>
      <article className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-14 md:grid-cols-[2fr_1fr]">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3">
            {photo && (
              <img
                src={photo}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 border-2 border-border object-cover"
              />
            )}
            <span>
              <span className="block font-bold">{p.author}</span>
              {squad?.slug ? (
                <Link
                  to={`/team/${squad.slug}` as "/"}
                  className="text-sm text-muted-foreground underline underline-offset-2"
                >
                  {squad.title} squad
                </Link>
              ) : squad ? (
                <span className="text-sm text-muted-foreground">{squad.title} squad</span>
              ) : null}
            </span>
          </p>
          <div className="mt-8 grid gap-5 text-lg leading-relaxed">
            {p.paragraphs.map((para, i) => (
              <p key={i}>
                {pieces(para).map((bit, j) =>
                  bit.to ? (
                    <Link
                      key={j}
                      to={bit.to as "/"}
                      className="font-bold text-primary underline underline-offset-4"
                    >
                      {bit.text}
                    </Link>
                  ) : (
                    <span key={j}>{bit.text}</span>
                  ),
                )}
              </p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3 border-t-2 border-dashed border-border pt-6">
            <Link
              to="/blog"
              className="border-2 border-border bg-card px-4 py-2 font-bold shadow-hard"
            >
              All posts
            </Link>
            <Link
              to="/events"
              className="border-2 border-border bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard"
            >
              See our events
            </Link>
          </div>
        </div>
        {p.cover && (
          <figure className="border-2 border-border bg-card p-2 shadow-hard-violet">
            <img
              src={p.cover.src}
              alt={p.cover.alt}
              width={p.cover.width}
              height={p.cover.height}
              className="block h-auto w-full"
            />
          </figure>
        )}
      </article>
    </>
  );
}
