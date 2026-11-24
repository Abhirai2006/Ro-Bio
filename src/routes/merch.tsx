import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/parts";
import { MerchStudio } from "@/components/site/MerchStudio";
import { merch } from "@/lib/site";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/merch")({
  head: () => ({
    links: merch.draft ? [] : [canonical("/merch")],
    // a draft for members, shared by link, stays out of search engines; the final kit is a public showcase
    meta: merch.draft
      ? [
          { title: "Merch drafts for members | RO-BIO" },
          { name: "robots", content: "noindex, nofollow" },
          {
            name: "description",
            content:
              "Draft RO-BIO club jacket for members. Turn it in 3D, like it and tell us what you think.",
          },
          { property: "og:title", content: "RO-BIO merch drafts" },
          {
            property: "og:description",
            content:
              "Spin the draft club kit in 3D, like your favourite and tell us what you think.",
          },
        ]
      : [
          { title: "Merch | RO-BIO" },
          {
            name: "description",
            content:
              "The RO-BIO club jacket in 3D: a grey bomber with a full zip and the design team's Define the Future print, for Rs 570. Turn it, unzip it and see every print.",
          },
          { property: "og:title", content: "RO-BIO merch" },
          {
            property: "og:description",
            content: "The club jacket in 3D. Turn it, unzip it, see every print.",
          },
        ],
  }),
  component: Merch,
});

function Merch() {
  return (
    <>
      <PageIntro label={`RO-BIO KIT / ${merch.drop.toUpperCase()}`} title="Wear the club.">
        The club jacket: a grey bomber with a full zip and artwork by our design team. The Define
        the Future print on the back, the robot Mono and the stars on the front, and the college
        crest as a peel-off sticker for the right sleeve. Turn it around and unzip it.
      </PageIntro>
      <MerchStudio />
    </>
  );
}
