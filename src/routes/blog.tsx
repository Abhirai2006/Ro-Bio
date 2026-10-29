import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro, Pending } from "@/components/site/parts";
import { events, shortDate } from "@/lib/site";

export const Route = createFileRoute("/blog")({
  head: () => ({
    links: [canonical("/blog")],
    meta: [
      { title: "Blog | RO-BIO" },
      { name: "description", content: "News and write-ups from RO-BIO, the Biomedical and Robotic Engineering club at MUSE." },
      { property: "og:title", content: "Blog | RO-BIO" },
      { property: "og:description", content: "News and write-ups from RO-BIO." },
    ],
  }),
  component: Blog,
});

function Blog() {
  return (
    <>
      <PageIntro label="BLOG / LAB NOTES" title="Lab notes." />
      <section className="mx-auto max-w-3xl px-4 py-14">
        <Pending title="No posts yet">The first write-up will probably be about {events[0]!.title}. Check back after {shortDate(events[0]!.date).replace(/\s\d{4}$/, "")}.</Pending>
      </section>
    </>
  );
}
