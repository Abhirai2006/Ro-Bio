import { createFileRoute } from "@tanstack/react-router";
import { JsonLd } from "@/components/site/JsonLd";
import { PageIntro } from "@/components/site/parts";
import { faqs } from "@/lib/faq";
import { canonical } from "@/lib/seo";

const desc = "Straight answers about RO-BIO, the Biomedical and Robotic Engineering club at Mysore University School of Engineering, and its first event, Bot Forge.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ | RO-BIO" },
      { name: "description", content: desc },
      { property: "og:title", content: "FAQ | RO-BIO" },
      { property: "og:description", content: desc },
    ],
    links: [canonical("/faq")],
  }),
  component: Faq,
});

function Faq() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageIntro label="FAQ / ASK RO-BIO" title="Questions, answered.">
        Short, factual answers. If yours is not here, message us on Instagram.
      </PageIntro>
      <section className="mx-auto max-w-3xl px-4 py-14">
        <dl className="space-y-8">
          {faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-display text-xl font-bold">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
