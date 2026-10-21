import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Pending } from "@/components/site/parts";

export const Route = createFileRoute("/blog")({
  head: () => ({
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
        <Pending title="No posts yet">The first write-up will probably be about Bot Forge. Check back after 28 Oct.</Pending>
      </section>
    </>
  );
}
